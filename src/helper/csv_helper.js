import Papa from 'papaparse';
import _ from 'lodash';
import util, { fillRange, sum, setArrayValuesToZero } from './util';

const papaConfig = {
  header: true,
  dynamicTyping: true,
  trimHeaders: true,
  skipEmptyLines: true
};

/**
 * @typedef {Object} author
 * @property {number} submissionId The submissionId of the author
 * @property {string} firstName The first name of the author
 * @property {string} lastName The last name of the author
 * @property {string} email The email of the author
 * @property {string} country The country of the author
 * @property {string} affiliation The organization the author belongs to
 * @property {string} page The web page of the author
 * @property {number} personId The unique id assigned to the author
 * @property {boolean} corresponding Whether the author is corresponding author for the paper
 */

/**
 * Generates a list of author objects from the given file (assumed to follow author.csv structure)
 * @param {*} file
 * @returns {author[]} A list of the parsed author objects if parse successful
 * @returns {Object} an object with error property if parse fails
 */
const parseAuthor = file => {
  // author.csv: header row, author names with affiliations, countries, emails
  // data format:
  // submission ID | f name | s name | email | country | affiliation | page | person ID | corresponding?
  // replace first line with a nicer header for objects
  let content = file.buffer.toString('utf8');
  content =
    'submissionId, firstName, lastName, email, country, affiliation, page, personId, corresponding\r' +
    content.substring(content.indexOf('\r') + 1);
  const parsedContent = Papa.parse(content, papaConfig);

  if (parsedContent.errors.length !== 0) {
    // error handling
    console.error('parsing has issues:', parsedContent.errors);
    return { error: true };
  }

  // eslint-disable-next-line
  parsedContent.data.map(author => author.corresponding = author.corresponding === 'yes');

  return parsedContent.data;
};

/**
 * @typedef {Object} review
 * @property {number} reviewId The id of the review
 * @property {number} paperId The paper id of that the review is reviewing
 * @property {number} reviewerId The id of the reviewer
 * @property {string} reviewerName The name of the reviewer
 * @property {string} test The full text of the review
 * @property {Object} scores The review scores
 * @property {number} overallScore The overall score of the review
 * @property {string} date The date of the review
 * @property {string} time The time of the review
 * @property {number} recommend 1 if paper is recommended, 0 if not
 */
/**
 * Generates a list of review objects from the given file (assumed to follow review.csv structure)
 * @param {*} file
 * @returns {review[]} A list of the parsed review objects
 */
const parseReview = file => {
  // review.csv
  // data format:
  // review ID | paper ID? | reviewer ID | reviewer name | unknown | text | scores | overall score | unknown | unknown | unknown | unknown | date | time | recommend?
  // File has NO header
  const content = 'reviewId, paperId, reviewerId, reviewerName, unknown, text, scores, overallScore, unknown, unknown, unknown, unknown, date, time, recommend\n' +
    (file.buffer.toString('utf8'));
  const parsedContent = Papa.parse(content, papaConfig);
  if (parsedContent.errors.length !== 0) {
    // error handling
    console.error('parsing has issues:', parsedContent.errors);
    return { error: true };
  }

  const formattedContent = [];

  parsedContent.data.forEach(review => {
    const { reviewId, paperId, reviewerId, reviewerName, text, scores, overallScore, date, time } = review;
    const evaluation = scores.split(/[\r\n]+/);
    const recommendForBestPaper = evaluation.length > 2
      ? evaluation[2].split(': ')[1] === 'yes'
        ? 1
        : 0
      : 0;
    const scoreObject = {
      overallEvaluation: parseInt(evaluation[0].split(': ')[1]),
      confidence: parseInt(evaluation[1].split(': ')[1]),
      recommendForBestPaper
    };
    formattedContent.push({
      reviewId,
      paperId,
      reviewerId,
      reviewerName,
      text,
      scores: scoreObject,
      overallScore,
      date,
      time,
      recommend: scoreObject.recommendForBestPaper
    });
  });

  return formattedContent;
};
const getAuthorInfo = file => {
  const parsedAuthors = parseAuthor(file);

  const authorList = [];
  const authors = [];
  const countries = [];
  const affiliations = [];
  parsedAuthors.map(author => {
    const { firstName, lastName, country, affiliation } = author;
    const name = firstName + ' ' + lastName;
    authorList.push({ name, country, affiliation });
    authors.push(name);
    countries.push(country);
    affiliations.push(affiliation);
  });

  const authorCounts = _.countBy(authors);
  const countryCounts = _.countBy(countries);
  const affiliationCounts = _.countBy(affiliations);

  const authorLabels = [];
  const authorData = [];
  util.getSortedArrayFromMapUsingCount(authorCounts).map(x => {
    authorLabels.push(x[0]);
    authorData.push(x[1]);
  });

  const countryLabels = [];
  const countryData = [];
  util.getSortedArrayFromMapUsingCount(countryCounts).map(x => {
    countryLabels.push(x[0]);
    countryData.push(x[1]);
  });

  const affiliationLabels = [];
  const affiliationData = [];
  util.getSortedArrayFromMapUsingCount(affiliationCounts).map(x => {
    affiliationLabels.push(x[0]);
    affiliationData.push(x[1]);
  });

  const parsedResult = {
    topAuthors: { labels: authorLabels, data: authorData },
    topCountries: { labels: countryLabels, data: countryData },
    topAffiliations: { labels: affiliationLabels, data: affiliationData }
  };

  return { infoType: 'author', infoData: parsedResult };
};

const getReviewInfo = file => {
  // score calculation principles:
  // Weighted Average of the scores, using reviewer's confidence as the weights
  // recommended principles:
  // Yes: 1; No: 0; weighted average of the 1 and 0's, also using reviewer's confidence as the weights
  const parsedReviews = parseReview(file);

  // Idea: from -3 to 3 (min to max scores possible), every 0.25 will be a gap
  let scoreDistributionCounts = fillRange(-3, 3, 0.25);
  let recommendDistributionCounts = fillRange(0, 1, 0.1);

  const scoreDistributionLabels = [];
  const recommendDistributionLabels = [];

  for (let i = 0; i < scoreDistributionCounts.length - 1; i++) {
    scoreDistributionLabels[i] = scoreDistributionCounts[i].toFixed(2) + ' ~ ' + scoreDistributionCounts[i + 1].toFixed(2);
  }
  for (let i = 0; i < recommendDistributionCounts.length - 1; i++) {
    recommendDistributionLabels[i] = recommendDistributionCounts[i].toFixed(1) + ' ~ ' + recommendDistributionCounts[i + 1].toFixed(1);
  }

  scoreDistributionCounts = setArrayValuesToZero(scoreDistributionCounts);
  recommendDistributionCounts = setArrayValuesToZero(recommendDistributionCounts);

  const confidenceList = [];
  const recommendList = [];
  const scoreList = [];
  const submissionIDReviewMap = {};
  const reviewsGroupBySubmissionId = _.mapValues(_.groupBy(parsedReviews, 'paperId'));
  for (const submissionId in reviewsGroupBySubmissionId) {
    const scores = [];
    const confidences = [];
    const recommends = [];
    const weightedScores = [];
    const weightedRecommends = [];
    reviewsGroupBySubmissionId[submissionId].map(review => {
      // overall evaluation || reviewer's confidence || Recommend for best paper
      // Sample: Overall evaluation: -3\nReviewer's confidence: 5\nRecommend for best paper: no
      const { overallEvaluation, confidence, recommendForBestPaper } = review.scores;
      scores.push(overallEvaluation);
      confidences.push(confidence);
      recommends.push(recommendForBestPaper);
      weightedScores.push(overallEvaluation * confidence);
      weightedRecommends.push(recommendForBestPaper * confidence);
    });

    const confidenceSum = confidences.reduce(sum);
    confidenceList.push(confidenceSum / confidences.length);

    const totalWeightedScore = weightedScores.reduce(sum) / confidenceSum;
    const totalWeightedRecommend = weightedRecommends.reduce(sum) / confidenceSum;

    scoreList.push(totalWeightedScore);
    recommendList.push(totalWeightedRecommend);

    // 0 based index, but answer is 1 based
    const scoreColumn = Math.max(Math.ceil((totalWeightedScore + 3) / 0.25) - 1, 0);
    const recommendColumn = Math.max(Math.ceil((totalWeightedRecommend) / 0.1) - 1, 0);
    scoreDistributionCounts[scoreColumn] += 1;
    recommendDistributionCounts[recommendColumn] += 1;

    submissionIDReviewMap[submissionId] = { score: totalWeightedScore, recommend: totalWeightedRecommend };
  }

  const parsedResult = {
    IDReviewMap: submissionIDReviewMap,
    scoreList,
    meanScore: scoreList.reduce(sum) / scoreList.length,
    meanConfidence: confidenceList.reduce(sum) / confidenceList.length,
    meanRecommend: recommendList.reduce(sum) / recommendList.length,
    recommendList,
    scoreDistribution: { labels: scoreDistributionLabels, counts: scoreDistributionCounts },
    recommendDistribution: { labels: recommendDistributionLabels, counts: recommendDistributionCounts }
  };

  return { infoType: 'review', infoData: parsedResult };
};

const getSubmissionInfo = file => {
  // submission.csv
  // data format:
  // submission ID | track ID | track name | title | authors | submit time | last update time | form fields | keywords | decision | notified | reviews sent | abstract
  // File has header
  let content = file.buffer.toString('utf8');
  content =
    'submissionId, trackId, trackName, title, authors, submitTime, lastUpdateTime, formFields, keywords, decision, notified, reviewsSent, abstract\r' +
    content.substring(content.indexOf('\r') + 1);
  const parsedContent = Papa.parse(content, papaConfig);
  if (parsedContent.errors.length !== 0) {
    // error handling
    console.error('parsing has issues:', parsedContent.errors);
    // return false;
  }

  const acceptedSubs = [];
  const rejectedSubs = [];
  const submissionTimes = [];
  const lastUpdateTimes = [];
  const acceptedKeywords = [];
  const rejectedKeywords = [];
  const allKeywords = [];
  const trackNames = [];
  const acceptedAuthorNames = [];
  parsedContent.data.map(row => {
    if (row.decision === 'reject') {
      rejectedSubs.push(row);
      rejectedKeywords.push(...row.keywords.split(/[\r\n]+/).map(x => x.toLowerCase()));
    } else if (row.decision === 'accept') {
      acceptedSubs.push(row);
      acceptedKeywords.push(...row.keywords.split(/[\r\n]+/).map(x => x.toLowerCase()));
      acceptedAuthorNames.push(...row.authors.replace(' and ', ',').split(',').map(x => x.trim()));
    }
    allKeywords.push(...row.keywords.split(/[\r\n]+/).map(x => x.toLowerCase()));
    trackNames.push(row.trackName);
    submissionTimes.push(row.submitTime.split(' ')[0]);
    lastUpdateTimes.push(row.submitTime.split(' ')[0]);
  });

  const acceptedAuthorCount = _.countBy(acceptedAuthorNames);

  const authorNames = [];
  const authorCounts = [];
  util.getSortedArrayFromMapUsingCount(acceptedAuthorCount).map(x => {
    authorNames.push(x[0]);
    authorCounts.push(x[1]);
  });

  const topAcceptedAuthorsMap = {
    names: authorNames,
    counts: authorCounts
  };

  const acceptedKeywordMap = _.countBy(acceptedKeywords);
  const rejectedKeywordMap = _.countBy(rejectedKeywords);
  const overallKeywordMap = _.countBy(allKeywords);

  const acceptedKeywordList = util.getSortedArrayFromMapUsingCount(acceptedKeywordMap);
  const rejectedKeywordList = util.getSortedArrayFromMapUsingCount(rejectedKeywordMap);
  const overallKeywordList = util.getSortedArrayFromMapUsingCount(overallKeywordMap);

  const acceptanceRate = acceptedSubs.length / parsedContent.data.length;
  const subTimeCounts = _.countBy(submissionTimes);
  const updateTimeCounts = _.countBy(lastUpdateTimes);

  const timestamps = util.getSortedArrayFromMapUsingKey(subTimeCounts);
  const lastEditStamps = util.getSortedArrayFromMapUsingKey(updateTimeCounts);

  const timeSeries = [];
  let cumulativeStampCount = 0;
  timestamps.map(element => {
    cumulativeStampCount += element[1];
    timeSeries.push({ x: element[0], y: cumulativeStampCount });
  });

  const lastEditSeries = [];
  let cumulativeEditCount = 0;
  lastEditStamps.map(element => {
    cumulativeEditCount += element[1];
    lastEditSeries.push({ x: element[0], y: cumulativeEditCount });
  });

  // do grouping analysis
  const paperGroupByTrackName = _.mapValues(_.groupBy(parsedContent.data, 'trackName'));

  // Obtained from the JCDL.org website: past conferences
  const comparableAcceptanceRate = {
    year: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018],
    'Full Papers': [0.29, 0.28, 0.27, 0.29, 0.29, 0.30, 0.29, 0.30],
    'Short Papers': [0.29, 0.37, 0.31, 0.31, 0.32, 0.50, 0.35, 0.32]
  };

  const keywordsByTrack = {};
  const acceptanceRateByTrack = {};
  const topAuthorsByTrack = {};
  for (const paperGroup in paperGroupByTrackName) {
    const acceptedPapersThisTrack = [];
    const acceptedAuthorsThisTrack = [];
    const currentGroupKeywords = [];
    paperGroupByTrackName[paperGroup].map(row => {
      currentGroupKeywords.push(...row.keywords.split(/[\r\n]+/).map(x => x.toLowerCase()));
      if (row.decision === 'accept') {
        acceptedPapersThisTrack.push(row);
        acceptedAuthorsThisTrack.push(...row.authors.replace(' and ', ',').split(',').map(x => x.trim()));
      }
    });
    const countedCurrentGroupKeywords = _.countBy(currentGroupKeywords);
    keywordsByTrack[paperGroup] = util.getSortedArrayFromMapUsingCount(countedCurrentGroupKeywords);
    const acceptedAuthorsThisTrackCount = _.countBy(acceptedAuthorsThisTrack);
    const authorNamesThisTrack = [];
    const authorCountsThisTrack = [];
    util.getSortedArrayFromMapUsingCount(acceptedAuthorsThisTrackCount).map(x => {
      authorNamesThisTrack.push(x[0]);
      authorCountsThisTrack.push(x[1]);
    });

    topAuthorsByTrack[paperGroup] = {
      names: authorNamesThisTrack,
      counts: authorCountsThisTrack
    };

    acceptanceRateByTrack[paperGroup] = acceptedPapersThisTrack.length / paperGroupByTrackName[paperGroup].length;

    if (paperGroup === 'Full Papers' || paperGroup === 'Short Papers') {
      comparableAcceptanceRate[paperGroup].push(acceptedPapersThisTrack.length / paperGroupByTrackName[paperGroup].length);
    }
  }

  const parsedResult = {
    acceptanceRate,
    overallKeywordMap,
    overallKeywordList,
    acceptedKeywordMap,
    acceptedKeywordList,
    rejectedKeywordMap,
    rejectedKeywordList,
    keywordsByTrack,
    acceptanceRateByTrack,
    topAcceptedAuthors: topAcceptedAuthorsMap,
    topAuthorsByTrack,
    timeSeries,
    lastEditSeries,
    comparableAcceptanceRate
  };

  return { infoType: 'submission', infoData: parsedResult };
};

export default {
  getAuthorInfo,
  getReviewInfo,
  getSubmissionInfo
};

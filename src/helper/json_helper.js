import _ from 'lodash';
import util, { fillRange, sum, setArrayValuesToZero, capitalize } from './util';

const getAuthorInfo = authorJson => {
  const { authors, fileName } = authorJson;
  const authorList = [];
  const authorNames = [];
  const countries = [];
  const organisations = [];
  const authorCounts = {};
  const subToOrgNames = {};
  Object.keys(authors).map(key => {
    const { name, country, submissions } = authors[key];
    authorList.push({ name, country });
    authorNames.push(name);
    const uniqOrgNames = [];
    submissions.map(sub => {
      // push a country into each submission author made
      countries.push(country);
      if (subToOrgNames[sub.submissionId]) {
        subToOrgNames[sub.submissionId].push(sub.organisation);
      } else {
        subToOrgNames[sub.submissionId] = [sub.organisation];
      }
    });
    organisations.push(..._.uniq(uniqOrgNames));

    authorCounts[name] = Object.keys(submissions).length;
  });

  Object.keys(subToOrgNames).map(key => {
    organisations.push(..._.uniq(subToOrgNames[key]));
  });
  const countryCounts = _.countBy(countries);
  const affiliationCounts = _.countBy(organisations);

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

  return { infoType: 'author', infoData: parsedResult, authors, timeProcessed: new Date(), fileName };
};

const getReviewInfo = reviewJson => {
  // score calculation principles:
  // Weighted Average of the scores, using reviewer's confidence as the weights
  // recommended principles:
  // Yes: 1; No: 0; weighted average of the 1 and 0's, also using reviewer's confidence as the weights
  const { reviews, fileName } = reviewJson;

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

  const reviewsList = _.values(reviews);

  const confidenceList = [];
  const recommendList = [];
  const scoreList = [];
  const submissionIDReviewMap = {};
  const reviewsGroupBySubmissionId = _.mapValues(_.groupBy(reviewsList, 'submissionId'));
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
      const recommendedScore = recommendForBestPaper ? 1 : 0;
      scores.push(overallEvaluation);
      confidences.push(confidence);
      recommends.push(recommendedScore);
      weightedScores.push(overallEvaluation * confidence);
      weightedRecommends.push(recommendedScore * confidence);
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
  return { infoType: 'review', infoData: parsedResult, timeProcessed: new Date(), fileName, reviews };
};

const getSubmissionInfo = submissionJson => {
  const { submissions, fileName } = submissionJson;

  const acceptedSubs = [];
  const rejectedSubs = [];
  const submissionTimes = [];
  const lastUpdateTimes = [];
  const acceptedKeywords = [];
  const rejectedKeywords = [];
  const allKeywords = [];
  const trackNames = [];
  const acceptedAuthorNames = [];
  const submissionsList = _.values(submissions);

  submissionsList.map(submission => {
    if (submission.decision === 'reject') {
      rejectedSubs.push(submission);
      rejectedKeywords.push(...submission.keywords);
    } else if (submission.decision === 'accept') {
      acceptedSubs.push(submission);
      acceptedKeywords.push(...submission.keywords);
      acceptedAuthorNames.push(...submission.authors);
    }
    allKeywords.push(...submission.keywords);
    trackNames.push(submission.trackName);
    submissionTimes.push(submission.submitTime.split(' ')[0]);
    lastUpdateTimes.push(submission.submitTime.split(' ')[0]);
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

  const acceptanceRate = acceptedSubs.length / submissionsList.length;
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
  const paperGroupByTrackName = _.mapValues(_.groupBy(submissionsList, 'trackName'));

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
      currentGroupKeywords.push(...row.keywords);
      if (row.decision === 'accept') {
        acceptedPapersThisTrack.push(row);
        acceptedAuthorsThisTrack.push(...row.authors);
      }
    });
    const countedCurrentGroupKeywords = _.countBy(currentGroupKeywords);
    keywordsByTrack[paperGroup] = countedCurrentGroupKeywords;
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
    // overallKeywordList
    acceptedKeywordMap,
    // acceptedKeywordList,
    rejectedKeywordMap,
    // rejectedKeywordList,
    keywordsByTrack,
    acceptanceRateByTrack,
    topAcceptedAuthors: topAcceptedAuthorsMap,
    topAuthorsByTrack,
    timeSeries,
    lastEditSeries,
    comparableAcceptanceRate
  };

  return { infoType: 'submission', infoData: parsedResult, timeProcessed: new Date(), fileName, submissions };
};

const getAuthorSubmissionInfo = combinedJson => {
  // info to visualize:
  // submissions per country -- top countries
  // acceptance rate by country
  // accepted keywords by country
  // acceptance rate by affiliation

  const subsGroupByCountry = _.mapValues(_.groupBy(combinedJson, 'country'));
  const subsCountByCountry = {};
  const acceptanceRateByCountry = {};
  const acceptedKeywordsByCountry = {};
  const acceptedKeywordsCountByCountry = {};
  const rejectionRateByCountry = {};
  const rejectedKeywordsByCountry = {};
  const rejectedKeywordsCountByCountry = {};
  const keywordsByCountry = {};
  const keywordsCountByCountry = {};
  for (const country in subsGroupByCountry) {
    let acceptanceCount = 0;
    let rejectionCount = 0;
    const uniqBySubId = _.uniqBy(subsGroupByCountry[country], 'submissionId');
    subsCountByCountry[country] = uniqBySubId.length;
    uniqBySubId.map(submission => {
      if (submission.decision === 'accept') {
        if (!acceptedKeywordsByCountry[country]) {
          acceptedKeywordsByCountry[country] = [];
        }
        acceptedKeywordsByCountry[country].push(...submission.keywords);
        acceptanceCount++;
      } else if (submission.decision === 'reject') {
        if (!rejectedKeywordsByCountry[country]) {
          rejectedKeywordsByCountry[country] = [];
        }
        rejectedKeywordsByCountry[country].push(...submission.keywords);
        rejectionCount++;
      }
      if (!keywordsByCountry[country]) {
        keywordsByCountry[country] = [];
      }
      keywordsByCountry[country].push(...submission.keywords);
    });
    acceptanceRateByCountry[country] = (acceptanceCount / uniqBySubId.length);
    acceptedKeywordsCountByCountry[country] = _.countBy(acceptedKeywordsByCountry[country]);
    rejectionRateByCountry[country] = (rejectionCount / uniqBySubId.length);
    rejectedKeywordsCountByCountry[country] = _.countBy(rejectedKeywordsByCountry[country]);
    keywordsCountByCountry[country] = _.countBy(keywordsByCountry[country]);
  }

  const subsGroupByAffiliation = _.mapValues(_.groupBy(combinedJson, 'organisation'));
  const subsCountByAffiliation = {};
  const acceptanceRateByAffiliation = {};
  const rejectionRateByAffiliation = {};
  for (const affiliation in subsGroupByAffiliation) {
    let acceptanceCount = 0;
    let rejectionCount = 0;
    const uniqBySubId = _.uniqBy(subsGroupByAffiliation[affiliation], 'submissionId');
    subsCountByAffiliation[affiliation] = uniqBySubId.length;
    uniqBySubId.map(submission => {
      if (submission.decision === 'accept') {
        acceptanceCount++;
      } else if (submission.decision === 'reject') {
        rejectionCount++;
      }
    });
    acceptanceRateByAffiliation[affiliation] = acceptanceCount / uniqBySubId.length;
    rejectionRateByAffiliation[affiliation] = rejectionCount / uniqBySubId.length;
  }

  const parsedResult = {
    keywordsCountByCountry,
    subsCountByCountry,
    subsCountByAffiliation,
    acceptedKeywordsCountByCountry,
    acceptanceRateByCountry,
    rejectedKeywordsCountByCountry,
    rejectionRateByCountry,
    acceptanceRateByAffiliation,
    rejectionRateByAffiliation
  };

  return { infoType: 'author_submission', infoData: parsedResult, timeProcessed: new Date(), fileName: 'author_submissions' };
};

const getReviewSubmissionInfo = combinedJson => {
  const scoresByKeywords = {};
  combinedJson.map(row => {
    const { keywords, scores } = row;
    keywords.map(keyword => {
      if (!scoresByKeywords[keyword]) {
        scoresByKeywords[keyword] = 0;
      }
      scoresByKeywords[keyword] += scores.overallEvaluation * scores.confidence;
    });
  });

  const {
    scoresByTrackName,
    recommendsByTrackName,
    reviewCountByTrackName
  } = getScoresAndRecommendsByCategory(combinedJson, 'trackName');
  const { recommendsByReviewerName, reviewCountByReviewerName } = getScoresAndRecommendsByCategory(combinedJson, 'reviewerName');

  const { timeSeriesByScore, lastEditSeriesByScore } = getScoreTimeseries(combinedJson);

  const { acceptedMeanScore,
    acceptedMeanConfidence,
    acceptedMeanRecommend,
    rejectedMeanScore,
    rejectedMeanConfidence,
    rejectedMeanRecommend,
    acceptedMinScore,
    rejectedMaxScore,
    acceptedScoreDistribution,
    acceptedRecommendDistribution,
    rejectedScoreDistribution,
    rejectedRecommendDistribution } = getScoreDistribution(combinedJson);

  const parsedResult = {
    scoresByKeywords,
    scoresByTrackName,
    recommendsByTrackName,
    reviewCountByTrackName,
    recommendsByReviewerName,
    reviewCountByReviewerName,
    timeSeriesByScore,
    lastEditSeriesByScore,
    acceptedMeanScore,
    acceptedMeanConfidence,
    acceptedMeanRecommend,
    rejectedMeanScore,
    rejectedMeanConfidence,
    rejectedMeanRecommend,
    acceptedMinScore,
    rejectedMaxScore,
    acceptedScoreDistribution,
    acceptedRecommendDistribution,
    rejectedScoreDistribution,
    rejectedRecommendDistribution
  };

  return { infoType: 'review_submission', infoData: parsedResult, timeProcessed: new Date(), fileName: 'review_submission' };
};

// helper method for getAuthorReviewInfo to calculate total score and total recommends by the category provided
const getScoresAndRecommendsByCategory = (combinedJson, category) => {
  const subsGroupByCategory = _.mapValues(_.groupBy(combinedJson, category));
  const scoresByCategory = {};
  const recommendsByCategory = {};
  const reviewCountByCategory = {};
  Object.keys(subsGroupByCategory).map(category => {
    let totalScore = 0;
    let totalRecommends = 0;
    subsGroupByCategory[category].map(review => {
      const { scores, expertiseLevel, isRecommended } = review;
      totalScore += scores.confidence * scores.overallEvaluation * expertiseLevel;

      if (isRecommended) {
        totalRecommends++;
      }
    });

    const reviewCount = subsGroupByCategory[category].length;
    // divide total score by number of reviews
    scoresByCategory[category] = totalScore / reviewCount;
    recommendsByCategory[category] = totalRecommends / reviewCount;
    reviewCountByCategory[category] = reviewCount;
  });
  const scoreKey = `scoresBy${capitalize(category)}`;
  const recommendsKey = `recommendsBy${capitalize(category)}`;
  const reviewCountKey = `reviewCountBy${capitalize(category)}`;
  return {
    [scoreKey]: scoresByCategory,
    [recommendsKey]: recommendsByCategory,
    [reviewCountKey]: reviewCountByCategory
  };
};

const getScoreTimeseries = combinedJson => {
  const submissionData = {};
  const lastEditData = {};

  combinedJson.map(row => {
    const { submitTime, lastUpdateTime, scores } = row;

    var submitDate = submitTime.split(' ')[0];
    var lastEditDate = lastUpdateTime.split(' ')[0];

    if (!submissionData[submitDate]) {
      submissionData[submitDate] = { totalScore: 0, count: 0 };
    }
    if (!lastEditData[lastEditDate]) {
      lastEditData[lastEditDate] = { totalScore: 0, count: 0 };
    }

    var newSubScore = submissionData[submitDate].totalScore + (scores.overallEvaluation * scores.confidence);
    var newSubCount = submissionData[submitDate].count + 1;
    var newEditScore = lastEditData[lastEditDate].totalScore + (scores.overallEvaluation * scores.confidence);
    var newEditCount = lastEditData[lastEditDate].count + 1;

    submissionData[submitDate].totalScore = newSubScore;
    submissionData[submitDate].count = newSubCount;
    lastEditData[lastEditDate].totalScore = newEditScore;
    lastEditData[lastEditDate].count = newEditCount;
  });

  const timeList = [];
  const lastEditList = [];
  util.getSortedArrayFromMapUsingKey(submissionData).map(row => {
    timeList.push({ x: row[0], y: row[1].totalScore / row[1].count });
  }
  );
  util.getSortedArrayFromMapUsingKey(lastEditData).map(row => {
    lastEditList.push({ x: row[0], y: row[1].totalScore / row[1].count });
  }
  );

  return { timeSeriesByScore: timeList, lastEditSeriesByScore: lastEditList };
};

const getScoreDistribution = combinedJson => {
// Idea: from -3 to 3 (min to max scores possible), every 0.25 will be a gap
  let acceptedScoreDistributionCounts = fillRange(-3, 3, 0.25);
  let acceptedRecommendDistributionCounts = fillRange(0, 1, 0.1);
  let rejectedScoreDistributionCounts = fillRange(-3, 3, 0.25);
  let rejectedRecommendDistributionCounts = fillRange(0, 1, 0.1);

  const scoreDistributionLabels = [];
  const recommendDistributionLabels = [];

  for (let i = 0; i < acceptedScoreDistributionCounts.length - 1; i++) {
    scoreDistributionLabels[i] = acceptedScoreDistributionCounts[i].toFixed(2) + ' ~ ' + acceptedScoreDistributionCounts[i + 1].toFixed(2);
  }
  for (let i = 0; i < acceptedRecommendDistributionCounts.length - 1; i++) {
    recommendDistributionLabels[i] = acceptedRecommendDistributionCounts[i].toFixed(1) + ' ~ ' + acceptedRecommendDistributionCounts[i + 1].toFixed(1);
  }

  acceptedScoreDistributionCounts = setArrayValuesToZero(acceptedScoreDistributionCounts);
  acceptedRecommendDistributionCounts = setArrayValuesToZero(acceptedRecommendDistributionCounts);
  rejectedScoreDistributionCounts = setArrayValuesToZero(rejectedScoreDistributionCounts);
  rejectedRecommendDistributionCounts = setArrayValuesToZero(rejectedRecommendDistributionCounts);

  const acceptedConfidenceList = [];
  const acceptedRecommendList = [];
  const acceptedScoreList = [];
  const rejectedConfidenceList = [];
  const rejectedRecommendList = [];
  const rejectedScoreList = [];
  const reviewsGroupBySubmissionId = _.mapValues(_.groupBy(combinedJson, 'submissionId'));

  var acceptedMinScore = 3;
  var rejectedMaxScore = 0;

  for (const submissionId in reviewsGroupBySubmissionId) {
    const acceptedScores = [];
    const acceptedConfidences = [];
    const acceptedRecommends = [];
    const acceptedWeightedScores = [];
    const acceptedWeightedRecommends = [];
    const rejectedScores = [];
    const rejectedConfidences = [];
    const rejectedRecommends = [];
    const rejectedWeightedScores = [];
    const rejectedWeightedRecommends = [];

    reviewsGroupBySubmissionId[submissionId].map(review => {
    // overall evaluation || reviewer's confidence || Recommend for best paper
    // Sample: Overall evaluation: -3\nReviewer's confidence: 5\nRecommend for best paper: no
      const { overallEvaluation, confidence, recommendForBestPaper } = review.scores;
      const recommendedScore = recommendForBestPaper ? 1 : 0;

      if (review.decision === 'accept') {
        acceptedScores.push(overallEvaluation);
        acceptedConfidences.push(confidence);
        acceptedRecommends.push(recommendedScore);
        acceptedWeightedScores.push(overallEvaluation * confidence);
        acceptedWeightedRecommends.push(recommendedScore * confidence);
      } else {
        rejectedScores.push(overallEvaluation);
        rejectedConfidences.push(confidence);
        rejectedRecommends.push(recommendedScore);
        rejectedWeightedScores.push(overallEvaluation * confidence);
        rejectedWeightedRecommends.push(recommendedScore * confidence);
      }
    });

    if (acceptedScores.length > 0) {
      const acceptedConfidenceSum = acceptedConfidences.reduce(sum);
      acceptedConfidenceList.push(acceptedConfidenceSum / acceptedConfidences.length);

      const totalAcceptedWeightedScore = acceptedWeightedScores.reduce(sum) / acceptedConfidenceSum;
      const totalAcceptedWeightedRecommend = acceptedWeightedRecommends.reduce(sum) / acceptedConfidenceSum;
      acceptedScoreList.push(totalAcceptedWeightedScore);
      acceptedRecommendList.push(totalAcceptedWeightedRecommend);

      // 0 based index, but answer is 1 based
      const acceptedScoreColumn = Math.max(Math.ceil((totalAcceptedWeightedScore + 3) / 0.25) - 1, 0);
      const acceptedRecommendColumn = Math.max(Math.ceil((totalAcceptedWeightedRecommend) / 0.1) - 1, 0);
      acceptedScoreDistributionCounts[acceptedScoreColumn] += 1;
      acceptedRecommendDistributionCounts[acceptedRecommendColumn] += 1;

      acceptedMinScore = Math.min(totalAcceptedWeightedScore, acceptedMinScore);
    }

    if (rejectedScores.length > 0) {
      const rejectedConfidenceSum = rejectedConfidences.reduce(sum);
      rejectedConfidenceList.push(rejectedConfidenceSum / rejectedConfidences.length);

      const totalRejectedWeightedScore = rejectedWeightedScores.reduce(sum) / rejectedConfidenceSum;
      const totalRejectedWeightedRecommend = rejectedWeightedRecommends.reduce(sum) / rejectedConfidenceSum;
      rejectedScoreList.push(totalRejectedWeightedScore);
      rejectedRecommendList.push(totalRejectedWeightedRecommend);

      // 0 based index, but answer is 1 based
      const rejectedScoreColumn = Math.max(Math.ceil((totalRejectedWeightedScore + 3) / 0.25) - 1, 0);
      const rejectedRecommendColumn = Math.max(Math.ceil((totalRejectedWeightedRecommend) / 0.1) - 1, 0);
      rejectedScoreDistributionCounts[rejectedScoreColumn] += 1;
      rejectedRecommendDistributionCounts[rejectedRecommendColumn] += 1;

      rejectedMaxScore = Math.max(totalRejectedWeightedScore, rejectedMaxScore);
    }
  }
  return {
    acceptedMeanScore: acceptedScoreList.reduce(sum) / acceptedScoreList.length,
    acceptedMeanConfidence: acceptedConfidenceList.reduce(sum) / acceptedConfidenceList.length,
    acceptedMeanRecommend: acceptedRecommendList.reduce(sum) / acceptedRecommendList.length,
    rejectedMeanScore: rejectedScoreList.reduce(sum) / rejectedScoreList.length,
    rejectedMeanConfidence: rejectedConfidenceList.reduce(sum) / rejectedConfidenceList.length,
    rejectedMeanRecommend: rejectedRecommendList.reduce(sum) / rejectedRecommendList.length,
    acceptedMinScore,
    rejectedMaxScore,
    acceptedScoreDistribution: { labels: scoreDistributionLabels, counts: acceptedScoreDistributionCounts },
    acceptedRecommendDistribution: { labels: recommendDistributionLabels, counts: acceptedRecommendDistributionCounts },
    rejectedScoreDistribution: { labels: scoreDistributionLabels, counts: rejectedScoreDistributionCounts },
    rejectedRecommendDistribution: { labels: recommendDistributionLabels, counts: rejectedRecommendDistributionCounts }
  };
};

const getAuthorReviewInfo = combinedJson => {
  // topAuthorsbyScore
  // topCountriesByScore
  // topOrganizationsByScore
  // mostRecommendedSubmission
  // mostRecommendedAuthor
  const { scoresByName, recommendsByName } = getScoresAndRecommendsByCategory(combinedJson, 'name');
  const { scoresByCountry, recommendsByCountry } = getScoresAndRecommendsByCategory(combinedJson, 'country');
  const { scoresByOrganisation, recommendsByOrganisation } = getScoresAndRecommendsByCategory(combinedJson, 'organisation');

  const parsedResult = {
    scoresByName,
    recommendsByName,
    scoresByCountry,
    recommendsByCountry,
    scoresByOrganisation,
    recommendsByOrganisation
  };

  return { infoType: 'author_review', infoData: parsedResult, timeProcessed: new Date(), fileName: 'author_review' };
};

export default {
  getAuthorInfo,
  getReviewInfo,
  getSubmissionInfo,
  getAuthorSubmissionInfo,
  getReviewSubmissionInfo,
  getAuthorReviewInfo
};

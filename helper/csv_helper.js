import Papa from 'papaparse';
import moment from 'moment';
import _ from 'lodash';
const papaConfig = {
  header: true,
  dynamicTyping: true,
  trimHeaders: true,
  skipEmptyLines: true
};

const getAuthorInfo = file => {
  // author.csv: header row, author names with affiliations, countries, emails
  // data format:
  // submission ID | f name | s name | email | country | affiliation | page | person ID | corresponding?
  // replace first line with a nicer header for objects
  let content = file.buffer.toString('utf8');
  content =
    'submissionId, firstName, lastName, email, country, affiliation, page, personId, corresponding\r' +
    content.substring(content.indexOf('\r') + 1);
  const parsedContent = Papa.parse(content, papaConfig);

  if (parsedContent.errors) {
    // error handling
    // return false;
  }

  const authorList = [];
  const authors = [];
  const countries = [];
  const affiliations = [];
  parsedContent.data.map(row => {
    const { firstName, lastName, country, affiliation } = row;
    const name = firstName + ' ' + lastName;
    authorList.push({ name, country, affiliation });
    authors.push(name);
    countries.push(country);
    affiliations.push(affiliation);
  });

  const authorCounts = _.countBy(authors);
  const countryCounts = _.countBy(countries);
  const affiliationCounts = _.countBy(affiliations);

  const sortableAuthor = [];
  for (const author in authorCounts) {
    sortableAuthor.push([author, authorCounts[author]]);
  }
  sortableAuthor.sort((a, b) => b[1] - a[1]);

  const authorLabels = [];
  const authorData = [];
  sortableAuthor.map(x => {
    authorLabels.push(x[0]);
    authorData.push(x[1]);
  });

  const sortableCountry = [];
  for (const country in countryCounts) {
    sortableCountry.push([country, countryCounts[country]]);
  }
  sortableCountry.sort((a, b) => b[1] - a[1]);

  const countryLabels = [];
  const countryData = [];
  sortableCountry.map(x => {
    countryLabels.push(x[0]);
    countryData.push(x[1]);
  });

  const sortableAffiliation = [];
  for (const affiliation in affiliationCounts) {
    sortableAffiliation.push([affiliation, affiliationCounts[affiliation]]);
  }
  sortableAffiliation.sort((a, b) => b[1] - a[1]);

  const affiliationLabels = [];
  const affiliationData = [];
  sortableAffiliation.map(x => {
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
  Papa.parse(file.buffer.toString('utf8'));
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
  if (parsedContent.errors) {
    // error handling
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
    if (row.decision === 'rejected') {
      rejectedSubs.push(row);
      rejectedKeywords.push(...row.keywords.split(/[\r\n]+/));
    } else {
      acceptedSubs.push(row);
      acceptedKeywords.push(...row.keywords.split(/[\r\n]+/));
      acceptedAuthorNames.push(row.firstName + ' ' + row.lastName);
    }
    allKeywords.push(...row.keywords.split(/[\r\n]+/));
    trackNames.push(row.trackName);
    submissionTimes.push(moment(row.submitTime).format('ll'));
    lastUpdateTimes.push(moment(row.lastUpdateTime).format('ll'));
  });

  submissionTimes.sort();
  lastUpdateTimes.sort();

  // timeseries todo
  const timeSeries = {};
  const lastEditSeries = {};

  const sortableAuthorNames = [];
  const acceptedAuthorCount = _.countBy(acceptedAuthorNames);
  for (const author in acceptedAuthorCount) {
    sortableAuthorNames.push([author, acceptedAuthorCount[author]]);
  }
  sortableAuthorNames.sort((a, b) => b[1] - a[1]);

  const authorNames = [];
  const authorCounts = [];
  sortableAuthorNames.map(x => {
    authorNames.push(x[0]);
    authorCounts.push(x[1]);
  });

  const topAcceptedAuthorsMap = {
    names: authorNames,
    counts: authorCounts
  };

  const acceptedKeywordMap = _.countBy(acceptedKeywords);
  const rejectedKeywordMap = _.countBy(rejectedKeywords);
  const allKeywordMap = _.countBy(allKeywords);

  const acceptedKeywordList = [];
  for (const keyword in acceptedKeywordMap) {
    acceptedKeywordList.push([keyword, acceptedKeywordMap[keyword]]);
  }
  acceptedKeywordList.sort((a, b) => b[1] - a[1]);

  const rejectedKeywordList = [];
  for (const keyword in rejectedKeywordMap) {
    rejectedKeywordList.push([keyword, rejectedKeywordMap[keyword]]);
  }
  rejectedKeywordList.sort((a, b) => b[1] - a[1]);

  const allKeywordList = [];
  for (const keyword in allKeywordMap) {
    allKeywordList.push([keyword, allKeywordMap[keyword]]);
  }
  allKeywordList.sort((a, b) => b[1] - a[1]);

  const acceptanceRate = acceptedSubs.length / parsedContent.data.length;
  const subTimeCounts = _.countBy(submissionTimes);
  const updateTimeCounts = _.countBy(lastUpdateTimes);

  const sortableSubTimes = [];
  for (const submissionTime in subTimeCounts) {
    sortableSubTimes.push([submissionTime, subTimeCounts[submissionTime]]);
  }
  sortableSubTimes.sort((a, b) => b[1] - a[1]);

  const sortableUpdateTimes = [];
  for (const updateTime in updateTimeCounts) {
    sortableUpdateTimes.push([updateTime, updateTimeCounts[updateTime]]);
  }
  sortableUpdateTimes.sort((a, b) => b[1] - a[1]);
  const paperGroupByTrackName = _.groupBy(parsedContent.data, 'trackName');

  const comparableAcceptanceRate = {
    year: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018],
    'Full Papers': [0.29, 0.28, 0.27, 0.29, 0.29, 0.30, 0.29, 0.30],
    'Short Papers': [0.29, 0.37, 0.31, 0.31, 0.32, 0.50, 0.35, 0.32]
  };

  const groupedKeywords = [];
  const acceptanceRateByTrack = [];
  const topAuthorsByTrack = {};
  for (const paperGroup in paperGroupByTrackName) {
    const acceptedPapersThisTrack = [];
    const acceptedAuthorsThisTrack = [];

    paperGroupByTrackName[paperGroup].map(row => {
      groupedKeywords.push(...row.keywords.split(/[\r\n]+/));
      if (row.decision === 'accepted') {
        acceptedPapersThisTrack.push(row);
        acceptedAuthorsThisTrack.push(row.firstName + ' ' + row.lastName);
      }
    });
    const acceptedAuthorsThisTrackCount = _.countBy(acceptedAuthorsThisTrack);
    const sortableAcceptedAuthorsThisTrack = [];
    for (const acceptedAuthor in acceptedAuthorsThisTrackCount) {
      sortableAcceptedAuthorsThisTrack.push([acceptedAuthor, acceptedAuthorsThisTrackCount[acceptedAuthor]]);
    }
    sortableAcceptedAuthorsThisTrack.sort((a, b) => b[1] - a[1]);
    const authorNamesThisTrack = [];
    const authorCountsThisTrack = [];
    sortableAcceptedAuthorsThisTrack.map(x => {
      authorNamesThisTrack.push(x[0]);
      authorCountsThisTrack.push(x[1]);
    });

    topAuthorsByTrack[paperGroup] = {
      names: authorNamesThisTrack,
      counts: authorCountsThisTrack
    };

    acceptanceRateByTrack[paperGroup] = acceptedPapersThisTrack / paperGroupByTrackName[paperGroup].length;

    if (paperGroup === 'Full Papers' || paperGroup === 'Short Papers') {
      comparableAcceptanceRate[paperGroup].push(acceptedPapersThisTrack / paperGroupByTrackName[paperGroup].length);
    }
  }
  const keywordsGroupByTrack = _.countBy(groupedKeywords);

  const parsedResult = {
    acceptanceRate,
    allKeywordMap,
    allKeywordList,
    acceptedKeywordMap,
    acceptedKeywordList,
    rejectedKeywordMap,
    rejectedKeywordList,
    keywordsGroupByTrack,
    acceptanceRateByTrack,
    topAcceptedAuthorsMap,
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

import Papa from 'papaparse';

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
 * @property {string} organisation The organization the author belongs to
 * @property {string} page The web page of the author
 * @property {number} personId The unique id assigned to the author
 * @property {boolean} corresponding Whether the author is corresponding author for the paper
 */

/**
 * Generates json containing a list of author objects from the given file (assumed to follow author.csv structure)
 * @param {*} file
 * @returns {Object} an object with key-value pairs of { authors : author[], uploadDateTime, fileName }
 * @returns {Object} an object with error property if parse fails
 */
const parseAuthor = (file, fileName) => {
  // author.csv: header row, author names with organisations, countries, emails
  // data format:
  // submission ID | f name | s name | email | country | organisation | page | person ID | corresponding?
  // replace first line with a nicer header for objects
  let content = file.buffer.toString('utf8');
  content =
    'submissionId, firstName, lastName, email, country, organisation, page, personId, corresponding\r' +
    content.substring(content.indexOf('\r') + 1);
  content = content.replace(new RegExp(/(", )|(," )/g), ', ');
  content = content.replace(new RegExp(/(", )/g), ', ');
  const parsedContent = Papa.parse(content, papaConfig);

  if (parsedContent.errors.length !== 0) {
    // error handling
    return { error: true };
  }

  // eslint-disable-next-line
  parsedContent.data.map(author => author.corresponding = author.corresponding === 'yes');

  const formattedAuthorContent = {};
  parsedContent.data.forEach(author => {
    const { submissionId, firstName, lastName, email, country, organisation, page, personId, corresponding } = author;
    // already exists
    if (formattedAuthorContent[personId]) {
      formattedAuthorContent[personId].submissions.push({ submissionId, organisation, email, corresponding });
    } else {
      formattedAuthorContent[personId] = {
        firstName,
        lastName,
        country,
        page,
        personId,
        submissions: [{ submissionId, organisation, email, corresponding }]
      };
    }
  });

  return {
    authors: formattedAuthorContent,
    fileName: fileName || 'author.csv'
  };
};

/**
 * @typedef {Object} review
 * @property {number} reviewId The id of the review
 * @property {number} submissionId The submission id of that the review is reviewing
 * @property {number} reviewerId The id of the reviewer
 * @property {string} reviewerName The name of the reviewer
 * @property {number} expertiseLevel The expertise level of the reviewer -- 5: expert, 1: passing knowledge
 * @property {string} reviewComments The comments left by the reviewer
 * @property {Object} scores The review scores
 * @property {number} overallScore The overall score of the review
 * @property {string} date The date of the review
 * @property {string} time The time of the review
 * @property {bool} isRecommended true if the paper is recommended, false if not
 */
/**
 * Generates a json containing list of review objects from the given file (assumed to follow review.csv structure)
 * @param {*} file
 * @returns {Object} an object with key-value pairs of { reviews : review[], uploadDateTime, fileName }
 * @returns {Object} an object with error property if parse fails
 */
const parseReview = (file, fileName) => {
  // review.csv
  // data format:
  // review ID | paper ID? | reviewer ID | reviewer name | unknown | text | scores | overall score | unknown | unknown | unknown | unknown | date | time | recommend?
  // File has NO header
  const content = 'reviewId, submissionId, reviewerId, reviewerName, expertiseLevel, reviewComments, scores, overallScore, unknown, unknown, unknown, unknown, date, time, isRecommended\n' +
    (file.buffer.toString('utf8'));
  const parsedContent = Papa.parse(content, papaConfig);
  if (parsedContent.errors.length !== 0) {
    // error handling
    return { error: true };
  }

  const formattedContent = {};

  parsedContent.data.forEach(review => {
    const { reviewId, submissionId, reviewerId, reviewerName, expertiseLevel, reviewComments, scores, overallScore, date, time } = review;
    const evaluation = scores.split(/[\r\n]+/);
    const recommendForBestPaper = evaluation.length > 2 && evaluation[2].split(': ')[1] === 'yes';
    const scoreObject = {
      overallEvaluation: parseInt(evaluation[0].split(': ')[1]),
      confidence: parseInt(evaluation[1].split(': ')[1]),
      recommendForBestPaper
    };
    formattedContent[reviewId] = {
      reviewId,
      submissionId,
      reviewerId,
      reviewerName,
      expertiseLevel,
      reviewComments,
      scores: scoreObject,
      overallScore,
      date,
      time,
      isRecommended: scoreObject.recommendForBestPaper
    };
  });

  return {
    reviews: formattedContent,
    fileName: fileName || 'review.csv'
  };
};

/**
 * @typedef {Object} submission
 * @property {number} submissionId The id of the submission
 * @property {number} trackId The track id of the submission
 * @property {string} trackName The name of the track
 * @property {string} title The title of the submission
 * @property {string[]} authors An array of the authors of the submission
 * @property {string} submitTime The time the submission was submitted
 * @property {string} lastUpdateTime The last updated time of the submission
 * @property {string[]} keywords An array of the keywords of the submission
 * @property {string} decision Can be "accept", "reject", or "no decision"
 * @property {boolean} isNotified Whether the acceptance/rejection mail were sent to authors
 * @property {boolean} isReviewSent Whether the review was sent in the mails
 * @property {string} abstract The abstract of the submission
 */

/**
 * Generates a json containing a list of submission objects from the given file (assumed to follow submission.csv structure)
 * @param {*} file
 * @returns {Object} an object with key-value pairs of { submissions : submission[], uploadDateTime, fileName }
 * @returns {Object} an object with error property if parse fails
 */
const parseSubmission = (file, fileName) => {
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
    return { error: true };
  }

  const formattedData = {};

  parsedContent.data.forEach(submission => {
    const { submissionId, trackId, trackName, title, authors, submitTime, lastUpdateTime, keywords, decision, notified, reviewsSent, abstract } = submission;

    const authorList = authors.replace(' and ', ',').split(',').map(x => x.trim());
    const keywordList = keywords.split(/[\r\n]+/).map(x => x.toLowerCase());

    formattedData[submissionId] = {
      submissionId,
      trackId,
      trackName,
      title,
      authors: authorList,
      submitTime,
      lastUpdateTime,
      keywords: keywordList,
      decision,
      isNotified: notified === 'yes',
      isReviewSent: reviewsSent === 'yes',
      abstract
    };
  });
  return {
    submissions: formattedData,
    fileName: fileName || 'submission.csv'
  };
};

export default {
  parseAuthor,
  parseSubmission,
  parseReview
};

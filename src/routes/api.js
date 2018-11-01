import express from 'express';
import multer from 'multer';

import csvHelper from '../helper/csv_helper';
import jsonHelper from '../helper/json_helper';

let router = express.Router();
let upload = multer();

router.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Connected, welcome to the backend server for ChairVise' });
});

router.post('/upload', upload.array('file'), (req, res) => {
  let result = [];

  const csvFiles = req.files;
  const { fileTypes, hasHeaders, firstLines } = req.body;
  csvFiles.map((csvFile, index) => {
    const fileName = csvFile.originalname;

    if (fileTypes && index < fileTypes.length) {
      switch (fileTypes[index]) {
        case 'review':
          result.push(jsonHelper.getReviewInfo(csvHelper.parseReview(csvFile, fileName, firstLines[index], hasHeaders[index])));
          break;
        case 'author':
          result.push(jsonHelper.getAuthorInfo(csvHelper.parseAuthor(csvFile, fileName, firstLines[index], hasHeaders[index])));
          break;
        case 'submission':
          result.push(jsonHelper.getSubmissionInfo(csvHelper.parseSubmission(csvFile, fileName, firstLines[index], hasHeaders[index])));
          break;
        default:
          res.sendStatus(422); // unknown file, no api to process
      }
    } else {
      console.log('went here');

      switch (fileName) {
        case 'review.csv':
          result.push(jsonHelper.getReviewInfo(csvHelper.parseReview(csvFile, fileName, firstLines[0], hasHeaders[0])));
          break;
        case 'author.csv':
          result.push(jsonHelper.getAuthorInfo(csvHelper.parseAuthor(csvFile, fileName, firstLines[0], hasHeaders[0])));
          break;
        case 'submission.csv':
          result.push(jsonHelper.getSubmissionInfo(csvHelper.parseSubmission(csvFile, fileName, firstLines[0], hasHeaders[0])));
          break;
        default:
          res.sendStatus(422); // unknown file, no api to process
      }
    }
  });

  let hasError = false;
  result.map(element => {
    if (element.error && !hasError) hasError = true;
  });

  hasError ? res.sendStatus(422) : res.status(200).json(result);
});

router.post('/uploadv2', upload.array('file'), (req, res) => {
  let result = [];
  const csvFiles = req.files;
  const { fileType } = req.body;

  csvFiles.map((csvFile, index) => {
    const fileName = csvFile.originalname;
    if (fileType && index < fileType.length) {
      switch (fileType[index]) {
        case 'review':
          result.push(csvHelper.parseReview(csvFile, fileName));
          break;
        case 'author':
          result.push(csvHelper.parseAuthor(csvFile, fileName));
          break;
        case 'submission':
          result.push(csvHelper.parseSubmission(csvFile, fileName));
          break;
        default:
          res.sendStatus(422); // unknown file, no api to process
      }
    } else {
      switch (fileName) {
        case 'review.csv':
          result.push(csvHelper.parseReview(csvFile, fileName));
          break;
        case 'author.csv':
          result.push(csvHelper.parseAuthor(csvFile, fileName));
          break;
        case 'submission.csv':
          result.push(csvHelper.parseSubmission(csvFile, fileName));
          break;
        default:
          res.sendStatus(422); // unknown file, no api to process
      }
    }
  });

  let hasError = false;
  result.map(element => {
    if (element.error && !hasError) hasError = true;
  });

  hasError ? res.sendStatus(422) : res.status(200).json(result);
});

const PROCESS_TYPES = {
  ALL_AUTHORS: 'all_authors',
  ALL_REVIEWS: 'all_reviews',
  ALL_SUBMISSIONS: 'all_submissions',
  REVIEW_SUBMISSION: 'review_submission',
  AUTHOR_REVIEW: 'author_review',
  AUTHOR_SUBMISSION: 'author_submission'
};

router.post('/process/:type', (req, res) => {
  const data = req.body;
  const { type } = req.params;
  console.log(req.params);
  let result = null;
  switch (type) {
    case PROCESS_TYPES.ALL_AUTHORS:
      result = jsonHelper.getAuthorInfo(data);
      break;
    case PROCESS_TYPES.ALL_REVIEWS:
      result = jsonHelper.getReviewInfo(data);
      break;
    case PROCESS_TYPES.ALL_SUBMISSIONS:
      result = jsonHelper.getSubmissionInfo(data);
      break;
    case PROCESS_TYPES.AUTHOR_SUBMISSION:
      result = jsonHelper.getAuthorSubmissionInfo(data);
      break;
    case PROCESS_TYPES.REVIEW_SUBMISSION:
      result = jsonHelper.getReviewSubmissionInfo(data);
      break;
    case PROCESS_TYPES.AUTHOR_REVIEW:
      result = jsonHelper.getAuthorReviewInfo(data);
      break;
    default:
      res.sendStatus(422); // unknown file, no api to process
  }

  if (result.error) {
    res.sendStatus(422); // unknown file, no api to process
  } else {
    res.status(200).json(result);
  }
});

export default router;

import express from 'express';
import multer from 'multer';

import csvHelper from '../helper/csv_helper';
import jsonHelper from '../helper/json_helper';

let router = express.Router();
let upload = multer();

router.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Connected, welcome to the backend server for ChairVise' });
});

router.post('/upload', upload.single('file'), (req, res) => {
  const csvFile = req.file;
  const fileName = csvFile.originalname;
  const { fileType } = req.body;
  let result = null;

  if (fileType) {
    switch (fileType) {
      case 'review':
        result = jsonHelper.getReviewInfo(csvHelper.parseReview(csvFile, fileName));
        break;
      case 'author':
        result = jsonHelper.getAuthorInfo(csvHelper.parseAuthor(csvFile, fileName));
        break;
      case 'submission':
        result = jsonHelper.getSubmissionInfo(csvHelper.parseSubmission(csvFile, fileName));
        break;
      default:
        res.sendStatus(422); // unknown file, no api to process
    }
  } else {
    switch (fileName) {
      case 'review.csv':
        result = jsonHelper.getReviewInfo(csvHelper.parseReview(csvFile, fileName));
        break;
      case 'author.csv':
        result = jsonHelper.getAuthorInfo(csvHelper.parseAuthor(csvFile, fileName));
        break;
      case 'submission.csv':
        result = jsonHelper.getSubmissionInfo(csvHelper.parseSubmission(csvFile, fileName));
        break;
      default:
        res.sendStatus(422); // unknown file, no api to process
    }
  }
  if (result.error) {
    res.sendStatus(422);
  } else {
    res.status(200).json(result);
  }
});

router.post('/uploadv2', upload.single('file'), (req, res) => {
  const csvFile = req.file;
  const fileName = csvFile.originalname;
  let result = null;
  const { fileType } = req.body;

  if (fileType) {
    switch (fileType) {
      case 'review':
        result = csvHelper.parseReview(csvFile, fileName);
        break;
      case 'author':
        result = csvHelper.parseAuthor(csvFile, fileName);
        break;
      case 'submission':
        result = csvHelper.parseSubmission(csvFile, fileName);
        break;
      default:
        res.sendStatus(422); // unknown file, no api to process
    }
  } else {
    switch (fileName) {
      case 'review.csv':
        result = csvHelper.parseReview(csvFile, fileName);
        break;
      case 'author.csv':
        result = csvHelper.parseAuthor(csvFile, fileName);
        break;
      case 'submission.csv':
        result = csvHelper.parseSubmission(csvFile, fileName);
        break;
      default:
        res.sendStatus(422); // unknown file, no api to process
    }
  }

  if (result.error) {
    res.sendStatus(422);
  } else {
    res.status(200).json(result);
  }
});

const PROCESS_TYPES = {
  ALL_AUTHORS: 'allAuthors',
  ALL_REVIEWS: 'allReviews',
  ALL_SUBMISSIONS: 'allSubmissions',
  REVIEW_SUBMISSION: 'reviewSubmission',
  AUTHOR_REVIEW: 'authorReview',
  AUTHOR_SUBMISSION: 'authorSubmission'
};

router.post('/process/:type', (req, res) => {
  const data = req.body;
  const { type } = req.params;
  let result = null;
  switch (type) {
    case PROCESS_TYPES.ALL_AUTHORS:
      result = jsonHelper.getAuthorInfo(data);
      break;
    case PROCESS_TYPES.ALL_REVIEWS:
      break;
    case PROCESS_TYPES.ALL_SUBMISSIONS:
      break;
    case PROCESS_TYPES.AUTHOR_SUBMISSION:
      break;
    case PROCESS_TYPES.REVIEW_SUBMISSION:
      break;
    case PROCESS_TYPES.AUTHOR_REVIEW:
      break;
    default:
      res.sendStatus(422); // unknown file, no api to process
  }

  res.sendStatus(200).json(result);
});

export default router;

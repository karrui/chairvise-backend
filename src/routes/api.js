import express from 'express';
import multer from 'multer';

import csvHelper from '../helper/csv_helper';

let router = express.Router();
let upload = multer();

router.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Connected, welcome to the backend server for ChairVise' });
});

router.post('/upload', upload.single('file'), (req, res) => {
  const csvFile = req.file;
  const fileName = csvFile.originalname;
  let result = null;

  switch (fileName) {
    case 'review.csv':
      result = csvHelper.getReviewInfo(csvFile);
      break;
    case 'author.csv':
      result = csvHelper.getAuthorInfo(csvFile);
      break;
    case 'submission.csv':
      result = csvHelper.getSubmissionInfo(csvFile);
      break;
    default:
      res.sendStatus(422); // unknown file, no api to process
  }
  res.status(200).json(result);
});

router.post('/uploadv2', upload.single('file'), (req, res) => {
  const csvFile = req.file;
  const fileName = csvFile.originalname;
  let result = null;

  switch (fileName) {
    case 'review.csv':
      result = csvHelper.parseReview(csvFile);
      break;
    case 'author.csv':
      result = csvHelper.parseAuthor(csvFile);
      break;
    case 'submission.csv':
      result = csvHelper.parseSubmission(csvFile);
      break;
    default:
      res.sendStatus(422); // unknown file, no api to process
  }
  res.status(200).json(result);
});

export default router;

import express from 'express';
import multer from 'multer';

import csvHelper from '../helper/csv_helper';

let router = express.Router();
let upload = multer();

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

export default router;

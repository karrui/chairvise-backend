import express from 'express';
let router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Connected!' });
});

export default router;

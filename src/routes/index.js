import express from 'express';
let router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Connected, welcome to the backend server for ChairVise' });
});

export default router;

import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';

import indexRouter from './routes/index';
import apiRouter from './routes/api';

let app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/api', apiRouter);

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

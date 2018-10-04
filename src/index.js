import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';

import indexRouter from './routes';
import apiRouter from './routes/api';

let app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/api', apiRouter);

app.listen(process.env.PORT || 3000, () =>
  console.log(`App is currently listening on port ${process.env.PORT ? process.env.PORT : 3000}!`));

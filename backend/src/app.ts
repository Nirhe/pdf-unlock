import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import docsRouter from './routes/docs.routes';
import emailRouter from './routes/email.routes';
import quickBooksRouter from './routes/qb.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/docs', docsRouter);
app.use('/api/email', emailRouter);
app.use('/api/qb', quickBooksRouter);

export default app;
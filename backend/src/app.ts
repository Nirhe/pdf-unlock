import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './swagger';

import docsRouter from './routes/docs.routes';
import emailRouter from './routes/email.routes';
import quickBooksRouter from './routes/qb.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Extra request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ct = req.headers['content-type'] ?? '';
  // eslint-disable-next-line no-console
  console.log(`[REQ] ${req.method} ${req.originalUrl} ct=${ct}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));
app.get('/swagger.json', (_req: Request, res: Response) => {
  res.json(openapiSpec);
});

app.use('/api/docs', docsRouter);
app.use('/api/email', emailRouter);
app.use('/api/qb', quickBooksRouter);

// Catch-all 404 logger
app.use((req: Request, res: Response) => {
  // eslint-disable-next-line no-console
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not found',
    method: req.method,
    path: req.originalUrl,
    hint: 'Verify the path and server base URL in Swagger. Expected prefixes: /api/docs, /api/email, /api/qb.',
  });
});

export default app;
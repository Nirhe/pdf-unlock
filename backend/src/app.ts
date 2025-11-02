import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './swagger';

import docsRouter from './routes/docs.routes';
import emailRouter from './routes/email.routes';
import quickBooksRouter from './routes/qb.routes';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://pdf-unlock.vercel.app',
  'https://www.pdf-unlock.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const normalizeOrigin = (origin: string): string => {
  const trimmed = origin.trim().replace(/\/+$/, '');
  const match = /^(https?:\/\/)([^/]+)$/i.exec(trimmed);

  if (!match) {
    return trimmed.toLowerCase();
  }

  const protocolRaw = match[1];
  const hostRaw = match[2];
  if (!protocolRaw || !hostRaw) {
    return trimmed.toLowerCase();
  }

  const protocol = protocolRaw.toLowerCase();
  let host = hostRaw.toLowerCase();

  if (protocol === 'https://' && host.endsWith(':443')) {
    host = host.slice(0, -4);
  } else if (protocol === 'http://' && host.endsWith(':80')) {
    host = host.slice(0, -3);
  }

  return `${protocol}${host}`;
};

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const origins = raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (origins.length === 0) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return Array.from(new Set(origins));
};

const allowedOrigins = parseAllowedOrigins().map(normalizeOrigin);

type OriginCallback = (err: Error | null, allow?: boolean) => void;

const corsOptions = {
  origin(origin: string | undefined, callback: OriginCallback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    const isAllowed = allowedOrigins.includes(normalized) || allowedOrigins.includes('*');
    if (!isAllowed) {
      // eslint-disable-next-line no-console
      console.warn(`[CORS] Blocked origin ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
    }

    callback(null, isAllowed);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
};

const app = express();

// Middleware
const corsMiddleware = cors(corsOptions);
app.use(corsMiddleware);
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});
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
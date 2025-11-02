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
const allowedOriginSet = new Set(allowedOrigins);

type OriginCallback = (err: Error | null, allow?: boolean) => void;

const ensureHeaderIncludes = (res: Response, headerName: string, value: string) => {
  const existing = res.getHeader(headerName);
  if (!existing) {
    res.setHeader(headerName, value);
    return;
  }

  const normalizedValue = value.toLowerCase();
  const values: string[] = Array.isArray(existing)
    ? existing.map((entry: string) => entry.trim()).filter((entry: string) => entry.length > 0)
    : existing
        .toString()
        .split(',')
        .map((entry: string) => entry.trim())
        .filter((entry: string) => entry.length > 0);

  if (values.some((entry) => entry.toLowerCase() === normalizedValue)) {
    return;
  }

  values.push(value);
  res.setHeader(headerName, values.join(', '));
};

const ensureVaryIncludesOrigin = (res: Response) => {
  const existing = res.getHeader('Vary');
  if (!existing) {
    res.setHeader('Vary', 'Origin');
    return;
  }

  if (Array.isArray(existing)) {
    if (!existing.includes('Origin')) {
      res.setHeader('Vary', [...existing, 'Origin']);
    }
    return;
  }

  const parts = existing
    .toString()
    .split(',')
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0);

  if (!parts.includes('Origin')) {
    parts.push('Origin');
    res.setHeader('Vary', parts.join(', '));
  }
};

const ALLOWED_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'] as const;
const ALLOWED_METHODS_HEADER = ALLOWED_METHODS.join(', ');

const isAllowedOrigin = (normalizedOrigin: string): boolean =>
  allowedOriginSet.has('*') || allowedOriginSet.has(normalizedOrigin);

const applyCorsHeaders = (req: Request, res: Response): boolean => {
  const originHeader = req.headers.origin;
  if (!originHeader) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(originHeader);
  const allowed = isAllowedOrigin(normalizedOrigin);

  if (!allowed) {
    // eslint-disable-next-line no-console
    console.warn(
      `[CORS] Blocked origin ${originHeader}. Allowed origins: ${Array.from(allowedOriginSet).join(', ')}`,
    );
    return false;
  }

  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', originHeader);
  }

  ensureVaryIncludesOrigin(res);
  ensureHeaderIncludes(res, 'Access-Control-Expose-Headers', 'Content-Disposition');

  if (!res.getHeader('Access-Control-Allow-Methods')) {
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS_HEADER);
  }

  const requestHeaders = req.headers['access-control-request-headers'];
  if (requestHeaders && !res.getHeader('Access-Control-Allow-Headers')) {
    res.setHeader(
      'Access-Control-Allow-Headers',
      Array.isArray(requestHeaders) ? requestHeaders.join(', ') : requestHeaders,
    );
  }

  return true;
};

const corsOptions = {
  origin(origin: string | undefined, callback: OriginCallback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    callback(null, isAllowedOrigin(normalized));
  },
  methods: ALLOWED_METHODS,
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
  preflightContinue: true,
};

const app = express();

// Middleware
const corsMiddleware = cors(corsOptions);
app.use(corsMiddleware);
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowed = applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    const status = allowed || !req.headers.origin ? 204 : 403;
    res.status(status).end();
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

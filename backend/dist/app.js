"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
const docs_routes_1 = __importDefault(require("./routes/docs.routes"));
const email_routes_1 = __importDefault(require("./routes/email.routes"));
const qb_routes_1 = __importDefault(require("./routes/qb.routes"));
const DEFAULT_ALLOWED_ORIGINS = [
    'https://pdf-unlock.vercel.app',
    'https://www.pdf-unlock.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];
const normalizeOrigin = (origin) => {
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
    }
    else if (protocol === 'http://' && host.endsWith(':80')) {
        host = host.slice(0, -3);
    }
    return `${protocol}${host}`;
};
const parseAllowedOrigins = () => {
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
const ensureHeaderIncludes = (res, headerName, value) => {
    const existing = res.getHeader(headerName);
    if (!existing) {
        res.setHeader(headerName, value);
        return;
    }
    const normalizedValue = value.toLowerCase();
    const values = Array.isArray(existing)
        ? existing.map((entry) => entry.trim()).filter((entry) => entry.length > 0)
        : existing
            .toString()
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    if (values.some((entry) => entry.toLowerCase() === normalizedValue)) {
        return;
    }
    values.push(value);
    res.setHeader(headerName, values.join(', '));
};
const ensureVaryIncludesOrigin = (res) => {
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
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (!parts.includes('Origin')) {
        parts.push('Origin');
        res.setHeader('Vary', parts.join(', '));
    }
};
const ALLOWED_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];
const ALLOWED_METHODS_HEADER = ALLOWED_METHODS.join(', ');
const isAllowedOrigin = (normalizedOrigin) => allowedOriginSet.has('*') || allowedOriginSet.has(normalizedOrigin);
const applyCorsHeaders = (req, res) => {
    const originHeader = req.headers.origin;
    if (!originHeader) {
        return false;
    }
    const normalizedOrigin = normalizeOrigin(originHeader);
    const allowed = isAllowedOrigin(normalizedOrigin);
    if (!allowed) {
        // eslint-disable-next-line no-console
        console.warn(`[CORS] Blocked origin ${originHeader}. Allowed origins: ${Array.from(allowedOriginSet).join(', ')}`);
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
        res.setHeader('Access-Control-Allow-Headers', Array.isArray(requestHeaders) ? requestHeaders.join(', ') : requestHeaders);
    }
    return true;
};
const corsOptions = {
    origin(origin, callback) {
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
const app = (0, express_1.default)();
// Middleware
const corsMiddleware = (0, cors_1.default)(corsOptions);
app.use(corsMiddleware);
app.use((req, res, next) => {
    const allowed = applyCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
        const status = allowed || !req.headers.origin ? 204 : 403;
        res.status(status).end();
        return;
    }
    next();
});
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Extra request logger
app.use((req, _res, next) => {
    const ct = req.headers['content-type'] ?? '';
    // eslint-disable-next-line no-console
    console.log(`[REQ] ${req.method} ${req.originalUrl} ct=${ct}`);
    next();
});
// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Swagger
app.use('/swagger', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.openapiSpec, { explorer: true }));
app.get('/swagger.json', (_req, res) => {
    res.json(swagger_1.openapiSpec);
});
app.use('/api/docs', docs_routes_1.default);
app.use('/api/email', email_routes_1.default);
app.use('/api/qb', qb_routes_1.default);
// Catch-all 404 logger
app.use((req, res) => {
    // eslint-disable-next-line no-console
    console.warn(`[404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Not found',
        method: req.method,
        path: req.originalUrl,
        hint: 'Verify the path and server base URL in Swagger. Expected prefixes: /api/docs, /api/email, /api/qb.',
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map
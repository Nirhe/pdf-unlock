"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const docs_routes_1 = __importDefault(require("./routes/docs.routes"));
const email_routes_1 = __importDefault(require("./routes/email.routes"));
const qb_routes_1 = __importDefault(require("./routes/qb.routes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
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
app.use('/docs', docs_routes_1.default);
app.use('/email', email_routes_1.default);
app.use('/qb', qb_routes_1.default);
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
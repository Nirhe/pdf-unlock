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
// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/api/docs', docs_routes_1.default);
app.use('/api/email', email_routes_1.default);
app.use('/api/qb', qb_routes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map
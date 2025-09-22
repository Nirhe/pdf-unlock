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
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// OpenAPI JSON and Swagger UI
app.get('/openapi.json', (_req, res) => {
    res.json(swagger_1.openapiSpec);
});
app.use('/swagger', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.openapiSpec));
app.use('/api/docs', docs_routes_1.default);
app.use('/api/email', email_routes_1.default);
app.use('/api/qb', qb_routes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map
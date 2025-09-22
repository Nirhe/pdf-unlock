"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const pdf_service_1 = require("../services/pdf.service");
const document_service_1 = require("../services/document.service");
const qb_service_1 = require("../services/qb.service");
const router = (0, express_1.Router)();
const pdfPathSchema = zod_1.z
    .string()
    .min(1)
    .refine((value) => path_1.default.extname(value).toLowerCase() === '.pdf', {
    message: 'Only PDF documents are supported',
});
const lockSchema = zod_1.z.object({
    inputPath: pdfPathSchema,
    password: zod_1.z.string().min(1),
    outputPath: pdfPathSchema.optional(),
});
const unlockSchema = zod_1.z.object({
    inputPath: pdfPathSchema,
    outputPath: pdfPathSchema.optional(),
});
const sendSchema = zod_1.z.object({
    customerId: zod_1.z.string().trim().min(1, { message: 'Customer ID is required' }),
});
const MULTIPART_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
class MultipartParsingError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.name = 'MultipartParsingError';
        this.status = status;
    }
}
async function readRequestBody(req) {
    const chunks = [];
    let total = 0;
    const contentLengthHeader = req.headers['content-length'];
    if (contentLengthHeader) {
        const contentLength = Array.isArray(contentLengthHeader)
            ? Number(contentLengthHeader[0])
            : Number(contentLengthHeader);
        if (!Number.isNaN(contentLength) && contentLength > MULTIPART_SIZE_LIMIT) {
            throw new MultipartParsingError('Uploaded file is too large');
        }
    }
    await new Promise((resolve, reject) => {
        let settled = false;
        const fail = (error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            reject(error);
        };
        const succeed = () => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            resolve();
        };
        function cleanup() {
            req.off('data', onData);
            req.off('end', onEnd);
            req.off('error', onError);
            req.off('aborted', onAborted);
        }
        function onData(chunk) {
            total += chunk.length;
            if (total > MULTIPART_SIZE_LIMIT) {
                fail(new MultipartParsingError('Uploaded file is too large'));
                return;
            }
            chunks.push(chunk);
        }
        function onEnd() {
            succeed();
        }
        function onError(error) {
            fail(error);
        }
        function onAborted() {
            fail(new MultipartParsingError('Request aborted'));
        }
        req.on('data', onData);
        req.once('end', onEnd);
        req.once('error', onError);
        req.once('aborted', onAborted);
    });
    return Buffer.concat(chunks);
}
function extractBoundary(contentType) {
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
        throw new MultipartParsingError('Unsupported content type');
    }
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
        throw new MultipartParsingError('Invalid multipart boundary');
    }
    return boundaryMatch[1] ?? boundaryMatch[2];
}
function parsePart(part) {
    let segment = part;
    if (!segment) {
        return undefined;
    }
    if (segment.startsWith('\r\n')) {
        segment = segment.slice(2);
    }
    if (segment.endsWith('\r\n')) {
        segment = segment.slice(0, -2);
    }
    if (!segment || segment === '--') {
        return undefined;
    }
    const headerEnd = segment.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
        return undefined;
    }
    const rawHeaders = segment.slice(0, headerEnd).split('\r\n');
    const headers = {};
    for (const line of rawHeaders) {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
            continue;
        }
        const key = line.slice(0, separatorIndex).trim().toLowerCase();
        const value = line.slice(separatorIndex + 1).trim();
        headers[key] = value;
    }
    let body = segment.slice(headerEnd + 4);
    if (body.endsWith('\r\n')) {
        body = body.slice(0, -2);
    }
    return { headers, body };
}
async function parseMultipartForm(req) {
    const boundary = extractBoundary(req.headers['content-type']);
    const rawBody = await readRequestBody(req);
    const boundaryMarker = `--${boundary}`;
    const binaryBody = rawBody.toString('binary');
    const segments = binaryBody.split(boundaryMarker);
    const fields = {};
    const files = {};
    for (const segment of segments) {
        const part = parsePart(segment);
        if (!part) {
            continue;
        }
        const disposition = part.headers['content-disposition'];
        if (!disposition) {
            continue;
        }
        const nameMatch = disposition.match(/name="?([^";]+)"?/i);
        if (!nameMatch) {
            continue;
        }
        const fieldName = nameMatch[1];
        if (!fieldName) {
            continue;
        }
        const filenameMatch = disposition.match(/filename="?([^";]*)"?/i);
        if (filenameMatch && filenameMatch[1]) {
            const mimeType = part.headers['content-type'] ?? 'application/octet-stream';
            files[fieldName] = {
                originalName: filenameMatch[1],
                mimeType,
                buffer: Buffer.from(part.body, 'binary'),
            };
        }
        else {
            fields[fieldName] = Buffer.from(part.body, 'binary').toString('utf8');
        }
    }
    return { fields, files };
}
function deriveOutputPath(inputPath, suffix) {
    const ext = path_1.default.extname(inputPath) || '.pdf';
    const base = path_1.default.basename(inputPath, ext) || 'document';
    return path_1.default.join(os_1.default.tmpdir(), `${base}-${suffix}-${Date.now()}${ext}`);
}
router.post('/lock', async (req, res) => {
    try {
        const { inputPath, password, outputPath } = lockSchema.parse(req.body);
        const destination = outputPath ?? deriveOutputPath(inputPath, 'locked');
        await (0, pdf_service_1.lockPdf)(inputPath, destination, password);
        res.status(200).json({
            message: 'Document locked successfully',
            outputPath: destination,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request payload',
                details: error.issues,
            });
        }
        return res.status(500).json({
            error: 'Unable to lock document',
        });
    }
});
router.post('/unlock', async (req, res) => {
    try {
        const { inputPath, outputPath } = unlockSchema.parse(req.body);
        const destination = outputPath ?? deriveOutputPath(inputPath, 'unlocked');
        await (0, pdf_service_1.unlockPdf)(inputPath, destination);
        res.status(200).json({
            message: 'Document unlocked successfully',
            outputPath: destination,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request payload',
                details: error.issues,
            });
        }
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                error: 'Document not found',
            });
        }
        return res.status(500).json({
            error: 'Unable to unlock document',
        });
    }
});
router.post('/send', async (req, res) => {
    try {
        const { fields, files } = await parseMultipartForm(req);
        const { customerId } = sendSchema.parse(fields);
        const file = files.document;
        if (!file) {
            return res.status(400).json({
                error: 'Document file is required',
            });
        }
        if (path_1.default.extname(file.originalName).toLowerCase() !== '.pdf') {
            return res.status(400).json({
                error: 'Only PDF documents are supported',
            });
        }
        if (file.mimeType !== 'application/pdf') {
            return res.status(400).json({
                error: 'Only PDF documents are supported',
            });
        }
        const submission = await (0, document_service_1.handleDocumentSubmission)(customerId, file);
        const invoice = await (0, qb_service_1.createInvoice)({
            customerId,
            amount: submission.invoice.amount,
            memo: submission.invoice.memo,
        });
        res.status(200).json({
            message: 'Document sent successfully',
            paymentLink: submission.paymentLink,
            invoice: {
                id: invoice.id,
                amount: invoice.amount,
                balance: invoice.balance,
                status: invoice.status,
            },
        });
    }
    catch (error) {
        if (error instanceof MultipartParsingError) {
            return res.status(error.status).json({
                error: error.message,
            });
        }
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request payload',
                details: error.issues,
            });
        }
        if (error instanceof document_service_1.DocumentProcessingError) {
            return res.status(502).json({
                error: error.message,
            });
        }
        return res.status(500).json({
            error: 'Unable to send document',
        });
    }
});
exports.default = router;
//# sourceMappingURL=docs.routes.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessingError = void 0;
exports.handleDocumentSubmission = handleDocumentSubmission;
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
class DocumentProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DocumentProcessingError';
    }
}
exports.DocumentProcessingError = DocumentProcessingError;
function generateStoragePath(customerId, originalName, timestamp) {
    const ext = path_1.default.extname(originalName).toLowerCase() || '.pdf';
    const baseName = path_1.default
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'document';
    return path_1.default.join(os_1.default.tmpdir(), `${customerId}-${timestamp}-${baseName}${ext}`);
}
const DEFAULT_INVOICE_AMOUNT = 125;
function generateInvoiceMemo(originalName) {
    const ext = path_1.default.extname(originalName).toLowerCase() || '.pdf';
    const baseName = path_1.default
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!baseName) {
        return 'PDF unlock service';
    }
    return `PDF unlock service for ${baseName}`;
}
async function handleDocumentSubmission(customerId, file) {
    if (!file || !file.buffer) {
        throw new DocumentProcessingError('Uploaded document is invalid');
    }
    if (path_1.default.extname(file.originalName).toLowerCase() !== '.pdf') {
        throw new DocumentProcessingError('Only PDF documents are supported');
    }
    if (file.mimeType !== 'application/pdf') {
        throw new DocumentProcessingError('Only PDF documents are supported');
    }
    const timestamp = Date.now();
    const storagePath = generateStoragePath(customerId, file.originalName, timestamp);
    try {
        await promises_1.default.writeFile(storagePath, file.buffer);
    }
    catch (error) {
        throw new DocumentProcessingError('Failed to store uploaded document');
    }
    if (process.env.DOCUMENT_SERVICE_FAIL_CUSTOMER_ID === customerId) {
        throw new DocumentProcessingError('Failed to generate payment link');
    }
    const paymentLink = `https://payments.example.com/checkout/${customerId}-${timestamp}`;
    return {
        storedPath: storagePath,
        paymentLink,
        invoice: {
            amount: DEFAULT_INVOICE_AMOUNT,
            memo: generateInvoiceMemo(file.originalName),
        },
    };
}
//# sourceMappingURL=document.service.js.map
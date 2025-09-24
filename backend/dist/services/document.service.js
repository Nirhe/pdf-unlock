"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessingError = void 0;
exports.getDownloadEntry = getDownloadEntry;
exports.handleDocumentSubmission = handleDocumentSubmission;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const pdf_service_1 = require("./pdf.service");
class DocumentProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DocumentProcessingError';
    }
}
exports.DocumentProcessingError = DocumentProcessingError;
const downloadRegistry = new Map();
function createSecureToken() {
    if (typeof crypto_1.default.randomUUID === 'function') {
        return crypto_1.default.randomUUID();
    }
    return crypto_1.default.randomBytes(16).toString('hex');
}
function normalizeDocumentName(originalName) {
    const ext = path_1.default.extname(originalName).toLowerCase() || '.pdf';
    const baseName = path_1.default
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'document';
    return { ext, baseName };
}
function generateStoragePath(customerId, originalName, timestamp) {
    const { ext, baseName } = normalizeDocumentName(originalName);
    return path_1.default.join(os_1.default.tmpdir(), `${customerId}-${timestamp}-${baseName}${ext}`);
}
function generateLockedFileDetails(customerId, originalName, timestamp) {
    const { ext, baseName } = normalizeDocumentName(originalName);
    const lockedBaseName = `${baseName}-locked`;
    const fileName = `${lockedBaseName}${ext}`;
    const filePath = path_1.default.join(os_1.default.tmpdir(), `${customerId}-${timestamp}-${fileName}`);
    return { fileName, filePath };
}
function getDownloadEntry(downloadId) {
    return downloadRegistry.get(downloadId);
}
function registerDownloadEntry(entry) {
    const downloadId = createSecureToken();
    downloadRegistry.set(downloadId, entry);
    return downloadId;
}
function generateDocumentPassword() {
    const buffer = crypto_1.default.randomBytes(24).toString('base64');
    const sanitized = buffer.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitized.length >= 18) {
        return sanitized.slice(0, 18);
    }
    if (sanitized.length >= 12) {
        return sanitized;
    }
    return crypto_1.default.randomBytes(12).toString('hex');
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
    const { fileName: lockedFileName, filePath: lockedFilePath } = generateLockedFileDetails(customerId, file.originalName, timestamp);
    const password = generateDocumentPassword();
    try {
        await (0, pdf_service_1.lockPdf)(storagePath, lockedFilePath, password);
    }
    catch (error) {
        await promises_1.default.unlink(storagePath).catch(() => { });
        await promises_1.default.unlink(lockedFilePath).catch(() => { });
        throw new DocumentProcessingError('Failed to encrypt uploaded document');
    }
    const downloadId = registerDownloadEntry({
        filePath: lockedFilePath,
        fileName: lockedFileName,
        password,
    });
    const paymentLink = `https://payments.example.com/checkout/${customerId}-${timestamp}`;
    return {
        storedPath: storagePath,
        paymentLink,
        invoice: {
            amount: DEFAULT_INVOICE_AMOUNT,
            memo: generateInvoiceMemo(file.originalName),
        },
        downloadId,
        downloadFileName: lockedFileName,
    };
}
//# sourceMappingURL=document.service.js.map
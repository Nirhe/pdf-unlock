"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const multer_1 = __importDefault(require("multer"));
const pdf_service_1 = require("../services/pdf.service");
const document_service_1 = require("../services/document.service");
const qb_service_1 = require("../services/qb.service");
const router = (0, express_1.Router)();
// Helpers
function isPdfPath(filePath) {
    return path_1.default.extname(filePath).toLowerCase() === '.pdf';
}
function tempPath(prefix, original) {
    return path_1.default.join(os_1.default.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.pdf`);
}
const unlockSchema = zod_1.z.object({
    inputPath: zod_1.z.string().min(1),
    outputPath: zod_1.z.string().min(1).optional(),
});
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
// POST /api/docs/lock
router.post('/lock', (req, res) => {
    const ct = (req.headers['content-type'] || '').toString().toLowerCase();
    if (ct.includes('application/json')) {
        return res.status(400).json({ error: 'Unsupported content type' });
    }
    upload.single('document')(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Uploaded file is too large' });
            }
            return res.status(400).json({ error: 'Invalid request payload' });
        }
        let inputPath;
        let outputPath;
        let responded = false;
        const cleanup = async (options) => {
            if (inputPath) {
                await promises_1.default.unlink(inputPath).catch(() => { });
                inputPath = undefined;
            }
            if ((options?.removeOutput ?? false) && outputPath) {
                await promises_1.default.unlink(outputPath).catch(() => { });
                outputPath = undefined;
            }
        };
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'Document file is required' });
            }
            if (file.mimetype !== 'application/pdf' && !isPdfPath(file.originalname)) {
                return res.status(400).json({ error: 'Uploaded file must be a PDF document' });
            }
            const passwordRaw = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
            if (!passwordRaw) {
                return res.status(400).json({ error: 'Password is required' });
            }
            inputPath = tempPath('lock-input');
            await promises_1.default.writeFile(inputPath, file.buffer);
            outputPath = tempPath('locked');
            await (0, pdf_service_1.lockPdf)(inputPath, outputPath, passwordRaw);
            const lockedBytes = await promises_1.default.readFile(outputPath);
            const inputName = path_1.default.basename(file.originalname, path_1.default.extname(file.originalname));
            const downloadName = `${inputName || 'document'}-locked.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
            responded = true;
            await cleanup({ removeOutput: true });
            return res.status(200).send(lockedBytes);
        }
        catch (error) {
            if (!responded) {
                await cleanup({ removeOutput: true });
                return res.status(500).json({ error: 'Unable to lock document' });
            }
        }
        finally {
            if (!responded) {
                await cleanup({ removeOutput: true });
            }
            else {
                await cleanup({ removeOutput: false });
            }
        }
    });
});
// POST /api/docs/unlock
router.post('/unlock', async (req, res) => {
    try {
        const payload = unlockSchema.parse(req.body);
        if (!isPdfPath(payload.inputPath)) {
            return res.status(400).json({ error: 'Invalid request payload' });
        }
        try {
            await promises_1.default.access(payload.inputPath);
        }
        catch {
            return res.status(404).json({ error: 'Document not found' });
        }
        const outPath = payload.outputPath && payload.outputPath.trim() ? payload.outputPath : tempPath('unlocked', payload.inputPath);
        await (0, pdf_service_1.unlockPdf)(payload.inputPath, outPath);
        return res.status(200).json({ message: 'Unlocked successfully', outputPath: outPath });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid request payload', details: error.issues });
        }
        return res.status(500).json({ error: 'Unable to unlock document' });
    }
});
// POST /api/docs/send
router.post('/send', (req, res) => {
    const ct = (req.headers['content-type'] || '').toString().toLowerCase();
    if (ct.includes('application/json')) {
        return res.status(400).json({ error: 'Unsupported content type' });
    }
    upload.single('document')(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Uploaded file is too large' });
            }
            return res.status(400).json({ error: 'Invalid request payload' });
        }
        try {
            const customerId = typeof req.body?.customerId === 'string' ? req.body.customerId.trim() : '';
            if (!customerId) {
                return res.status(400).json({ error: 'Invalid request payload' });
            }
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'Document file is required' });
            }
            const uploaded = {
                originalName: file.originalname,
                mimeType: file.mimetype,
                buffer: file.buffer,
            };
            const submission = await (0, document_service_1.handleDocumentSubmission)(customerId, uploaded);
            const invoice = await (0, qb_service_1.createInvoice)({
                customerId,
                amount: submission.invoice.amount,
                memo: submission.invoice.memo,
            });
            return res.status(200).json({
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
            if (error instanceof document_service_1.DocumentProcessingError) {
                if (error.message === 'Failed to generate payment link') {
                    return res.status(502).json({ error: error.message });
                }
                return res.status(400).json({ error: 'Invalid request payload' });
            }
            return res.status(500).json({ error: 'Unable to send document' });
        }
    });
});
exports.default = router;
//# sourceMappingURL=docs.routes.js.map
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
const router = (0, express_1.Router)();
const lockSchema = zod_1.z.object({
    inputPath: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
    outputPath: zod_1.z.string().optional(),
});
const unlockSchema = zod_1.z.object({
    inputPath: zod_1.z.string().min(1),
    outputPath: zod_1.z.string().optional(),
});
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
exports.default = router;
//# sourceMappingURL=docs.routes.js.map
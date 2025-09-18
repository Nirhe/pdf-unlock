"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockPdf = lockPdf;
exports.unlockPdf = unlockPdf;
// src/services/pdf.service.ts
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const fileSystem = fs_1.default.promises;
async function lockPdf(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({
            userPassword: password,
            ownerPassword: password,
            permissions: { printing: 'highResolution', modifying: false, copying: false },
        });
        const stream = fs_1.default.createWriteStream(outputPath);
        doc.pipe(stream);
        // simplest path: re-embed the pages as images or attach original; for now write a cover:
        doc.text('Secure Document', { align: 'center' });
        // (For preserving original content, you can render pages via an intermediate step, or generate from source.)
        doc.end();
        stream.on('finish', () => resolve());
        stream.on('error', reject);
    });
}
async function unlockPdf(inputPath, outputPath) {
    await fileSystem.access(inputPath);
    await fileSystem.copyFile(inputPath, outputPath);
}
//# sourceMappingURL=pdf.service.js.map
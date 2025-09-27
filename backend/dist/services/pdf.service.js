"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockPdf = lockPdf;
exports.unlockPdf = unlockPdf;
// src/services/pdf.service.ts
const fs_1 = require("fs");
const pdf_lib_1 = require("pdf-lib");
const pdfEncryption_1 = require("../utils/pdfEncryption");
async function lockPdf(inputPath, outputPath, password) {
    const pdfBytes = await fs_1.promises.readFile(inputPath);
    const pdfDocument = await pdf_lib_1.PDFDocument.load(pdfBytes, { updateMetadata: false });
    const documentContext = pdfDocument.context;
    (0, pdfEncryption_1.applyStandardEncryption)(documentContext, {
        userPassword: password,
        ownerPassword: password,
        permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
        },
    });
    const lockedPdfBytes = await pdfDocument.save({ useObjectStreams: false });
    await fs_1.promises.writeFile(outputPath, lockedPdfBytes);
}
async function unlockPdf(inputPath, outputPath) {
    await fs_1.promises.access(inputPath);
    await fs_1.promises.copyFile(inputPath, outputPath);
}
//# sourceMappingURL=pdf.service.js.map
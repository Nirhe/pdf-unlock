"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockPdf = lockPdf;
exports.unlockPdf = unlockPdf;
// src/services/pdf.service.ts
const child_process_1 = require("child_process");
const fs_1 = require("fs");
async function runQpdfEncryption(inputPath, outputPath, userPassword, ownerPassword) {
    return new Promise((resolve, reject) => {
        const qpdf = (0, child_process_1.spawn)('qpdf', ['--encrypt', userPassword, ownerPassword, '40', '--', inputPath, outputPath], {
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        let stderr = '';
        if (qpdf.stderr) {
            qpdf.stderr.setEncoding('utf8');
            qpdf.stderr.on('data', (chunk) => {
                stderr += chunk;
            });
        }
        qpdf.once('error', (error) => {
            // eslint-disable-next-line no-console
            console.error('qpdf process error event', {
                stderr: stderr.trim() || undefined,
                stack: error.stack,
                message: error.message,
            });
            reject(error);
        });
        qpdf.once('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                const message = stderr.trim();
                const error = new Error(message ? `qpdf exited with code ${code}: ${message}` : `qpdf exited with code ${code}`);
                // eslint-disable-next-line no-console
                console.error('qpdf process exited with non-zero code', {
                    code,
                    stderr: message || undefined,
                    stack: error.stack,
                    message: error.message,
                });
                reject(error);
            }
        });
    });
}
async function lockPdf(inputPath, outputPath, password) {
    await fs_1.promises.access(inputPath);
    await runQpdfEncryption(inputPath, outputPath, password, password);
}
async function unlockPdf(inputPath, outputPath) {
    await fs_1.promises.access(inputPath);
    await fs_1.promises.copyFile(inputPath, outputPath);
}
//# sourceMappingURL=pdf.service.js.map
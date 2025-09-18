// src/services/pdf.service.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';

const fileSystem = fs.promises;

export async function lockPdf(inputPath: string, outputPath: string, password: string) {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      userPassword: password,
      ownerPassword: password,
      permissions: { printing: 'highResolution', modifying: false, copying: false },
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // simplest path: re-embed the pages as images or attach original; for now write a cover:
    doc.text('Secure Document', { align: 'center' });
    // (For preserving original content, you can render pages via an intermediate step, or generate from source.)

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

export async function unlockPdf(inputPath: string, outputPath: string) {
  await fileSystem.access(inputPath);
  await fileSystem.copyFile(inputPath, outputPath);
}

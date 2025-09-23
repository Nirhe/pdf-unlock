// src/services/pdf.service.ts
import { promises as fileSystem } from 'fs';
import { PDFDocument } from 'pdf-lib';

export async function lockPdf(inputPath: string, outputPath: string, password: string) {
  const pdfBytes = await fileSystem.readFile(inputPath);
  const pdfDocument = await PDFDocument.load(pdfBytes);

  const lockedPdfBytes = await pdfDocument.save({
    userPassword: password,
    ownerPassword: password,
    permissions: { printing: 'highResolution', modifying: false, copying: false },
  });

  await fileSystem.writeFile(outputPath, lockedPdfBytes);
}

export async function unlockPdf(inputPath: string, outputPath: string) {
  await fileSystem.access(inputPath);
  await fileSystem.copyFile(inputPath, outputPath);
}

// src/services/pdf.service.ts
import { promises as fileSystem } from 'fs';
import { PDFDocument } from 'pdf-lib';
import type { PDFContext } from 'pdf-lib/cjs/core';

import { applyStandardEncryption } from '../utils/pdfEncryption';

export async function lockPdf(inputPath: string, outputPath: string, password: string) {
  const pdfBytes = await fileSystem.readFile(inputPath);
  const pdfDocument = await PDFDocument.load(pdfBytes, { updateMetadata: false });

  const documentContext = (pdfDocument as unknown as { context: PDFContext }).context;

  applyStandardEncryption(documentContext, {
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
    },
  });

  const lockedPdfBytes = await pdfDocument.save({ useObjectStreams: false });

  await fileSystem.writeFile(outputPath, lockedPdfBytes);
}

export async function unlockPdf(inputPath: string, outputPath: string) {
  await fileSystem.access(inputPath);
  await fileSystem.copyFile(inputPath, outputPath);
}

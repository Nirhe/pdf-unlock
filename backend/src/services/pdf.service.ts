// src/services/pdf.service.ts
import { PDFDocument } from 'pdf-lib';
import { promises as fileSystem } from 'fs';

export async function lockPdf(inputPath: string, outputPath: string, password: string) {
  // Read the input PDF
  const inputBytes = await fileSystem.readFile(inputPath);
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(inputBytes);
  
  // Encrypt the PDF with user and owner passwords
  // pdf-lib uses RC4 encryption (128-bit) by default
  const encryptedBytes = await pdfDoc.save({
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: true,
      documentAssembly: false,
    },
  });
  
  // Write the encrypted PDF to the output path
  await fileSystem.writeFile(outputPath, encryptedBytes);
}

export async function unlockPdf(inputPath: string, outputPath: string) {
  await fileSystem.access(inputPath);
  await fileSystem.copyFile(inputPath, outputPath);
}

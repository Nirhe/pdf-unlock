import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export interface DocumentSubmissionResult {
  storedPath: string;
  paymentLink: string;
}

export interface UploadedDocument {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export class DocumentProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

function generateStoragePath(customerId: string, originalName: string, timestamp: number) {
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const baseName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'document';

  return path.join(os.tmpdir(), `${customerId}-${timestamp}-${baseName}${ext}`);
}

export async function handleDocumentSubmission(
  customerId: string,
  file: UploadedDocument
): Promise<DocumentSubmissionResult> {
  if (!file || !file.buffer) {
    throw new DocumentProcessingError('Uploaded document is invalid');
  }

  if (path.extname(file.originalName).toLowerCase() !== '.pdf') {
    throw new DocumentProcessingError('Only PDF documents are supported');
  }

  if (file.mimeType !== 'application/pdf') {
    throw new DocumentProcessingError('Only PDF documents are supported');
  }

  const timestamp = Date.now();
  const storagePath = generateStoragePath(customerId, file.originalName, timestamp);

  try {
    await fs.writeFile(storagePath, file.buffer);
  } catch (error) {
    throw new DocumentProcessingError('Failed to store uploaded document');
  }

  if (process.env.DOCUMENT_SERVICE_FAIL_CUSTOMER_ID === customerId) {
    throw new DocumentProcessingError('Failed to generate payment link');
  }

  const paymentLink = `https://payments.example.com/checkout/${customerId}-${timestamp}`;

  return { storedPath: storagePath, paymentLink };
}


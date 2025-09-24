import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { lockPdf } from './pdf.service';

export interface DocumentInvoiceDetails {
  amount: number;
  memo: string;
}

export interface DocumentSubmissionResult {
  storedPath: string;
  paymentLink: string;
  invoice: DocumentInvoiceDetails;
  downloadId: string;
  downloadFileName: string;
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

interface DownloadEntry {
  filePath: string;
  fileName: string;
  password: string;
}

const downloadRegistry = new Map<string, DownloadEntry>();

function createSecureToken(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function normalizeDocumentName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const baseName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'document';

  return { ext, baseName };
}

function generateStoragePath(customerId: string, originalName: string, timestamp: number) {
  const { ext, baseName } = normalizeDocumentName(originalName);

  return path.join(os.tmpdir(), `${customerId}-${timestamp}-${baseName}${ext}`);
}

function generateLockedFileDetails(customerId: string, originalName: string, timestamp: number) {
  const { ext, baseName } = normalizeDocumentName(originalName);
  const lockedBaseName = `${baseName}-locked`;
  const fileName = `${lockedBaseName}${ext}`;
  const filePath = path.join(os.tmpdir(), `${customerId}-${timestamp}-${fileName}`);

  return { fileName, filePath };
}

export function getDownloadEntry(downloadId: string): DownloadEntry | undefined {
  return downloadRegistry.get(downloadId);
}

function registerDownloadEntry(entry: DownloadEntry): string {
  const downloadId = createSecureToken();
  downloadRegistry.set(downloadId, entry);
  return downloadId;
}

function generateDocumentPassword(): string {
  const buffer = crypto.randomBytes(24).toString('base64');
  const sanitized = buffer.replace(/[^a-zA-Z0-9]/g, '');

  if (sanitized.length >= 18) {
    return sanitized.slice(0, 18);
  }

  if (sanitized.length >= 12) {
    return sanitized;
  }

  return crypto.randomBytes(12).toString('hex');
}

const DEFAULT_INVOICE_AMOUNT = 125;

function generateInvoiceMemo(originalName: string) {
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const baseName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!baseName) {
    return 'PDF unlock service';
  }

  return `PDF unlock service for ${baseName}`;
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

  const { fileName: lockedFileName, filePath: lockedFilePath } = generateLockedFileDetails(
    customerId,
    file.originalName,
    timestamp
  );
  const password = generateDocumentPassword();

  try {
    await lockPdf(storagePath, lockedFilePath, password);
  } catch (error) {
    await fs.unlink(storagePath).catch(() => {});
    await fs.unlink(lockedFilePath).catch(() => {});
    throw new DocumentProcessingError('Failed to encrypt uploaded document');
  }

  const downloadId = registerDownloadEntry({
    filePath: lockedFilePath,
    fileName: lockedFileName,
    password,
  });

  const paymentLink = `https://payments.example.com/checkout/${customerId}-${timestamp}`;

  return {
    storedPath: storagePath,
    paymentLink,
    invoice: {
      amount: DEFAULT_INVOICE_AMOUNT,
      memo: generateInvoiceMemo(file.originalName),
    },
    downloadId,
    downloadFileName: lockedFileName,
  };
}


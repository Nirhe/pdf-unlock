import { Router } from 'express';
import type { Request } from 'express';
import os from 'os';
import path from 'path';
import { z } from 'zod';
import { lockPdf, unlockPdf } from '../services/pdf.service';
import {
  DocumentProcessingError,
  handleDocumentSubmission,
  type UploadedDocument,
} from '../services/document.service';
import { createInvoice } from '../services/qb.service';

const router = Router();

const pdfPathSchema = z
  .string()
  .min(1)
  .refine((value) => path.extname(value).toLowerCase() === '.pdf', {
    message: 'Only PDF documents are supported',
  });

const lockSchema = z.object({
  inputPath: pdfPathSchema,
  password: z.string().min(1),
  outputPath: pdfPathSchema.optional(),
});

const unlockSchema = z.object({
  inputPath: pdfPathSchema,
  outputPath: pdfPathSchema.optional(),
});

const sendSchema = z.object({
  customerId: z.string().trim().min(1, { message: 'Customer ID is required' }),
});

const MULTIPART_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

class MultipartParsingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MultipartParsingError';
    this.status = status;
  }
}

async function readRequestBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  const contentLengthHeader = req.headers['content-length'];
  if (contentLengthHeader) {
    const contentLength = Array.isArray(contentLengthHeader)
      ? Number(contentLengthHeader[0])
      : Number(contentLengthHeader);

    if (!Number.isNaN(contentLength) && contentLength > MULTIPART_SIZE_LIMIT) {
      throw new MultipartParsingError('Uploaded file is too large');
    }
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    function cleanup() {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
    }

    function onData(chunk: Buffer) {
      total += chunk.length;
      if (total > MULTIPART_SIZE_LIMIT) {
        fail(new MultipartParsingError('Uploaded file is too large'));
        return;
      }

      chunks.push(chunk);
    }

    function onEnd() {
      succeed();
    }

    function onError(error: Error) {
      fail(error);
    }

    function onAborted() {
      fail(new MultipartParsingError('Request aborted'));
    }

    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
    req.once('aborted', onAborted);
  });

  return Buffer.concat(chunks);
}

function extractBoundary(contentType?: string | null) {
  if (!contentType || !contentType.startsWith('multipart/form-data')) {
    throw new MultipartParsingError('Unsupported content type');
  }

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw new MultipartParsingError('Invalid multipart boundary');
  }

  return boundaryMatch[1] ?? boundaryMatch[2];
}

interface ParsedMultipart {
  fields: Record<string, string>;
  files: Record<string, UploadedDocument>;
}

function parsePart(part: string): { headers: Record<string, string>; body: string } | undefined {
  let segment = part;

  if (!segment) {
    return undefined;
  }

  if (segment.startsWith('\r\n')) {
    segment = segment.slice(2);
  }

  if (segment.endsWith('\r\n')) {
    segment = segment.slice(0, -2);
  }

  if (!segment || segment === '--') {
    return undefined;
  }

  const headerEnd = segment.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    return undefined;
  }

  const rawHeaders = segment.slice(0, headerEnd).split('\r\n');
  const headers: Record<string, string> = {};

  for (const line of rawHeaders) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    headers[key] = value;
  }

  let body = segment.slice(headerEnd + 4);
  if (body.endsWith('\r\n')) {
    body = body.slice(0, -2);
  }

  return { headers, body };
}

async function parseMultipartForm(req: Request): Promise<ParsedMultipart> {
  const boundary = extractBoundary(req.headers['content-type']);
  const rawBody = await readRequestBody(req);
  const boundaryMarker = `--${boundary}`;
  const binaryBody = rawBody.toString('binary');
  const segments = binaryBody.split(boundaryMarker);

  const fields: Record<string, string> = {};
  const files: Record<string, UploadedDocument> = {};

  for (const segment of segments) {
    const part = parsePart(segment);
    if (!part) {
      continue;
    }

    const disposition = part.headers['content-disposition'];
    if (!disposition) {
      continue;
    }

    const nameMatch = disposition.match(/name="?([^";]+)"?/i);
    if (!nameMatch) {
      continue;
    }

    const fieldName = nameMatch[1];
    if (!fieldName) {
      continue;
    }
    const filenameMatch = disposition.match(/filename="?([^";]*)"?/i);

    if (filenameMatch && filenameMatch[1]) {
      const mimeType = part.headers['content-type'] ?? 'application/octet-stream';

      files[fieldName] = {
        originalName: filenameMatch[1],
        mimeType,
        buffer: Buffer.from(part.body, 'binary'),
      };
    } else {
      fields[fieldName] = Buffer.from(part.body, 'binary').toString('utf8');
    }
  }

  return { fields, files };
}

function deriveOutputPath(inputPath: string, suffix: string) {
  const ext = path.extname(inputPath) || '.pdf';
  const base = path.basename(inputPath, ext) || 'document';
  return path.join(os.tmpdir(), `${base}-${suffix}-${Date.now()}${ext}`);
}

router.post('/lock', async (req, res) => {
  try {
    const { inputPath, password, outputPath } = lockSchema.parse(req.body);
    const destination = outputPath ?? deriveOutputPath(inputPath, 'locked');

    await lockPdf(inputPath, destination, password);

    res.status(200).json({
      message: 'Document locked successfully',
      outputPath: destination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

    await unlockPdf(inputPath, destination);

    res.status(200).json({
      message: 'Document unlocked successfully',
      outputPath: destination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.issues,
      });
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    return res.status(500).json({
      error: 'Unable to unlock document',
    });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { fields, files } = await parseMultipartForm(req);
    const { customerId } = sendSchema.parse(fields);

    const file = files.document;
    if (!file) {
      return res.status(400).json({
        error: 'Document file is required',
      });
    }

    if (path.extname(file.originalName).toLowerCase() !== '.pdf') {
      return res.status(400).json({
        error: 'Only PDF documents are supported',
      });
    }

    if (file.mimeType !== 'application/pdf') {
      return res.status(400).json({
        error: 'Only PDF documents are supported',
      });
    }

    const submission = await handleDocumentSubmission(customerId, file);
    const invoice = await createInvoice({
      customerId,
      amount: submission.invoice.amount,
      memo: submission.invoice.memo,
    });

    res.status(200).json({
      message: 'Document sent successfully',
      paymentLink: submission.paymentLink,
      invoice: {
        id: invoice.id,
        amount: invoice.amount,
        balance: invoice.balance,
        status: invoice.status,
      },
    });
  } catch (error) {
    if (error instanceof MultipartParsingError) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.issues,
      });
    }

    if (error instanceof DocumentProcessingError) {
      return res.status(502).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Unable to send document',
    });
  }
});

export default router;

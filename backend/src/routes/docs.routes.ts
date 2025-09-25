import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import multer from 'multer';

import { lockPdf, unlockPdf } from '../services/pdf.service';
import { handleDocumentSubmission, DocumentProcessingError } from '../services/document.service';
import { createInvoice } from '../services/qb.service';

const router = Router();

// Helpers
function isPdfPath(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

function tempPath(prefix: string, original?: string) {
  return path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.pdf`
  );
}

const unlockSchema = z.object({
  inputPath: z.string().min(1),
  outputPath: z.string().min(1).optional(),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/docs/lock
router.post('/lock', (req, res) => {
  const ct = (req.headers['content-type'] || '').toString().toLowerCase();
  if (ct.includes('application/json')) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }

  upload.single('document')(req, res, async (err: any) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Uploaded file is too large' });
      }
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    let inputPath: string | undefined;
    let outputPath: string | undefined;
    let responded = false;

    const cleanup = async (options?: { removeOutput?: boolean }) => {
      if (inputPath) {
        await fs.unlink(inputPath).catch(() => {});
        inputPath = undefined;
      }
      if ((options?.removeOutput ?? false) && outputPath) {
        await fs.unlink(outputPath).catch(() => {});
        outputPath = undefined;
      }
    };

    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'Document file is required' });
      }

      if (file.mimetype !== 'application/pdf' && !isPdfPath(file.originalname)) {
        return res.status(400).json({ error: 'Uploaded file must be a PDF document' });
      }

      const passwordRaw = typeof (req as any).body?.password === 'string' ? (req as any).body.password.trim() : '';
      if (!passwordRaw) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const downloadRaw = (req as any).body?.download;
      const download =
        typeof downloadRaw === 'string'
          ? ['true', '1', 'yes', 'on'].includes(downloadRaw.toLowerCase())
          : Boolean(downloadRaw);

      inputPath = tempPath('lock-input');
      await fs.writeFile(inputPath, file.buffer);

      outputPath = tempPath('locked');
      await lockPdf(inputPath, outputPath, passwordRaw);

      if (download) {
        const lockedBytes = await fs.readFile(outputPath);
        const inputName = path.basename(file.originalname, path.extname(file.originalname));
        const downloadName = `${inputName}-locked.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        responded = true;
        await cleanup({ removeOutput: true });
        return res.status(200).send(lockedBytes);
      }

      responded = true;
      return res.status(200).json({ message: 'Locked successfully', outputPath });
    } catch (error) {
      if (!responded) {
        await cleanup({ removeOutput: true });
        return res.status(500).json({ error: 'Unable to lock document' });
      }
    } finally {
      if (!responded) {
        await cleanup({ removeOutput: true });
      } else {
        await cleanup({ removeOutput: false });
      }
    }
  });
});

// POST /api/docs/unlock
router.post('/unlock', async (req, res) => {
  try {
    const payload = unlockSchema.parse(req.body);

    if (!isPdfPath(payload.inputPath)) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    try {
      await fs.access(payload.inputPath);
    } catch {
      return res.status(404).json({ error: 'Document not found' });
    }

    const outPath = payload.outputPath && payload.outputPath.trim() ? payload.outputPath : tempPath('unlocked', payload.inputPath);

    await unlockPdf(payload.inputPath, outPath);

    return res.status(200).json({ message: 'Unlocked successfully', outputPath: outPath });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request payload', details: error.issues });
    }

    return res.status(500).json({ error: 'Unable to unlock document' });
  }
});

// POST /api/docs/send
router.post('/send', (req, res) => {
  const ct = (req.headers['content-type'] || '').toString().toLowerCase();
  if (ct.includes('application/json')) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }

  upload.single('document')(req, res, async (err: any) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Uploaded file is too large' });
      }
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    try {
      const customerId = typeof (req as any).body?.customerId === 'string' ? (req as any).body.customerId.trim() : '';
      if (!customerId) {
        return res.status(400).json({ error: 'Invalid request payload' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'Document file is required' });
      }

      const uploaded = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
      } as const;

      const submission = await handleDocumentSubmission(customerId, uploaded);

      const invoice = await createInvoice({
        customerId,
        amount: submission.invoice.amount,
        memo: submission.invoice.memo,
      });

      return res.status(200).json({
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
      if (error instanceof DocumentProcessingError) {
        if (error.message === 'Failed to generate payment link') {
          return res.status(502).json({ error: error.message });
        }
        return res.status(400).json({ error: 'Invalid request payload' });
      }

      return res.status(500).json({ error: 'Unable to send document' });
    }
  });
});
export default router;
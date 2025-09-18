import { Router } from 'express';
import os from 'os';
import path from 'path';
import { z } from 'zod';
import { lockPdf, unlockPdf } from '../services/pdf.service';

const router = Router();

const lockSchema = z.object({
  inputPath: z.string().min(1),
  password: z.string().min(1),
  outputPath: z.string().optional(),
});

const unlockSchema = z.object({
  inputPath: z.string().min(1),
  outputPath: z.string().optional(),
});

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

export default router;

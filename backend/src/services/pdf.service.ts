// src/services/pdf.service.ts
import { spawn } from 'child_process';
import { promises as fileSystem } from 'fs';
import path from 'path';

const bundledQpdfPath = path.join(__dirname, '../bin/qpdf-linux-x64');
const resolvedQpdfPath = process.env.QPDF_PATH?.trim() || bundledQpdfPath;

async function runQpdfEncryption(
  inputPath: string,
  outputPath: string,
  userPassword: string,
  ownerPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const qpdf = spawn(
      resolvedQpdfPath,
      ['--encrypt', userPassword, ownerPassword, '40', '--', inputPath, outputPath],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );

    let stderr = '';
    if (qpdf.stderr) {
      qpdf.stderr.setEncoding('utf8');
      qpdf.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });
    }

    qpdf.once('error', (error: Error) => {
      // eslint-disable-next-line no-console
      console.error('qpdf process error event', {
        stderr: stderr.trim() || undefined,
        stack: error.stack,
        message: error.message,
      });
      reject(error);
    });

    qpdf.once('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        const message = stderr.trim();
        const error = new Error(
          message ? `qpdf exited with code ${code}: ${message}` : `qpdf exited with code ${code}`,
        );
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

export async function lockPdf(inputPath: string, outputPath: string, password: string) {
  await fileSystem.access(inputPath);
  await runQpdfEncryption(inputPath, outputPath, password, password);
}

export async function unlockPdf(inputPath: string, outputPath: string) {
  await fileSystem.access(inputPath);
  await fileSystem.copyFile(inputPath, outputPath);
}

import nodemailer, { SendMailOptions, SentMessageInfo, TransportOptions } from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  attachments?: {
    filename: string;
    content: string;
  }[] | undefined;
}

const DEFAULT_SENDER = process.env.EMAIL_SENDER ?? 'no-reply@pdf-unlock.local';

function resolveTransport(): string | TransportOptions {
  if (process.env.SMTP_URL) {
    return process.env.SMTP_URL;
  }

  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    } satisfies TransportOptions;
  }

  return { jsonTransport: true } satisfies TransportOptions;
}

export async function sendNotificationEmail(payload: EmailPayload): Promise<SentMessageInfo> {
  const transporter = nodemailer.createTransport(resolveTransport());

  const message: SendMailOptions = {
    from: DEFAULT_SENDER,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    attachments: payload.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
    })),
  };

  return transporter.sendMail(message);
}

declare module 'nodemailer' {
  export interface Attachment {
    filename?: string | undefined;
    content?: string | Buffer | undefined;
  }

  export interface SendMailOptions {
    from?: string | undefined;
    to?: string | undefined;
    subject?: string | undefined;
    text?: string | undefined;
    attachments?: Attachment[] | undefined;
  }

  export interface SentMessageInfo {
    messageId: string;
    [key: string]: unknown;
  }

  export type TransportOptions = Record<string, unknown>;

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(
    options?: string | TransportOptions
  ): Transporter;
}

import { SentMessageInfo } from 'nodemailer';
export interface EmailPayload {
    to: string;
    subject: string;
    text: string;
    attachments?: {
        filename: string;
        content: string;
    }[] | undefined;
}
export declare function sendNotificationEmail(payload: EmailPayload): Promise<SentMessageInfo>;
//# sourceMappingURL=email.service.d.ts.map
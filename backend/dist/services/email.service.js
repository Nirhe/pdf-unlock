"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationEmail = sendNotificationEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const DEFAULT_SENDER = process.env.EMAIL_SENDER ?? 'no-reply@pdf-unlock.local';
function resolveTransport() {
    if (process.env.SMTP_URL) {
        return process.env.SMTP_URL;
    }
    if (process.env.SMTP_HOST) {
        return {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER && process.env.SMTP_PASS
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                }
                : undefined,
        };
    }
    return { jsonTransport: true };
}
async function sendNotificationEmail(payload) {
    const transporter = nodemailer_1.default.createTransport(resolveTransport());
    const message = {
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
//# sourceMappingURL=email.service.js.map
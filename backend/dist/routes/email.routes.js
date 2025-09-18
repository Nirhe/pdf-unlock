"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
const sendSchema = zod_1.z.object({
    to: zod_1.z.string().email(),
    subject: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1),
    attachments: zod_1.z
        .array(zod_1.z.object({
        filename: zod_1.z.string().min(1),
        content: zod_1.z.string(),
    }))
        .optional(),
});
router.post('/send', async (req, res) => {
    try {
        const payload = sendSchema.parse(req.body);
        const info = await (0, email_service_1.sendNotificationEmail)(payload);
        return res.status(200).json({
            message: 'Email sent successfully',
            messageId: info.messageId,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request payload',
                details: error.issues,
            });
        }
        return res.status(500).json({
            error: 'Unable to send email',
        });
    }
});
exports.default = router;
//# sourceMappingURL=email.routes.js.map
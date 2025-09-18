import { Router } from 'express';
import { z } from 'zod';
import { sendNotificationEmail } from '../services/email.service';

const router = Router();

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        content: z.string(),
      })
    )
    .optional(),
});

router.post('/send', async (req, res) => {
  try {
    const payload = sendSchema.parse(req.body);
    const info = await sendNotificationEmail(payload);

    return res.status(200).json({
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

export default router;

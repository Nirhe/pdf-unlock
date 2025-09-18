import { Router } from 'express';
import { z } from 'zod';
import { createInvoice, getInvoice, recordPayment, ResourceNotFoundError } from '../services/qb.service';

const router = Router();

const invoiceSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string().optional(),
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().min(1),
});

router.post('/invoices', async (req, res) => {
  try {
    const payload = invoiceSchema.parse(req.body);
    const invoice = await createInvoice(payload);

    return res.status(201).json({
      message: 'Invoice synced successfully',
      invoice,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.issues,
      });
    }

    return res.status(500).json({
      error: 'Unable to sync invoice with QuickBooks',
    });
  }
});

router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.invoiceId);

    return res.status(200).json({ invoice });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    return res.status(500).json({
      error: 'Unable to fetch invoice from QuickBooks',
    });
  }
});

router.post('/payments', async (req, res) => {
  try {
    const payload = paymentSchema.parse(req.body);
    const result = await recordPayment(payload);

    return res.status(200).json({
      message: 'Payment recorded successfully',
      invoice: result.invoice,
      payment: result.payment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.issues,
      });
    }

    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    return res.status(500).json({
      error: 'Unable to record payment in QuickBooks',
    });
  }
});

export default router;

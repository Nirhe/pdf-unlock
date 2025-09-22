import { Router } from 'express';
import { z } from 'zod';
import {
  createInvoice,
  getInvoice,
  listCustomers,
  recordPayment,
  ResourceNotFoundError,
  DEFAULT_CUSTOMER_PAGE_SIZE,
} from '../services/qb.service';

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

const listCustomersQuerySchema = z
  .object({
    query: z
      .preprocess((value) => {
        if (Array.isArray(value)) {
          const [first] = value;
          return typeof first === 'string' ? first.trim() : undefined;
        }

        if (typeof value === 'string') {
          return value.trim();
        }

        return undefined;
      }, z.string().optional())
      .transform((value) => value ?? ''),
    page: z
      .preprocess((value) => (Array.isArray(value) ? value[0] : value), z.coerce.number().int().min(1).optional())
      .transform((value) => value ?? 1),
    pageSize: z
      .preprocess((value) => (Array.isArray(value) ? value[0] : value), z.coerce.number().int().min(1).optional())
      .transform((value) => value ?? DEFAULT_CUSTOMER_PAGE_SIZE),
  })
  .transform((value) => ({
    query: value.query,
    page: value.page,
    pageSize: value.pageSize,
  }));

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

router.get('/customers', async (req, res) => {
  const parsedQuery = listCustomersQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      error: 'Invalid request query',
      details: parsedQuery.error.issues,
    });
  }

  try {
    const { query, page, pageSize } = parsedQuery.data;
    const result = await listCustomers({ query, page, pageSize });

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({
      error: 'Unable to fetch customers from QuickBooks',
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

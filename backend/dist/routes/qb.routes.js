"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const qb_service_1 = require("../services/qb.service");
const router = (0, express_1.Router)();
const invoiceSchema = zod_1.z.object({
    customerId: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
    memo: zod_1.z.string().optional(),
});
const paymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
    method: zod_1.z.string().min(1),
});
router.post('/invoices', async (req, res) => {
    try {
        const payload = invoiceSchema.parse(req.body);
        const invoice = await (0, qb_service_1.createInvoice)(payload);
        return res.status(201).json({
            message: 'Invoice synced successfully',
            invoice,
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
            error: 'Unable to sync invoice with QuickBooks',
        });
    }
});
router.get('/invoices/:invoiceId', async (req, res) => {
    try {
        const invoice = await (0, qb_service_1.getInvoice)(req.params.invoiceId);
        return res.status(200).json({ invoice });
    }
    catch (error) {
        if (error instanceof qb_service_1.ResourceNotFoundError) {
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
        const result = await (0, qb_service_1.recordPayment)(payload);
        return res.status(200).json({
            message: 'Payment recorded successfully',
            invoice: result.invoice,
            payment: result.payment,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request payload',
                details: error.issues,
            });
        }
        if (error instanceof qb_service_1.ResourceNotFoundError) {
            return res.status(404).json({
                error: 'Invoice not found',
            });
        }
        return res.status(500).json({
            error: 'Unable to record payment in QuickBooks',
        });
    }
});
exports.default = router;
//# sourceMappingURL=qb.routes.js.map
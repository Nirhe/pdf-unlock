"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceNotFoundError = exports.QuickBooksError = void 0;
exports.createInvoice = createInvoice;
exports.getInvoice = getInvoice;
exports.recordPayment = recordPayment;
class QuickBooksError extends Error {
}
exports.QuickBooksError = QuickBooksError;
class ResourceNotFoundError extends QuickBooksError {
}
exports.ResourceNotFoundError = ResourceNotFoundError;
const invoices = new Map();
const payments = new Map();
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}
async function createInvoice(payload) {
    const timestamp = new Date();
    const invoice = {
        id: generateId('inv'),
        customerId: payload.customerId,
        amount: payload.amount,
        balance: payload.amount,
        status: 'OPEN',
        memo: payload.memo,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    invoices.set(invoice.id, invoice);
    payments.set(invoice.id, []);
    return invoice;
}
async function getInvoice(invoiceId) {
    const invoice = invoices.get(invoiceId);
    if (!invoice) {
        throw new ResourceNotFoundError('Invoice not found');
    }
    const relatedPayments = payments.get(invoiceId) ?? [];
    return {
        ...invoice,
        payments: relatedPayments.map((payment) => ({ ...payment })),
    };
}
async function recordPayment(payload) {
    const invoice = invoices.get(payload.invoiceId);
    if (!invoice) {
        throw new ResourceNotFoundError('Invoice not found');
    }
    const payment = {
        id: generateId('pay'),
        invoiceId: payload.invoiceId,
        amount: payload.amount,
        method: payload.method,
        createdAt: new Date(),
    };
    const invoicePayments = payments.get(payload.invoiceId) ?? [];
    invoicePayments.push(payment);
    payments.set(payload.invoiceId, invoicePayments);
    const paidTotal = invoicePayments.reduce((total, entry) => total + entry.amount, 0);
    invoice.balance = Math.max(invoice.amount - paidTotal, 0);
    invoice.status = invoice.balance === 0 ? 'PAID' : 'PARTIALLY_PAID';
    invoice.updatedAt = new Date();
    return { invoice: { ...invoice }, payment };
}
//# sourceMappingURL=qb.service.js.map
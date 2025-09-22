"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CUSTOMER_PAGE_SIZE = exports.ResourceNotFoundError = exports.QuickBooksError = void 0;
exports.listCustomers = listCustomers;
exports.__setCustomersForTesting = __setCustomersForTesting;
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
const customers = new Map();
exports.DEFAULT_CUSTOMER_PAGE_SIZE = 25;
const defaultCustomers = [
    { id: 'cust-001', qbId: 'QB-001', name: 'Acme Corporation', email: 'billing@acme.test' },
    { id: 'cust-002', qbId: 'QB-002', name: 'Globex Corporation', email: 'accounts@globex.test' },
    { id: 'cust-003', qbId: 'QB-003', name: 'Initech', email: 'finance@initech.test' },
    { id: 'cust-004', qbId: 'QB-004', name: 'Stark Industries', email: 'billing@starkindustries.test' },
    { id: 'cust-005', qbId: 'QB-005', name: 'Wayne Enterprises', email: 'ap@wayneenterprises.test' },
];
function normalizeCustomerSeed(seed) {
    const qbId = seed.qbId?.trim();
    const name = seed.name?.trim();
    const email = seed.email?.trim();
    if (!qbId || !name || !email) {
        return null;
    }
    const id = typeof seed.id === 'string' && seed.id.trim() ? seed.id.trim() : qbId;
    return {
        id,
        qbId,
        name,
        email,
    };
}
function seedCustomers(entries) {
    customers.clear();
    for (const entry of entries) {
        const customer = normalizeCustomerSeed(entry);
        if (!customer) {
            continue;
        }
        customers.set(customer.qbId, customer);
    }
}
seedCustomers(defaultCustomers);
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}
function normalizeQuery(query) {
    if (typeof query !== 'string') {
        return '';
    }
    return query.trim().toLowerCase();
}
function ensurePositiveInteger(value, fallback) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    const integer = Math.trunc(value);
    if (integer < 1) {
        return fallback;
    }
    return integer;
}
async function listCustomers(options = {}) {
    const query = normalizeQuery(options.query);
    const page = ensurePositiveInteger(options.page, 1);
    const pageSize = ensurePositiveInteger(options.pageSize, exports.DEFAULT_CUSTOMER_PAGE_SIZE);
    const sortedCustomers = Array.from(customers.values())
        .map((customer) => ({ ...customer }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const filteredCustomers = query
        ? sortedCustomers.filter((customer) => {
            const fields = [customer.name, customer.email, customer.id, customer.qbId];
            return fields.some((field) => field.toLowerCase().includes(query));
        })
        : sortedCustomers;
    const total = filteredCustomers.length;
    const offset = (page - 1) * pageSize;
    const customersPage = offset >= filteredCustomers.length ? [] : filteredCustomers.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < total;
    return {
        customers: customersPage,
        total,
        page,
        pageSize,
        hasMore,
    };
}
function __setCustomersForTesting(entries) {
    if (!entries) {
        seedCustomers(defaultCustomers);
        return;
    }
    seedCustomers(entries);
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
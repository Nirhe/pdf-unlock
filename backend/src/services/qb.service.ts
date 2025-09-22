export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID';

export interface InvoicePayload {
  customerId: string;
  amount: number;
  memo?: string | undefined;
}

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  balance: number;
  status: InvoiceStatus;
  memo?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentPayload {
  invoiceId: string;
  amount: number;
  method: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  createdAt: Date;
}

export class QuickBooksError extends Error {}

export class ResourceNotFoundError extends QuickBooksError {}

export interface QuickBooksCustomer {
  id: string;
  qbId: string;
  name: string;
  email: string;
}

export interface ListCustomersOptions {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCustomersResult {
  customers: QuickBooksCustomer[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

type QuickBooksCustomerSeed = QuickBooksCustomer | (Omit<QuickBooksCustomer, 'id'> & { id?: string });

const invoices = new Map<string, Invoice>();
const payments = new Map<string, Payment[]>();
const customers = new Map<string, QuickBooksCustomer>();

export const DEFAULT_CUSTOMER_PAGE_SIZE = 25;

const defaultCustomers: QuickBooksCustomerSeed[] = [
  { id: 'cust-001', qbId: 'QB-001', name: 'Acme Corporation', email: 'billing@acme.test' },
  { id: 'cust-002', qbId: 'QB-002', name: 'Globex Corporation', email: 'accounts@globex.test' },
  { id: 'cust-003', qbId: 'QB-003', name: 'Initech', email: 'finance@initech.test' },
  { id: 'cust-004', qbId: 'QB-004', name: 'Stark Industries', email: 'billing@starkindustries.test' },
  { id: 'cust-005', qbId: 'QB-005', name: 'Wayne Enterprises', email: 'ap@wayneenterprises.test' },
];

function normalizeCustomerSeed(seed: QuickBooksCustomerSeed): QuickBooksCustomer | null {
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

function seedCustomers(entries: QuickBooksCustomerSeed[]): void {
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

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeQuery(query?: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  return query.trim().toLowerCase();
}

function ensurePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.trunc(value);

  if (integer < 1) {
    return fallback;
  }

  return integer;
}

export async function listCustomers(options: ListCustomersOptions = {}): Promise<ListCustomersResult> {
  const query = normalizeQuery(options.query);
  const page = ensurePositiveInteger(options.page, 1);
  const pageSize = ensurePositiveInteger(options.pageSize, DEFAULT_CUSTOMER_PAGE_SIZE);

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

export function __setCustomersForTesting(entries?: QuickBooksCustomerSeed[]): void {
  if (!entries) {
    seedCustomers(defaultCustomers);
    return;
  }

  seedCustomers(entries);
}

export async function createInvoice(payload: InvoicePayload): Promise<Invoice> {
  const timestamp = new Date();
  const invoice: Invoice = {
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

export async function getInvoice(invoiceId: string): Promise<Invoice & { payments: Payment[] }> {
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

export async function recordPayment(payload: PaymentPayload): Promise<{ invoice: Invoice; payment: Payment }> {
  const invoice = invoices.get(payload.invoiceId);

  if (!invoice) {
    throw new ResourceNotFoundError('Invoice not found');
  }

  const payment: Payment = {
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

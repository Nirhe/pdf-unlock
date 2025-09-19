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
export declare class QuickBooksError extends Error {
}
export declare class ResourceNotFoundError extends QuickBooksError {
}
export interface QuickBooksCustomer {
    id: string;
    qbId: string;
    name: string;
    email: string;
}
type QuickBooksCustomerSeed = QuickBooksCustomer | (Omit<QuickBooksCustomer, 'id'> & {
    id?: string;
});
export declare function listCustomers(): Promise<QuickBooksCustomer[]>;
export declare function __setCustomersForTesting(entries?: QuickBooksCustomerSeed[]): void;
export declare function createInvoice(payload: InvoicePayload): Promise<Invoice>;
export declare function getInvoice(invoiceId: string): Promise<Invoice & {
    payments: Payment[];
}>;
export declare function recordPayment(payload: PaymentPayload): Promise<{
    invoice: Invoice;
    payment: Payment;
}>;
export {};
//# sourceMappingURL=qb.service.d.ts.map
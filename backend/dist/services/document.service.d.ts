export interface DocumentInvoiceDetails {
    amount: number;
    memo: string;
}
export interface DocumentSubmissionResult {
    storedPath: string;
    paymentLink: string;
    invoice: DocumentInvoiceDetails;
}
export interface UploadedDocument {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
}
export declare class DocumentProcessingError extends Error {
    constructor(message: string);
}
export declare function handleDocumentSubmission(customerId: string, file: UploadedDocument): Promise<DocumentSubmissionResult>;
//# sourceMappingURL=document.service.d.ts.map
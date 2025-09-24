export interface DocumentInvoiceDetails {
    amount: number;
    memo: string;
}
export interface DocumentSubmissionResult {
    storedPath: string;
    paymentLink: string;
    invoice: DocumentInvoiceDetails;
    downloadId: string;
    downloadFileName: string;
}
export interface UploadedDocument {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
}
export declare class DocumentProcessingError extends Error {
    constructor(message: string);
}
interface DownloadEntry {
    filePath: string;
    fileName: string;
    password: string;
}
export declare function getDownloadEntry(downloadId: string): DownloadEntry | undefined;
export declare function handleDocumentSubmission(customerId: string, file: UploadedDocument): Promise<DocumentSubmissionResult>;
export {};
//# sourceMappingURL=document.service.d.ts.map
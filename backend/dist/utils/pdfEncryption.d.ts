import { PDFContext } from 'pdf-lib/cjs/core';
export interface EncryptionPermissions {
    printing?: 'lowResolution' | 'highResolution';
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
}
export interface EncryptionOptions {
    userPassword: string;
    ownerPassword?: string;
    permissions?: EncryptionPermissions;
}
export declare function applyStandardEncryption(context: PDFContext, options: EncryptionOptions): void;
//# sourceMappingURL=pdfEncryption.d.ts.map
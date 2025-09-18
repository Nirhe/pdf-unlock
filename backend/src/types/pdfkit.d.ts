declare module 'pdfkit' {
  interface Permissions {
    printing?: 'lowResolution' | 'highResolution';
    modifying?: boolean;
    copying?: boolean;
  }

  interface PDFKitOptions {
    userPassword?: string;
    ownerPassword?: string;
    permissions?: Permissions;
  }

  export default class PDFDocument {
    constructor(options?: PDFKitOptions);
    pipe(destination: NodeJS.WritableStream): void;
    text(text: string, options?: { align?: string }): this;
    end(): void;
  }
}

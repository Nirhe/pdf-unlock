export declare const openapiSpec: {
    readonly openapi: "3.1.0";
    readonly info: {
        readonly title: "PDF Unlock API";
        readonly version: "1.0.0";
        readonly description: "API for locking/unlocking PDFs, sending documents, sending emails, and QuickBooks integrations.";
    };
    readonly servers: readonly [{
        readonly url: "/api";
        readonly description: "Relative API base (behind proxy or rewrite)";
    }, {
        readonly url: "http://localhost:3000";
        readonly description: "Local server (direct)";
    }];
    readonly paths: {
        readonly '/health': {
            readonly get: {
                readonly summary: "Health check";
                readonly tags: readonly ["system"];
                readonly responses: {
                    readonly '200': {
                        readonly description: "Service is healthy";
                        readonly content: {
                            readonly 'application/json': {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly status: {
                                            readonly type: "string";
                                            readonly example: "ok";
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly '/api/docs/lock': {
            readonly post: {
                readonly summary: "Lock a PDF with password";
                readonly tags: readonly ["documents"];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly 'application/json': {
                            readonly schema: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly inputPath: {
                                        readonly type: "string";
                                    };
                                    readonly password: {
                                        readonly type: "string";
                                    };
                                    readonly outputPath: {
                                        readonly type: "string";
                                        readonly nullable: true;
                                    };
                                    readonly download: {
                                        readonly type: "boolean";
                                        readonly nullable: true;
                                    };
                                };
                                readonly required: readonly ["inputPath", "password"];
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly '200': {
                        readonly description: "Locked successfully";
                        readonly content: {
                            readonly 'application/pdf': {
                                readonly schema: {
                                    readonly type: "string";
                                    readonly format: "binary";
                                };
                            };
                            readonly 'application/json': {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly message: {
                                            readonly type: "string";
                                        };
                                        readonly outputPath: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly '400': {
                        readonly description: "Invalid payload";
                    };
                    readonly '500': {
                        readonly description: "Unable to lock document";
                    };
                };
            };
        };
        readonly '/api/docs/unlock': {
            readonly post: {
                readonly summary: "Unlock a PDF";
                readonly tags: readonly ["documents"];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly 'application/json': {
                            readonly schema: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly inputPath: {
                                        readonly type: "string";
                                    };
                                    readonly outputPath: {
                                        readonly type: "string";
                                        readonly nullable: true;
                                    };
                                };
                                readonly required: readonly ["inputPath"];
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly '200': {
                        readonly description: "Unlocked successfully";
                        readonly content: {
                            readonly 'application/json': {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly message: {
                                            readonly type: "string";
                                        };
                                        readonly outputPath: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly '400': {
                        readonly description: "Invalid payload";
                    };
                    readonly '404': {
                        readonly description: "Document not found";
                    };
                    readonly '500': {
                        readonly description: "Unable to unlock document";
                    };
                };
            };
        };
        readonly '/api/docs/send': {
            readonly post: {
                readonly summary: "Upload a PDF for processing and send";
                readonly description: "Accepts multipart/form-data with a PDF file under field name \"document\" and a text field \"customerId\".";
                readonly tags: readonly ["documents"];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly 'multipart/form-data': {
                            readonly schema: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly customerId: {
                                        readonly type: "string";
                                    };
                                    readonly document: {
                                        readonly type: "string";
                                        readonly format: "binary";
                                    };
                                };
                                readonly required: readonly ["customerId", "document"];
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly '200': {
                        readonly description: "Document sent successfully";
                        readonly content: {
                            readonly 'application/json': {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly message: {
                                            readonly type: "string";
                                        };
                                        readonly paymentLink: {
                                            readonly type: "string";
                                        };
                                        readonly invoice: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly amount: {
                                                    readonly type: "number";
                                                };
                                                readonly balance: {
                                                    readonly type: "number";
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly '400': {
                        readonly description: "Validation error / wrong file type / missing file";
                    };
                    readonly '502': {
                        readonly description: "Downstream processing error";
                    };
                    readonly '500': {
                        readonly description: "Unable to send document";
                    };
                };
            };
        };
        readonly '/api/email/send': {
            readonly post: {
                readonly summary: "Send a notification email";
                readonly tags: readonly ["email"];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly 'application/json': {
                            readonly schema: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly to: {
                                        readonly type: "string";
                                        readonly format: "email";
                                    };
                                    readonly subject: {
                                        readonly type: "string";
                                    };
                                    readonly text: {
                                        readonly type: "string";
                                    };
                                    readonly attachments: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly filename: {
                                                    readonly type: "string";
                                                };
                                                readonly content: {
                                                    readonly type: "string";
                                                };
                                            };
                                            readonly required: readonly ["filename", "content"];
                                        };
                                    };
                                };
                                readonly required: readonly ["to", "subject", "text"];
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly '200': {
                        readonly description: "Email sent successfully";
                        readonly content: {
                            readonly 'application/json': {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly message: {
                                            readonly type: "string";
                                        };
                                        readonly messageId: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly '400': {
                        readonly description: "Invalid payload";
                    };
                    readonly '500': {
                        readonly description: "Unable to send email";
                    };
                };
            };
        };
        readonly '/api/qb/customers': {
            readonly get: {
                readonly summary: "List customers";
                readonly tags: readonly ["quickbooks"];
                readonly responses: {
                    readonly '200': {
                        readonly description: "List of customers";
                        readonly content: {
                            readonly 'application/json': {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly customers: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly '500': {
                        readonly description: "Unable to fetch customers";
                    };
                };
            };
        };
        readonly '/api/qb/invoices': {
            readonly post: {
                readonly summary: "Create an invoice";
                readonly tags: readonly ["quickbooks"];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly 'application/json': {
                            readonly schema: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly customerId: {
                                        readonly type: "string";
                                    };
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly memo: {
                                        readonly type: "string";
                                        readonly nullable: true;
                                    };
                                };
                                readonly required: readonly ["customerId", "amount"];
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly '201': {
                        readonly description: "Invoice created and synced";
                    };
                    readonly '400': {
                        readonly description: "Invalid payload";
                    };
                    readonly '500': {
                        readonly description: "Unable to sync invoice with QuickBooks";
                    };
                };
            };
        };
        readonly '/api/qb/invoices/{invoiceId}': {
            readonly get: {
                readonly summary: "Get an invoice by ID";
                readonly tags: readonly ["quickbooks"];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "invoiceId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly '200': {
                        readonly description: "Invoice found";
                    };
                    readonly '404': {
                        readonly description: "Invoice not found";
                    };
                    readonly '500': {
                        readonly description: "Unable to fetch invoice";
                    };
                };
            };
        };
        readonly '/api/qb/payments': {
            readonly post: {
                readonly summary: "Record a payment against an invoice";
                readonly tags: readonly ["quickbooks"];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly 'application/json': {
                            readonly schema: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly invoiceId: {
                                        readonly type: "string";
                                    };
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly method: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["invoiceId", "amount", "method"];
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly '200': {
                        readonly description: "Payment recorded successfully";
                    };
                    readonly '400': {
                        readonly description: "Invalid payload";
                    };
                    readonly '404': {
                        readonly description: "Invoice not found";
                    };
                    readonly '500': {
                        readonly description: "Unable to record payment";
                    };
                };
            };
        };
    };
    readonly tags: readonly [{
        readonly name: "system";
    }, {
        readonly name: "documents";
    }, {
        readonly name: "email";
    }, {
        readonly name: "quickbooks";
    }];
};
//# sourceMappingURL=swagger.d.ts.map
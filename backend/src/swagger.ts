/*
  OpenAPI spec for the PDF Unlock backend
*/
export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'PDF Unlock API',
    version: '1.0.0',
    description:
      'API for locking/unlocking PDFs, sending documents, sending emails, and QuickBooks integrations.'
  },
  servers: [
    { url: '/api', description: 'Relative API base (behind proxy or rewrite)' },
    { url: 'http://localhost:3000', description: 'Local server (direct)' }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['system'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } }
                }
              }
            }
          }
        }
      }
    },
    '/api/docs/lock': {
      post: {
        summary: 'Lock a PDF with password',
        tags: ['documents'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  document: { type: 'string', format: 'binary' },
                  password: { type: 'string' }
                },
                required: ['document', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Locked successfully',
            content: {
              'application/pdf': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              }
            }
          },
          '400': { description: 'Invalid payload' },
          '500': { description: 'Unable to lock document' }
        }
      }
    },
    '/api/docs/unlock': {
      post: {
        summary: 'Unlock a PDF',
        tags: ['documents'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  inputPath: { type: 'string' },
                  outputPath: { type: 'string', nullable: true }
                },
                required: ['inputPath']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Unlocked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    outputPath: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': { description: 'Invalid payload' },
          '404': { description: 'Document not found' },
          '500': { description: 'Unable to unlock document' }
        }
      }
    },
    '/api/docs/send': {
      post: {
        summary: 'Upload a PDF for processing and send',
        description:
          'Accepts multipart/form-data with a PDF file under field name "document" and a text field "customerId".',
        tags: ['documents'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  customerId: { type: 'string' },
                  document: { type: 'string', format: 'binary' }
                },
                required: ['customerId', 'document']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Document sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    paymentLink: { type: 'string' },
                    invoice: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        amount: { type: 'number' },
                        balance: { type: 'number' },
                        status: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Validation error / wrong file type / missing file' },
          '502': { description: 'Downstream processing error' },
          '500': { description: 'Unable to send document' }
        }
      }
    },
    '/api/email/send': {
      post: {
        summary: 'Send a notification email',
        tags: ['email'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  to: { type: 'string', format: 'email' },
                  subject: { type: 'string' },
                  text: { type: 'string' },
                  attachments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        filename: { type: 'string' },
                        content: { type: 'string' }
                      },
                      required: ['filename', 'content']
                    }
                  }
                },
                required: ['to', 'subject', 'text']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Email sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    messageId: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': { description: 'Invalid payload' },
          '500': { description: 'Unable to send email' }
        }
      }
    },
    '/api/qb/customers': {
      get: {
        summary: 'List customers',
        tags: ['quickbooks'],
        responses: {
          '200': {
            description: 'List of customers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customers: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          '500': { description: 'Unable to fetch customers' }
        }
      }
    },
    '/api/qb/invoices': {
      post: {
        summary: 'Create an invoice',
        tags: ['quickbooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customerId: { type: 'string' },
                  amount: { type: 'number' },
                  memo: { type: 'string', nullable: true }
                },
                required: ['customerId', 'amount']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Invoice created and synced' },
          '400': { description: 'Invalid payload' },
          '500': { description: 'Unable to sync invoice with QuickBooks' }
        }
      }
    },
    '/api/qb/invoices/{invoiceId}': {
      get: {
        summary: 'Get an invoice by ID',
        tags: ['quickbooks'],
        parameters: [
          { in: 'path', name: 'invoiceId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Invoice found' },
          '404': { description: 'Invoice not found' },
          '500': { description: 'Unable to fetch invoice' }
        }
      }
    },
    '/api/qb/payments': {
      post: {
        summary: 'Record a payment against an invoice',
        tags: ['quickbooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  invoiceId: { type: 'string' },
                  amount: { type: 'number' },
                  method: { type: 'string' }
                },
                required: ['invoiceId', 'amount', 'method']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Payment recorded successfully' },
          '400': { description: 'Invalid payload' },
          '404': { description: 'Invoice not found' },
          '500': { description: 'Unable to record payment' }
        }
      }
    }
  },
  tags: [
    { name: 'system' },
    { name: 'documents' },
    { name: 'email' },
    { name: 'quickbooks' }
  ]
} as const;

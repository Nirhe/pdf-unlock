const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { Blob } = require('node:buffer');
const { PDFDocument } = require('pdf-lib');

const app = require('../dist/app').default;
const qbService = require('../dist/services/qb.service');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);

  await new Promise((resolve) => {
    server.once('listening', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`;
      } else {
        baseUrl = 'http://127.0.0.1:0';
      }
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

async function requestJson(endpoint, options) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json();
  return { response, body };
}

async function requestMultipart(endpoint, formData, expectJson = true) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  let body;
  if (expectJson) {
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
  }

  return { response, body };
}

async function createSamplePdfBytes() {
  const pdfDocument = await PDFDocument.create();
  pdfDocument.addPage([300, 300]);
  const pdfBytes = await pdfDocument.save();
  return Buffer.from(pdfBytes);
}

test('locks an uploaded PDF document and returns the encrypted file', async () => {
  const pdfBytes = await createSamplePdfBytes();
  const formData = new FormData();
  formData.append('document', new Blob([pdfBytes], { type: 'application/pdf' }), 'download.pdf');
  formData.append('password', 'download-secret');

  const response = await fetch(`${baseUrl}/api/docs/lock`, {
    method: 'POST',
    body: formData,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');

  const disposition = response.headers.get('content-disposition');
  assert.ok(disposition);
  assert.match(disposition, /attachment/);
  assert.match(disposition, /\.pdf/);

  const lockedBytes = Buffer.from(await response.arrayBuffer());
  assert.ok(lockedBytes.length > 0);

  const unlockedDoc = await PDFDocument.load(lockedBytes, { password: 'download-secret' });
  assert.equal(unlockedDoc.getPageCount(), 1);
});

test('requires a document file when locking', async () => {
  const formData = new FormData();
  formData.append('password', 'missing-file');

  const { response, body } = await requestMultipart('/api/docs/lock', formData);

  assert.equal(response.status, 400);
  assert.ok(body);
  assert.equal(body.error, 'Document file is required');
});

test('requires a password when locking a document', async () => {
  const pdfBytes = await createSamplePdfBytes();
  const formData = new FormData();
  formData.append('document', new Blob([pdfBytes], { type: 'application/pdf' }), 'no-password.pdf');

  const { response, body } = await requestMultipart('/api/docs/lock', formData);

  assert.equal(response.status, 400);
  assert.ok(body);
  assert.equal(body.error, 'Password is required');
});

test('rejects non-PDF uploads when locking a document', async () => {
  const formData = new FormData();
  formData.append('document', new Blob(['hello world'], { type: 'text/plain' }), 'sample.txt');
  formData.append('password', 'secret');

  const { response, body } = await requestMultipart('/api/docs/lock', formData);

  assert.equal(response.status, 400);
  assert.ok(body);
  assert.equal(body.error, 'Uploaded file must be a PDF document');
});

test('unlocks a document', async () => {
  const lockedPath = path.join(os.tmpdir(), `locked-${Date.now()}.pdf`);
  await fs.writeFile(lockedPath, 'locked-content');

  const { response, body } = await requestJson('/api/docs/unlock', {
    method: 'POST',
    body: JSON.stringify({ inputPath: lockedPath }),
  });

  assert.equal(response.status, 200);
  assert.ok(body.outputPath);

  const unlockedContent = await fs.readFile(body.outputPath, 'utf8');
  assert.equal(unlockedContent, 'locked-content');

  await fs.unlink(body.outputPath);
  await fs.unlink(lockedPath);
});

test('returns 404 when unlocking missing document', async () => {
  const { response, body } = await requestJson('/api/docs/unlock', {
    method: 'POST',
    body: JSON.stringify({ inputPath: '/tmp/does-not-exist.pdf' }),
  });

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Document not found');
});

test('rejects non-PDF input when unlocking a document', async () => {
  const inputPath = path.join(os.tmpdir(), `locked-${Date.now()}.txt`);
  await fs.writeFile(inputPath, 'locked-content');

  try {
    const { response, body } = await requestJson('/api/docs/unlock', {
      method: 'POST',
      body: JSON.stringify({ inputPath }),
    });

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Invalid request payload');
  } finally {
    await fs.unlink(inputPath).catch(() => {});
  }
});

test('rejects JSON payload when uploading a document', async () => {
  const { response, body } = await requestJson('/api/docs/send', {
    method: 'POST',
    body: JSON.stringify({ customerId: 'cust-123' }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'Unsupported content type' });
});

test('uploads a document for sending and returns payment link', async () => {
  const formData = new FormData();
  formData.set('customerId', 'cust-123');
  formData.append(
    'document',
    new Blob(['%PDF-1.4 test document'], { type: 'application/pdf' }),
    'sample.pdf'
  );

  const { response, body } = await requestMultipart('/api/docs/send', formData);

  assert.equal(response.status, 200);
  assert.equal(body.message, 'Document sent successfully');
  assert.match(body.paymentLink, /^https:\/\/payments\.example\.com\//);
  assert.ok(body.invoice);
  assert.equal(typeof body.invoice.id, 'string');
  assert.notEqual(body.invoice.id.length, 0);
  assert.equal(body.invoice.amount, 125);
  assert.equal(body.invoice.balance, 125);
  assert.equal(body.invoice.status, 'OPEN');
});

test('validates customerId when uploading a document', async () => {
  const formData = new FormData();
  formData.append(
    'document',
    new Blob(['%PDF-1.4 test document'], { type: 'application/pdf' }),
    'sample.pdf'
  );

  const { response, body } = await requestMultipart('/api/docs/send', formData);

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid request payload');
});

test('rejects upload without a document file', async () => {
  const formData = new FormData();
  formData.set('customerId', 'cust-999');

  const { response, body } = await requestMultipart('/api/docs/send', formData);

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Document file is required');
});

test('rejects document upload that exceeds size limit', async () => {
  const formData = new FormData();
  formData.set('customerId', 'cust-oversized');
  formData.append(
    'document',
    new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)], { type: 'application/pdf' }),
    'oversized.pdf'
  );

  const { response, body } = await requestMultipart('/api/docs/send', formData);

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Uploaded file is too large');
});

test('handles downstream errors when uploading a document', async () => {
  process.env.DOCUMENT_SERVICE_FAIL_CUSTOMER_ID = 'cust-failure';

  try {
    const formData = new FormData();
    formData.set('customerId', 'cust-failure');
    formData.append(
      'document',
      new Blob(['%PDF-1.4 test document'], { type: 'application/pdf' }),
      'sample.pdf'
    );

    const { response, body } = await requestMultipart('/api/docs/send', formData);

    assert.equal(response.status, 502);
    assert.equal(body.error, 'Failed to generate payment link');
  } finally {
    delete process.env.DOCUMENT_SERVICE_FAIL_CUSTOMER_ID;
  }
});

test('sends a notification email', async () => {
  const { response, body } = await requestJson('/api/email/send', {
    method: 'POST',
    body: JSON.stringify({ to: 'customer@example.com', subject: 'Test', text: 'Hello!' }),
  });

  assert.equal(response.status, 200);
  assert.equal(body.message, 'Email sent successfully');
  assert.ok(body.messageId);
});

test('validates email payload', async () => {
  const { response, body } = await requestJson('/api/email/send', {
    method: 'POST',
    body: JSON.stringify({ to: 'invalid-email', subject: '', text: '' }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid request payload');
});

test('filters QuickBooks customers by query across multiple fields', async () => {
  qbService.__setCustomersForTesting([
    { id: 'cust-delta', qbId: 'QB-DELTA', name: 'Delta Partners', email: 'hello@alpha-delta.test' },
    { id: 'cust-alpha', qbId: 'QB-ALPHA', name: 'Alpha Holdings', email: 'billing@alpha.test' },
    { id: 'cust-gamma', qbId: 'QB-GAMMA', name: 'Gamma Services', email: 'support@gamma.test' },
    { id: 'cust-beta', qbId: 'QB-BETA', name: 'Beta Manufacturing', email: 'accounts@beta.test' },
  ]);

  try {
    const alphaSearch = await requestJson('/api/qb/customers?query=ALPHA', { method: 'GET' });

    assert.equal(alphaSearch.response.status, 200);
    assert.deepEqual(alphaSearch.body, {
      customers: [
        { id: 'cust-alpha', qbId: 'QB-ALPHA', name: 'Alpha Holdings', email: 'billing@alpha.test' },
        { id: 'cust-delta', qbId: 'QB-DELTA', name: 'Delta Partners', email: 'hello@alpha-delta.test' },
      ],
      total: 2,
      page: 1,
      pageSize: 25,
      hasMore: false,
    });

    const idSearch = await requestJson('/api/qb/customers?query=cust-gamma', { method: 'GET' });

    assert.equal(idSearch.response.status, 200);
    assert.equal(idSearch.body.total, 1);
    assert.equal(idSearch.body.page, 1);
    assert.equal(idSearch.body.pageSize, 25);
    assert.equal(idSearch.body.hasMore, false);
    assert.deepEqual(idSearch.body.customers, [
      { id: 'cust-gamma', qbId: 'QB-GAMMA', name: 'Gamma Services', email: 'support@gamma.test' },
    ]);

    const qbIdSearch = await requestJson('/api/qb/customers?query=qb-beta', { method: 'GET' });

    assert.equal(qbIdSearch.response.status, 200);
    assert.equal(qbIdSearch.body.total, 1);
    assert.equal(qbIdSearch.body.page, 1);
    assert.equal(qbIdSearch.body.pageSize, 25);
    assert.equal(qbIdSearch.body.hasMore, false);
    assert.deepEqual(qbIdSearch.body.customers, [
      { id: 'cust-beta', qbId: 'QB-BETA', name: 'Beta Manufacturing', email: 'accounts@beta.test' },
    ]);
  } finally {
    qbService.__setCustomersForTesting();
  }
});

test('paginates QuickBooks customers and reports hasMore correctly', async () => {
  qbService.__setCustomersForTesting([
    { id: 'cust-3', qbId: 'QB-3', name: 'Charlie Services', email: 'charlie@example.test' },
    { id: 'cust-5', qbId: 'QB-5', name: 'Echo Logistics', email: 'echo@example.test' },
    { id: 'cust-1', qbId: 'QB-1', name: 'Alpha Studios', email: 'alpha@example.test' },
    { id: 'cust-2', qbId: 'QB-2', name: 'Bravo Systems', email: 'bravo@example.test' },
    { id: 'cust-4', qbId: 'QB-4', name: 'Delta Partners', email: 'delta@example.test' },
  ]);

  try {
    const { response, body } = await requestJson('/api/qb/customers?page=2&pageSize=2', { method: 'GET' });

    assert.equal(response.status, 200);
    assert.deepEqual(body.customers, [
      { id: 'cust-3', qbId: 'QB-3', name: 'Charlie Services', email: 'charlie@example.test' },
      { id: 'cust-4', qbId: 'QB-4', name: 'Delta Partners', email: 'delta@example.test' },
    ]);
    assert.equal(body.total, 5);
    assert.equal(body.page, 2);
    assert.equal(body.pageSize, 2);
    assert.equal(body.hasMore, true);
  } finally {
    qbService.__setCustomersForTesting();
  }
});

test('returns empty customer list with metadata when page exceeds available results', async () => {
  qbService.__setCustomersForTesting([
    { id: 'cust-1', qbId: 'QB-1', name: 'Alpha Studios', email: 'alpha@example.test' },
    { id: 'cust-2', qbId: 'QB-2', name: 'Bravo Systems', email: 'bravo@example.test' },
    { id: 'cust-3', qbId: 'QB-3', name: 'Charlie Services', email: 'charlie@example.test' },
  ]);

  try {
    const { response, body } = await requestJson('/api/qb/customers?page=4&pageSize=2', { method: 'GET' });

    assert.equal(response.status, 200);
    assert.deepEqual(body.customers, []);
    assert.equal(body.total, 3);
    assert.equal(body.page, 4);
    assert.equal(body.pageSize, 2);
    assert.equal(body.hasMore, false);
  } finally {
    qbService.__setCustomersForTesting();
  }
});

test('returns metadata when no QuickBooks customers are available', async () => {
  qbService.__setCustomersForTesting([]);

  try {
    const { response, body } = await requestJson('/api/qb/customers', { method: 'GET' });

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      customers: [],
      total: 0,
      page: 1,
      pageSize: 25,
      hasMore: false,
    });
  } finally {
    qbService.__setCustomersForTesting();
  }
});

test('validates query parameters for QuickBooks customer search', async () => {
  const { response, body } = await requestJson('/api/qb/customers?page=0&pageSize=-5', { method: 'GET' });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid request query');
  assert.ok(Array.isArray(body.details));
  const issuePaths = body.details.map((issue) => issue.path.join('.'));
  assert.ok(issuePaths.includes('page'));
  assert.ok(issuePaths.includes('pageSize'));
});

test('creates an invoice and records payment', async () => {
  const invoiceRequest = await requestJson('/api/qb/invoices', {
    method: 'POST',
    body: JSON.stringify({ customerId: 'cust-1', amount: 150, memo: 'Quarterly subscription' }),
  });

  assert.equal(invoiceRequest.response.status, 201);
  assert.ok(invoiceRequest.body.invoice.id);

  const invoiceId = invoiceRequest.body.invoice.id;

  const paymentRequest = await requestJson('/api/qb/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, amount: 150, method: 'credit_card' }),
  });

  assert.equal(paymentRequest.response.status, 200);
  assert.equal(paymentRequest.body.invoice.status, 'PAID');
  assert.equal(paymentRequest.body.payment.amount, 150);

  const fetchResponse = await fetch(`${baseUrl}/api/qb/invoices/${invoiceId}`);
  const invoiceBody = await fetchResponse.json();
  assert.equal(fetchResponse.status, 200);
  assert.equal(invoiceBody.invoice.id, invoiceId);
});

test('validates invoice payload', async () => {
  const { response, body } = await requestJson('/api/qb/invoices', {
    method: 'POST',
    body: JSON.stringify({ customerId: '', amount: -1 }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid request payload');
});

test('handles missing invoice when recording payment', async () => {
  const { response, body } = await requestJson('/api/qb/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId: 'missing', amount: 50, method: 'cash' }),
  });

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Invoice not found');
});

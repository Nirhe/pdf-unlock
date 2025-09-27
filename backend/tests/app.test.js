const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { Blob } = require('node:buffer');
const { PDFDocument } = require('pdf-lib');
const {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFStream,
  PDFString,
  PDFRawStream,
} = require('pdf-lib/cjs/core');
const CryptoJS = require('crypto-js');

const app = require('../dist/app').default;
const qbService = require('../dist/services/qb.service');

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff,
  0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c,
  0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

const KEY_BYTES = 5;

function wordArrayToUint8(wordArray) {
  const byteArray = [];
  for (let i = 0; i < wordArray.sigBytes; i += 1) {
    const word = wordArray.words[Math.floor(i / 4)];
    byteArray.push((word >> (24 - (i % 4) * 8)) & 0xff);
  }
  return Uint8Array.from(byteArray);
}

function md5Bytes(bytes) {
  const hash = CryptoJS.MD5(CryptoJS.lib.WordArray.create(bytes, bytes.length));
  return wordArrayToUint8(hash);
}

function padPassword(password) {
  const output = new Uint8Array(32);
  const length = Math.min(password.length, 32);
  for (let i = 0; i < length; i += 1) {
    const code = password.charCodeAt(i);
    if (code > 0xff) {
      throw new Error('Password contains one or more invalid characters.');
    }
    output[i] = code;
  }
  output.set(PASSWORD_PADDING.subarray(0, 32 - length), length);
  return output;
}

function rc4(key, data) {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    s[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    const si = s[i];
    const keyByte = key[i % key.length];
    j = (j + si + keyByte) & 0xff;
    const sj = s[j];
    s[i] = sj;
    s[j] = si;
  }
  const result = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let idx = 0; idx < data.length; idx += 1) {
    i = (i + 1) & 0xff;
    const si = s[i];
    j = (j + si) & 0xff;
    const sj = s[j];
    s[i] = sj;
    s[j] = si;
    const k = s[(s[i] + s[j]) & 0xff];
    result[idx] = data[idx] ^ k;
  }
  return result;
}

function objectEncryptionKey(baseKey, ref) {
  const buffer = new Uint8Array(baseKey.length + 5);
  buffer.set(baseKey, 0);
  buffer[baseKey.length + 0] = ref.objectNumber & 0xff;
  buffer[baseKey.length + 1] = (ref.objectNumber >> 8) & 0xff;
  buffer[baseKey.length + 2] = (ref.objectNumber >> 16) & 0xff;
  buffer[baseKey.length + 3] = ref.generationNumber & 0xff;
  buffer[baseKey.length + 4] = (ref.generationNumber >> 8) & 0xff;
  return md5Bytes(buffer).subarray(0, KEY_BYTES);
}

function applyCipherToObject(object, ref, key, context, visited) {
  if (visited.has(object)) return object;
  visited.add(object);

  const cipher = (input) => rc4(key, input);

  if (object instanceof PDFString || object instanceof PDFHexString) {
    const bytes = object.asBytes();
    return PDFHexString.of(Buffer.from(cipher(bytes)).toString('hex'));
  }

  if (object instanceof PDFStream) {
    const encrypted = cipher(object.getContents());
    const dict = object.dict.clone(context);
    return PDFRawStream.of(dict, encrypted);
  }

  if (object instanceof PDFDict) {
    for (const [keyName, value] of object.entries()) {
      if (value instanceof PDFRef) continue;
      const updated = applyCipherToObject(value, ref, key, context, visited);
      if (updated !== value) object.set(keyName, updated);
    }
    return object;
  }

  if (object instanceof PDFArray) {
    for (let idx = 0; idx < object.size(); idx += 1) {
      const value = object.get(idx);
      if (value instanceof PDFRef) continue;
      const updated = applyCipherToObject(value, ref, key, context, visited);
      if (updated !== value) object.set(idx, updated);
    }
    return object;
  }

  return object;
}

async function decryptPdfWithPassword(encryptedBytes, password) {
  const pdfDoc = await PDFDocument.load(encryptedBytes, { ignoreEncryption: true });
  const encryptRef = pdfDoc.context.trailerInfo.Encrypt;
  if (!encryptRef) throw new Error('Document is not encrypted');
  const encryptDict = pdfDoc.context.lookup(encryptRef, PDFDict);

  const ownerHex = pdfDoc.context.lookup(encryptDict.get(PDFName.of('O')), PDFHexString).asString();
  const userHex = pdfDoc.context.lookup(encryptDict.get(PDFName.of('U')), PDFHexString).asString();
  const permissions = pdfDoc.context.lookup(encryptDict.get(PDFName.of('P'))).asNumber();
  const ids = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.ID, PDFArray);
  const fileId = pdfDoc.context.lookup(ids.get(0), PDFHexString).asString();

  const paddedUser = padPassword(password);
  const ownerEntry = Buffer.from(ownerHex, 'hex');
  const fileIdBytes = Buffer.from(fileId, 'hex');
  const buffer = new Uint8Array(paddedUser.length + ownerEntry.length + 4 + fileIdBytes.length);
  let offset = 0;
  buffer.set(paddedUser, offset);
  offset += paddedUser.length;
  buffer.set(ownerEntry, offset);
  offset += ownerEntry.length;
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
  view.setInt32(0, permissions, true);
  offset += 4;
  buffer.set(fileIdBytes, offset);

  const encryptionKey = md5Bytes(buffer).subarray(0, KEY_BYTES);
  const expectedUser = Buffer.from(userHex, 'hex');
  const computedUser = Buffer.from(rc4(encryptionKey, PASSWORD_PADDING));
  if (!expectedUser.equals(computedUser)) {
    throw new Error('Invalid password');
  }

  const visited = new Set();
  for (const [ref, object] of pdfDoc.context.enumerateIndirectObjects()) {
    if (ref === encryptRef) continue;
    const key = objectEncryptionKey(encryptionKey, ref);
    const updated = applyCipherToObject(object, ref, key, pdfDoc.context, visited);
    if (updated !== object) {
      pdfDoc.context.assign(ref, updated);
    }
  }

  pdfDoc.context.trailerInfo.Encrypt = undefined;

  return pdfDoc.save({ useObjectStreams: false });
}

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

  // Decrypt helper verifies passwords
  await assert.rejects(async () => decryptPdfWithPassword(lockedBytes, 'incorrect'));

  const decrypted = await decryptPdfWithPassword(lockedBytes, 'download-secret');
  const unlockedDoc = await PDFDocument.load(decrypted);
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

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const app = require('../dist/app').default;

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

test('locks a document', async () => {
  const inputPath = path.join(os.tmpdir(), `sample-${Date.now()}.pdf`);
  await fs.writeFile(inputPath, 'dummy');

  const { response, body } = await requestJson('/api/docs/lock', {
    method: 'POST',
    body: JSON.stringify({ inputPath, password: 'secret' }),
  });

  assert.equal(response.status, 200);
  assert.ok(body.outputPath);
  await fs.access(body.outputPath);

  await fs.unlink(body.outputPath);
  await fs.unlink(inputPath);
});

test('returns 400 when lock payload invalid', async () => {
  const { response, body } = await requestJson('/api/docs/lock', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid request payload');
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

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { startInvoiceStatusPolling } from '../dist-test/pages/startInvoiceStatusPolling.js'

describe('startInvoiceStatusPolling', () => {
  it('polls until the invoice status is PAID', async () => {
    const statuses = ['SENT', 'PARTIALLY_PAID', 'PAID']
    const observed = []
    let receivedError = null

    startInvoiceStatusPolling({
      fetchStatus: async () => statuses.shift() ?? 'PAID',
      onStatus: (status) => {
        observed.push(status)
      },
      onError: (error) => {
        receivedError = error
      },
      intervalMs: 0,
      timeoutMs: 100,
    })

    for (let attempt = 0; attempt < 10 && observed[observed.length - 1] !== 'PAID'; attempt += 1) {
      await delay(10)
    }

    assert.deepEqual(observed, ['SENT', 'PARTIALLY_PAID', 'PAID'])
    assert.equal(receivedError, null)
  })

  it('stops polling when cleanup is invoked', async () => {
    let calls = 0

    const stop = startInvoiceStatusPolling({
      fetchStatus: async () => {
        calls += 1
        return 'SENT'
      },
      onStatus: () => {},
      onError: () => {},
      intervalMs: 0,
      timeoutMs: 100,
    })

    await delay(5)
    stop()
    const callsAfterCleanup = calls

    await delay(20)

    assert.equal(calls, callsAfterCleanup)
  })

  it('reports an error when polling times out', async () => {
    let receivedError = null

    startInvoiceStatusPolling({
      fetchStatus: async () => 'SENT',
      onStatus: () => {},
      onError: (error) => {
        receivedError = error
      },
      intervalMs: 5,
      timeoutMs: 15,
    })

    await delay(40)

    assert(receivedError instanceof Error)
    assert.equal(receivedError?.message, 'Timed out while waiting for payment confirmation.')
  })
})

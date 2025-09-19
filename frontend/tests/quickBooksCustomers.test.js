import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeQuickBooksCustomersResponse } from '../dist-test/api/qb.js'

describe('normalizeQuickBooksCustomersResponse', () => {
  it('normalizes array responses and sorts by customer name', () => {
    const result = normalizeQuickBooksCustomersResponse([
      { qbId: 'qb-2', name: 'Beta Industries', email: 'beta@example.com' },
      { qbId: 'qb-1', name: 'alpha systems', email: 'alpha@example.com' },
    ])

    assert.equal(result.length, 2)
    assert.deepEqual(
      result.map((customer) => customer.qbId),
      ['qb-1', 'qb-2'],
    )
    assert.equal(result[0].name, 'alpha systems')
  })

  it('extracts customers from envelope payloads', () => {
    const result = normalizeQuickBooksCustomersResponse({
      customers: [
        { qbId: 'qb-3', name: 'Gamma Labs', email: 'gamma@example.com' },
        { qbId: 'qb-4', name: 'Delta Works', email: 'delta@example.com' },
      ],
    })

    assert.equal(result.length, 2)
    assert.deepEqual(
      result.map((customer) => customer.name),
      ['Delta Works', 'Gamma Labs'],
    )
  })

  it('deduplicates by QuickBooks ID, trims fields, and ignores invalid entries', () => {
    const result = normalizeQuickBooksCustomersResponse([
      { qbId: 'qb-1', name: ' Alpha Co ', email: 'alpha@example.com ' },
      { qbId: 'qb-1', name: 'Alpha Duplicate', email: 'duplicate@example.com' },
      { id: 'legacy-9', name: 'Beta Group', email: 'beta@example.com' },
      { qbId: '', name: 'No Id', email: 'noid@example.com' },
      { qbId: 'qb-3', name: '  ', email: 'missing@example.com' },
      { qbId: 'qb-4', name: 'Delta Holdings', email: '' },
    ])

    assert.equal(result.length, 2)
    assert.deepEqual(
      result,
      [
        { id: 'qb-1', qbId: 'qb-1', name: 'Alpha Co', email: 'alpha@example.com' },
        { id: 'legacy-9', qbId: 'legacy-9', name: 'Beta Group', email: 'beta@example.com' },
      ],
    )
  })
})

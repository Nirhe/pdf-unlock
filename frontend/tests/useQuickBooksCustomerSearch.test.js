import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE,
  buildQuickBooksCustomerSearchKey,
  normalizeQuickBooksCustomerSearchResponse,
  sanitizeQuickBooksCustomerSearchQuery,
} from '../dist-test/api/useQuickBooksCustomerSearch.js'

describe('sanitizeQuickBooksCustomerSearchQuery', () => {
  it('normalises whitespace and defaults paging options', () => {
    const result = sanitizeQuickBooksCustomerSearchQuery({
      query: '  beta  ',
      page: 2.9,
      pageSize: 15.2,
    })

    assert.equal(result.query, 'beta')
    assert.equal(result.page, 2)
    assert.equal(result.pageSize, 15)
    assert.equal(result.enabled, true)
    assert.deepEqual(result.requestParams, { query: 'beta', page: 2, pageSize: 15 })
  })

  it('falls back to page 1 and the default page size when values are invalid', () => {
    const result = sanitizeQuickBooksCustomerSearchQuery({
      query: '   ',
      page: -4,
      pageSize: 0,
      enabled: false,
    })

    assert.equal(result.query, '')
    assert.equal(result.page, 1)
    assert.equal(result.pageSize, DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE)
    assert.equal(result.enabled, false)
    assert.deepEqual(result.requestParams, {
      query: undefined,
      page: 1,
      pageSize: DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE,
    })
  })
})

describe('buildQuickBooksCustomerSearchKey', () => {
  it('creates a stable query key for the combination of search parameters', () => {
    const key = buildQuickBooksCustomerSearchKey('alpha', 3, 40)

    assert.deepEqual(key, ['qb', 'customers', 'search', 'alpha', 3, 40])
  })
})

describe('normalizeQuickBooksCustomerSearchResponse', () => {
  const customers = [
    { id: '1', qbId: 'qb-1', name: 'Alpha', email: 'alpha@example.com' },
    { id: '2', qbId: 'qb-2', name: 'Beta', email: 'beta@example.com' },
  ]

  it('preserves pagination metadata when available', () => {
    const result = normalizeQuickBooksCustomerSearchResponse(
      {
        customers,
        total: 20,
        page: 4,
        pageSize: 5,
        hasMore: true,
      },
      1,
      10,
    )

    assert.equal(result.total, 20)
    assert.equal(result.page, 4)
    assert.equal(result.pageSize, 5)
    assert.equal(result.hasMore, true)
    assert.deepEqual(result.customers.map((customer) => customer.qbId), ['qb-1', 'qb-2'])
  })

  it('computes total and hasMore when metadata is missing or invalid', () => {
    const result = normalizeQuickBooksCustomerSearchResponse(customers, 2, 1)

    assert.equal(result.total, 2)
    assert.equal(result.page, 2)
    assert.equal(result.pageSize, 1)
    assert.equal(result.hasMore, false)
  })
})

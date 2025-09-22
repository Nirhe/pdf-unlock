import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  calculateVirtualListHeight,
  deriveVirtualRange,
  formatCustomerOption,
  isCustomerSelected,
  mergeCustomerPages,
} from '../dist-test/components/CustomerSelector.js'

describe('formatCustomerOption', () => {
  it('formats customer information as "Name (email)"', () => {
    const option = formatCustomerOption({
      id: '1',
      qbId: 'qb-1',
      name: 'Acme Corp',
      email: 'billing@acme.test',
    })

    assert.equal(option, 'Acme Corp (billing@acme.test)')
  })
})

describe('mergeCustomerPages', () => {
  it('concatenates pages while removing duplicate QuickBooks IDs', () => {
    const merged = mergeCustomerPages([
      [
        { id: '1', qbId: 'qb-1', name: 'Alpha', email: 'alpha@example.com' },
        { id: '2', qbId: 'qb-2', name: 'Beta', email: 'beta@example.com' },
      ],
      [
        { id: '3', qbId: 'qb-2', name: 'Duplicate', email: 'dup@example.com' },
        { id: '4', qbId: 'qb-3', name: 'Gamma', email: 'gamma@example.com' },
      ],
    ])

    assert.deepEqual(
      merged.map((customer) => customer.qbId),
      ['qb-1', 'qb-2', 'qb-3'],
    )
  })
})

describe('calculateVirtualListHeight', () => {
  it('enforces minimum and maximum visible rows', () => {
    const small = calculateVirtualListHeight(1, 40, 6, 3)
    const large = calculateVirtualListHeight(40, 40, 6, 3)

    assert.equal(small, 120)
    assert.equal(large, 240)
  })
})

describe('deriveVirtualRange', () => {
  it('returns a range that respects overscan and boundaries', () => {
    const first = deriveVirtualRange(0, 160, 50, 40, 2)
    const mid = deriveVirtualRange(200, 160, 50, 40, 2)
    const end = deriveVirtualRange(1900, 160, 50, 40, 2)

    assert.deepEqual(first, { start: 0, end: 6 })
    assert.deepEqual(mid, { start: 3, end: 11 })
    assert.deepEqual(end, { start: 45, end: 50 })
  })
})

describe('isCustomerSelected', () => {
  it('matches by QuickBooks identifier or fallback ID', () => {
    const selected = { id: 'legacy-1', qbId: 'qb-42', name: 'Selected', email: 'selected@example.com' }

    assert.equal(
      isCustomerSelected({ id: '99', qbId: 'qb-42', name: 'Match', email: 'match@example.com' }, selected),
      true,
    )
    assert.equal(
      isCustomerSelected({ id: 'legacy-1', qbId: 'other', name: 'Legacy', email: 'legacy@example.com' }, selected),
      true,
    )
    assert.equal(
      isCustomerSelected({ id: '100', qbId: 'qb-100', name: 'Other', email: 'other@example.com' }, selected),
      false,
    )
  })
})

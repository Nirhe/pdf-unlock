import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import {
  apiStateReducer,
  serializeQueryKey,
} from '../dist-test/api/state.js'
import { createApiClient } from '../dist-test/api/client.js'

const ORIGINAL_NOW = Date.now

describe('serializeQueryKey', () => {
  it('returns string keys unchanged', () => {
    assert.equal(serializeQueryKey('invoices'), 'invoices')
  })

  it('stringifies array-based keys for caching', () => {
    assert.equal(serializeQueryKey(['invoices', '123']), '["invoices","123"]')
  })
})

describe('apiStateReducer', () => {
  afterEach(() => {
    Date.now = ORIGINAL_NOW
  })

  it('marks a query as loading and preserves existing data', () => {
    const existingState = {
      '["docs","status"]': {
        status: 'success',
        data: { message: 'ready' },
        error: new Error('previous error'),
        updatedAt: 100,
      },
    }

    const nextState = apiStateReducer(existingState, {
      type: 'start',
      key: '["docs","status"]',
    })

    assert.equal(nextState['["docs","status"]'].status, 'loading')
    assert.deepEqual(nextState['["docs","status"]'].data, { message: 'ready' })
    assert.equal(nextState['["docs","status"]'].error, undefined)
    assert.equal(nextState['["docs","status"]'].updatedAt, 100)
  })

  it('stores new data and a timestamp on success', () => {
    Date.now = () => 4_200

    const nextState = apiStateReducer({}, {
      type: 'success',
      key: 'health',
      data: { status: 'ok' },
    })

    assert.equal(nextState.health.status, 'success')
    assert.deepEqual(nextState.health.data, { status: 'ok' })
    assert.equal(nextState.health.error, undefined)
    assert.equal(nextState.health.updatedAt, 4_200)
  })

  it('records error information on failure', () => {
    Date.now = () => 7_500
    const failure = new Error('Request failed')

    const nextState = apiStateReducer({}, {
      type: 'error',
      key: 'health',
      error: failure,
    })

    assert.equal(nextState.health.status, 'error')
    assert.equal(nextState.health.data, undefined)
    assert.equal(nextState.health.error, failure)
    assert.equal(nextState.health.updatedAt, 7_500)
  })

  it('removes cached entries when invalidated', () => {
    const populated = {
      '["docs","status"]': {
        status: 'success',
        data: { message: 'ok' },
        updatedAt: 10,
      },
      health: {
        status: 'success',
        data: { status: 'ok' },
        updatedAt: 20,
      },
    }

    const cleared = apiStateReducer(populated, { type: 'invalidate', key: 'health' })

    assert.equal(cleared.health, undefined)
    assert.deepEqual(cleared['["docs","status"]'], populated['["docs","status"]'])
  })

  it('supports clearing the entire cache', () => {
    const populated = {
      anything: {
        status: 'success',
        data: { value: 1 },
        updatedAt: 5,
      },
    }

    const cleared = apiStateReducer(populated, { type: 'invalidate' })

    assert.deepEqual(cleared, {})
  })
})

describe('createApiClient', () => {
  it('uses the default base URL when none is provided', () => {
    const client = createApiClient()

    assert.equal(client.defaults.baseURL, '/api')
    assert.equal(client.defaults.headers.Accept, 'application/json')
    assert.equal(client.defaults.headers['Content-Type'], 'application/json')
  })

  it('respects custom configuration', () => {
    const client = createApiClient({ baseUrl: 'https://example.test/v1', withCredentials: true })

    assert.equal(client.defaults.baseURL, 'https://example.test/v1')
    assert.equal(client.defaults.withCredentials, true)
    assert.equal(client.defaults.headers['Content-Type'], 'application/json')
  })
})

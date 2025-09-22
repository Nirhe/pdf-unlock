import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  applyHashNavigation,
  getHashPath,
  normalizePath,
  subscribeToHashChanges,
} from '../dist-test/hooks/useHashRouter.js'

const createMockWindow = (initialHash = '#/') => {
  let currentHash = initialHash
  let writeCount = 0
  const listeners = new Map()

  return {
    location: {
      get hash() {
        return currentHash
      },
      set hash(value) {
        currentHash = value.startsWith('#') ? value : `#${value}`
        writeCount += 1
      },
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type).add(listener)
    },
    removeEventListener(type, listener) {
      const bucket = listeners.get(type)
      if (!bucket) {
        return
      }
      bucket.delete(listener)
    },
    emit(type) {
      const bucket = listeners.get(type)
      if (!bucket) {
        return
      }
      for (const listener of bucket) {
        listener()
      }
    },
    getHash() {
      return currentHash
    },
    getWriteCount() {
      return writeCount
    },
    resetWriteCount() {
      writeCount = 0
    },
  }
}

describe('normalizePath', () => {
  it('defaults to the root path when empty', () => {
    assert.equal(normalizePath(''), '/')
  })

  it('ensures the path includes a leading slash', () => {
    assert.equal(normalizePath('lock'), '/lock')
  })

  it('maps the legacy unlock route to the lock route', () => {
    assert.equal(normalizePath('unlock'), '/lock')
    assert.equal(normalizePath('#/unlock'), '/lock')
  })

  it('removes leading hash fragments', () => {
    assert.equal(normalizePath('#/about'), '/about')
  })
})

describe('getHashPath', () => {
  afterEach(() => {
    delete globalThis.window
  })

  it('returns the root path when no window is present', () => {
    delete globalThis.window
    assert.equal(getHashPath(), '/')
  })

  it('normalizes the current hash from the window', () => {
    const mockWindow = createMockWindow('#/lock')
    globalThis.window = mockWindow

    assert.equal(getHashPath(), '/lock')
  })
})

describe('applyHashNavigation', () => {
  let mockWindow

  beforeEach(() => {
    mockWindow = createMockWindow('#/current')
    globalThis.window = mockWindow
    mockWindow.resetWriteCount()
  })

  afterEach(() => {
    delete globalThis.window
  })

  it('normalizes and updates the hash location', () => {
    applyHashNavigation('lock')

    assert.equal(mockWindow.getHash(), '#/lock')
    assert.equal(mockWindow.getWriteCount(), 1)
  })

  it('redirects legacy unlock hashes to the lock route', () => {
    mockWindow.location.hash = '#/unlock'
    mockWindow.resetWriteCount()

    applyHashNavigation('/unlock')

    assert.equal(mockWindow.getHash(), '#/lock')
    assert.equal(mockWindow.getWriteCount(), 1)
  })

  it('ignores navigation requests that match the current location', () => {
    applyHashNavigation('/current')

    assert.equal(mockWindow.getHash(), '#/current')
    assert.equal(mockWindow.getWriteCount(), 0)
  })

  it('does nothing when window is unavailable', () => {
    delete globalThis.window

    applyHashNavigation('/anywhere')
    // Should not throw
  })
})

describe('subscribeToHashChanges', () => {
  afterEach(() => {
    delete globalThis.window
  })

  it('registers and cleans up hash change listeners', () => {
    const mockWindow = createMockWindow('#/')
    globalThis.window = mockWindow

    let callCount = 0
    const unsubscribe = subscribeToHashChanges(() => {
      callCount += 1
    })

    mockWindow.emit('hashchange')
    assert.equal(callCount, 1)

    unsubscribe()
    mockWindow.emit('hashchange')
    assert.equal(callCount, 1)
  })

  it('returns a noop cleanup when no window is present', () => {
    delete globalThis.window

    const cleanup = subscribeToHashChanges(() => {
      throw new Error('listener should not run without a window')
    })

    cleanup()
  })
})

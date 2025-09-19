import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseServerErrorMessage } from '../dist-test/utils/parseServerErrorMessage.js'

describe('parseServerErrorMessage', () => {
  it('returns the message field when provided', () => {
    const payload = JSON.stringify({ message: 'Not authorised to send this document.' })

    assert.equal(parseServerErrorMessage(payload), 'Not authorised to send this document.')
  })

  it('uses the error field when message is not present', () => {
    const payload = JSON.stringify({ error: 'Upload failed validation.' })

    assert.equal(parseServerErrorMessage(payload), 'Upload failed validation.')
  })

  it('returns null when no string fields are available', () => {
    const payload = JSON.stringify({ message: { detail: 'nested' } })

    assert.equal(parseServerErrorMessage(payload), null)
  })

  it('returns null for invalid JSON payloads', () => {
    assert.equal(parseServerErrorMessage('{ invalid'), null)
  })
})

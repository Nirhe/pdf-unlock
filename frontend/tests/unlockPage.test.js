import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseServerErrorMessage } from '../dist-test/utils/parseServerErrorMessage.js'
import { createReviewAndSendFormData } from '../dist-test/pages/createReviewAndSendFormData.js'

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


describe('createReviewAndSendFormData', () => {
  it('packages the document and customer ID as expected by the API', () => {
    const file = new File(['example'], 'invoice.pdf', { type: 'application/pdf' })
    const formData = createReviewAndSendFormData(file, 'qb-42')

    assert.equal(formData.get('document'), file)
    assert.equal(formData.get('customerId'), 'qb-42')
    assert.equal(formData.has('file'), false)
  })
})

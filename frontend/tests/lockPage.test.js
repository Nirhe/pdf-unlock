import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ApiProvider } from '../dist-test/api/ApiProvider.js'
import { parseServerErrorMessage } from '../dist-test/utils/parseServerErrorMessage.js'
import { createReviewAndSendFormData } from '../dist-test/pages/createReviewAndSendFormData.js'
import { translate } from '../dist-test/i18n/useTranslations.js'
import LockPage, { createLockTestFormData } from '../dist-test/pages/LockPage.js'

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

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

describe('createReviewAndSendFormData', () => {
  it('packages the document and customer ID as expected by the API', () => {
    const file = new File(['example'], 'invoice.pdf', { type: 'application/pdf' })
    const formData = createReviewAndSendFormData(file, 'qb-42')

    assert.equal(formData.get('document'), file)
    assert.equal(formData.get('customerId'), 'qb-42')
    assert.equal(formData.has('file'), false)
  })
})

describe('createLockTestFormData', () => {
  it('includes the PDF and lock options used for testing the endpoint', () => {
    const file = new File(['example'], 'sample.pdf', { type: 'application/pdf' })
    const formData = createLockTestFormData(file)

    assert.equal(formData.get('document'), file)
    assert.equal(formData.get('password'), 'sample-password')
  })
})

describe('LockPage messaging', () => {
  it('renders the locking flow copy and disabled action when password protection is off', () => {
    const markup = renderToStaticMarkup(createElement(ApiProvider, {}, createElement(LockPage)))

    const expectTranslation = (key) => {
      const message = escapeHtml(translate(key))
      assert.ok(
        markup.includes(message),
        `expected markup to include translation for ${key}`,
      )
    }

    expectTranslation('lock.title')
    expectTranslation('lock.cta')
    expectTranslation('lock.requiredToggleMessage')
    assert.ok(/<button[^>]+disabled/.test(markup), 'expected the submit button to be disabled by default')
  })
})

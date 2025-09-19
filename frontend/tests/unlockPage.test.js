import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createReviewAndSendFormData } from '../dist-test/pages/createReviewAndSendFormData.js'

describe('createReviewAndSendFormData', () => {
  it('packages the document and customer ID as expected by the API', () => {
    const file = new File(['example'], 'invoice.pdf', { type: 'application/pdf' })
    const formData = createReviewAndSendFormData(file, 'qb-42')

    assert.equal(formData.get('document'), file)
    assert.equal(formData.get('customerId'), 'qb-42')
    assert.equal(formData.has('file'), false)
  })
})

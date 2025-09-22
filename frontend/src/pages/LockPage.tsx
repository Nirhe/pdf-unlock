import { useEffect, useState, type FC } from 'react'
import PageSection from '../components/ui/PageSection.js'
import Surface from '../components/ui/Surface.js'
import CustomerSelector from '../components/CustomerSelector.js'
import type { QuickBooksCustomer } from '../api/index.js'
import PdfUploader from '../components/PdfUploader.js'
import Button from '../components/ui/Button.js'
import { parseServerErrorMessage } from '../utils/parseServerErrorMessage.js'
import { createReviewAndSendFormData } from './createReviewAndSendFormData.js'
import { startInvoiceStatusPolling } from './startInvoiceStatusPolling.js'

const INVOICE_STATUS_POLL_INTERVAL_MS = 5000
const INVOICE_STATUS_TIMEOUT_MS = 2 * 60 * 1000

type UnknownRecord = Record<string, unknown>

const toRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as UnknownRecord
}

const readStringField = (record: UnknownRecord | null, key: string): string | null => {
  if (!record) {
    return null
  }

  const value = record[key]
  return typeof value === 'string' ? value : null
}

const extractInvoiceRecord = (payload: UnknownRecord | null): UnknownRecord | null => {
  if (!payload) {
    return null
  }

  return toRecord(payload['invoice'])
}

const parseSendResponse = (data: unknown) => {
  const payload = toRecord(data)
  const invoice = extractInvoiceRecord(payload)

  return {
    paymentLink: readStringField(payload, 'paymentLink'),
    invoiceId: readStringField(invoice, 'id') ?? readStringField(payload, 'invoiceId'),
    password: readStringField(invoice, 'password') ?? readStringField(payload, 'password'),
  }
}

const parseInvoiceStatusResponse = (data: unknown) => {
  const payload = toRecord(data)
  const invoice = extractInvoiceRecord(payload)

  return {
    status: readStringField(invoice, 'status') ?? readStringField(payload, 'status'),
    password: readStringField(invoice, 'password') ?? readStringField(payload, 'password'),
  }
}

const LockPage: FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<QuickBooksCustomer | null>(null)
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [shouldLockWithPassword, setShouldLockWithPassword] = useState(false)
  const [lockPassword, setLockPassword] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const handleReviewAndSend = async () => {
    if (!selectedCustomer || !selectedPdf || isSending || !shouldLockWithPassword) {
      return
    }

    setIsSending(true)
    setPaymentLink(null)
    setInvoiceId(null)
    setInvoiceStatus(null)
    setSendError(null)
    setLockPassword(null)

    try {
      const formData = createReviewAndSendFormData(selectedPdf, selectedCustomer.qbId)

      const response = await fetch('/api/docs/send', {
        method: 'POST',
        body: formData,
      })

      const rawBody = await response.text()

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`

        const parsedError = parseServerErrorMessage(rawBody)

        if (parsedError) {
          errorMessage = parsedError
        } else if (rawBody) {
          errorMessage = rawBody
        }

        throw new Error(errorMessage)
      }

      let data: unknown = null
      if (rawBody) {
        try {
          data = JSON.parse(rawBody)
        } catch {
          throw new Error('Received an invalid response from the server.')
        }
      }

      const { paymentLink: paymentLinkValue, invoiceId: invoiceIdValue, password } = parseSendResponse(data)

      if (!paymentLinkValue) {
        throw new Error('The server response did not include a payment link.')
      }

      if (!invoiceIdValue) {
        throw new Error('The server response did not include an invoice ID.')
      }

      if (password) {
        setLockPassword(password)
      }

      setPaymentLink(paymentLinkValue)
      setInvoiceId(invoiceIdValue)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send the document.'
      setSendError(message)
      setInvoiceId(null)
      setInvoiceStatus(null)
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    if (!invoiceId) {
      return
    }

    setInvoiceStatus('PENDING')

    const stopPolling = startInvoiceStatusPolling({
      intervalMs: INVOICE_STATUS_POLL_INTERVAL_MS,
      timeoutMs: INVOICE_STATUS_TIMEOUT_MS,
      fetchStatus: async (signal) => {
        const response = await fetch(`/api/qb/invoices/${invoiceId}`, { signal })
        const rawBody = await response.text()

        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`

          const parsedError = parseServerErrorMessage(rawBody)

          if (parsedError) {
            errorMessage = parsedError
          } else if (rawBody) {
            errorMessage = rawBody
          }

          throw new Error(errorMessage)
        }

        if (!rawBody) {
          throw new Error('The server response did not include an invoice status.')
        }

        let data: unknown = null
        try {
          data = JSON.parse(rawBody)
        } catch {
          throw new Error('Received an invalid response while checking the invoice status.')
        }

        const { status: statusValue, password } = parseInvoiceStatusResponse(data)

        if (password) {
          setLockPassword(password)
        }

        if (!statusValue) {
          throw new Error('The server response did not include an invoice status.')
        }

        return statusValue
      },
      onStatus: (status) => {
        const normalizedStatus = status.toUpperCase()

        if (normalizedStatus === 'PAID') {
          setInvoiceStatus('PAID')
          return
        }

        setInvoiceStatus(normalizedStatus)
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Unable to fetch the invoice status.'

        setInvoiceStatus(null)
        setSendError(message)
      },
    })

    return () => {
      stopPolling()
    }
  }, [invoiceId])

  const isReadyToSend = Boolean(selectedCustomer && selectedPdf && shouldLockWithPassword)
  const isSubmitDisabled = !isReadyToSend || isSending

  return (
    <PageSection aria-labelledby="lock-title">
      <Surface className="grid gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="lock-title">
          Lock PDF with Password
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          Protect your PDF with a strong, system-generated password. Upload the document, confirm the customer who should
          receive it, and we will deliver secure access after payment is confirmed.
        </p>
      </Surface>

      <Surface className="grid gap-5">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold text-slate-900" id="pdf-upload-title">
            Upload the PDF to protect
          </h2>
          <p className="text-base leading-relaxed text-slate-600">
            Drag and drop the PDF you want to secure into the area below or browse to choose a file. We currently accept PDF
            files with the <strong>.pdf</strong> extension only.
          </p>
        </div>
        <PdfUploader ariaLabelledBy="pdf-upload-title" onFileChange={setSelectedPdf} />
        <p className="text-sm text-slate-600" aria-live="polite">
          {selectedPdf
            ? `Ready to lock ${selectedPdf.name}. Upload a different PDF to replace it.`
            : 'No PDF uploaded yet. Select a file to begin.'}
        </p>
      </Surface>

      <Surface className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">QuickBooks customer lookup</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Search your connected QuickBooks customers to send the locked document to the right account. Start typing a name or
          email address to filter the list.
        </p>
        <CustomerSelector
          label="Select a customer"
          placeholder="Start typing a customer name or email…"
          helperText="Customers sync from QuickBooks automatically. Narrow the search to find the right match quickly."
          required
          name="qbCustomerId"
          onSelect={setSelectedCustomer}
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {selectedCustomer
            ? `Selected ${selectedCustomer.name} (${selectedCustomer.email}). They will receive the payment email and password.`
            : 'No customer selected yet. Choose who should receive the locked PDF.'}
        </p>
      </Surface>

      <Surface className="grid gap-4">
        <div className="grid gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <label htmlFor="lock-toggle" className="flex cursor-pointer items-start gap-3">
              <input
                id="lock-toggle"
                type="checkbox"
                className="mt-1 h-5 w-5 flex-shrink-0 rounded border border-slate-400 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                checked={shouldLockWithPassword}
                onChange={(event) => setShouldLockWithPassword(event.currentTarget.checked)}
                aria-describedby="lock-toggle-helper"
              />
              <div className="flex flex-col gap-2">
                <span className="text-base font-semibold text-slate-900">Lock with password</span>
                <p className="text-sm leading-relaxed text-slate-600" id="lock-toggle-helper">
                  Encrypts the PDF with a system-generated password before it is sent to your customer.
                </p>
              </div>
            </label>
            <button
              type="button"
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label="Learn how locking with a password works"
              title="We generate a strong password, email it to your customer, and display it here after payment."
            >
              ?
            </button>
          </div>
          {!shouldLockWithPassword ? (
            <p className="text-sm font-medium text-red-600" role="alert" aria-live="assertive">
              Enable password protection to continue.
            </p>
          ) : null}
        </div>
      </Surface>

      <div className="grid gap-6 md:grid-cols-2" role="list">
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Preparation checklist</h2>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-600">
            <li>Confirm who should receive the locked PDF once payment clears.</li>
            <li>Let your customer know a unique password will arrive in their inbox.</li>
            <li>Review your retention policies for storing the encrypted document and password.</li>
          </ul>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">What happens next?</h2>
          <p className="text-base leading-relaxed text-slate-600">
            We will guide you through uploading the file, generating the secure password, and collecting payment. After the
            invoice is paid, we email the password to your customer and display it below for quick reference.
          </p>
        </Surface>
      </div>

      <Surface className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={handleReviewAndSend} disabled={isSubmitDisabled}>
            {isSending ? 'Locking PDF and creating payment link…' : 'Lock & Generate Payment Link'}
          </Button>
          <p className="text-sm text-slate-600" aria-live="polite">
            {isReadyToSend
              ? 'We will generate a payment link, lock the PDF, and share the password automatically.'
              : shouldLockWithPassword
                ? 'Select a PDF and customer to enable locking.'
                : 'Enable password protection, then select a PDF and customer to continue.'}
          </p>
        </div>
        <div aria-live="polite" aria-atomic="true" className="grid gap-3">
          {isSending ? (
            <p className="text-sm font-medium text-slate-700" role="status">
              Locking PDF and creating payment link…
            </p>
          ) : null}
          {paymentLink ? (
            <div
              className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm font-semibold text-blue-900"
              role="status"
            >
              <span>Payment link ready. Share it with your customer to confirm the order.</span>
              <Button as="a" href={paymentLink} target="_blank" rel="noreferrer">
                Pay Now
              </Button>
            </div>
          ) : null}
          {invoiceStatus && invoiceStatus !== 'PAID' ? (
            <p className="text-sm font-medium text-slate-700" role="status">
              Waiting for payment confirmation…
            </p>
          ) : null}
          {invoiceStatus === 'PAID' ? (
            <p className="text-sm font-semibold text-emerald-700" role="status">
              Payment confirmed. Password sent to the customer and available below.
            </p>
          ) : null}
          {sendError ? (
            <p className="text-sm font-semibold text-red-600" role="alert">
              {sendError}
            </p>
          ) : null}
          {lockPassword ? (
            <div className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4" aria-live="polite">
              <h3 className="text-sm font-semibold text-emerald-900">Password</h3>
              <p className="font-mono text-base font-semibold tracking-wide text-emerald-900">{lockPassword}</p>
              <p className="text-xs text-emerald-800">Store this password securely. It has also been emailed to the customer.</p>
            </div>
          ) : null}
        </div>
      </Surface>
    </PageSection>
  )
}

export default LockPage

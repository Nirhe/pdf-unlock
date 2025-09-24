import { useEffect, useState, type FC } from 'react'
import PageSection from '../components/ui/PageSection.js'
import Surface from '../components/ui/Surface.js'
import CustomerSelector from '../components/CustomerSelector.js'
import type { QuickBooksCustomer } from '../api/index.js'
import PdfUploader from '../components/PdfUploader.js'
import Button from '../components/ui/Button.js'
import { useTranslations } from '../i18n/useTranslations.js'
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
    downloadUrl: readStringField(payload, 'downloadUrl'),
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const { t } = useTranslations()

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
    setDownloadUrl(null)

    try {
      const formData = createReviewAndSendFormData(selectedPdf, selectedCustomer.qbId)

      const response = await fetch('/api/docs/send', {
        method: 'POST',
        body: formData,
      })

      const rawBody = await response.text()

      if (!response.ok) {
        let errorMessage = t('lock.error.requestFailed', { status: response.status })

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
          throw new Error(t('lock.error.invalidResponse'))
        }
      }

      const {
        paymentLink: paymentLinkValue,
        invoiceId: invoiceIdValue,
        password,
        downloadUrl: downloadUrlValue,
      } = parseSendResponse(data)

      if (!paymentLinkValue) {
        throw new Error(t('lock.error.missingPaymentLink'))
      }

      if (!invoiceIdValue) {
        throw new Error(t('lock.error.missingInvoiceId'))
      }

      if (password) {
        setLockPassword(password)
      }

      setPaymentLink(paymentLinkValue)
      setInvoiceId(invoiceIdValue)
      setDownloadUrl(downloadUrlValue ?? null)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('lock.error.sendFailed')
      setSendError(message)
      setInvoiceId(null)
      setInvoiceStatus(null)
      setDownloadUrl(null)
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
          let errorMessage = t('lock.error.requestFailed', { status: response.status })

          const parsedError = parseServerErrorMessage(rawBody)

          if (parsedError) {
            errorMessage = parsedError
          } else if (rawBody) {
            errorMessage = rawBody
          }

          throw new Error(errorMessage)
        }

        if (!rawBody) {
          throw new Error(t('lock.error.missingInvoiceStatus'))
        }

        let data: unknown = null
        try {
          data = JSON.parse(rawBody)
        } catch {
          throw new Error(t('lock.error.invalidInvoiceStatusResponse'))
        }

        const { status: statusValue, password } = parseInvoiceStatusResponse(data)

        if (password) {
          setLockPassword(password)
        }

        if (!statusValue) {
          throw new Error(t('lock.error.missingInvoiceStatus'))
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
        const message = error instanceof Error ? error.message : t('lock.error.statusFailed')

        setInvoiceStatus(null)
        setSendError(message)
      },
    })

    return () => {
      stopPolling()
    }
  }, [invoiceId, t])

  const isReadyToSend = Boolean(selectedCustomer && selectedPdf && shouldLockWithPassword)
  const isSubmitDisabled = !isReadyToSend || isSending

  return (
    <PageSection aria-labelledby="lock-title">
      <Surface className="grid gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="lock-title">
          {t('lock.title')}
        </h1>
        <p className="text-base leading-relaxed text-slate-600">{t('lock.description')}</p>
      </Surface>

      <Surface className="grid gap-5">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold text-slate-900" id="pdf-upload-title">
            {t('lock.upload.title')}
          </h2>
          <p
            className="text-base leading-relaxed text-slate-600"
            dangerouslySetInnerHTML={{ __html: t('lock.upload.description') }}
          />
        </div>
        <PdfUploader ariaLabelledBy="pdf-upload-title" onFileChange={setSelectedPdf} />
        <p className="text-sm text-slate-600" aria-live="polite">
          {selectedPdf
            ? t('lock.upload.ready', { fileName: selectedPdf.name })
            : t('lock.upload.empty')}
        </p>
      </Surface>

      <Surface className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">{t('lock.customer.title')}</h2>
        <p className="text-base leading-relaxed text-slate-600">{t('lock.customer.description')}</p>
        <CustomerSelector
          label={t('lock.customer.selectorLabel')}
          placeholder={t('lock.customer.selectorPlaceholder')}
          helperText={t('lock.customer.selectorHelper')}
          required
          name="qbCustomerId"
          onSelect={setSelectedCustomer}
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {selectedCustomer
            ? t('lock.customer.selected', {
                customerName: selectedCustomer.name,
                customerEmail: selectedCustomer.email,
              })
            : t('lock.customer.empty')}
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
                <span className="text-base font-semibold text-slate-900">{t('lock.passwordToggle.label')}</span>
                <p className="text-sm leading-relaxed text-slate-600" id="lock-toggle-helper">
                  {t('lock.passwordToggle.helper')}
                </p>
              </div>
            </label>
            <button
              type="button"
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label={t('lock.passwordToggle.ariaLabel')}
              title={t('lock.passwordToggle.tooltip')}
            >
              ?
            </button>
          </div>
          {!shouldLockWithPassword ? (
            <p className="text-sm font-medium text-red-600" role="alert" aria-live="assertive">
              {t('lock.requiredToggleMessage')}
            </p>
          ) : null}
        </div>
      </Surface>

      <div className="grid gap-6 md:grid-cols-2" role="list">
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">{t('lock.preparation.title')}</h2>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-600">
            <li>{t('lock.preparation.confirm')}</li>
            <li>{t('lock.preparation.inform')}</li>
            <li>{t('lock.preparation.review')}</li>
          </ul>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">{t('lock.nextSteps.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">{t('lock.nextSteps.description')}</p>
        </Surface>
      </div>

      <Surface className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={handleReviewAndSend} disabled={isSubmitDisabled}>
            {isSending ? t('lock.progress') : t('lock.cta')}
          </Button>
          <p className="text-sm text-slate-600" aria-live="polite">
            {isReadyToSend
              ? t('lock.helper')
              : shouldLockWithPassword
                ? t('lock.helper.select')
                : t('lock.helper.enable')}
          </p>
        </div>
        <div aria-live="polite" aria-atomic="true" className="grid gap-3">
          {isSending ? (
            <p className="text-sm font-medium text-slate-700" role="status">
              {t('lock.progress')}
            </p>
          ) : null}
          {paymentLink ? (
            <div
              className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm font-semibold text-blue-900"
              role="status"
            >
              <span>{t('lock.paymentLinkReady')}</span>
              <Button as="a" href={paymentLink} target="_blank" rel="noreferrer">
                {t('lock.payNow')}
              </Button>
            </div>
          ) : null}
          {downloadUrl ? (
            <div
              className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm font-semibold text-indigo-900"
              role="status"
            >
              <span>{t('lock.downloadReady')}</span>
              <Button as="a" href={downloadUrl} download>
                {t('lock.downloadCta')}
              </Button>
            </div>
          ) : null}
          {invoiceStatus && invoiceStatus !== 'PAID' ? (
            <p className="text-sm font-medium text-slate-700" role="status">
              {t('lock.waiting')}
            </p>
          ) : null}
          {invoiceStatus === 'PAID' ? (
            <p className="text-sm font-semibold text-emerald-700" role="status">
              {t('lock.success')}
            </p>
          ) : null}
          {sendError ? (
            <p className="text-sm font-semibold text-red-600" role="alert">
              {sendError}
            </p>
          ) : null}
          {lockPassword ? (
            <div className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4" aria-live="polite">
              <h3 className="text-sm font-semibold text-emerald-900">{t('lock.passwordHeader')}</h3>
              <p className="font-mono text-base font-semibold tracking-wide text-emerald-900">{lockPassword}</p>
              <p className="text-xs text-emerald-800">{t('lock.passwordSubheader')}</p>
            </div>
          ) : null}
        </div>
      </Surface>
    </PageSection>
  )
}

export default LockPage

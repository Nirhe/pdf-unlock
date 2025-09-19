export interface InvoiceStatusPollingOptions {
  fetchStatus: (signal: AbortSignal) => Promise<string>
  onStatus: (status: string) => void
  onError: (error: Error) => void
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_POLL_INTERVAL_MS = 5000
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000

export const startInvoiceStatusPolling = ({
  fetchStatus,
  onStatus,
  onError,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: InvoiceStatusPollingOptions): (() => void) => {
  let isActive = true
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let latestController: AbortController | null = null
  const startedAt = Date.now()

  const stop = () => {
    isActive = false

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    if (latestController) {
      latestController.abort()
      latestController = null
    }
  }

  const scheduleNextPoll = () => {
    if (!isActive) {
      return
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      void runPoll()
    }, intervalMs)
  }

  const runPoll = async (): Promise<void> => {
    if (!isActive) {
      return
    }

    if (Date.now() - startedAt >= timeoutMs) {
      stop()
      onError(new Error('Timed out while waiting for payment confirmation.'))
      return
    }

    const controller = new AbortController()
    latestController = controller

    try {
      const status = await fetchStatus(controller.signal)

      if (!isActive) {
        return
      }

      onStatus(status)

      if (status.toUpperCase() === 'PAID') {
        stop()
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        stop()
        onError(new Error('Timed out while waiting for payment confirmation.'))
        return
      }

      scheduleNextPoll()
    } catch (error) {
      if (!isActive) {
        return
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      stop()
      const normalizedError =
        error instanceof Error ? error : new Error('Unable to fetch the invoice status.')
      onError(normalizedError)
    }
  }

  void runPoll()

  return () => {
    stop()
  }
}

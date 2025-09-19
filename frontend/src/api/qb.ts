import { useApiQuery } from './useApiQuery.js'
import type { UseApiQueryResult } from './useApiQuery.js'

export type QuickBooksCustomer = {
  id: string
  qbId: string
  name: string
  email: string
}

export type RawQuickBooksCustomer = Partial<QuickBooksCustomer> & Record<string, unknown>

export type QuickBooksCustomersEnvelope = {
  customers?: RawQuickBooksCustomer[] | null
}

export type QuickBooksCustomersResponse =
  | RawQuickBooksCustomer[]
  | QuickBooksCustomersEnvelope
  | null
  | undefined

const QUICKBOOKS_CUSTOMERS_COLLATOR = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
})

export const QUICKBOOKS_CUSTOMERS_QUERY_KEY = ['qb', 'customers'] as const

export const QUICKBOOKS_CUSTOMERS_STALE_TIME = 5 * 60_000

const extractRawCustomers = (
  payload: QuickBooksCustomersResponse,
): RawQuickBooksCustomer[] => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.customers)) {
    return payload.customers
  }

  return []
}

const normalizeQuickBooksCustomer = (
  candidate: unknown,
): QuickBooksCustomer | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const raw = candidate as RawQuickBooksCustomer
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''

  const qbId = (() => {
    if (typeof raw.qbId === 'string' && raw.qbId.trim()) {
      return raw.qbId.trim()
    }

    if (typeof raw.id === 'string' && raw.id.trim()) {
      return raw.id.trim()
    }

    return null
  })()

  if (!name || !email || !qbId) {
    return null
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : qbId

  return {
    id,
    qbId,
    name,
    email,
  }
}

export const normalizeQuickBooksCustomersResponse = (
  payload: QuickBooksCustomersResponse,
): QuickBooksCustomer[] => {
  const rawCustomers = extractRawCustomers(payload)
  const seen = new Set<string>()
  const normalized: QuickBooksCustomer[] = []

  for (const entry of rawCustomers) {
    const customer = normalizeQuickBooksCustomer(entry)
    if (!customer) {
      continue
    }

    if (seen.has(customer.qbId)) {
      continue
    }

    seen.add(customer.qbId)
    normalized.push(customer)
  }

  return normalized.sort((a, b) => QUICKBOOKS_CUSTOMERS_COLLATOR.compare(a.name, b.name))
}

export type UseQuickBooksCustomersQueryOptions = {
  enabled?: boolean
}

export const useQuickBooksCustomersQuery = (
  options: UseQuickBooksCustomersQueryOptions = {},
): UseApiQueryResult<QuickBooksCustomer[]> => {
  const { enabled = true } = options

  return useApiQuery<QuickBooksCustomer[]>({
    key: QUICKBOOKS_CUSTOMERS_QUERY_KEY,
    queryFn: async (client) => {
      const response = await client.get<QuickBooksCustomersResponse>('/qb/customers')
      return normalizeQuickBooksCustomersResponse(response.data)
    },
    staleTime: QUICKBOOKS_CUSTOMERS_STALE_TIME,
    enabled,
  })
}

import { useMemo } from 'react'
import type { AxiosRequestConfig } from 'axios'
import {
  QUICKBOOKS_CUSTOMERS_QUERY_KEY,
  QUICKBOOKS_CUSTOMERS_STALE_TIME,
  normalizeQuickBooksCustomersResponse,
  type QuickBooksCustomer,
  type QuickBooksCustomersEnvelope,
  type QuickBooksCustomersResponse,
} from './qb.js'
import { useApiQuery, type UseApiQueryResult } from './useApiQuery.js'

type RawCustomerSearchEnvelope = QuickBooksCustomersEnvelope & {
  total?: unknown
  page?: unknown
  pageSize?: unknown
  hasMore?: unknown
}

export type QuickBooksCustomerSearchResponse =
  | QuickBooksCustomersResponse
  | RawCustomerSearchEnvelope
  | null
  | undefined

export type QuickBooksCustomerSearchResult = {
  customers: QuickBooksCustomer[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export type QuickBooksCustomerSearchQueryOptions = {
  query?: string
  page?: number
  pageSize?: number
  enabled?: boolean
}

export const DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE = 25

export const sanitizeQuickBooksCustomerSearchQuery = (
  options: QuickBooksCustomerSearchQueryOptions = {},
) => {
  const query = typeof options.query === 'string' ? options.query.trim() : ''
  const rawPage = typeof options.page === 'number' ? Math.trunc(options.page) : 1
  const page = rawPage > 0 ? rawPage : 1
  const rawPageSize =
    typeof options.pageSize === 'number' ? Math.trunc(options.pageSize) : DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE
  const pageSize = rawPageSize > 0 ? rawPageSize : DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE
  const enabled = options.enabled ?? true

  return {
    query,
    page,
    pageSize,
    enabled,
    requestParams: {
      query: query || undefined,
      page,
      pageSize,
    },
  }
}

export const buildQuickBooksCustomerSearchKey = (
  query: string,
  page: number,
  pageSize: number,
) => [
  ...QUICKBOOKS_CUSTOMERS_QUERY_KEY,
  'search',
  query,
  page,
  pageSize,
] as const

export const normalizeQuickBooksCustomerSearchResponse = (
  payload: QuickBooksCustomerSearchResponse,
  fallbackPage: number,
  fallbackPageSize: number,
): QuickBooksCustomerSearchResult => {
  const customers = normalizeQuickBooksCustomersResponse(payload ?? null)

  let total = customers.length
  let page = fallbackPage > 0 ? fallbackPage : 1
  let pageSize = fallbackPageSize > 0 ? fallbackPageSize : DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE
  let hasMore: boolean | null = null

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const rawTotal = (payload as { total?: unknown }).total
    if (typeof rawTotal === 'number' && Number.isFinite(rawTotal) && rawTotal >= 0) {
      total = Math.max(customers.length, Math.trunc(rawTotal))
    }

    const rawPage = (payload as { page?: unknown }).page
    if (typeof rawPage === 'number' && Number.isFinite(rawPage) && rawPage > 0) {
      page = Math.trunc(rawPage)
    }

    const rawPageSize = (payload as { pageSize?: unknown }).pageSize
    if (typeof rawPageSize === 'number' && Number.isFinite(rawPageSize) && rawPageSize > 0) {
      pageSize = Math.trunc(rawPageSize)
    }

    const rawHasMore = (payload as { hasMore?: unknown }).hasMore
    if (typeof rawHasMore === 'boolean') {
      hasMore = rawHasMore
    }
  }

  if (!Number.isFinite(total) || total < customers.length) {
    total = customers.length
  }

  if (!Number.isFinite(page) || page < 1) {
    page = fallbackPage
  }

  if (!Number.isFinite(pageSize) || pageSize < 1) {
    pageSize = fallbackPageSize
  }

  const computedHasMore = page * pageSize < total
  const resolvedHasMore = hasMore ?? computedHasMore

  return {
    customers,
    total,
    page,
    pageSize,
    hasMore: resolvedHasMore,
  }
}

export type UseQuickBooksCustomerSearchResult = UseApiQueryResult<QuickBooksCustomerSearchResult> &
  QuickBooksCustomerSearchResult & {
    query: string
  }

export const useQuickBooksCustomerSearch = (
  options: QuickBooksCustomerSearchQueryOptions = {},
): UseQuickBooksCustomerSearchResult => {
  const { query, page, pageSize, enabled, requestParams } = sanitizeQuickBooksCustomerSearchQuery(options)

  const result = useApiQuery<QuickBooksCustomerSearchResult>({
    key: buildQuickBooksCustomerSearchKey(query, page, pageSize),
    queryFn: async (client) => {
      const response = await client.get<QuickBooksCustomerSearchResponse>('/qb/customers', {
        params: requestParams,
      } satisfies AxiosRequestConfig)
      return normalizeQuickBooksCustomerSearchResponse(response.data, page, pageSize)
    },
    staleTime: QUICKBOOKS_CUSTOMERS_STALE_TIME,
    enabled,
  })

  return useMemo(() => {
    const pageData = result.data ?? {
      customers: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    }

    return {
      ...result,
      customers: pageData.customers,
      total: pageData.total,
      page: pageData.page,
      pageSize: pageData.pageSize,
      hasMore: pageData.hasMore,
      query,
    }
  }, [result, page, pageSize, query])
}


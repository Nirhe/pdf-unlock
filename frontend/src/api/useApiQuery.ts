import { useCallback, useEffect, useMemo } from 'react'
import type { AxiosInstance } from 'axios'
import { useApiContext } from './context'
import type { ApiStatus, QueryKey } from './state'
import { serializeQueryKey } from './state'

export const DEFAULT_STALE_TIME = 30_000

export type UseApiQueryOptions<TData> = {
  key: QueryKey
  queryFn: (client: AxiosInstance) => Promise<TData>
  enabled?: boolean
  staleTime?: number
}

export type UseApiQueryResult<TData> = {
  data: TData | undefined
  error: unknown
  status: ApiStatus
  isIdle: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  updatedAt: number | null
  refetch: () => Promise<TData>
  invalidate: () => void
}

export function useApiQuery<TData>({
  key,
  queryFn,
  enabled = true,
  staleTime = DEFAULT_STALE_TIME,
}: UseApiQueryOptions<TData>): UseApiQueryResult<TData> {
  const { client, state, startRequest, fulfillRequest, failRequest, invalidate } =
    useApiContext()
  const cacheKey = useMemo(() => serializeQueryKey(key), [key])
  const entry = state[cacheKey]

  const status: ApiStatus = entry?.status ?? 'idle'
  const isIdle = status === 'idle'
  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  const lastUpdated = entry?.updatedAt ?? null
  const resolvedStaleTime = Number.isFinite(staleTime)
    ? staleTime
    : Number.POSITIVE_INFINITY
  const isDataMissing = !entry
  const isExpired =
    !isDataMissing &&
    resolvedStaleTime !== Number.POSITIVE_INFINITY &&
    typeof lastUpdated === 'number' &&
    Date.now() - lastUpdated > resolvedStaleTime

  const shouldFetch = enabled && !isLoading && (isDataMissing || isError || isExpired)

  useEffect(() => {
    if (!shouldFetch) {
      return
    }

    let cancelled = false

    startRequest(cacheKey)

    queryFn(client)
      .then((result) => {
        if (!cancelled) {
          fulfillRequest(cacheKey, result)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          failRequest(cacheKey, error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    shouldFetch,
    cacheKey,
    queryFn,
    client,
    startRequest,
    fulfillRequest,
    failRequest,
  ])

  const refetch = useCallback(async () => {
    startRequest(cacheKey)
    try {
      const result = await queryFn(client)
      fulfillRequest(cacheKey, result)
      return result
    } catch (error) {
      failRequest(cacheKey, error)
      throw error
    }
  }, [cacheKey, queryFn, client, startRequest, fulfillRequest, failRequest])

  const invalidateSelf = useCallback(() => {
    invalidate(cacheKey)
  }, [invalidate, cacheKey])

  return useMemo(
    () => ({
      data: entry?.data as TData | undefined,
      error: entry?.error,
      status,
      isIdle,
      isLoading,
      isSuccess,
      isError,
      updatedAt: typeof lastUpdated === 'number' ? lastUpdated : null,
      refetch,
      invalidate: invalidateSelf,
    }),
    [
      entry?.data,
      entry?.error,
      status,
      isIdle,
      isLoading,
      isSuccess,
      isError,
      lastUpdated,
      refetch,
      invalidateSelf,
    ],
  )
}

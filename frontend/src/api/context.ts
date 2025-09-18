import { createContext, useCallback, useContext } from 'react'
import type { AxiosInstance } from 'axios'
import { serializeQueryKey, type ApiState, type QueryKey } from './state'

export type ApiContextValue = {
  client: AxiosInstance
  state: ApiState
  startRequest: (cacheKey: string) => void
  fulfillRequest: (cacheKey: string, data: unknown) => void
  failRequest: (cacheKey: string, error: unknown) => void
  invalidate: (cacheKey?: string) => void
}

export const ApiContext = createContext<ApiContextValue | null>(null)

export const useApiContext = (): ApiContextValue => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApiContext must be used within an ApiProvider')
  }

  return context
}

export const useInvalidateQuery = () => {
  const { invalidate } = useApiContext()

  return useCallback(
    (key?: QueryKey) => {
      invalidate(key ? serializeQueryKey(key) : undefined)
    },
    [invalidate],
  )
}

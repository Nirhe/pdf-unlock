import type { FC, ReactNode } from 'react'
import { useCallback, useMemo, useReducer } from 'react'
import { createApiClient, type CreateApiClientOptions } from './client.js'
import { resolveApiBaseUrl } from '../config/resolveApiBaseUrl.js'
import { ApiContext, type ApiContextValue } from './context.js'
import { apiStateReducer } from './state.js'

export type ApiProviderProps = {
  children: ReactNode
  baseUrl?: string
  withCredentials?: CreateApiClientOptions['withCredentials']
}

export const ApiProvider: FC<ApiProviderProps> = ({
  children,
  baseUrl = resolveApiBaseUrl(),
  withCredentials,
}) => {
  const client = useMemo(
    () => createApiClient({ baseUrl, withCredentials }),
    [baseUrl, withCredentials],
  )
  const [state, dispatch] = useReducer(apiStateReducer, {})

  const startRequest = useCallback(
    (cacheKey: string) => {
      dispatch({ type: 'start', key: cacheKey })
    },
    [dispatch],
  )

  const fulfillRequest = useCallback(
    (cacheKey: string, data: unknown) => {
      dispatch({ type: 'success', key: cacheKey, data })
    },
    [dispatch],
  )

  const failRequest = useCallback(
    (cacheKey: string, error: unknown) => {
      dispatch({ type: 'error', key: cacheKey, error })
    },
    [dispatch],
  )

  const invalidate = useCallback(
    (cacheKey?: string) => {
      dispatch({ type: 'invalidate', key: cacheKey })
    },
    [dispatch],
  )

  const value = useMemo<ApiContextValue>(
    () => ({
      client,
      state,
      startRequest,
      fulfillRequest,
      failRequest,
      invalidate,
    }),
    [client, state, startRequest, fulfillRequest, failRequest, invalidate],
  )

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

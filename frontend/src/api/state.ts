export type ApiStatus = 'idle' | 'loading' | 'success' | 'error'

export type ApiEntry<TData = unknown> = {
  status: ApiStatus
  data?: TData
  error?: unknown
  updatedAt?: number
}

export type ApiState = Record<string, ApiEntry>

export type ApiAction =
  | { type: 'start'; key: string }
  | { type: 'success'; key: string; data: unknown }
  | { type: 'error'; key: string; error: unknown }
  | { type: 'invalidate'; key?: string }

export const apiStateReducer = (state: ApiState, action: ApiAction): ApiState => {
  switch (action.type) {
    case 'start': {
      const previousEntry = state[action.key]
      return {
        ...state,
        [action.key]: {
          status: 'loading',
          data: previousEntry?.data,
          error: undefined,
          updatedAt: previousEntry?.updatedAt,
        },
      }
    }
    case 'success': {
      return {
        ...state,
        [action.key]: {
          status: 'success',
          data: action.data,
          error: undefined,
          updatedAt: Date.now(),
        },
      }
    }
    case 'error': {
      return {
        ...state,
        [action.key]: {
          status: 'error',
          data: undefined,
          error: action.error,
          updatedAt: Date.now(),
        },
      }
    }
    case 'invalidate': {
      if (!action.key) {
        return {}
      }

      const nextState = { ...state }
      delete nextState[action.key]
      return nextState
    }
    default: {
      return state
    }
  }
}

export type QueryKey = string | readonly unknown[]

export const serializeQueryKey = (key: QueryKey): string => {
  if (Array.isArray(key)) {
    return JSON.stringify(key)
  }

  if (typeof key === 'string') {
    return key
  }

  return JSON.stringify(key)
}

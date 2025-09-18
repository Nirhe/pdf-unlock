import { useCallback, useMemo, useSyncExternalStore } from 'react'

export const normalizePath = (path: string): string => {
  if (!path) {
    return '/'
  }

  const sanitized = path.startsWith('#') ? path.slice(1) : path
  if (!sanitized.startsWith('/')) {
    return `/${sanitized}`
  }

  return sanitized
}

export const getHashPath = (): string => {
  if (typeof window === 'undefined') {
    return '/'
  }

  return normalizePath(window.location.hash)
}

export const subscribeToHashChanges = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleHashChange = () => {
    onChange()
  }

  window.addEventListener('hashchange', handleHashChange)
  return () => window.removeEventListener('hashchange', handleHashChange)
}

export const applyHashNavigation = (nextPath: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = normalizePath(nextPath)
  if (normalizePath(window.location.hash) === normalized) {
    return
  }

  window.location.hash = normalized
}

const getServerPath = () => '/'

export const useHashRouter = () => {
  const path = useSyncExternalStore(
    subscribeToHashChanges,
    getHashPath,
    getServerPath,
  )

  const navigate = useCallback((nextPath: string) => {
    applyHashNavigation(nextPath)
  }, [])

  return useMemo(
    () => ({
      path,
      navigate,
    }),
    [path, navigate],
  )
}

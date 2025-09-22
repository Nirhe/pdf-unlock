import { useCallback, useMemo, useSyncExternalStore } from 'react'

const ensureLeadingSlash = (value: string): string => {
  if (value.startsWith('/')) {
    return value
  }

  return `/${value}`
}

const canonicalizePath = (value: string): string => {
  const withSlash = ensureLeadingSlash(value)

  if (withSlash === '/unlock') {
    return '/lock'
  }

  return withSlash
}

export const normalizePath = (path: string): string => {
  if (!path) {
    return '/'
  }

  const sanitized = path.startsWith('#') ? path.slice(1) : path
  return canonicalizePath(sanitized)
}

export const getHashPath = (): string => {
  if (typeof window === 'undefined') {
    return '/'
  }

  return normalizePath(window.location.hash)
}

const getRawHashPath = (): string => {
  if (typeof window === 'undefined') {
    return '/'
  }

  const hash = window.location.hash ?? ''
  const value = hash.startsWith('#') ? hash.slice(1) : hash

  if (!value) {
    return '/'
  }

  return ensureLeadingSlash(value)
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
  const currentHash = window.location.hash ?? ''
  const currentValue = currentHash.startsWith('#') ? currentHash.slice(1) : currentHash
  const currentNormalized = normalizePath(currentValue)

  if (currentNormalized === normalized && ensureLeadingSlash(currentValue) === normalized) {
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
  const rawPath = useSyncExternalStore(
    subscribeToHashChanges,
    getRawHashPath,
    getServerPath,
  )

  const navigate = useCallback((nextPath: string) => {
    applyHashNavigation(nextPath)
  }, [])

  return useMemo(
    () => ({
      path,
      rawPath,
      navigate,
    }),
    [path, rawPath, navigate],
  )
}

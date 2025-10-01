const PRODUCTION_FALLBACK_API_BASE_URL = 'https://your-backend-url.vercel.app/api'
const DEVELOPMENT_FALLBACK_API_BASE_URL = '/api'

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

type ProcessLike = {
  env?: Record<string, string | undefined>
}

const readEnvValue = (key: string): string | undefined => {
  // Vite environment variables
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env
    if (env) {
      const value = env[key]
      if (typeof value === 'string') {
        return value
      }
    }
  }

  // Node.js process.env (for server-side rendering)
  const processEnv = (globalThis as typeof globalThis & { process?: ProcessLike }).process?.env
  if (processEnv) {
    const value = processEnv[key]
    if (typeof value === 'string') {
      return value
    }
  }

  // Browser environment variables (set via window.__ENV)
  if (typeof window !== 'undefined' && (window as any).__ENV?.[key]) {
    return (window as any).__ENV[key]
  }

  return undefined
}

const sanitizeUrl = (value: string | undefined): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return trimTrailingSlashes(trimmed)
}

const sanitizeHost = (host: string | undefined): string | null => {
  if (!host) {
    return null
  }

  const withoutProtocol = host.replace(/^https?:\/\//i, '')
  const trimmed = withoutProtocol.trim()

  if (!trimmed) {
    return null
  }

  return trimmed.replace(/\/+$/, '')
}

const isProductionEnvironment = (): boolean => {
  // Vite environment
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    return import.meta.env.PROD === true
  }

  // Node.js environment
  const processEnv = (globalThis as typeof globalThis & { process?: ProcessLike }).process?.env
  if (processEnv) {
    return processEnv.NODE_ENV === 'production'
  }

  // Browser environment
  if (typeof window !== 'undefined' && (window as any).NODE_ENV === 'production') {
    return true
  }

  return false
}

export const resolveApiBaseUrl = (): string => {
  // 1. Check for explicit base URL
  const explicitBaseUrl = sanitizeUrl(readEnvValue('VITE_API_BASE_URL'))
  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  // 2. Check for legacy environment variables
  const legacyBaseUrl = sanitizeUrl(readEnvValue('VITE_API_URL'))
  if (legacyBaseUrl) {
    return legacyBaseUrl
  }

  // 3. Check for host-based configuration
  const backendHost = sanitizeHost(
    readEnvValue('VITE_API_BACKEND_HOST') ?? 
    readEnvValue('PDF_UNLOCK_BACKEND_HOST')
  )
  
  if (backendHost) {
    return `https://${backendHost}/api`
  }

  // 4. Fall back to environment-specific defaults
  return isProductionEnvironment() 
    ? PRODUCTION_FALLBACK_API_BASE_URL 
    : DEVELOPMENT_FALLBACK_API_BASE_URL
}

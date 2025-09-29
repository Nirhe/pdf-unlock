const PRODUCTION_FALLBACK_API_BASE_URL = 'https://pdf-unlock-backend.vercel.app/api'
const DEVELOPMENT_FALLBACK_API_BASE_URL = '/api'

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

type ProcessLike = {
  env?: Record<string, string | undefined>
}

const readEnvValue = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env
    if (env) {
      const value = env[key]
      if (typeof value === 'string') {
        return value
      }
    }
  }

  const processEnv = (globalThis as typeof globalThis & { process?: ProcessLike }).process?.env
  if (processEnv) {
    const value = processEnv[key]
    if (typeof value === 'string') {
      return value
    }
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
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    if (import.meta.env.PROD === true) {
      return true
    }
  }

  const processEnv = (globalThis as typeof globalThis & { process?: ProcessLike }).process?.env
  if (processEnv && processEnv.NODE_ENV === 'production') {
    return true
  }

  return false
}

export const resolveApiBaseUrl = (): string => {
  const explicitBaseUrl = sanitizeUrl(readEnvValue('VITE_API_BASE_URL'))
  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  const backendHost = sanitizeHost(readEnvValue('VITE_API_BACKEND_HOST') ?? readEnvValue('PDF_UNLOCK_BACKEND_HOST'))
  if (backendHost) {
    return `https://${backendHost}/api`
  }

  if (isProductionEnvironment()) {
    return PRODUCTION_FALLBACK_API_BASE_URL
  }

  return DEVELOPMENT_FALLBACK_API_BASE_URL
}


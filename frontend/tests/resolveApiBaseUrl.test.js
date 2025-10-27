import assert from 'node:assert/strict'
import { after, beforeEach, describe, it } from 'node:test'

const originalEnv = {
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
  VITE_API_BACKEND_HOST: process.env.VITE_API_BACKEND_HOST,
  PDF_UNLOCK_BACKEND_HOST: process.env.PDF_UNLOCK_BACKEND_HOST,
  NODE_ENV: process.env.NODE_ENV,
}

const setEnvValue = (key, value) => {
  if (typeof value === 'undefined') {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

const restoreOriginalEnv = () => {
  setEnvValue('VITE_API_BASE_URL', originalEnv.VITE_API_BASE_URL)
  setEnvValue('VITE_API_BACKEND_HOST', originalEnv.VITE_API_BACKEND_HOST)
  setEnvValue('PDF_UNLOCK_BACKEND_HOST', originalEnv.PDF_UNLOCK_BACKEND_HOST)
  setEnvValue('NODE_ENV', originalEnv.NODE_ENV)
}

const resetTestEnv = () => {
  setEnvValue('VITE_API_BASE_URL', undefined)
  setEnvValue('VITE_API_BACKEND_HOST', undefined)
  setEnvValue('PDF_UNLOCK_BACKEND_HOST', undefined)
  setEnvValue('NODE_ENV', undefined)
}

const loadResolver = async () => {
  const module = await import('../dist-test/config/resolveApiBaseUrl.js')
  return module.resolveApiBaseUrl
}

describe('resolveApiBaseUrl', () => {
  beforeEach(() => {
    restoreOriginalEnv()
    resetTestEnv()
  })

  after(() => {
    restoreOriginalEnv()
  })

  it('prefers an explicit VITE_API_BASE_URL when provided', async () => {
    setEnvValue('VITE_API_BASE_URL', ' https://api.example.test/v1/ ')

    const resolveApiBaseUrl = await loadResolver()

    assert.equal(resolveApiBaseUrl(), 'https://api.example.test/v1')
  })

  it('builds a URL from the backend host environment variables', async () => {
    setEnvValue('PDF_UNLOCK_BACKEND_HOST', 'custom-backend.vercel.app/')

    const resolveApiBaseUrl = await loadResolver()

    assert.equal(resolveApiBaseUrl(), 'https://custom-backend.vercel.app/api')
  })

  it('ignores protocols and paths when sanitizing the backend host', async () => {
    setEnvValue('PDF_UNLOCK_BACKEND_HOST', ' https://custom-backend.vercel.app/api ')

    const resolveApiBaseUrl = await loadResolver()

    assert.equal(resolveApiBaseUrl(), 'https://custom-backend.vercel.app/api')
  })

  it('falls back to the production default when NODE_ENV is production', async () => {
    setEnvValue('NODE_ENV', 'production')

    const resolveApiBaseUrl = await loadResolver()

    assert.equal(resolveApiBaseUrl(), 'https://pdf-unlock-backend.vercel.app/api')
  })

  it('uses the development proxy path by default', async () => {
    const resolveApiBaseUrl = await loadResolver()

    assert.equal(resolveApiBaseUrl(), '/api')
  })
})

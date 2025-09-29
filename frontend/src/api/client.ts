import axios, { type AxiosInstance } from 'axios'

export type CreateApiClientOptions = {
  baseUrl?: string
  withCredentials?: boolean
}

export const createApiClient = (
  options: CreateApiClientOptions = {},
): AxiosInstance => {
  const { baseUrl = '/api', withCredentials = false } = options
  const sanitizedBaseUrl = baseUrl.trim()

  if (!sanitizedBaseUrl) {
    throw new Error('API client base URL cannot be empty. Check the frontend configuration.')
  }

  return axios.create({
    baseURL: sanitizedBaseUrl,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    withCredentials,
  })
}

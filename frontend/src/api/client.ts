import axios, { type AxiosInstance } from 'axios'

export type CreateApiClientOptions = {
  baseUrl?: string
  withCredentials?: boolean
}

export const createApiClient = (
  options: CreateApiClientOptions = {},
): AxiosInstance => {
  const { baseUrl = '/api', withCredentials = false } = options

  return axios.create({
    baseURL: baseUrl,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    withCredentials,
  })
}

type ErrorPayload = {
  message?: unknown
  error?: unknown
}

export const parseServerErrorMessage = (rawBody: string): string | null => {
  if (!rawBody) {
    return null
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown

    if (parsed && typeof parsed === 'object') {
      const { message, error } = parsed as ErrorPayload

      if (typeof message === 'string') {
        return message
      }

      if (typeof error === 'string') {
        return error
      }
    }
  } catch {
    // Ignore JSON parsing errors and fall back to the caller's default behaviour.
  }

  return null
}

export default parseServerErrorMessage

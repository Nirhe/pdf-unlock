import { useCallback } from 'react'
import messages, { type MessageKey } from './messages.js'

export type TranslationValues = Record<string, string | number | boolean>

const TOKEN_PATTERN = /\{(\w+)\}/g

export const translate = (
  key: MessageKey,
  replacements?: TranslationValues,
): string => {
  const template = messages[key]

  if (!template) {
    return key
  }

  if (!replacements) {
    return template
  }

  return template.replace(TOKEN_PATTERN, (match, token) => {
    if (!(token in replacements)) {
      return match
    }

    const value = replacements[token]

    if (value === undefined || value === null) {
      return match
    }

    return String(value)
  })
}

export const useTranslations = () => {
  const t = useCallback(
    (key: MessageKey, replacements?: TranslationValues) => translate(key, replacements),
    [],
  )

  return { t }
}

export type { MessageKey }

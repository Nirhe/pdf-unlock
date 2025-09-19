import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import type { QuickBooksCustomer } from '../api/qb'
import { useQuickBooksCustomersQuery } from '../api/qb'

const combineClassNames = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(' ')

const mergeIds = (...ids: Array<string | undefined>): string | undefined => {
  const filtered = ids.filter(Boolean) as string[]
  return filtered.length > 0 ? filtered.join(' ') : undefined
}

const MAX_VISIBLE_RESULTS = 50

export type CustomerDropdownProps = {
  label?: string
  placeholder?: string
  helperText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  name?: string
  className?: string
  onSelect?: (customer: QuickBooksCustomer | null) => void
}

const CustomerDropdown = ({
  label = 'Customer',
  placeholder = 'Search customers…',
  helperText,
  error,
  disabled = false,
  required = false,
  name,
  className,
  onSelect,
}: CustomerDropdownProps) => {
  const {
    data: customers = [],
    isLoading,
    isError,
    error: requestError,
    refetch,
  } = useQuickBooksCustomersQuery({ enabled: !disabled })
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [userEdited, setUserEdited] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [selectedCustomer, setSelectedCustomer] = useState<QuickBooksCustomer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const baseId = useId()
  const inputId = `${baseId}-input`
  const listboxId = `${baseId}-listbox`
  const helperId = helperText ? `${baseId}-helper` : undefined
  const errorId = error ? `${baseId}-error` : undefined

  const requestErrorMessage = isError
    ? requestError instanceof Error && requestError.message
      ? requestError.message
      : 'Unable to load customers.'
    : null
  const requestErrorId = requestErrorMessage ? `${baseId}-request-error` : undefined
  const describedBy = mergeIds(helperId, requestErrorId, errorId)

  const formatCustomer = useCallback(
    (customer: QuickBooksCustomer) => `${customer.name} (${customer.email})`,
    [],
  )

  const searchTerm = userEdited ? inputValue.trim().toLowerCase() : ''

  const { filteredCustomers, totalMatches, isTruncated } = useMemo(() => {
    if (!customers.length) {
      return { filteredCustomers: [] as QuickBooksCustomer[], totalMatches: 0, isTruncated: false }
    }

    const matches = (searchTerm
      ? customers.filter((customer) => {
          const haystack = `${customer.name} ${customer.email} ${customer.qbId}`.toLowerCase()
          return haystack.includes(searchTerm)
        })
      : customers) as QuickBooksCustomer[]

    const limited = matches.slice(0, MAX_VISIBLE_RESULTS)

    return {
      filteredCustomers: limited,
      totalMatches: matches.length,
      isTruncated: matches.length > limited.length,
    }
  }, [customers, searchTerm])

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => () => clearBlurTimeout(), [clearBlurTimeout])

  useEffect(() => {
    if (disabled) {
      setIsOpen(false)
    }
  }, [disabled])

  useEffect(() => {
    if (!selectedCustomer) {
      return
    }

    const match = customers.find((customer) => customer.qbId === selectedCustomer.qbId)

    if (!match) {
      setSelectedCustomer(null)
      if (!userEdited) {
        setInputValue('')
      }
      onSelect?.(null)
      return
    }

    if (match !== selectedCustomer) {
      setSelectedCustomer(match)
      if (!userEdited) {
        setInputValue(formatCustomer(match))
      }
    }
  }, [customers, formatCustomer, onSelect, selectedCustomer, userEdited])

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1)
      return
    }

    if (isLoading || requestErrorMessage || filteredCustomers.length === 0) {
      setHighlightedIndex(-1)
      return
    }

    if (selectedCustomer) {
      const selectedIndex = filteredCustomers.findIndex(
        (customer) => customer.qbId === selectedCustomer.qbId,
      )

      if (selectedIndex >= 0) {
        setHighlightedIndex(selectedIndex)
        return
      }
    }

    setHighlightedIndex(0)
  }, [
    filteredCustomers,
    isLoading,
    isOpen,
    requestErrorMessage,
    selectedCustomer,
  ])

  const handleSelect = useCallback(
    (customer: QuickBooksCustomer) => {
      setSelectedCustomer(customer)
      setInputValue(formatCustomer(customer))
      setUserEdited(false)
      setIsOpen(false)
      setHighlightedIndex(-1)
      onSelect?.(customer)
    },
    [formatCustomer, onSelect],
  )

  const handleInputFocus = useCallback(() => {
    clearBlurTimeout()
    if (!disabled) {
      setIsOpen(true)
    }
  }, [clearBlurTimeout, disabled])

  const handleInputBlur = useCallback(() => {
    clearBlurTimeout()
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }, [clearBlurTimeout])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value
      setInputValue(nextValue)
      setUserEdited(true)
      setIsOpen(true)
      setHighlightedIndex(0)

      if (selectedCustomer) {
        setSelectedCustomer(null)
        onSelect?.(null)
      }
    },
    [onSelect, selectedCustomer],
  )

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          return
        }

        if (filteredCustomers.length === 0) {
          return
        }

        setHighlightedIndex((prev) => {
          const nextIndex = prev < filteredCustomers.length - 1 ? prev + 1 : 0
          return nextIndex
        })
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          return
        }

        if (filteredCustomers.length === 0) {
          return
        }

        setHighlightedIndex((prev) => {
          if (prev <= 0) {
            return filteredCustomers.length - 1
          }
          return prev - 1
        })
        return
      }

      if (event.key === 'Enter') {
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredCustomers.length) {
          event.preventDefault()
          handleSelect(filteredCustomers[highlightedIndex])
        }
        return
      }

      if (event.key === 'Escape') {
        if (isOpen) {
          event.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
        }
      }
    },
    [filteredCustomers, handleSelect, highlightedIndex, isOpen],
  )

  const statusMessage = (() => {
    if (isLoading) {
      return 'Loading customers…'
    }

    if (requestErrorMessage) {
      return requestErrorMessage
    }

    if (!customers.length) {
      return 'No customers available yet.'
    }

    if (!filteredCustomers.length && searchTerm) {
      return `No matches for “${inputValue.trim()}”.`
    }

    if (!filteredCustomers.length) {
      return 'No customers found.'
    }

    return null
  })()

  const handleRetry = useCallback(() => {
    clearBlurTimeout()
    void refetch()
  }, [clearBlurTimeout, refetch])

  const getOptionId = useCallback(
    (index: number) => `${baseId}-option-${index}`,
    [baseId],
  )

  const comboboxAriaActivedescendant =
    isOpen && highlightedIndex >= 0 && highlightedIndex < filteredCustomers.length
      ? getOptionId(highlightedIndex)
      : undefined

  return (
    <div
      className={combineClassNames('relative flex flex-col gap-2', className)}
      ref={containerRef}
    >
      <label className="text-sm font-medium text-slate-700" htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-red-600">*</span> : null}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="search"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          aria-disabled={disabled || undefined}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={comboboxAriaActivedescendant}
          aria-invalid={Boolean(error || requestErrorMessage)}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          value={inputValue}
          placeholder={placeholder}
          className={combineClassNames(
            'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100',
            error || requestErrorMessage ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : null,
          )}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400"
        >
          ▾
        </span>
      </div>

      {name ? (
        <input
          type="hidden"
          name={name}
          value={selectedCustomer ? selectedCustomer.qbId || selectedCustomer.id : ''}
        />
      ) : null}

      {helperText ? (
        <p className="text-xs text-slate-500" id={helperId}>
          {helperText}
        </p>
      ) : null}

      {requestErrorMessage ? (
        <div
          className="flex items-center gap-2 text-sm text-amber-700"
          id={requestErrorId}
        >
          <span>{requestErrorMessage}</span>
          <button
            type="button"
            className="rounded-md border border-amber-600/30 bg-amber-100/40 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600" id={errorId}>
          {error}
        </p>
      ) : null}

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
            <ul
              id={listboxId}
              role="listbox"
              aria-label={`${label} options`}
              className="max-h-64 overflow-y-auto focus:outline-none"
            >
              {!isLoading && !requestErrorMessage
                ? filteredCustomers.map((customer, index) => {
                    const isSelected =
                      selectedCustomer?.qbId === customer.qbId ||
                      selectedCustomer?.id === customer.id

                    const optionClassName = combineClassNames(
                      'cursor-pointer select-none px-3 py-2 text-sm transition-colors focus:outline-none',
                      highlightedIndex === index
                        ? 'bg-blue-600 text-white'
                        : isSelected
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-blue-50',
                    )

                    return (
                      <li
                        key={customer.qbId ?? customer.id}
                        id={getOptionId(index)}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        className={optionClassName}
                        title={`${customer.name} • ${customer.email}`}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          clearBlurTimeout()
                          handleSelect(customer)
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div className="font-medium leading-snug">{customer.name}</div>
                        <div
                          className={combineClassNames(
                            'text-xs leading-snug',
                            highlightedIndex === index
                              ? 'text-blue-100'
                              : 'text-slate-500',
                          )}
                        >
                          {customer.email}
                        </div>
                      </li>
                    )
                  })
                : null}
            </ul>

            {statusMessage ? (
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600" role="status">
                {statusMessage}
              </div>
            ) : null}

            {isTruncated ? (
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Showing the first {filteredCustomers.length} of {totalMatches} customers. Continue typing to narrow your results.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default CustomerDropdown

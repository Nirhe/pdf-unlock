import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE,
  useQuickBooksCustomerSearch,
  type QuickBooksCustomer,
} from '../api/index.js'

const combineClassNames = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(' ')

const mergeIds = (...ids: Array<string | undefined>): string | undefined => {
  const filtered = ids.filter(Boolean) as string[]
  return filtered.length > 0 ? filtered.join(' ') : undefined
}

export const formatCustomerOption = (customer: QuickBooksCustomer): string =>
  `${customer.name} (${customer.email})`

export const mergeCustomerPages = (
  pages: Iterable<QuickBooksCustomer[]>,
): QuickBooksCustomer[] => {
  const merged: QuickBooksCustomer[] = []
  const seen = new Set<string>()

  for (const page of pages) {
    for (const customer of page) {
      if (!customer || seen.has(customer.qbId)) {
        continue
      }

      seen.add(customer.qbId)
      merged.push(customer)
    }
  }

  return merged
}

export const calculateVirtualListHeight = (
  itemCount: number,
  itemSize: number,
  maxVisibleRows: number,
  minVisibleRows = 3,
): number => {
  const safeItemSize = itemSize > 0 ? itemSize : 1
  const safeMinRows = Math.max(1, minVisibleRows)
  const safeMaxRows = Math.max(safeMinRows, maxVisibleRows)
  const rows = Math.min(safeMaxRows, Math.max(itemCount, safeMinRows))
  return rows * safeItemSize
}

export const deriveVirtualRange = (
  scrollOffset: number,
  containerHeight: number,
  itemCount: number,
  itemSize: number,
  overscan: number,
): { start: number; end: number } => {
  const safeItemSize = itemSize > 0 ? itemSize : 1
  const safeOverscan = Math.max(0, overscan)
  const safeCount = Math.max(0, itemCount)

  if (safeCount === 0 || containerHeight <= 0) {
    return { start: 0, end: 0 }
  }

  const firstVisible = Math.floor(scrollOffset / safeItemSize)
  const lastVisible = Math.min(
    safeCount,
    Math.ceil((scrollOffset + containerHeight) / safeItemSize),
  )
  const start = Math.max(0, firstVisible - safeOverscan)
  const end = Math.min(safeCount, Math.max(lastVisible + safeOverscan, start))

  return { start, end }
}

export const isCustomerSelected = (
  candidate: QuickBooksCustomer,
  selected: QuickBooksCustomer | null,
): boolean => {
  if (!selected) {
    return false
  }

  return selected.qbId === candidate.qbId || selected.id === candidate.id
}

const areCustomerListsEqual = (
  left: QuickBooksCustomer[] | undefined,
  right: QuickBooksCustomer[],
) => {
  if (!left || left.length !== right.length) {
    return false
  }

  return left.every((customer, index) => customer.qbId === right[index]?.qbId)
}

const ITEM_HEIGHT = 44
const MAX_VISIBLE_ROWS = 8
const MIN_VISIBLE_ROWS = 4
const VIRTUAL_OVERSCAN = 4
const INPUT_DEBOUNCE_MS = 250

export type CustomerSelectorProps = {
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

const LoadingMessage: FC<{ message: string; top: number }> = memo(({ message, top }) => (
  <li
    role="presentation"
    className="absolute inset-x-0 flex h-11 items-center px-3 py-2 text-sm text-slate-500"
    style={{ top }}
  >
    {message}
  </li>
))
LoadingMessage.displayName = 'CustomerSelectorLoadingMessage'

const CustomerOption: FC<{
  customer: QuickBooksCustomer
  index: number
  top: number
  isHighlighted: boolean
  isSelected: boolean
  getOptionId: (index: number) => string
  onHover: (index: number) => void
  onSelect: (customer: QuickBooksCustomer) => void
}> = memo(({ customer, index, top, isHighlighted, isSelected, getOptionId, onHover, onSelect }) => (
  <li
    id={getOptionId(index)}
    role="option"
    aria-selected={isSelected}
    className={combineClassNames(
      'absolute inset-x-0 flex h-11 cursor-pointer select-none flex-col justify-center px-3 py-2 text-sm transition-colors',
      isHighlighted
        ? 'bg-blue-600 text-white'
        : isSelected
          ? 'bg-blue-50 text-blue-700'
          : 'hover:bg-blue-50',
    )}
    style={{ top }}
    title={formatCustomerOption(customer)}
    onPointerDown={(event) => {
      event.preventDefault()
      onSelect(customer)
    }}
    onMouseEnter={() => onHover(index)}
  >
    <span className="font-medium leading-snug">{customer.name}</span>
    <span className={combineClassNames('text-xs leading-snug', isHighlighted ? 'text-blue-100' : 'text-slate-500')}>
      {customer.email}
    </span>
  </li>
))
CustomerOption.displayName = 'CustomerSelectorOption'

const CustomerSelector: FC<CustomerSelectorProps> = ({
  label = 'Customer',
  placeholder = 'Search customers…',
  helperText,
  error,
  disabled = false,
  required = false,
  name,
  className,
  onSelect,
}) => {
  const baseId = useId()
  const inputId = `${baseId}-input`
  const listboxId = `${baseId}-listbox`
  const helperId = helperText ? `${baseId}-helper` : undefined
  const errorId = error ? `${baseId}-error` : undefined
  const hiddenId = `${baseId}-value`

  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [userEdited, setUserEdited] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<QuickBooksCustomer | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [pages, setPages] = useState<Map<number, QuickBooksCustomer[]>>(new Map())
  const [requestedPage, setRequestedPage] = useState(1)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [latestTotal, setLatestTotal] = useState(0)
  const [latestHasMore, setLatestHasMore] = useState(false)

  const searchPageSize = DEFAULT_QUICKBOOKS_CUSTOMER_SEARCH_PAGE_SIZE

  const { customers: pageCustomers, hasMore, total, isLoading, isError, error: requestError, query, page, refetch } =
    useQuickBooksCustomerSearch({
      query: debouncedQuery,
      page: requestedPage,
      pageSize: searchPageSize,
      enabled: !disabled && isOpen,
    })

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
    if (!userEdited) {
      setDebouncedQuery('')
      setLastSubmittedQuery('')
      return
    }

    const handle = window.setTimeout(() => {
      const nextQuery = inputValue.trim()
      setDebouncedQuery(nextQuery)
      setLastSubmittedQuery(nextQuery)
    }, INPUT_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(handle)
    }
  }, [inputValue, userEdited])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setPages(new Map())
    setRequestedPage(1)
    setScrollOffset(0)
    setLoadError(null)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [debouncedQuery, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (isError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load customers.'
      setLoadError(message)
      return
    }

    if (!isLoading) {
      setLoadError(null)
    }
  }, [isError, isLoading, isOpen, requestError])

  useEffect(() => {
    if (!isOpen || !pageCustomers) {
      return
    }

    if (query !== debouncedQuery) {
      return
    }

    setPages((previous) => {
      const next = new Map(previous)
      const existing = next.get(page)
      if (areCustomerListsEqual(existing, pageCustomers)) {
        return previous
      }
      next.set(page, pageCustomers)
      return next
    })
    setLatestTotal(total)
    setLatestHasMore(hasMore)
  }, [debouncedQuery, hasMore, isOpen, page, pageCustomers, query, total])

  const aggregatedCustomers = useMemo(() => {
    const orderedPages = [...pages.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => list)
    return mergeCustomerPages(orderedPages)
  }, [pages])

  const isInitialLoading = isLoading && aggregatedCustomers.length === 0
  const isLoadingMore = isLoading && aggregatedCustomers.length > 0

  const itemCount = aggregatedCustomers.length + (isLoadingMore ? 1 : 0)
  const listHeight = calculateVirtualListHeight(itemCount || MIN_VISIBLE_ROWS, ITEM_HEIGHT, MAX_VISIBLE_ROWS, MIN_VISIBLE_ROWS)
  const totalHeight = itemCount * ITEM_HEIGHT

  const { start: visibleStart, end: visibleEnd } = useMemo(
    () => deriveVirtualRange(scrollOffset, listHeight, itemCount, ITEM_HEIGHT, VIRTUAL_OVERSCAN),
    [itemCount, listHeight, scrollOffset],
  )

  const handleOptionSelect = useCallback(
    (customer: QuickBooksCustomer) => {
      setSelectedCustomer(customer)
      setInputValue(formatCustomerOption(customer))
      setUserEdited(false)
      setIsOpen(false)
      setHighlightedIndex(-1)
      onSelect?.(customer)
    },
    [onSelect],
  )

  const updateCustomValidity = useCallback(
    (customer: QuickBooksCustomer | null) => {
      if (!inputRef.current) {
        return
      }

      if (disabled || !required) {
        inputRef.current.setCustomValidity('')
        return
      }

      inputRef.current.setCustomValidity(customer ? '' : 'Please select a customer from the list.')
    },
    [disabled, required],
  )

  useEffect(() => {
    updateCustomValidity(selectedCustomer)
  }, [selectedCustomer, updateCustomValidity])

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1)
      return
    }

    if (isInitialLoading || aggregatedCustomers.length === 0) {
      setHighlightedIndex(-1)
      return
    }

    if (selectedCustomer) {
      const selectedIndex = aggregatedCustomers.findIndex((customer) => isCustomerSelected(customer, selectedCustomer))
      if (selectedIndex >= 0) {
        setHighlightedIndex(selectedIndex)
        return
      }
    }

    setHighlightedIndex(0)
  }, [aggregatedCustomers, isInitialLoading, isOpen, selectedCustomer])

  const scrollHighlightedIntoView = useCallback(
    (index: number) => {
      if (!listRef.current) {
        return
      }

      const top = index * ITEM_HEIGHT
      const bottom = top + ITEM_HEIGHT
      const viewTop = listRef.current.scrollTop
      const viewBottom = viewTop + listRef.current.clientHeight

      if (top < viewTop) {
        listRef.current.scrollTop = top
      } else if (bottom > viewBottom) {
        listRef.current.scrollTop = bottom - listRef.current.clientHeight
      }

      setScrollOffset(listRef.current.scrollTop)
    },
    [],
  )

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) {
      return
    }

    scrollHighlightedIntoView(highlightedIndex)
  }, [highlightedIndex, isOpen, scrollHighlightedIntoView])

  useEffect(() => {
    if (!selectedCustomer) {
      return
    }

    const match = aggregatedCustomers.find((customer) => isCustomerSelected(customer, selectedCustomer))
    if (!match) {
      setSelectedCustomer(null)
      if (!userEdited) {
        setInputValue('')
      }
      onSelect?.(null)
      updateCustomValidity(null)
      return
    }

    if (match !== selectedCustomer && !userEdited) {
      setInputValue(formatCustomerOption(match))
    }
  }, [aggregatedCustomers, onSelect, selectedCustomer, updateCustomValidity, userEdited])

  const requestNextPage = useCallback(() => {
    if (!isOpen || loadError || !hasMore || isLoading) {
      return
    }

    const loadedPages = pages.size ? Math.max(...pages.keys()) : 0
    const nextPage = loadedPages + 1
    setRequestedPage((previous) => (previous === nextPage ? previous : nextPage))
  }, [hasMore, isLoading, isOpen, loadError, pages])

  const handleScroll = useCallback(() => {
    if (!listRef.current) {
      return
    }

    const container = listRef.current
    const { scrollTop, clientHeight, scrollHeight } = container
    setScrollOffset(scrollTop)

    if (loadError || !hasMore || isLoading) {
      return
    }

    if (scrollTop + clientHeight >= scrollHeight - ITEM_HEIGHT) {
      requestNextPage()
    }
  }, [hasMore, isLoading, loadError, requestNextPage])

  useEffect(() => {
    if (!isOpen || loadError || !hasMore || isLoading) {
      return
    }

    if (!listRef.current) {
      return
    }

    if (listRef.current.scrollHeight <= listRef.current.clientHeight + ITEM_HEIGHT) {
      requestNextPage()
    }
  }, [aggregatedCustomers.length, hasMore, isLoading, isOpen, loadError, requestNextPage])

  const getOptionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId])
  const handleOptionHover = useCallback((index: number) => {
    setHighlightedIndex(index)
  }, [])

  const visibleOptions = useMemo(() => {
    const items: ReactNode[] = []

    for (let index = visibleStart; index < visibleEnd; index += 1) {
      const top = index * ITEM_HEIGHT
      if (index < aggregatedCustomers.length) {
        const customer = aggregatedCustomers[index]
        items.push(
          <CustomerOption
            key={customer.qbId ?? `${customer.id}-${index}`}
            customer={customer}
            index={index}
            top={top}
            isHighlighted={highlightedIndex === index}
            isSelected={isCustomerSelected(customer, selectedCustomer)}
            getOptionId={getOptionId}
            onHover={handleOptionHover}
            onSelect={handleOptionSelect}
          />,
        )
        continue
      }

      if (isLoadingMore) {
        items.push(
          <LoadingMessage key={`loading-${index}`} top={top} message="Loading more customers…" />,
        )
      }
    }

    return items
  }, [
    aggregatedCustomers,
    getOptionId,
    handleOptionHover,
    handleOptionSelect,
    highlightedIndex,
    isLoadingMore,
    selectedCustomer,
    visibleEnd,
    visibleStart,
  ])

  const statusMessage = (() => {
    if (loadError) {
      return loadError
    }

    if (isInitialLoading) {
      return 'Loading customers…'
    }

    if (!aggregatedCustomers.length) {
      if (lastSubmittedQuery) {
        return `No matches for “${lastSubmittedQuery}”.`
      }
      return 'No customers found.'
    }

    if (!latestHasMore && latestTotal > aggregatedCustomers.length) {
      return `Showing ${aggregatedCustomers.length} of ${latestTotal} customers.`
    }

    return null
  })()

  const describedBy = mergeIds(helperId, errorId)
  const activeDescendant =
    isOpen && highlightedIndex >= 0 && highlightedIndex < aggregatedCustomers.length
      ? `${baseId}-option-${highlightedIndex}`
      : undefined

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
        updateCustomValidity(null)
      }
    },
    [onSelect, selectedCustomer, updateCustomValidity],
  )

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          return
        }

        if (aggregatedCustomers.length === 0) {
          return
        }

        setHighlightedIndex((previous) => {
          const nextIndex = previous < aggregatedCustomers.length - 1 ? previous + 1 : 0
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

        if (aggregatedCustomers.length === 0) {
          return
        }

        setHighlightedIndex((previous) => {
          if (previous <= 0) {
            return aggregatedCustomers.length - 1
          }
          return previous - 1
        })
        return
      }

      if (event.key === 'Enter') {
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < aggregatedCustomers.length) {
          event.preventDefault()
          handleOptionSelect(aggregatedCustomers[highlightedIndex])
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
    [aggregatedCustomers, handleOptionSelect, highlightedIndex, isOpen],
  )

  const handleRetry = useCallback(() => {
    setLoadError(null)
    void refetch()
  }, [refetch])

  return (
    <div className={combineClassNames('relative flex flex-col gap-2', className)} ref={containerRef}>
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
          aria-activedescendant={activeDescendant}
          aria-invalid={Boolean(error || loadError)}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          value={inputValue}
          placeholder={placeholder}
          required={required}
          className={combineClassNames(
            'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100',
            error || loadError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : null,
          )}
          ref={inputRef}
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
          id={hiddenId}
          name={name}
          value={selectedCustomer ? selectedCustomer.qbId : ''}
        />
      ) : null}

      {helperText ? (
        <p className="text-xs text-slate-500" id={helperId}>
          {helperText}
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600" id={errorId}>
          {error}
        </p>
      ) : null}

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
            {itemCount > 0 ? (
              <div
                id={listboxId}
                role="listbox"
                aria-label={`${label} options`}
                className="relative overflow-y-auto focus:outline-none"
                style={{ height: listHeight }}
                ref={listRef}
                onScroll={handleScroll}
              >
                <ul className="relative" style={{ height: Math.max(totalHeight, listHeight) }}>
                  {visibleOptions}
                </ul>
              </div>
            ) : null}

            {statusMessage ? (
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600" role="status">
                <span>{statusMessage}</span>
                {loadError ? (
                  <button
                    type="button"
                    className="ml-2 rounded-md border border-red-500/30 bg-red-100/40 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default CustomerSelector

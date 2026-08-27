import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/shared/ui/utils/cn'
import type { ComboBoxProps } from './combo-box-types'
import './combo-box.css'

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase()
}

interface MenuPosition {
  top: number
  left: number
  width: number
}

export function ComboBox({
  id,
  label,
  value,
  options,
  onChange,
  className,
  hideLabel,
  searchable,
  searchPlaceholder = 'Buscar...',
  menuPortal = false,
}: ComboBoxProps) {
  const fallbackId = useId()
  const searchId = useId()
  const triggerId = id ?? fallbackId
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)

  const showSearch = searchable ?? options.length >= 6

  const selected = options.find((opt) => opt.value === value)
  const selectedLabel = selected?.label ?? 'Selecionar'

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    if (!normalizedQuery) return options
    return options.filter((opt) => opt.label.toLocaleLowerCase().includes(normalizedQuery))
  }, [options, query])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !menuPortal) {
      setMenuPosition(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, menuPortal])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setHighlightIndex(-1)
      return
    }

    if (showSearch) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }

    const currentIndex = filteredOptions.findIndex((opt) => opt.value === value)
    setHighlightIndex(currentIndex >= 0 ? currentIndex : filteredOptions.length > 0 ? 0 : -1)
  }, [open, showSearch])

  useEffect(() => {
    if (!open) return

    const currentIndex = filteredOptions.findIndex((opt) => opt.value === value)
    setHighlightIndex(currentIndex >= 0 ? currentIndex : filteredOptions.length > 0 ? 0 : -1)
  }, [filteredOptions, open, value])

  const selectOption = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  const moveHighlight = (direction: 1 | -1) => {
    if (filteredOptions.length === 0) return
    setHighlightIndex((index) => {
      const next = index + direction
      if (next < 0) return filteredOptions.length - 1
      if (next >= filteredOptions.length) return 0
      return next
    })
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (!showSearch) moveHighlight(1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (!showSearch) moveHighlight(-1)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (!showSearch) {
        const option = filteredOptions[highlightIndex]
        if (option) selectOption(option.value)
      }
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlight(1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlight(-1)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filteredOptions[highlightIndex]
      if (option) selectOption(option.value)
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  const menuStyle: CSSProperties | undefined =
    menuPortal && menuPosition
      ? {
          position: 'fixed',
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
        }
      : undefined

  const menu = (
    <div
      ref={menuRef}
      className={cn('combobox__menu', menuPortal && 'combobox__menu--portal')}
      style={menuStyle}
    >
      {showSearch && (
        <div className="combobox__search">
          <Search size={14} className="combobox__search-icon" aria-hidden />
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            className="combobox__search-input"
            value={query}
            placeholder={searchPlaceholder}
            aria-label={`Buscar em ${label}`}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      )}

      {filteredOptions.length > 0 ? (
        <ul className="combobox__options" role="listbox" aria-label={label}>
          {filteredOptions.map((opt, index) => {
            const isSelected = opt.value === value
            const isHighlighted = index === highlightIndex

            return (
              <li key={opt.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'combobox__option',
                    isSelected && 'combobox__option--selected',
                    isHighlighted && 'combobox__option--highlighted',
                  )}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectOption(opt.value)}
                >
                  <span className="combobox__option-label">{opt.label}</span>
                  {isSelected && (
                    <Check className="combobox__option-check" size={14} strokeWidth={2.5} aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="combobox__empty">Nenhum resultado encontrado</p>
      )}
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={cn('combobox', open && 'combobox--open', showSearch && 'combobox--searchable', className)}
    >
      <label
        htmlFor={triggerId}
        className={cn('combobox__label', hideLabel && 'combobox__label--hidden')}
      >
        {label}
      </label>

      <div className="combobox__control">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          className="combobox__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={hideLabel ? label : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="combobox__value">{selectedLabel}</span>
          <span className="combobox__chevron" aria-hidden>
            <ChevronDown size={13} strokeWidth={2.25} />
          </span>
        </button>

        {open &&
          (menuPortal
            ? menuPosition
              ? createPortal(menu, document.body)
              : null
            : menu)}
      </div>
    </div>
  )
}

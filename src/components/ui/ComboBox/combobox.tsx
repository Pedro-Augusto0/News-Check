import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import './combobox.css'

export interface ComboBoxOption {
  value: string
  label: string
}

interface ComboBoxProps {
  id?: string
  label: string
  value: string
  options: ComboBoxOption[]
  onChange: (value: string) => void
  className?: string
  compact?: boolean
}

export function ComboBox({ id, label, value, options, onChange, className, compact }: ComboBoxProps) {
  const fallbackId = useId()
  const triggerId = id ?? fallbackId
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const selected = options.find((opt) => opt.value === value)
  const selectedLabel = selected?.label ?? 'Selecionar'

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) {
      setHighlightIndex(-1)
      return
    }

    const currentIndex = options.findIndex((opt) => opt.value === value)
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [open, options, value])

  const selectOption = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightIndex((index) => (index + 1) % options.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightIndex((index) => (index - 1 + options.length) % options.length)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const option = options[highlightIndex]
      if (option) selectOption(option.value)
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn('combobox', compact && 'combobox--compact', open && 'combobox--open', className)}
    >
      <label htmlFor={triggerId} className="combobox__label">
        {label}
      </label>

      <div className="combobox__control">
        <button
          id={triggerId}
          type="button"
          className="combobox__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={compact ? label : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="combobox__value">{selectedLabel}</span>
          <span className="combobox__chevron" aria-hidden>
            <ChevronDown size={13} strokeWidth={2.25} />
          </span>
        </button>

        {open && (
          <ul className="combobox__menu" role="listbox" aria-label={label}>
            {options.map((opt, index) => {
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
        )}
      </div>
    </div>
  )
}

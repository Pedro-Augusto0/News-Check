export interface ComboBoxOption {
  value: string
  label: string
}

export interface ComboBoxProps {
  id?: string
  label: string
  value: string
  options: ComboBoxOption[]
  onChange: (value: string) => void
  className?: string
  hideLabel?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}

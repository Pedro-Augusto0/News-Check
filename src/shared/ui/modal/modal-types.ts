import type { ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg' | 'fullscreen'
  hideHeader?: boolean
}

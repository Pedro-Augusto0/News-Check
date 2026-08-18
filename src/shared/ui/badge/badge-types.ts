import type { ReactNode } from 'react'

export interface BadgeProps {
  variant?: 'success' | 'neutral' | 'warning'
  children: ReactNode
  className?: string
}

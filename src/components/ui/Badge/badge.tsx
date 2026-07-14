import { cn } from '@/utils/cn'
import './badge.css'

interface BadgeProps {
  variant?: 'success' | 'neutral' | 'warning'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return <span className={cn('badge', `badge--${variant}`, className)}>{children}</span>
}

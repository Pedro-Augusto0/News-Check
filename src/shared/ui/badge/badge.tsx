import { cn } from '@/shared/ui/utils/cn'
import type { BadgeProps } from './badge-types'
import './badge.css'

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return <span className={cn('badge', `badge--${variant}`, className)}>{children}</span>
}

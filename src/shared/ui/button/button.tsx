import { forwardRef } from 'react'
import { cn } from '@/shared/ui/utils/cn'
import type { ButtonProps } from './button-types'
import './button.css'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('btn', `btn--${variant}`, `btn--${size}`, className)}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

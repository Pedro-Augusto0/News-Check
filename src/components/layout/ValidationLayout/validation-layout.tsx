import type { ReactNode } from 'react'
import './validation-layout.css'

interface ValidationLayoutProps {
  header: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
  footer?: ReactNode
}

export function ValidationLayout({ header, left, center, right, footer }: ValidationLayoutProps) {
  return (
    <div className="validation-layout">
      <header className="validation-layout__header">{header}</header>
      <aside className="validation-layout__left">{left}</aside>
      <main className="validation-layout__center">{center}</main>
      <aside className="validation-layout__right">{right}</aside>
      {footer}
    </div>
  )
}

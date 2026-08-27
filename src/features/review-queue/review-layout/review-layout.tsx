import type { ReactNode } from 'react'
import './review-layout.css'

interface ReviewLayoutProps {
  header: ReactNode
  rail: ReactNode
  stage: ReactNode
  queue: ReactNode
}

export function ReviewLayout({ header, rail, stage, queue }: ReviewLayoutProps) {
  return (
    <div className="review-layout review-layout--v2">
      <header className="review-layout__header">{header}</header>
      <aside className="review-layout__rail">{rail}</aside>
      <main className="review-layout__stage">{stage}</main>
      <aside className="review-layout__queue">{queue}</aside>
    </div>
  )
}

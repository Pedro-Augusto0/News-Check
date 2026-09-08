import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/utils/cn'
import { ReviewLoadingOverlay } from '../review-loading-overlay'
import './review-layout.css'

interface ReviewLayoutProps {
  header: ReactNode
  banner?: ReactNode
  rail: ReactNode
  stage: ReactNode
  queue: ReactNode
  loading?: boolean
  loadingLabel?: string
}

export function ReviewLayout({
  header,
  banner,
  rail,
  stage,
  queue,
  loading = false,
  loadingLabel = 'Carregando edição…',
}: ReviewLayoutProps) {
  return (
    <div className="review-layout review-layout--v2">
      <header className={cn('review-layout__header', banner && 'review-layout__header--with-banner')}>
        {header}
        {banner}
      </header>
      <aside className="review-layout__rail">{rail}</aside>
      <main className="review-layout__stage">{stage}</main>
      <aside className="review-layout__queue">{queue}</aside>
      {loading && <ReviewLoadingOverlay label={loadingLabel} />}
    </div>
  )
}

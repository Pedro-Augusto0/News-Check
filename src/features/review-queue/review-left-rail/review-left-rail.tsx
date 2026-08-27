import type { ReactNode } from 'react'
import './review-left-rail.css'

interface ReviewLeftRailProps {
  pages: ReactNode
  areas: ReactNode
}

export function ReviewLeftRail({ pages, areas }: ReviewLeftRailProps) {
  return (
    <div className="review-left-rail">
      <div className="review-left-rail__pages">{pages}</div>
      <div className="review-left-rail__areas">{areas}</div>
    </div>
  )
}

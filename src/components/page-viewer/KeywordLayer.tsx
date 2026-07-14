import type { KeywordOccurrence } from '@/types/session'
import { percentToPx } from '@/utils/cropGeometry'
import './keyword-layer.css'

interface KeywordLayerProps {
  occurrences: KeywordOccurrence[]
  width: number
  height: number
}

export function KeywordLayer({ occurrences, width, height }: KeywordLayerProps) {
  if (width <= 0 || height <= 0 || occurrences.length === 0) return null

  return (
    <div className="keyword-layer" style={{ width, height }}>
      {occurrences.map((occ, i) => {
        const px = percentToPx(occ.rect, width, height)
        return (
          <div
            key={`${occ.keyword}-${i}`}
            className="keyword-layer__highlight"
            style={{
              left: px.x,
              top: px.y,
              width: px.width,
              height: px.height,
            }}
            title={occ.keyword}
          />
        )
      })}
    </div>
  )
}

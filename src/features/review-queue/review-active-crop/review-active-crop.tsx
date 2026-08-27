import type { Ref } from 'react'
import { percentToPx } from '@/features/crops/geometry'
import type { Crop } from '@/features/crops'
import { cn } from '@/shared/ui/utils/cn'
import { useLiveCropAdjust } from '../hooks'
import './review-active-crop.css'

interface ReviewActiveCropProps {
  crop: Crop
  label: string
  containerWidth: number
  containerHeight: number
  enabled: boolean
  tone?: 'current' | 'inspect'
  boxRef?: Ref<HTMLDivElement>
  onCommit: (rect: Crop['rect']) => void
  onDelete?: () => void
}

export function ReviewActiveCrop({
  crop,
  label,
  containerWidth,
  containerHeight,
  enabled,
  tone = 'current',
  boxRef,
  onCommit,
  onDelete,
}: ReviewActiveCropProps) {
  const adjust = useLiveCropAdjust({
    rect: crop.rect,
    containerWidth,
    containerHeight,
    enabled,
    onCommit,
  })
  const px = percentToPx(adjust.liveRect, containerWidth, containerHeight)
  const dragBind = {
    onPointerMove: adjust.handlePointerMove,
    onPointerUp: adjust.handlePointerUp,
    onPointerCancel: adjust.handlePointerUp,
  }

  return (
    <div
      ref={adjust.overlayRef}
      className="review-active-crop"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <div
        ref={boxRef}
        className={cn(
          'review-active-crop__box',
          tone === 'inspect' && 'review-active-crop__box--inspect',
          !enabled && 'review-active-crop__box--locked',
        )}
        style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
        title={
          tone === 'inspect'
            ? 'Arraste para ajustar. Botão direito exclui. Desenhe outro recorte para esta notícia.'
            : 'Arraste para ajustar. Botão direito exclui e deixa desenhar outro.'
        }
        onPointerDown={adjust.handleBoxPointerDown}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (enabled) onDelete?.()
        }}
        {...dragBind}
      >
        <span className="review-active-crop__badge">{label}</span>
        {enabled &&
          adjust.handles.map((handle) => (
            <span
              key={handle}
              className={`review-active-crop__handle review-active-crop__handle--${handle}`}
              onPointerDown={adjust.handleHandlePointerDown(handle)}
              {...dragBind}
            />
          ))}
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Check, Move, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Crop } from '@/types/session'
import type { CropResizeHandle } from '@/utils/cropGeometry'
import { percentToPx } from '@/utils/cropGeometry'
import { cropColor } from '@/utils/cropColors'
import type { CropDisplayInfo } from '@/utils/cropDisplayTree'
import { useCropEditing, getDimPanels } from '@/hooks/useCropEditing'
import './crop-edit-overlay.css'

interface CropEditOverlayProps {
  crop: Crop
  cropDisplayInfo?: CropDisplayInfo
  containerWidth: number
  containerHeight: number
  onSave: (rect: Crop['rect']) => void
  onCancel: () => void
}

export function CropEditOverlay({
  crop,
  cropDisplayInfo,
  containerWidth,
  containerHeight,
  onSave,
  onCancel,
}: CropEditOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    editRect,
    displayRect,
    draftRect,
    handles,
    handleDrawPointerDown,
    handleBoxPointerDown,
    handleHandlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isValid,
  } = useCropEditing({
    enabled: true,
    initialRect: crop.rect,
    containerWidth,
    containerHeight,
    overlayRef,
  })

  const color = cropColor(cropDisplayInfo?.colorIndex ?? 0)
  const px = percentToPx(displayRect, containerWidth, containerHeight)
  const panels = getDimPanels(displayRect, containerWidth, containerHeight)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const bindPointer = {
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  }

  return (
    <div
      ref={overlayRef}
      className="crop-edit-overlay"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <div className="crop-edit-overlay__hint">
        Arraste para recortar · ícone central para mover · cantos para ajustar
      </div>

      <div
        className="crop-edit-overlay__draw-surface"
        onPointerDown={handleDrawPointerDown}
        {...bindPointer}
      />

      {(['top', 'bottom', 'left', 'right'] as const).map((side) => {
        const panel = panels[side]
        if (panel.width <= 0 && panel.height <= 0) return null
        return (
          <div
            key={side}
            className="crop-edit-overlay__dim"
            style={panel}
          />
        )
      })}

      <div
        className={cn('crop-edit-box', draftRect && 'crop-edit-box--redrawing')}
        style={{
          left: px.x,
          top: px.y,
          width: px.width,
          height: px.height,
          ['--crop-accent' as string]: color,
        }}
      >
        {cropDisplayInfo?.displayIndex !== undefined && (
          <span className="crop-edit-box__badge">{cropDisplayInfo.displayIndex}</span>
        )}

        {!draftRect && (
          <div
            className="crop-edit-box__move-grip"
            onPointerDown={handleBoxPointerDown}
            {...bindPointer}
            title="Arrastar para mover"
          >
            <Move size={12} strokeWidth={2.5} />
          </div>
        )}

        {!draftRect &&
          handles.map((handle) => (
            <div
              key={handle}
              className={`crop-edit-box__handle crop-edit-box__handle--${handle}`}
              onPointerDown={handleHandlePointerDown(handle as CropResizeHandle)}
              {...bindPointer}
            />
          ))}

        <div className="crop-edit-box__actions" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" className="crop-edit-box__action" onClick={onCancel}>
            <X size={10} strokeWidth={2.5} />
            Cancelar
          </button>
          <button
            type="button"
            className="crop-edit-box__action crop-edit-box__action--save"
            disabled={!isValid}
            onClick={() => onSave(editRect)}
          >
            <Check size={10} strokeWidth={2.5} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

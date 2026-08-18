import { useEffect, useRef, useState } from 'react'
import type { Crop } from '@/features/crops'
import { renderImageRegionToCanvas } from '@/shared/image/page-image-cache'
import { cn } from '@/shared/ui/utils/cn'

interface CropThumbnailChipProps {
  crop: Crop
  pdfUrl: string
  label: string
  pageLabel: string
  selected: boolean
  accentColor: string
  onSelect: () => void
  onDelete: () => void
}

export function CropThumbnailChip({
  crop,
  pdfUrl,
  label,
  pageLabel,
  selected,
  accentColor,
  onSelect,
  onDelete,
}: CropThumbnailChipProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    setReady(false)

    void renderImageRegionToCanvas(pdfUrl, crop.rect, canvas, 120)
      .then((dims) => {
        if (!cancelled) setReady(dims.width > 0 && dims.height > 0)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [pdfUrl, crop.rect])

  return (
    <button
      type="button"
      className={cn(
        'news-detail-crop-editor__thumb',
        selected && 'news-detail-crop-editor__thumb--active',
      )}
      style={{ ['--clip-accent' as string]: accentColor }}
      onClick={onSelect}
      onContextMenu={(event) => {
        event.preventDefault()
        onDelete()
      }}
      title={`Página ${pageLabel}. Botão direito para excluir`}
      aria-label={`Selecionar corte ${label}, página ${pageLabel}. Botão direito para excluir`}
    >
      <div className="news-detail-crop-editor__thumb-preview">
        <canvas
          ref={canvasRef}
          className={cn(
            'news-detail-crop-editor__thumb-canvas',
            !ready && 'news-detail-crop-editor__thumb-canvas--hidden',
          )}
        />
        {!ready && <span className="news-detail-crop-editor__thumb-skeleton" aria-hidden />}
        <span className="news-detail-crop-editor__thumb-badge">{label}</span>
      </div>
    </button>
  )
}

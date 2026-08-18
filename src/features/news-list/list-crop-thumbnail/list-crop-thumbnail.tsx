import { useEffect, useRef, useState } from 'react'
import type { Crop } from '@/features/crops'
import { renderImageRegionToCanvas } from '@/shared/image/page-image-cache'
import { useLazyMount } from './use-lazy-mount'
import { cn } from '@/shared/ui/utils/cn'
import './list-thumbnail.css'

const LIST_CROP_THUMB_WIDTH = 88

interface ListCropThumbnailProps {
  /** URL da imagem da página (scan). */
  pdfUrl?: string
  crop: Crop
  displayIndex?: string | number
  accentColor?: string
}

export function ListCropThumbnail({
  pdfUrl,
  crop,
  displayIndex,
  accentColor,
}: ListCropThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ref, mounted } = useLazyMount()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdfUrl || !mounted) return

    let cancelled = false
    setReady(false)

    void renderImageRegionToCanvas(pdfUrl, crop.rect, canvas, LIST_CROP_THUMB_WIDTH)
      .then((dims) => {
        if (!cancelled) setReady(dims.width > 0 && dims.height > 0)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [pdfUrl, crop.rect, mounted])

  return (
    <div
      ref={ref}
      className="list-thumbnail list-thumbnail--crop"
      style={accentColor ? { ['--crop-accent' as string]: accentColor } : undefined}
      aria-hidden
    >
      {(!mounted || !ready) && <span className="list-thumbnail__skeleton" />}
      <canvas
        ref={canvasRef}
        className={cn('list-thumbnail__canvas', !ready && 'list-thumbnail__canvas--hidden')}
      />
      {displayIndex !== undefined && (
        <span className="list-thumbnail__badge">{displayIndex}</span>
      )}
    </div>
  )
}

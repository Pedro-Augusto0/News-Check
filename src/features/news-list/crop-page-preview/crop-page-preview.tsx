import { useEffect, useRef, useState } from 'react'
import type { Crop } from '@/features/crops'
import { renderImageToCanvas } from '@/shared/image/page-image-cache'
import { percentToPx } from '@/features/crops/geometry'
import { cropColor } from '@/features/crops/colors'
import { cn } from '@/shared/ui/utils/cn'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import { useCropsStore } from '@/features/crops'
import './crop-page-preview.css'
interface CropPagePreviewProps {
  pdfUrl: string
  pageNumber: string
  crops: Crop[]
  cropDisplayIndex: Map<string, CropDisplayInfo>
  activeCropId?: string | null
}

export function CropPagePreview({
  pdfUrl,
  pageNumber,
  crops,
  cropDisplayIndex,
  activeCropId,
}: CropPagePreviewProps) {
  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdfUrl) return

    let cancelled = false
    const scale = 0.35

    void renderImageToCanvas(pdfUrl, canvas, scale).then((dims) => {
      if (!cancelled) setDimensions(dims)
    })

    return () => {
      cancelled = true
    }
  }, [pdfUrl, pageNumber])

  return (
    <div className="crop-page-preview">
      <span className="crop-page-preview__label">p. {pageNumber}</span>
      <div className="crop-page-preview__frame">
        <canvas ref={canvasRef} className="crop-page-preview__canvas" />
        {dimensions.width > 0 && (
          <div
            className="crop-page-preview__overlay"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            {crops.map((crop) => {
              const px = percentToPx(crop.rect, dimensions.width, dimensions.height)
              const info = cropDisplayIndex.get(crop.id)
              const finalized = isNewsItemFinalized(crop.id)
              const active = !finalized && activeCropId === crop.id
              return (
                <div
                  key={crop.id}
                  className={cn(
                    'crop-page-preview__box',
                    active && 'crop-page-preview__box--active',
                    finalized && 'crop-page-preview__box--finalized',
                  )}
                  style={{
                    left: px.x,
                    top: px.y,
                    width: px.width,
                    height: px.height,
                    ...{ ['--crop-accent' as string]: cropColor(info?.colorIndex ?? 0) },
                  }}
                  title={crop.title}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

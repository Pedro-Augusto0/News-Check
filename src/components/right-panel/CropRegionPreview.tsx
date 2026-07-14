import { useEffect, useRef } from 'react'
import type { Crop } from '@/types/session'
import { renderCropRegionToCanvas } from '@/lib/pdf/documentCache'
import './crop-region-preview.css'

interface CropRegionPreviewProps {
  pdfUrl: string
  crop: Crop
  displayIndex?: number
}

export function CropRegionPreview({ pdfUrl, crop, displayIndex }: CropRegionPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false

    void renderCropRegionToCanvas(pdfUrl, crop.pageNumber, crop.rect, canvas).catch(() => {
      if (!cancelled) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = 1
          canvas.height = 1
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [pdfUrl, crop.pageNumber, crop.rect])

  return (
    <figure className="crop-region-preview">
      <figcaption className="crop-region-preview__caption">
        {displayIndex !== undefined && (
          <span className="crop-region-preview__index">{displayIndex}</span>
        )}
        <span className="crop-region-preview__page">p. {crop.pageNumber}</span>
      </figcaption>
      <div className="crop-region-preview__frame">
        <canvas ref={canvasRef} className="crop-region-preview__canvas" />
      </div>
    </figure>
  )
}

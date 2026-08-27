import { useEffect, useRef } from 'react'
import { loadPageImage, renderImageToCanvas } from '@/shared/image/page-image-cache'
import { useLazyMount } from '@/features/news-list/list-crop-thumbnail/use-lazy-mount'
import { cn } from '@/shared/ui/utils/cn'

const THUMB_WIDTH = 52

interface ReviewPageThumbProps {
  imageUrl?: string
  className?: string
}

export function ReviewPageThumb({ imageUrl, className }: ReviewPageThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ref, mounted } = useLazyMount()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl || !mounted) return
    let cancelled = false

    void loadPageImage(imageUrl)
      .then((image) => {
        if (cancelled) return
        const scale = THUMB_WIDTH / image.naturalWidth
        return renderImageToCanvas(imageUrl, canvas, scale)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [imageUrl, mounted])

  return (
    <div ref={ref} className={cn('review-page-rail__thumb', className)} aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  )
}

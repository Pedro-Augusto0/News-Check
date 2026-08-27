import { useEffect, useRef, useState } from 'react'
import { loadPageImage, renderImageToCanvas } from '@/shared/image/page-image-cache'
import { computeReviewPageScale, REVIEW_FIT_SCALE } from '../application'

const FALLBACK_WIDTH = 595
const FALLBACK_HEIGHT = 842

interface UseReviewPageImageOptions {
  imageUrl: string | undefined
  viewportWidth: number
  viewportHeight: number
  zoom: number
}

export function useReviewPageImage({
  imageUrl,
  viewportWidth,
  viewportHeight,
  zoom,
}: UseReviewPageImageOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || viewportWidth < 40 || viewportHeight < 40) return

    let cancelled = false
    const usableWidth = Math.max(240, viewportWidth - 8)

    const paintFallback = (message: string) => {
      const width = Math.round(Math.min(FALLBACK_WIDTH, usableWidth) * REVIEW_FIT_SCALE * zoom)
      const height = Math.round((FALLBACK_HEIGHT / FALLBACK_WIDTH) * width)
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (context) {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
        context.fillStyle = '#667085'
        context.font = '13px Inter, sans-serif'
        context.fillText(message, 20, 36)
      }
      setDimensions({ width, height })
    }

    const render = async () => {
      if (!imageUrl) {
        if (!cancelled) {
          paintFallback('Imagem da página indisponível')
        }
        return
      }

      try {
        const image = await loadPageImage(imageUrl)
        if (cancelled) return

        const scale = computeReviewPageScale({
          naturalWidth: image.naturalWidth,
          usableWidth,
          zoom,
        })

        const next = await renderImageToCanvas(imageUrl, canvas, scale)
        if (!cancelled) {
          setDimensions((prev) =>
            prev.width === next.width && prev.height === next.height ? prev : next,
          )
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          paintFallback('Falha ao carregar imagem')
          setError(cause instanceof Error ? cause.message : 'Erro ao carregar imagem')
        }
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [imageUrl, viewportWidth, viewportHeight, zoom])

  return { canvasRef, dimensions, error }
}

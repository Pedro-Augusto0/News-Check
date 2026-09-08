import { useEffect, useRef, useState } from 'react'
import { loadPageImage, renderImageToCanvas } from '@/shared/image/page-image-cache'
import { computeReviewPageScale, REVIEW_FIT_SCALE } from '../application'

const FALLBACK_WIDTH = 595
const FALLBACK_HEIGHT = 842
const MIN_VIEWPORT_WIDTH = 40

interface UseReviewPageImageOptions {
  imageUrl: string | undefined
  viewportWidth: number
  viewportHeight: number
  zoom: number
}

export function useReviewPageImage({
  imageUrl,
  viewportWidth,
  viewportHeight: _viewportHeight,
  zoom,
}: UseReviewPageImageOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderGenerationRef = useRef(0)
  const [dimensions, setDimensions] = useState({ width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (viewportWidth < MIN_VIEWPORT_WIDTH) return

    const generation = ++renderGenerationRef.current
    let cancelled = false
    let frameId = 0

    const paintFallback = (canvas: HTMLCanvasElement, message: string) => {
      const usableWidth = Math.max(240, viewportWidth - 8)
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
      const canvas = canvasRef.current
      if (!canvas) {
        frameId = window.requestAnimationFrame(() => {
          if (!cancelled) void render()
        })
        return
      }

      setLoading(true)
      const usableWidth = Math.max(240, viewportWidth - 8)

      try {
        if (!imageUrl) {
          if (!cancelled) {
            paintFallback(canvas, 'Imagem da página indisponível')
            setError(null)
          }
          return
        }

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
          paintFallback(canvas, 'Falha ao carregar imagem')
          setError(cause instanceof Error ? cause.message : 'Erro ao carregar imagem')
        }
      } finally {
        if (!cancelled && generation === renderGenerationRef.current) {
          setLoading(false)
        }
      }
    }

    void render()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [imageUrl, viewportWidth, zoom])

  return { canvasRef, dimensions, error, loading }
}

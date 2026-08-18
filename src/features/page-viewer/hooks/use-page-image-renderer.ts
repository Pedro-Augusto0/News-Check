import { useEffect, useRef, useState } from 'react'
import { loadPageImage, renderImageToCanvas } from '@/shared/image/page-image-cache'
import { DEFAULT_FIT_SCALE, useViewerStore } from '../store'

const FALLBACK_WIDTH = 595
const FALLBACK_HEIGHT = 842
const VIEWPORT_GUTTER = 8

export function usePageImageRenderer(
  imageUrl: string | undefined,
  viewportWidth: number,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({
    width: FALLBACK_WIDTH,
    height: FALLBACK_HEIGHT,
  })
  const [error, setError] = useState<string | null>(null)
  const zoom = useViewerStore((state) => state.zoom)
  const setRendering = useViewerStore((state) => state.setRendering)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    setRendering(true)
    setError(null)
    const usableWidth = Math.max(220, viewportWidth - VIEWPORT_GUTTER)

    const paintFallback = (message: string) => {
      const width = Math.round(Math.min(FALLBACK_WIDTH, usableWidth) * DEFAULT_FIT_SCALE * zoom)
      const height = Math.round((FALLBACK_HEIGHT / FALLBACK_WIDTH) * width)
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (context) {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
        context.fillStyle = '#5f6368'
        context.font = '14px Inter, sans-serif'
        context.fillText(message, 24, 40)
      }
      setDimensions({ width, height })
    }

    const render = async () => {
      if (!imageUrl) {
        if (!cancelled) {
          paintFallback('Imagem da página indisponível')
          setRendering(false)
        }
        return
      }

      try {
        const image = await loadPageImage(imageUrl)
        if (cancelled) return
        const fitScale = usableWidth / image.naturalWidth
        const scale = Math.max(0.05, fitScale * DEFAULT_FIT_SCALE * zoom)
        const nextDimensions = await renderImageToCanvas(imageUrl, canvas, scale)
        if (!cancelled) setDimensions(nextDimensions)
      } catch (cause) {
        if (!cancelled) {
          paintFallback('Falha ao carregar imagem')
          setError(cause instanceof Error ? cause.message : 'Erro ao carregar imagem da página')
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [imageUrl, zoom, viewportWidth, setRendering])

  return { canvasRef, dimensions, error }
}

import { useEffect, useRef, useState } from 'react'
import { loadPageImage, renderImageToCanvas } from '@/shared/image/page-image-cache'
import { DEFAULT_FIT_SCALE } from '@/features/page-viewer/store'

export function useModalPageImage(
  imageUrl: string | undefined,
  viewportWidth: number,
  zoom: number,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    setError(null)

    const render = async () => {
      if (!imageUrl || viewportWidth <= 0) {
        setDimensions({ width: 0, height: 0 })
        return
      }

      try {
        const image = await loadPageImage(imageUrl)
        if (cancelled) return
        const fitScale = Math.max(0.05, ((viewportWidth - 16) / image.naturalWidth) * DEFAULT_FIT_SCALE)
        const scale = fitScale * zoom
        const dims = await renderImageToCanvas(imageUrl, canvas, scale)
        if (!cancelled) setDimensions(dims)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar página')
          setDimensions({ width: 0, height: 0 })
        }
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [imageUrl, viewportWidth, zoom])

  return { canvasRef, dimensions, error }
}

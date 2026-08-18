import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crop as CropIcon, Maximize2, Minus, ZoomIn } from 'lucide-react'
import type { Crop, StoredNewsItem } from '@/types/session'
import type { CropDisplayInfo } from '@/utils/cropDisplayTree'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useSessionStore } from '@/stores/sessionStore'
import { DEFAULT_FIT_SCALE } from '@/stores/viewerStore'
import { useCropDrawing } from '@/hooks/useCropDrawing'
import { resolveCropImageUrl } from '@/services/cropTextExtraction'
import { loadPageImage, renderImageRegionToCanvas, renderImageToCanvas } from '@/lib/image/pageImageCache'
import { percentToPx } from '@/utils/cropGeometry'
import { cropColor } from '@/utils/cropColors'
import { comparePageKeys } from '@/utils/pageKey'
import { cn } from '@/utils/cn'
import './news-detail-crop-editor.css'

interface NewsDetailCropEditorProps {
  modalCrops: Crop[]
  modalRootId: string | null
  pendingNewsItem?: StoredNewsItem
  cropDisplayIndex: Map<string, CropDisplayInfo>
  viewPageNumber?: string | null
  onViewPage?: (pageNumber: string) => void
  previewCrops?: Crop[]
}

function sortModalCrops(crops: Crop[]): Crop[] {
  return [...crops].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return comparePageKeys(a.pageNumber, b.pageNumber)
    return a.rect.y - b.rect.y
  })
}

function useModalPageImage(
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

function CropThumbnailChip({
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

interface ModalCropBoxProps {
  crop: Crop
  selected: boolean
  preview?: boolean
  finalized?: boolean
  label: string
  accentColor: string
  width: number
  height: number
  onSelect?: () => void
  onDelete?: () => void
}

function ModalCropBox({
  crop,
  selected,
  preview,
  finalized,
  label,
  accentColor,
  width,
  height,
  onSelect,
  onDelete,
}: ModalCropBoxProps) {
  const px = percentToPx(crop.rect, width, height)
  const interactive = !preview && !finalized

  if (finalized) {
    return (
      <div
        className="modal-crop-box modal-crop-box--finalized"
        style={{
          left: px.x,
          top: px.y,
          width: px.width,
          height: px.height,
        }}
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'modal-crop-box',
        selected && 'modal-crop-box--selected',
        preview && 'modal-crop-box--preview',
      )}
      style={{
        left: px.x,
        top: px.y,
        width: px.width,
        height: px.height,
        ['--crop-accent' as string]: accentColor,
      }}
      onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation()
              onSelect?.()
            }
          : undefined
      }
      onContextMenu={
        interactive
          ? (event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete?.()
            }
          : undefined
      }
      disabled={preview}
      title={preview ? 'Corte de outra notícia' : 'Botão direito para excluir'}
      aria-label={
        preview
          ? `Marcação de outra notícia na página ${crop.pageNumber}`
          : `Corte da página ${crop.pageNumber}. Botão direito para excluir`
      }
    >
      <span className="modal-crop-box__badge">{label}</span>
    </button>
  )
}

export function NewsDetailCropEditor({
  modalCrops,
  modalRootId,
  pendingNewsItem,
  cropDisplayIndex,
  viewPageNumber,
  onViewPage,
  previewCrops = [],
}: NewsDetailCropEditorProps) {
  const editions = useSessionStore((s) => s.editions)
  const addCropToNews = useCropsStore((s) => s.addCropToNews)
  const deleteCrop = useCropsStore((s) => s.deleteCrop)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)
  const crops = useCropsStore((s) => s.crops)
  const closeNewsTextModal = useNewsStore((s) => s.closeNewsTextModal)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)

  const sortedCrops = useMemo(() => sortModalCrops(modalCrops), [modalCrops])
  const isPending = !!pendingNewsItem && sortedCrops.length === 0

  const newsItem = useMemo(() => {
    if (pendingNewsItem) return pendingNewsItem
    const newsId = sortedCrops[0]?.newsItemId
    return newsId ? getNewsItem(newsId) : undefined
  }, [pendingNewsItem, sortedCrops, getNewsItem])

  const [selectedCropId, setSelectedCropId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(640)

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const update = () => setViewportWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setZoom(1)
    if (sortedCrops.length === 0) {
      setSelectedCropId(null)
      return
    }

    setSelectedCropId((current) => {
      if (current && sortedCrops.some((crop) => crop.id === current)) return current
      return sortedCrops[0].id
    })
  }, [modalRootId, pendingNewsItem?.id, sortedCrops])

  const selectedCrop = selectedCropId
    ? sortedCrops.find((crop) => crop.id === selectedCropId)
    : undefined

  const pageNumber =
    viewPageNumber ?? selectedCrop?.pageNumber ?? pendingNewsItem?.pageNumber ?? null

  const pageCrops = useMemo(
    () => sortedCrops.filter((crop) => crop.pageNumber === pageNumber),
    [sortedCrops, pageNumber],
  )

  const previewPageCrops = useMemo(
    () => previewCrops.filter((crop) => crop.pageNumber === pageNumber),
    [previewCrops, pageNumber],
  )

  const imageUrl = useMemo(() => {
    if (!pageNumber) return undefined
    const editionId = newsItem?.editionId ?? sortedCrops[0]?.editionId ?? pendingNewsItem?.editionId
    const pdfId = newsItem?.pdfId ?? sortedCrops[0]?.pdfId ?? pendingNewsItem?.pdfId
    if (!editionId || !pdfId) return undefined
    const edition = editions.find((item) => item.id === editionId)
    const pdf = edition?.pdfs.find((item) => item.id === pdfId)
    return pdf?.pages.find((page) => page.pageNumber === pageNumber)?.imageUrl
  }, [pageNumber, newsItem, sortedCrops, pendingNewsItem, editions])

  const { canvasRef, dimensions, error } = useModalPageImage(imageUrl, viewportWidth, zoom)

  const resolvePdfUrl = useCallback(
    (crop: Crop) => resolveCropImageUrl(crop, editions),
    [editions],
  )

  const handleDrawComplete = useCallback(
    (rect: Crop['rect']) => {
      if (!newsItem || !pageNumber) return

      const edition = editions.find((e) => e.id === newsItem.editionId)
      const pdf = edition?.pdfs.find((p) => p.id === newsItem.pdfId)
      if (!edition || !pdf) return

      const newCropId = addCropToNews({
        editionId: edition.id,
        pdfId: pdf.id,
        pageNumber,
        rect,
        newsItem,
      })

      if (!newCropId) return

      const state = useCropsStore.getState()
      const newCrop = state.crops[newCropId]
      const modalId = newCrop?.groupId ?? newCropId

      if (isPending) {
        closeNewsTextModal()
      }
      openTextModal(modalId)

      if (newCrop) {
        setSelectedCropId(newCropId)
        onViewPage?.(newCrop.pageNumber)
      }
    },
    [
      newsItem,
      pageNumber,
      editions,
      addCropToNews,
      isPending,
      closeNewsTextModal,
      openTextModal,
      onViewPage,
    ],
  )

  const canDraw =
    !!newsItem &&
    !!pageNumber &&
    !sortedCrops.some((crop) => isNewsItemFinalized(crop.id))

  const { draftRect, handlePointerDown, handlePointerMove, handlePointerUp } = useCropDrawing({
    enabled: canDraw,
    containerWidth: dimensions.width,
    containerHeight: dimensions.height,
    onComplete: handleDrawComplete,
  })

  const handleSelectCrop = useCallback((cropId: string) => {
    if (isNewsItemFinalized(cropId)) return
    setSelectedCropId(cropId)
    const crop = useCropsStore.getState().crops[cropId]
    if (crop) onViewPage?.(crop.pageNumber)
  }, [onViewPage, isNewsItemFinalized])

  const handleDeleteCrop = useCallback(
    (cropId: string) => {
      const deletedNewsId = crops[cropId]?.newsItemId ?? newsItem?.id
      deleteCrop(cropId)

      const state = useCropsStore.getState()
      let nextCrops: Crop[] = []

      if (modalRootId && state.groups[modalRootId]) {
        nextCrops = state.groups[modalRootId].cropIds
          .map((id) => state.crops[id])
          .filter(Boolean)
      } else if (modalRootId && state.crops[modalRootId]) {
        nextCrops = [state.crops[modalRootId]]
      } else if (deletedNewsId) {
        nextCrops = Object.values(state.crops).filter((c) => c.newsItemId === deletedNewsId)
      }

      if (nextCrops.length === 0) {
        setSelectedCropId(null)
        return
      }

      const keepSelected = selectedCropId && nextCrops.some((crop) => crop.id === selectedCropId)
      const nextCrop = keepSelected
        ? nextCrops.find((crop) => crop.id === selectedCropId)!
        : nextCrops[0]
      setSelectedCropId(nextCrop.id)
      onViewPage?.(nextCrop.pageNumber)
    },
    [selectedCropId, crops, newsItem, deleteCrop, modalRootId, onViewPage],
  )

  const canvasCursor = canDraw ? 'crosshair' : 'default'
  const zoomLabel = `${Math.round(zoom * 100)}%`

  const cropIndexLabel = (cropId: string, index: number) => {
    const info = cropDisplayIndex.get(cropId)
    return String(info?.displayIndex ?? index + 1)
  }

  return (
    <section className="news-detail-crop-editor">
      <div className="news-detail-crop-editor__body">
        <div className="news-detail-crop-editor__workspace" ref={canvasWrapRef}>
          {!imageUrl && (
            <div className="news-detail-crop-editor__empty">
              <CropIcon size={28} strokeWidth={1.5} aria-hidden />
              <p>Selecione uma página com imagem disponível.</p>
            </div>
          )}

          {imageUrl && (
            <div
              className="news-detail-crop-editor__canvas-wrap"
              style={{ cursor: canvasCursor }}
              onPointerDown={canDraw ? handlePointerDown : undefined}
              onPointerMove={canDraw ? handlePointerMove : undefined}
              onPointerUp={canDraw ? handlePointerUp : undefined}
            >
              <canvas ref={canvasRef} className="news-detail-crop-editor__canvas" />

              {dimensions.width > 0 && dimensions.height > 0 && (
                <div
                  className="news-detail-crop-editor__overlay"
                  style={{ width: dimensions.width, height: dimensions.height }}
                >
                  {pageCrops.map((crop, index) => {
                    const info = cropDisplayIndex.get(crop.id)
                    const finalized = isNewsItemFinalized(crop.id)
                    return (
                      <ModalCropBox
                        key={crop.id}
                        crop={crop}
                        selected={!finalized && selectedCropId === crop.id}
                        finalized={finalized}
                        label={cropIndexLabel(crop.id, index)}
                        accentColor={cropColor(info?.colorIndex ?? 0)}
                        width={dimensions.width}
                        height={dimensions.height}
                        onSelect={() => handleSelectCrop(crop.id)}
                        onDelete={() => handleDeleteCrop(crop.id)}
                      />
                    )
                  })}

                  {previewPageCrops.map((crop, index) => {
                    const info = cropDisplayIndex.get(crop.id)
                    return (
                      <ModalCropBox
                        key={`preview-${crop.id}`}
                        crop={crop}
                        selected={false}
                        preview
                        label={cropIndexLabel(crop.id, index)}
                        accentColor={cropColor(info?.colorIndex ?? 0)}
                        width={dimensions.width}
                        height={dimensions.height}
                      />
                    )
                  })}

                  {draftRect && (
                    <div
                      className="modal-crop-box modal-crop-box--draft"
                      style={{
                        ...(() => {
                          const px = percentToPx(draftRect, dimensions.width, dimensions.height)
                          return { left: px.x, top: px.y, width: px.width, height: px.height }
                        })(),
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="news-detail-crop-editor__error">{error}</p>}
        </div>

        <div className="news-detail-crop-editor__zoom-controls">
          <button
            type="button"
            className="news-detail-crop-editor__icon-btn"
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
            aria-label="Diminuir zoom"
          >
            <Minus size={14} aria-hidden />
          </button>
          <span className="news-detail-crop-editor__zoom-label">{zoomLabel}</span>
          <button
            type="button"
            className="news-detail-crop-editor__icon-btn"
            onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
            aria-label="Aumentar zoom"
          >
            <ZoomIn size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="news-detail-crop-editor__icon-btn"
            onClick={() => setZoom(1)}
            title="Ajustar à tela"
            aria-label="Ajustar à tela"
          >
            <Maximize2 size={13} aria-hidden />
          </button>
        </div>

        {sortedCrops.length > 0 && (
          <div className="news-detail-crop-editor__filmstrip">
              {sortedCrops.map((crop, index) => {
                const pdfUrl = resolvePdfUrl(crop)
                const info = cropDisplayIndex.get(crop.id)
                if (!pdfUrl) return null
                return (
                  <CropThumbnailChip
                    key={crop.id}
                    crop={crop}
                    pdfUrl={pdfUrl}
                    label={cropIndexLabel(crop.id, index)}
                    pageLabel={crop.pageNumber}
                    selected={selectedCropId === crop.id}
                    accentColor={cropColor(info?.colorIndex ?? 0)}
                    onSelect={() => handleSelectCrop(crop.id)}
                    onDelete={() => handleDeleteCrop(crop.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
}

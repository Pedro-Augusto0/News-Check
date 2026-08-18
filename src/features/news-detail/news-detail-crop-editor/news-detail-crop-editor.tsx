import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crop as CropIcon, Maximize2, Minus, ZoomIn } from 'lucide-react'
import type { Crop } from '@/features/crops'
import type { StoredNewsItem } from '@/features/news'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import { useSessionStore } from '@/features/edition-session'
import { useCropDrawing } from '@/features/page-viewer/hooks'
import { resolveCropImageUrl } from '@/features/text-extraction'
import { percentToPx } from '@/features/crops/geometry'
import { cropColor } from '@/features/crops/colors'
import { comparePageKeys } from '@/features/page-navigation/page-key'
import { CropThumbnailChip } from './crop-thumbnail-chip'
import { ModalCropBox } from './modal-crop-box'
import { useModalPageImage } from './use-modal-page-image'
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
              <p>Selecione uma pÃ¡gina com imagem disponÃ­vel.</p>
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
            title="Ajustar Ã  tela"
            aria-label="Ajustar Ã  tela"
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

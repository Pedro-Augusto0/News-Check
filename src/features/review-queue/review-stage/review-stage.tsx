import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Lock, Maximize2, Minus, Plus } from 'lucide-react'
import type { Crop } from '@/features/crops'
import type { CropRect } from '@/features/crops/geometry'
import { percentToPx } from '@/features/crops/geometry'
import { FinalizedCropBox } from '@/features/page-viewer/crop-overlay/crop-box'
import { useCropDrawing } from '@/features/page-viewer/hooks/use-crop-drawing'
import '@/features/page-viewer/crop-overlay/crop-overlay.css'
import { cn } from '@/shared/ui/utils/cn'
import { computeReviewPageDisplaySize, nextStableViewport, REVIEW_DEFAULT_ZOOM, stepReviewZoom } from '../application'
import { ReviewActiveCrop } from '../review-active-crop'
import { ReviewLoadingOverlay } from '../review-loading-overlay'
import { useReviewPageImage } from '../hooks'
import type { ReviewDrawMode, ReviewQueueItem, ReviewWorkMode } from '../model'
import './review-stage.css'

interface ReviewStageProps {
  imageUrl: string | undefined
  viewedPageNumber: string
  drawMode: ReviewDrawMode
  needsCrop: boolean
  currentItem: ReviewQueueItem | null
  pageCrops: Crop[]
  currentCropIds: string[]
  activeCrop: Crop | undefined
  inspectCropIds?: string[]
  inspectCrop?: Crop | undefined
  mergeCandidateId: string | null
  approvedCropIds?: Set<string>
  onDrawn: (rect: CropRect) => void
  onCommitRect: (cropId: string, rect: CropRect) => void
  onSelectCrop: (cropId: string) => void
  onDeleteCrop: (cropId: string) => void
  peekOtherCrops?: boolean
  inspecting?: boolean
  workMode?: ReviewWorkMode
  onWorkModeChange?: (mode: ReviewWorkMode) => void
}

export function ReviewStage({
  imageUrl,
  viewedPageNumber,
  drawMode,
  needsCrop,
  currentItem,
  pageCrops,
  currentCropIds,
  activeCrop,
  inspectCropIds = [],
  inspectCrop,
  mergeCandidateId,
  approvedCropIds,
  onDrawn,
  onCommitRect,
  onSelectCrop,
  onDeleteCrop,
  peekOtherCrops = true,
  inspecting = false,
  workMode = 'free',
  onWorkModeChange,
}: ReviewStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const inspectRef = useRef<HTMLDivElement>(null)
  const sessionKeyRef = useRef('')
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(REVIEW_DEFAULT_ZOOM)
  const redrawing = drawMode === 'redraw' && activeCrop?.pageNumber === viewedPageNumber
  const canDraw = !!currentItem?.newsId
  const sessionKey = `${currentItem?.id ?? ''}:${imageUrl ?? ''}`
  if (sessionKeyRef.current !== sessionKey) {
    sessionKeyRef.current = sessionKey
    if (zoom !== REVIEW_DEFAULT_ZOOM) setZoom(REVIEW_DEFAULT_ZOOM)
  }

  useLayoutEffect(() => {
    const target = scrollRef.current ?? stageRef.current
    if (!target) return

    const update = () => {
      setViewport((prev) =>
        nextStableViewport(prev, { width: target.clientWidth, height: target.clientHeight }),
      )
    }

    update()
    const frame = window.requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(target)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [currentItem?.id, imageUrl, viewedPageNumber])

  const { canvasRef, dimensions, error, loading } = useReviewPageImage({
    imageUrl,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    zoom,
  })

  const skeletonSize = useMemo(
    () => computeReviewPageDisplaySize(viewport.width, zoom),
    [viewport.width, zoom],
  )

  const cropDrawing = useCropDrawing({
    enabled: canDraw,
    containerWidth: dimensions.width,
    containerHeight: dimensions.height,
    onComplete: onDrawn,
  })

  useEffect(() => {
    if (redrawing) return
    const frame = window.requestAnimationFrame(() => {
      const target = inspectCrop?.pageNumber === viewedPageNumber ? inspectRef.current : activeRef.current
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [currentItem?.id, inspectCrop?.id, zoom, redrawing, viewedPageNumber])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setZoom((value) => stepReviewZoom(value, event.deltaY < 0 ? 1 : -1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [currentItem?.id])

  if (!currentItem) {
    return (
      <div className="review-stage review-stage--empty" ref={stageRef}>
        <p>Nenhum item na fila</p>
      </div>
    )
  }

  return (
    <div className="review-stage" ref={stageRef}>
      <div className="review-stage__toolbar">
        <div className="review-stage__toolbar-inner">
          {onWorkModeChange && (
            <button
              type="button"
              className={cn(
                'review-stage__lock-btn',
                workMode === 'focus' && 'review-stage__lock-btn--on',
              )}
              aria-pressed={workMode === 'focus'}
              onClick={() => onWorkModeChange(workMode === 'focus' ? 'free' : 'focus')}
              title={
                workMode === 'focus'
                  ? 'Sair do modo foco'
                  : 'Modo foco nesta notícia — outras só visualizam o recorte'
              }
            >
              <Lock size={11} strokeWidth={2.3} />
              Travar notícia
            </button>
          )}

          <div className="review-stage__control-group">
            <button
              type="button"
              className="review-stage__tool"
              onClick={() => setZoom((value) => stepReviewZoom(value, -1))}
              aria-label="Diminuir zoom"
            >
              <Minus size={12} strokeWidth={2.2} />
            </button>
            <span className="review-stage__zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="review-stage__tool"
              onClick={() => setZoom((value) => stepReviewZoom(value, 1))}
              aria-label="Aumentar zoom"
            >
              <Plus size={12} strokeWidth={2.2} />
            </button>
            <span className="review-stage__rule" aria-hidden />
            <button
              type="button"
              className="review-stage__tool"
              onClick={() => setZoom(1)}
              title="Zoom 100%"
              aria-label="Zoom 100%"
            >
              <Maximize2 size={12} strokeWidth={2.1} />
            </button>
          </div>
        </div>
      </div>

      <div className="review-stage__scroll" ref={scrollRef}>
        <div
          className={cn(
            'review-stage__page-slot',
            loading && skeletonSize.width > 0 && 'review-stage__page-slot--loading',
          )}
        >
          {loading && skeletonSize.width > 0 && (
            <ReviewLoadingOverlay
              stage
              width={skeletonSize.width}
              height={skeletonSize.height}
              label={`Carregando página ${viewedPageNumber}…`}
            />
          )}
          <div
            className={cn(
              'review-stage__canvas-wrap',
              loading && 'review-stage__canvas-wrap--loading',
            )}
          style={{ cursor: canDraw ? 'crosshair' : 'default' }}
          onPointerDown={canDraw ? cropDrawing.handlePointerDown : undefined}
          onPointerMove={canDraw ? cropDrawing.handlePointerMove : undefined}
          onPointerUp={canDraw ? cropDrawing.handlePointerUp : undefined}
          onContextMenu={(event) => event.preventDefault()}
        >
          <canvas ref={canvasRef} className="review-stage__canvas" />

          {pageCrops.map((crop) => {
            const px = percentToPx(crop.rect, dimensions.width, dimensions.height)
            if (approvedCropIds?.has(crop.id)) {
              return (
                <FinalizedCropBox
                  key={crop.id}
                  rect={crop.rect}
                  containerWidth={dimensions.width}
                  containerHeight={dimensions.height}
                />
              )
            }
            const currentIndex = currentCropIds.indexOf(crop.id)
            const inspectIndex = inspectCropIds.indexOf(crop.id)
            const isCurrent = currentIndex >= 0
            const isInspect = inspectIndex >= 0
            const isActive = activeCrop?.id === crop.id
            const isInspectActive = inspectCrop?.id === crop.id
            const isMerge = mergeCandidateId === crop.id
            if ((isActive || isInspectActive) && !redrawing) return null
            if (isCurrent || isInspect) {
              return (
                <button
                  key={crop.id}
                  type="button"
                  className={cn(
                    'review-stage__crop',
                    isInspect && 'review-stage__crop--inspect',
                    isMerge && 'review-stage__crop--merge',
                  )}
                  style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) event.stopPropagation()
                  }}
                  onClick={(event) => event.preventDefault()}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelectCrop(crop.id)
                  }}
                  title={
                    isInspect
                      ? 'Botão direito seleciona este recorte. Arraste com o esquerdo para desenhar.'
                      : `Recorte ${currentIndex + 1}. Botão direito para selecionar; esquerdo desenha.`
                  }
                >
                  <span className="review-stage__crop-badge">
                    {isInspect ? inspectIndex + 1 : currentIndex + 1}
                  </span>
                </button>
              )
            }
            return peekOtherCrops ? (
              <button
                key={crop.id}
                type="button"
                className={cn('review-stage__ghost', 'review-stage__ghost--peek', isMerge && 'review-stage__ghost--merge')}
                style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
                onPointerDown={(event) => {
                  if (event.button !== 0) event.stopPropagation()
                }}
                onClick={(event) => event.preventDefault()}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onSelectCrop(crop.id)
                }}
                title={
                  workMode === 'focus'
                    ? 'Botão direito para visualizar esta notícia. Esquerdo desenha um recorte.'
                    : 'Botão direito seleciona esta notícia. Esquerdo desenha um recorte.'
                }
              />
            ) : (
              <div
                key={crop.id}
                className={cn('review-stage__ghost', isMerge && 'review-stage__ghost--merge')}
                style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
              />
            )
          })}

          {activeCrop && !redrawing && activeCrop.pageNumber === viewedPageNumber && (
            <ReviewActiveCrop
              crop={activeCrop}
              label={`${Math.max(1, currentCropIds.indexOf(activeCrop.id) + 1)}/${Math.max(1, currentCropIds.length)}`}
              containerWidth={dimensions.width}
              containerHeight={dimensions.height}
              enabled
              boxRef={activeRef}
              onCommit={(rect) => onCommitRect(activeCrop.id, rect)}
              onDelete={() => onDeleteCrop(activeCrop.id)}
            />
          )}

          {inspectCrop && !redrawing && inspectCrop.pageNumber === viewedPageNumber && (
            <ReviewActiveCrop
              crop={inspectCrop}
              label={`Visualizando ${inspectCrop.pageNumber}`}
              tone="inspect"
              containerWidth={dimensions.width}
              containerHeight={dimensions.height}
              enabled
              boxRef={inspectRef}
              onCommit={(rect) => onCommitRect(inspectCrop.id, rect)}
              onDelete={() => onDeleteCrop(inspectCrop.id)}
            />
          )}

          {cropDrawing.draftRect && (
            <div
              className="review-stage__draft"
              style={(() => {
                const px = percentToPx(cropDrawing.draftRect, dimensions.width, dimensions.height)
                return { left: px.x, top: px.y, width: px.width, height: px.height }
              })()}
            />
          )}
        </div>
        </div>
        {error && <p className="review-stage__error">{error}</p>}
      </div>

      {(needsCrop || redrawing || inspecting) && (
        <p className="review-stage__hint">
          {inspecting && inspectCropIds.length === 0
            ? 'Desenhe o recorte da notícia visualizada — ele fica nela para juntar depois'
            : inspecting
              ? 'Visualizando outra notícia • Ajuste, apague ou desenhe outro recorte nela; depois junte.'
              : needsCrop
                ? 'Desenhe o recorte desta notícia'
                : 'Redesenhe o recorte atual'}
        </p>
      )}
    </div>
  )
}

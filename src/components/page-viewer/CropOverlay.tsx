import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Crop as CropIcon, Eye, GripVertical, Link2, Trash2, Unlink, UserRound } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Crop } from '@/types/session'
import type { CropRect } from '@/utils/cropGeometry'
import { percentToPx } from '@/utils/cropGeometry'
import { cropColor } from '@/utils/cropColors'
import type { CropDisplayInfo } from '@/utils/cropDisplayTree'
import { cropHasClient, formatClientKeywords } from '@/utils/cropClientStats'
import { useCropsStore } from '@/stores/cropsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { cropRectArea } from '@/utils/cropNewsSelection'
import './crop-overlay.css'

interface CropOverlayProps {
  crops: Crop[]
  finalizedCrops?: Crop[]
  cropDisplayIndex: Map<string, CropDisplayInfo>
  selectedCropId: string | null
  editingCropId: string | null
  draftRect: CropRect | null
  width: number
  height: number
  onSelectCrop: (cropId: string, event?: React.MouseEvent) => void
  onViewText: (cropId: string) => void
  onEditCrop: (cropId: string) => void
  onFinalizeCrop: (cropId: string) => void
  onDeleteCrop: (cropId: string) => void
}

interface CropBoxInnerProps {
  cropId: string
  rect: CropRect
  containerWidth: number
  containerHeight: number
  color: string
  selected: boolean
  draft?: boolean
  index?: number
  title?: string
  mergeEnabled?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  mergeFlash?: boolean
  clientKeywords?: string[]
  onClick?: (event?: React.MouseEvent) => void
  onViewText?: () => void
  onEdit?: () => void
  onFinalize?: () => void
  onDelete?: () => void
  onMergeDragStart?: (e: React.DragEvent, cropId: string) => void
  onMergeDragOver?: (e: React.DragEvent) => void
  onMergeDrop?: (e: React.DragEvent, cropId: string) => void
  onMergeDragEnter?: (cropId: string) => void
  onMergeDragLeave?: (cropId: string) => void
}

function FinalizedCropBox({
  rect,
  containerWidth,
  containerHeight,
}: {
  rect: CropRect
  containerWidth: number
  containerHeight: number
}) {
  const px = percentToPx(rect, containerWidth, containerHeight)

  return (
    <div
      className="crop-box crop-box--finalized"
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

function overlayCaption(title: string | undefined, boxWidth: number): string | undefined {
  const text = title?.trim()
  if (!text || boxWidth < 92) return undefined
  const maxChars = boxWidth >= 180 ? 16 : 10
  const upper = text.toLocaleUpperCase('pt-BR')
  if (upper.length <= maxChars) return upper
  return `${upper.slice(0, maxChars).trimEnd()}…`
}

function CropBoxInner({
  cropId,
  rect,
  containerWidth,
  containerHeight,
  color,
  selected,
  draft,
  index,
  title,
  mergeEnabled,
  isDragging,
  isDropTarget,
  mergeFlash,
  clientKeywords,
  onClick,
  onViewText,
  onEdit,
  onFinalize,
  onDelete,
  onMergeDragStart,
  onMergeDragOver,
  onMergeDrop,
  onMergeDragEnter,
  onMergeDragLeave,
}: Omit<CropBoxInnerProps, 'finalized'>) {
  const px = percentToPx(rect, containerWidth, containerHeight)
  const caption = overlayCaption(title, px.width)

  return (
    <div
      className={cn(
        'crop-box',
        selected && 'crop-box--selected',
        draft && 'crop-box--draft',
        isDragging && 'crop-box--dragging',
        isDropTarget && 'crop-box--drop-target',
        mergeFlash && 'crop-box--merge-flash',
      )}
      style={{
        left: px.x,
        top: px.y,
        width: px.width,
        height: px.height,
        ['--crop-accent' as string]: color,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      onDragOver={mergeEnabled ? onMergeDragOver : undefined}
      onDragEnter={mergeEnabled ? () => onMergeDragEnter?.(cropId) : undefined}
      onDragLeave={
        mergeEnabled
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                onMergeDragLeave?.(cropId)
              }
            }
          : undefined
      }
      onDrop={mergeEnabled ? (e) => onMergeDrop?.(e, cropId) : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {(index !== undefined || caption) && (
        <span className="crop-box__badge">
          {index !== undefined && (
            <span className="crop-box__badge-index">{index}</span>
          )}
          {caption && <span className="crop-box__badge-label">{caption}</span>}
        </span>
      )}

      {clientKeywords && clientKeywords.length > 0 && (
        <span
          className="crop-box__client-badge"
          title={`Palavra-chave do cliente: ${formatClientKeywords(clientKeywords)}`}
          aria-label={`Cliente: ${formatClientKeywords(clientKeywords)}`}
        >
          <UserRound size={11} strokeWidth={2.3} aria-hidden />
        </span>
      )}

      {isDropTarget && (
        <span className="crop-box__drop-hint" aria-hidden>
          Soltar aqui
        </span>
      )}

      {mergeEnabled && !draft && (
        <span
          className="crop-box__merge-handle"
          draggable
          title="Arraste para juntar com outro corte"
          aria-label="Arrastar para juntar cortes"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.stopPropagation()
            onMergeDragStart?.(e, cropId)
          }}
        >
          <GripVertical size={12} strokeWidth={2.5} />
        </span>
      )}

      {!draft && (onViewText || onEdit || onFinalize || onDelete) && (
        <div
          className="crop-box__actions"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {onViewText && (
            <button
              type="button"
              className="crop-box__action crop-box__action--view-text"
              onClick={onViewText}
              aria-label="Ver detalhes"
              title="Ver detalhes"
            >
              <Eye size={12} strokeWidth={2.25} aria-hidden />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="crop-box__action crop-box__action--edit"
              onClick={onEdit}
              aria-label="Editar corte"
              title="Editar corte"
            >
              <CropIcon size={12} strokeWidth={2.25} aria-hidden />
            </button>
          )}
          {onFinalize && (
            <button
              type="button"
              className="crop-box__action crop-box__action--finalize"
              onClick={onFinalize}
              aria-label="Finalizar"
              title="Finalizar"
            >
              <Check size={12} strokeWidth={2.5} aria-hidden />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="crop-box__action crop-box__action--delete"
              onClick={onDelete}
              aria-label="Excluir"
              title="Excluir"
            >
              <Trash2 size={12} strokeWidth={2.25} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function canMergeInto(source: Crop | undefined, target: Crop | undefined): boolean {
  if (!source || !target || source.id === target.id) return false
  if (source.groupId && source.groupId === target.groupId) return false
  const store = useCropsStore.getState()
  if (store.isNewsItemFinalized(source.id) || store.isNewsItemFinalized(target.id)) return false
  return true
}

function createMergeDragGhost(label: string, color: string) {
  const ghost = document.createElement('div')
  ghost.className = 'crop-merge-drag-ghost'
  ghost.textContent = label
  ghost.style.setProperty('--crop-accent', color)
  document.body.appendChild(ghost)
  return ghost
}

export function CropOverlay({
  crops,
  finalizedCrops = [],
  cropDisplayIndex,
  selectedCropId,
  editingCropId,
  draftRect,
  width,
  height,
  onSelectCrop,
  onViewText,
  onEditCrop,
  onFinalizeCrop,
  onDeleteCrop,
}: CropOverlayProps) {
  const cropsMap = useCropsStore((s) => s.crops)
  const mergeCrops = useCropsStore((s) => s.mergeCrops)
  const ungroupCrop = useCropsStore((s) => s.ungroupCrop)
  const panMode = useViewerStore((s) => s.panMode)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [ungroupZoneActive, setUngroupZoneActive] = useState(false)
  const [mergeFlashId, setMergeFlashId] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const suppressClickCropIdRef = useRef<string | null>(null)

  const mergeEnabled = !panMode && !editingCropId
  const dragSourceInGroup = dragId ? !!cropsMap[dragId]?.groupId : false

  useEffect(() => {
    if (!mergeFlashId) return
    const timer = window.setTimeout(() => setMergeFlashId(null), 650)
    return () => window.clearTimeout(timer)
  }, [mergeFlashId])

  const handleDragStart = useCallback((e: React.DragEvent, cropId: string) => {
    e.dataTransfer.setData('text/plain', cropId)
    e.dataTransfer.effectAllowed = 'move'
    suppressClickCropIdRef.current = cropId
    setDragId(cropId)
    setDropTargetId(null)

    const info = cropDisplayIndex.get(cropId)
    const color = cropColor(info?.colorIndex ?? 0)
    const label = info?.displayIndex !== undefined ? String(info.displayIndex) : '•'
    const ghost = createMergeDragGhost(label, color)
    dragGhostRef.current = ghost
    e.dataTransfer.setDragImage(ghost, 18, 18)
    requestAnimationFrame(() => {
      ghost.remove()
      dragGhostRef.current = null
    })
  }, [cropDisplayIndex])

  const handleMergeCropClick = useCallback(
    (cropId: string, event?: React.MouseEvent) => {
      if (suppressClickCropIdRef.current === cropId) return
      onSelectCrop(cropId, event)
    },
    [onSelectCrop],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = e.dataTransfer.getData('text/plain') || dragId
      const source = sourceId ? cropsMap[sourceId] : undefined
      const target = cropsMap[targetId]
      if (sourceId && canMergeInto(source, target)) {
        mergeCrops(sourceId, targetId)
        setMergeFlashId(targetId)
      }
      setDragId(null)
      setDropTargetId(null)
      setUngroupZoneActive(false)
    },
    [dragId, cropsMap, mergeCrops],
  )

  const handleDragEnter = useCallback(
    (targetId: string) => {
      const sourceId = dragId
      if (!sourceId) return
      const source = cropsMap[sourceId]
      const target = cropsMap[targetId]
      if (canMergeInto(source, target)) {
        setDropTargetId(targetId)
      }
    },
    [dragId, cropsMap],
  )

  const handleDragLeave = useCallback((targetId: string) => {
    setDropTargetId((current) => (current === targetId ? null : current))
  }, [])

  const handleUngroupDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = e.dataTransfer.getData('text/plain') || dragId
      if (sourceId && cropsMap[sourceId]?.groupId) {
        ungroupCrop(sourceId)
      }
      setDragId(null)
      setDropTargetId(null)
      setUngroupZoneActive(false)
    },
    [dragId, cropsMap, ungroupCrop],
  )

  const handleDragLeaveOverlay = useCallback((e: React.DragEvent) => {
    if (!overlayRef.current?.contains(e.relatedTarget as Node)) {
      setDropTargetId(null)
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDropTargetId(null)
    setUngroupZoneActive(false)
    dragGhostRef.current?.remove()
    dragGhostRef.current = null
    requestAnimationFrame(() => {
      suppressClickCropIdRef.current = null
    })
  }, [])

  const visibleInteractive = useMemo(() => {
    if (editingCropId) return []
    return [...crops].sort((a, b) => cropRectArea(b.rect) - cropRectArea(a.rect))
  }, [crops, editingCropId])

  if (width <= 0 || height <= 0) return null

  if (visibleInteractive.length === 0 && finalizedCrops.length === 0 && !draftRect) {
    return null
  }

  return (
    <div
      ref={overlayRef}
      className={cn('crop-overlay', dragId && 'crop-overlay--merge-active')}
      style={{ width, height }}
      onDragOver={dragId ? handleDragOver : undefined}
      onDragLeave={dragId ? handleDragLeaveOverlay : undefined}
      onDragEnd={handleDragEnd}
    >
      {mergeEnabled && dragId && (
        <div className="crop-overlay__merge-hint" aria-live="polite">
          <Link2 size={13} strokeWidth={2.25} />
          <span>Solte sobre outro corte para juntar</span>
        </div>
      )}

      {finalizedCrops.map((crop) => (
        <FinalizedCropBox
          key={`finalized-${crop.id}`}
          rect={crop.rect}
          containerWidth={width}
          containerHeight={height}
        />
      ))}

      {visibleInteractive.map((crop) => {
        const info = cropDisplayIndex.get(crop.id)
        const clientKeywords = cropHasClient(crop) ? crop.clientKeywordsFound : undefined
        return (
          <CropBoxInner
            key={crop.id}
            cropId={crop.id}
            rect={crop.rect}
            containerWidth={width}
            containerHeight={height}
            color={cropColor(info?.colorIndex ?? 0)}
            selected={selectedCropId === crop.id}
            index={info?.displayIndex}
            title={crop.title}
            clientKeywords={clientKeywords}
            mergeEnabled={mergeEnabled}
            isDragging={dragId === crop.id}
            isDropTarget={dropTargetId === crop.id}
            mergeFlash={mergeFlashId === crop.id}
            onClick={(event) => handleMergeCropClick(crop.id, event)}
            onViewText={() => onViewText(crop.id)}
            onEdit={() => onEditCrop(crop.id)}
            onFinalize={() => onFinalizeCrop(crop.id)}
            onDelete={() => onDeleteCrop(crop.id)}
            onMergeDragStart={handleDragStart}
            onMergeDragOver={handleDragOver}
            onMergeDrop={handleDrop}
            onMergeDragEnter={handleDragEnter}
            onMergeDragLeave={handleDragLeave}
          />
        )
      })}
      {draftRect && (
        <CropBoxInner
          cropId="__draft__"
          rect={draftRect}
          containerWidth={width}
          containerHeight={height}
          color="var(--color-primary)"
          selected
          draft
        />
      )}
      {mergeEnabled && dragSourceInGroup && (
        <div
          className={cn(
            'crop-overlay__ungroup-zone',
            ungroupZoneActive && 'crop-overlay__ungroup-zone--active',
          )}
          onDragEnter={() => setUngroupZoneActive(true)}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setUngroupZoneActive(false)
            }
          }}
          onDragOver={handleDragOver}
          onDrop={handleUngroupDrop}
        >
          <Unlink size={14} strokeWidth={2} />
          <span>Solte para desagrupar</span>
        </div>
      )}
    </div>
  )
}

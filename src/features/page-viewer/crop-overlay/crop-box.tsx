import { Check, Crop as CropIcon, Eye, GripVertical, Trash2, UserRound } from 'lucide-react'
import { cn } from '@/shared/ui/utils/cn'
import type { CropRect } from '@/features/crops/geometry'
import { percentToPx } from '@/features/crops/geometry'
import { formatClientKeywords } from '@/features/crops/client-stats'

interface CropBoxProps {
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

function overlayCaption(title: string | undefined, boxWidth: number): string | undefined {
  const text = title?.trim()
  if (!text || boxWidth < 92) return undefined
  const maxChars = boxWidth >= 180 ? 16 : 10
  const upper = text.toLocaleUpperCase('pt-BR')
  if (upper.length <= maxChars) return upper
  return `${upper.slice(0, maxChars).trimEnd()}…`
}

export function FinalizedCropBox({
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

export function CropBox({
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
}: CropBoxProps) {
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

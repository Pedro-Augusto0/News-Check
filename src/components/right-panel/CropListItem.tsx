import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, FileText, MoreVertical, UserRound } from 'lucide-react'
import type { Crop, CropGroup } from '@/types/session'
import { cn } from '@/utils/cn'
import { cropHasClient, formatClientKeywords, mergeClientKeywords } from '@/utils/cropClientStats'
import { CropItemMenu } from './CropItemMenu'
import { useCropsStore } from '@/stores/cropsStore'
import './crop-list-item.css'

function isBlockedDragTarget(target: EventTarget | null, editingTitle = false): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('button, .crop-list-item__actions, .crop-group-item__toggle')) return true
  if (editingTitle && target.closest('input')) return true
  return false
}

function formatPageCount(count: number): string {
  return count === 1 ? '1 página' : `${count} páginas`
}

function ClientBadge({ keywords }: { keywords: string[] }) {
  const label = formatClientKeywords(keywords)
  return (
    <span
      className="crop-list-item__client-badge"
      title={`Palavra-chave do cliente encontrada: ${label}`}
      aria-label={`Cliente: ${label}`}
    >
      <UserRound size={11} strokeWidth={2.3} aria-hidden />
    </span>
  )
}

interface CropListItemProps {
  crop: Crop
  index?: number
  subLabel?: string
  accentColor?: string
  isChild?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  isSelected?: boolean
  compact?: boolean
  onDragStart: (e: React.DragEvent, cropId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: string) => void
  onTitleChange: (cropId: string, title: string) => void
  onViewText: (id: string) => void
  onSelect: (cropId: string) => void
  onDelete: (cropId: string) => void
  onUngroup?: (cropId: string) => void
}

export function CropListItem({
  crop,
  index,
  subLabel,
  accentColor,
  isChild = false,
  isDragging,
  isDropTarget,
  isSelected,
  compact = false,
  onDragStart,
  onDragOver,
  onDrop,
  onTitleChange,
  onViewText,
  onSelect,
  onDelete,
  onUngroup,
}: CropListItemProps) {
  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)
  const startEditCrop = useCropsStore((s) => s.startEditCrop)
  const finalizeCrop = useCropsStore((s) => s.finalizeCrop)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const label = subLabel ?? (index !== undefined ? String(index) : undefined)
  const canUngroup = !!crop.groupId && !!onUngroup
  const finalized = isNewsItemFinalized(crop.id)
  const clientKeywords = crop.clientKeywordsFound ?? []
  const hasClient = cropHasClient(crop)

  const handleEditTitle = () => {
    setEditingTitle(true)
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  const handleEditCrop = () => {
    onSelect(crop.id)
    startEditCrop(crop.id)
  }

  const handleFinalize = () => {
    finalizeCrop(crop.id)
    onSelect(crop.id)
  }

  const handleItemDragStart = (e: React.DragEvent) => {
    if (isBlockedDragTarget(e.target, editingTitle)) {
      e.preventDefault()
      return
    }
    onDragStart(e, crop.id)
  }

  return (
    <div
      className={cn(
        'crop-list-item',
        compact && 'crop-list-item--compact',
        isChild && 'crop-list-item--child',
        finalized && 'crop-list-item--finalized',
        isDragging && 'crop-list-item--dragging',
        isDropTarget && 'crop-list-item--drop-target',
        isSelected && 'crop-list-item--selected',
        menuOpen && 'crop-list-item--menu-open',
      )}
      style={{ ['--crop-accent' as string]: accentColor }}
      draggable
      onDragStart={handleItemDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, crop.id)}
      onClick={() => onSelect(crop.id)}
      aria-label={finalized ? `${crop.title || 'Sem título'} — Finalizado` : undefined}
    >
      {label && (
        <span className="crop-list-item__index" aria-hidden>
          {label}
        </span>
      )}

      <div className="crop-list-item__body">
        <div className="crop-list-item__title-row">
          {editingTitle ? (
            <input
              ref={titleRef}
              className="crop-list-item__title"
              value={crop.title}
              onChange={(e) => onTitleChange(crop.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
              aria-label="Título do corte"
            />
          ) : (
            <span
              className="crop-list-item__title crop-list-item__title--readonly"
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleEditTitle()
              }}
            >
              {crop.title || 'Sem título'}
            </span>
          )}
          {hasClient && <ClientBadge keywords={clientKeywords} />}
        </div>

        {(isChild || !compact) && (
          <span className={cn('crop-list-item__meta', isChild && 'crop-list-item__meta--subtitle')}>
            {isChild && <>Página {crop.pageNumber}</>}
            {!isChild && !compact && (
              <>1 corte · {formatPageCount(1)} · Página {crop.pageNumber}</>
            )}
          </span>
        )}
      </div>

      <div className="crop-list-item__actions">
        <button
          type="button"
          className="crop-list-item__action-btn crop-list-item__action-btn--view"
          aria-label="Ver detalhes"
          onClick={(e) => {
            e.stopPropagation()
            onViewText(crop.id)
          }}
        >
          <Eye size={14} />
        </button>

        <button
          type="button"
          ref={menuBtnRef}
          className="crop-list-item__action-btn crop-list-item__action-btn--menu"
          aria-label="Mais opções"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
        >
          <MoreVertical size={14} />
        </button>

        <CropItemMenu
          open={menuOpen}
          anchorRef={menuBtnRef}
          onClose={() => setMenuOpen(false)}
          onViewText={() => onViewText(crop.id)}
          onEditCrop={handleEditCrop}
          onFinalize={handleFinalize}
          isFinalized={finalized}
          onDelete={() => onDelete(crop.id)}
          onUngroup={canUngroup ? () => onUngroup!(crop.id) : undefined}
          canUngroup={canUngroup}
        />
      </div>
    </div>
  )
}

interface CropGroupItemProps {
  group: CropGroup
  rootCrop: Crop
  childCrops: Crop[]
  index?: number
  accentColor?: string
  expanded: boolean
  isDropTarget?: boolean
  selectedCropId?: string | null
  compact?: boolean
  onToggle: (groupId: string) => void
  onDragStart: (e: React.DragEvent, cropId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: string) => void
  onGroupTitleChange: (groupId: string, title: string) => void
  onViewText: (groupId: string) => void
  onSelect: (cropId: string) => void
  onDelete: (cropId: string) => void
  onUngroup: (cropId: string) => void
}

export function CropGroupItem({
  group,
  rootCrop,
  childCrops,
  index,
  accentColor,
  expanded,
  isDropTarget,
  selectedCropId,
  compact = false,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onGroupTitleChange,
  onViewText,
  onSelect,
  onDelete,
  onUngroup,
}: CropGroupItemProps) {
  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)
  const startEditCrop = useCropsStore((s) => s.startEditCrop)
  const finalizeCrop = useCropsStore((s) => s.finalizeCrop)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const allCrops = [rootCrop, ...childCrops]
  const totalItems = allCrops.length
  const pageNumbers = [...new Set(allCrops.map((c) => c.pageNumber))].sort((a, b) => a - b)
  const spansPages = pageNumbers.length > 1
  const finalized = isNewsItemFinalized(rootCrop.id)
  const clientKeywords = mergeClientKeywords(allCrops)
  const hasClient = clientKeywords.length > 0

  const cropsByPage = useMemo(() => {
    const map = new Map<number, Crop[]>()
    for (const crop of allCrops) {
      const list = map.get(crop.pageNumber) ?? []
      list.push(crop)
      map.set(crop.pageNumber, list)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [rootCrop, childCrops])

  const handleEditTitle = () => {
    setEditingTitle(true)
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  const handleEditCrop = () => {
    onSelect(rootCrop.id)
    startEditCrop(rootCrop.id)
  }

  const handleFinalize = () => {
    finalizeCrop(rootCrop.id)
    onSelect(rootCrop.id)
  }

  const handleHeaderDragStart = (e: React.DragEvent) => {
    if (isBlockedDragTarget(e.target, editingTitle)) {
      e.preventDefault()
      return
    }
    onDragStart(e, rootCrop.id)
  }

  const renderChildCrop = (crop: Crop) => {
    const cropIndexInGroup = allCrops.findIndex((c) => c.id === crop.id)
    const subLabel =
      index !== undefined
        ? `${index}.${cropIndexInGroup + 1}`
        : String(cropIndexInGroup + 1)

    return (
      <CropListItem
        key={crop.id}
        crop={{ ...crop, title: group.title }}
        subLabel={subLabel}
        accentColor={accentColor}
        isChild
        compact={compact}
        isSelected={selectedCropId === crop.id}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onTitleChange={(_, title) => onGroupTitleChange(group.id, title)}
        onViewText={() => onViewText(group.id)}
        onSelect={onSelect}
        onDelete={onDelete}
        onUngroup={onUngroup}
      />
    )
  }

  return (
    <div
      className={cn(
        'crop-group-item',
        finalized && 'crop-group-item--finalized',
        isDropTarget && 'crop-group-item--drop-target',
        menuOpen && 'crop-group-item--menu-open',
      )}
      style={{ ['--crop-accent' as string]: accentColor }}
    >
      <div
        className={cn('crop-group-item__header', finalized && 'crop-group-item__header--finalized')}
        draggable
        onDragStart={handleHeaderDragStart}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, rootCrop.id)}
        onClick={() => onSelect(rootCrop.id)}
        aria-label={finalized ? `${group.title || 'Sem título'} — Finalizado` : undefined}
      >
        {index !== undefined && (
          <span className="crop-list-item__index" aria-hidden>
            {index}
          </span>
        )}

        <div className="crop-list-item__body">
          <div className="crop-list-item__title-row">
            {editingTitle ? (
              <input
                ref={titleRef}
                className="crop-list-item__title"
                value={group.title}
                onChange={(e) => onGroupTitleChange(group.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                aria-label="Título do grupo"
              />
            ) : (
              <span
                className="crop-list-item__title crop-list-item__title--readonly"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  handleEditTitle()
                }}
              >
                {group.title || 'Sem título'}
              </span>
            )}
            {hasClient && <ClientBadge keywords={clientKeywords} />}
          </div>

          <span className="crop-list-item__meta">
            {totalItems} {totalItems === 1 ? 'corte' : 'cortes'}
            {!compact && (
              <> · {formatPageCount(pageNumbers.length)} · Página {rootCrop.pageNumber}</>
            )}
            {compact && spansPages && (
              <span className="crop-list-item__cross-page"> · várias páginas</span>
            )}
          </span>
        </div>

        <div className="crop-list-item__actions">
          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--view"
            aria-label="Ver detalhes"
            onClick={(e) => {
              e.stopPropagation()
              onViewText(group.id)
            }}
          >
            <Eye size={14} />
          </button>

          <button
            type="button"
            ref={menuBtnRef}
            className="crop-list-item__action-btn crop-list-item__action-btn--menu"
            aria-label="Mais opções"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
          >
            <MoreVertical size={14} />
          </button>

          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--toggle crop-group-item__toggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher grupo' : 'Expandir grupo'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(group.id)
            }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <CropItemMenu
            open={menuOpen}
            anchorRef={menuBtnRef}
            onClose={() => setMenuOpen(false)}
            onViewText={() => onViewText(group.id)}
            onEditCrop={handleEditCrop}
            onFinalize={handleFinalize}
            isFinalized={finalized}
            onDelete={() => onDelete(rootCrop.id)}
          />
        </div>
      </div>

      {expanded && (
        <div className="crop-group-item__children">
          {compact || pageNumbers.length <= 1
            ? allCrops.map((crop) => renderChildCrop(crop))
            : cropsByPage.map(([pageNumber, pageCrops]) => (
                <div key={pageNumber} className="crop-group-item__page-block">
                  <div className="crop-group-item__page-header">
                    <FileText size={12} aria-hidden />
                    <span>Página {pageNumber}</span>
                    <span className="crop-group-item__page-count">
                      {pageCrops.length} {pageCrops.length === 1 ? 'corte' : 'cortes'}
                    </span>
                  </div>
                  {pageCrops.map((crop) => renderChildCrop(crop))}
                </div>
              ))}
        </div>
      )}
    </div>
  )
}

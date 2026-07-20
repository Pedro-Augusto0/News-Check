import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, FileText, MoreVertical, UserRound } from 'lucide-react'
import type { Crop, CropGroup } from '@/types/session'
import { cn } from '@/utils/cn'
import { cropHasClient, formatClientKeywords, mergeClientKeywords } from '@/utils/cropClientStats'
import { CropItemMenu } from './CropItemMenu'
import { ListCropThumbnail } from '@/components/shared/ListCropThumbnail'
import { useCropsStore } from '@/stores/cropsStore'
import './crop-list-item.css'

function isBlockedDragTarget(target: EventTarget | null, editingTitle = false): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('button, .crop-list-item__actions, .crop-list-item__action-btn--toggle')) return true
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
  pdfUrl?: string
  index?: number
  subLabel?: string
  accentColor?: string
  isChild?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  isSelected?: boolean
  isActiveNews?: boolean
  compact?: boolean
  expanded?: boolean
  onToggle?: () => void
  metaContent?: React.ReactNode
  onDragStart: (e: React.DragEvent, cropId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: string) => void
  onTitleChange: (cropId: string, title: string) => void
  onViewText: (id: string) => void
  onSelect: (cropId: string) => void
  onDelete: (cropId: string) => void
  onUngroup?: (cropId: string) => void
  showViewText?: boolean
}

export function CropListItem({
  crop,
  pdfUrl,
  index,
  subLabel,
  accentColor,
  isChild = false,
  isDragging,
  isDropTarget,
  isSelected,
  isActiveNews = false,
  compact = false,
  expanded,
  onToggle,
  metaContent,
  onDragStart,
  onDragOver,
  onDrop,
  onTitleChange,
  onViewText,
  onSelect,
  onDelete,
  onUngroup,
  showViewText = true,
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
        isActiveNews && 'crop-list-item--active-news',
        menuOpen && 'crop-list-item--menu-open',
      )}
      style={{ ['--crop-accent' as string]: accentColor }}
      data-active-news={isActiveNews ? 'true' : undefined}
      aria-current={isActiveNews ? 'true' : undefined}
      draggable
      onDragStart={handleItemDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, crop.id)}
      onClick={() => onSelect(crop.id)}
      aria-label={finalized ? `${crop.title || 'Sem título'} — Finalizado` : undefined}
    >
      <ListCropThumbnail
        pdfUrl={pdfUrl}
        crop={crop}
        displayIndex={label}
        accentColor={accentColor}
      />

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

        {(isChild || !compact || metaContent) && (
          <span className={cn('crop-list-item__meta', isChild && 'crop-list-item__meta--subtitle')}>
            {metaContent}
            {!metaContent && isChild && <>Página {crop.pageNumber}</>}
            {!metaContent && !isChild && !compact && (
              <>1 corte · {formatPageCount(1)} · Página {crop.pageNumber}</>
            )}
          </span>
        )}
      </div>

      <div className="crop-list-item__actions">
        {showViewText && (
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
        )}

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

        {onToggle && (
          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--toggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher grupo' : 'Expandir grupo'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        <CropItemMenu
          open={menuOpen}
          anchorRef={menuBtnRef}
          onClose={() => setMenuOpen(false)}
          onViewText={() => onViewText(crop.id)}
          canViewText={showViewText}
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
  pdfUrl?: string
  index?: number
  accentColor?: string
  expanded: boolean
  isDropTarget?: boolean
  selectedCropId?: string | null
  isNewsSelected?: boolean
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
  pdfUrl,
  index,
  accentColor,
  expanded,
  isDropTarget,
  selectedCropId,
  isNewsSelected,
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
  const allCrops = [rootCrop, ...childCrops]
  const pageNumbers = [...new Set(allCrops.map((c) => c.pageNumber))].sort((a, b) => a - b)
  const spansPages = pageNumbers.length > 1
  const clientKeywords = mergeClientKeywords(allCrops)
  const hasClient = clientKeywords.length > 0

  const cropsByPage = useMemo(() => {
    const map = new Map<number, Crop[]>()
    for (const crop of childCrops) {
      const list = map.get(crop.pageNumber) ?? []
      list.push(crop)
      map.set(crop.pageNumber, list)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [childCrops])

  const parentMeta = useMemo(() => {
    if (!compact) {
      return (
        <>
          {allCrops.length} {allCrops.length === 1 ? 'corte' : 'cortes'}
          {' · '}
          {formatPageCount(pageNumbers.length)}
          {' · '}
          Página {rootCrop.pageNumber}
        </>
      )
    }
    if (spansPages) {
      return <span className="crop-list-item__cross-page">várias páginas</span>
    }
    return null
  }, [allCrops.length, compact, pageNumbers.length, rootCrop.pageNumber, spansPages])

  const renderChildCrop = (crop: Crop, childIndex: number) => {
    const subLabel = index !== undefined ? `${index}.${childIndex + 1}` : String(childIndex + 2)

    return (
      <CropListItem
        key={crop.id}
        crop={{ ...crop, title: group.title }}
        pdfUrl={pdfUrl}
        subLabel={subLabel}
        accentColor={accentColor}
        isChild
        compact={compact}
        showViewText={false}
        isSelected={selectedCropId === crop.id || isNewsSelected}
        isActiveNews={isNewsSelected}
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
        isDropTarget && 'crop-group-item--drop-target',
      )}
      style={{ ['--crop-accent' as string]: accentColor }}
    >
      <CropListItem
        crop={{ ...rootCrop, title: group.title, clientKeywordsFound: hasClient ? clientKeywords : rootCrop.clientKeywordsFound }}
        pdfUrl={pdfUrl}
        index={index}
        accentColor={accentColor}
        compact={compact}
        expanded={expanded}
        onToggle={childCrops.length > 0 ? () => onToggle(group.id) : undefined}
        metaContent={parentMeta}
        isDropTarget={isDropTarget}
        isSelected={selectedCropId === rootCrop.id || isNewsSelected}
        isActiveNews={isNewsSelected}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onTitleChange={(_, title) => onGroupTitleChange(group.id, title)}
        onViewText={() => onViewText(group.id)}
        onSelect={onSelect}
        onDelete={onDelete}
      />

      {expanded && childCrops.length > 0 && (
        <div className="crop-group-item__children">
          {compact || pageNumbers.length <= 1
            ? childCrops.map((crop, childIndex) => renderChildCrop(crop, childIndex))
            : cropsByPage.map(([pageNumber, pageCrops]) => (
                <div key={pageNumber} className="crop-group-item__page-block">
                  <div className="crop-group-item__page-header">
                    <FileText size={12} aria-hidden />
                    <span>Página {pageNumber}</span>
                    <span className="crop-group-item__page-count">
                      {pageCrops.length} {pageCrops.length === 1 ? 'corte' : 'cortes'}
                    </span>
                  </div>
                  {pageCrops.map((crop) =>
                    renderChildCrop(crop, childCrops.findIndex((c) => c.id === crop.id)),
                  )}
                </div>
              ))}
        </div>
      )}
    </div>
  )
}

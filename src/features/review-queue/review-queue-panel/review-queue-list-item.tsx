import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Crop, Scissors, Trash2, Unlink, UserRound } from 'lucide-react'
import { cropColor, stableColorIndex } from '@/features/crops/colors'
import { useCropsStore, type Crop as CropModel } from '@/features/crops'
import type { VehicleEdition } from '@/features/edition-session'
import { formatClientKeywords } from '@/features/crops/client-stats'
import { ListCropThumbnail } from '@/features/news-list/list-crop-thumbnail'
import { resolveCropImageUrl } from '@/features/text-extraction'
import { cn } from '@/shared/ui/utils/cn'
import type { ReviewQueueItem } from '../model'
import '@/features/news-list/list-crop-thumbnail/list-thumbnail.css'
import '@/features/news-list/crop-list-item/crop-list-item.css'

interface ReviewQueueListItemProps {
  item: ReviewQueueItem
  index: number
  crops: Record<string, CropModel>
  edition: VehicleEdition | undefined
  isCurrent: boolean
  isInspect: boolean
  isDone: boolean
  selectionLocked?: boolean
  activeCropId?: string | null
  onSelect: () => void
  onDiscard: () => void
  onUngroupCrop?: (cropId: string) => void
  onEditCrop?: (cropId: string) => void
  onContextMenu?: (event: React.MouseEvent) => void
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

function NeedsCropBadge() {
  return (
    <span
      className="crop-list-item__needs-crop-badge"
      title="Esta notícia ainda não tem recorte"
      aria-label="Precisa de recorte"
    >
      <Scissors size={11} strokeWidth={2.3} aria-hidden />
    </span>
  )
}

function relatedCropsOf(
  item: ReviewQueueItem,
  crops: Record<string, CropModel>,
  groups: Record<string, { cropIds: string[] }>,
): { root: CropModel | undefined; children: CropModel[] } {
  const itemCrops = item.cropIds
    .map((id) => crops[id])
    .filter((crop): crop is CropModel => !!crop)
  const groupId = itemCrops.find((crop) => crop.groupId)?.groupId
  const group = groupId ? groups[groupId] : undefined
  const idSet = new Set(item.cropIds)
  const ordered = (group?.cropIds ?? item.cropIds)
    .filter((id) => idSet.has(id))
    .map((id) => crops[id])
    .filter((crop): crop is CropModel => !!crop)
  return { root: ordered[0], children: ordered.slice(1) }
}

export function ReviewQueueListItem({
  item,
  index,
  crops,
  edition,
  isCurrent,
  isInspect,
  isDone,
  selectionLocked = false,
  activeCropId = null,
  onSelect,
  onDiscard,
  onUngroupCrop,
  onEditCrop,
  onContextMenu,
}: ReviewQueueListItemProps) {
  const groups = useCropsStore((state) => state.groups)
  const { root, children } = useMemo(() => relatedCropsOf(item, crops, groups), [item, crops, groups])
  const [expanded, setExpanded] = useState(true)
  const accentColor = cropColor(stableColorIndex(item.newsId ?? item.id))
  const previewCrop = root ?? (item.cropIds[0] ? crops[item.cropIds[0]] : undefined)
  const imageUrl = previewCrop && edition ? resolveCropImageUrl(previewCrop, [edition]) : undefined
  const needsCrop = item.suspectReasons.includes('no-crop') || item.cropIds.length === 0
  const cropPages = new Set(
    item.cropIds.map((id) => crops[id]?.pageNumber).filter((page): page is string => !!page),
  )
  const multiPage = cropPages.size > 1
  const needsReview = item.suspectReasons.length > 0 && !needsCrop
  const hasRelated = children.length > 0

  useEffect(() => {
    if (children.length > 0) setExpanded(true)
  }, [children.length])

  const parent = (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'crop-list-item',
        'crop-list-item--compact',
        'review-queue-list-item',
        needsCrop && 'crop-list-item--pending',
        isDone && 'crop-list-item--finalized',
        isCurrent && 'crop-list-item--active-news',
        isInspect && 'crop-list-item--selected',
      )}
      style={{ ['--crop-accent' as string]: accentColor }}
      data-active-news={isCurrent ? 'true' : undefined}
      aria-current={isCurrent ? 'true' : undefined}
      aria-pressed={isInspect || isCurrent}
      title={
        selectionLocked && !isCurrent
          ? 'Botão direito: visualizar recorte. A notícia ativa não muda.'
          : undefined
      }
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      {previewCrop && imageUrl ? (
        <ListCropThumbnail
          pdfUrl={imageUrl}
          crop={previewCrop}
          displayIndex={index}
          accentColor={accentColor}
        />
      ) : (
        <div className="list-thumbnail list-thumbnail--crop list-thumbnail--pending" aria-hidden>
          <span className="list-thumbnail__pending-icon">
            <Scissors size={18} strokeWidth={1.75} />
          </span>
          <span className="list-thumbnail__badge">{index}</span>
        </div>
      )}

      <div className="crop-list-item__body">
        <div className="crop-list-item__title-row">
          <span className="crop-list-item__title crop-list-item__title--readonly">{item.title}</span>
          {needsCrop && <NeedsCropBadge />}
          {item.hasClient && <ClientBadge keywords={item.clientKeywords} />}
        </div>
        <span className="crop-list-item__meta">
          {multiPage && <span className="crop-list-item__cross-page">várias páginas</span>}
          {hasRelated && !multiPage && `${children.length + 1} cortes`}
          {needsCrop && !multiPage && !hasRelated && 'Sem recorte'}
          {needsReview && !needsCrop && !multiPage && !hasRelated && 'Revisar'}
          {isDone && !needsCrop && !needsReview && !multiPage && !hasRelated && 'Revisada'}
        </span>
      </div>

      <div className="crop-list-item__actions">
        {!isDone && (
          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--pending-delete review-queue-list-item__discard"
            aria-label="Não é notícia"
            title="Não é notícia (N)"
            onClick={(event) => {
              event.stopPropagation()
              onDiscard()
            }}
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        )}
        {hasRelated && (
          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--toggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher relacionadas' : 'Expandir relacionadas'}
            title={expanded ? 'Recolher relacionadas' : 'Expandir relacionadas'}
            onClick={(event) => {
              event.stopPropagation()
              setExpanded((value) => !value)
            }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
    </div>
  )

  if (!hasRelated) return parent

  return (
    <div className="crop-group-item review-queue-list-item__group">
      {parent}
      {expanded && (
        <div className="crop-group-item__children">
          {children.map((crop, childIndex) => {
            const childImageUrl = edition ? resolveCropImageUrl(crop, [edition]) : undefined
            const isChildActive = crop.id === activeCropId
            return (
              <div
                key={crop.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'crop-list-item',
                  'crop-list-item--compact',
                  'crop-list-item--child',
                  'review-queue-list-item__child',
                  isChildActive && 'crop-list-item--selected',
                )}
                style={{ ['--crop-accent' as string]: accentColor }}
                onClick={(event) => {
                  event.stopPropagation()
                  onEditCrop?.(crop.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onEditCrop?.(crop.id)
                  }
                }}
              >
                {childImageUrl ? (
                  <ListCropThumbnail
                    pdfUrl={childImageUrl}
                    crop={crop}
                    displayIndex={`${index}.${childIndex + 1}`}
                    accentColor={accentColor}
                  />
                ) : (
                  <div className="list-thumbnail list-thumbnail--crop" aria-hidden>
                    <span className="list-thumbnail__badge">{`${index}.${childIndex + 1}`}</span>
                  </div>
                )}
                <div className="crop-list-item__body">
                  <div className="crop-list-item__title-row">
                    <span className="crop-list-item__title crop-list-item__title--readonly">
                      {crop.title || item.title}
                    </span>
                  </div>
                  <span className="crop-list-item__meta crop-list-item__meta--subtitle">
                    Página {crop.pageNumber}
                  </span>
                </div>
                {!isDone && (
                  <div className="crop-list-item__actions">
                    <button
                      type="button"
                      className="crop-list-item__action-btn"
                      aria-label="Desagrupar"
                      title="Desagrupar"
                      onClick={(event) => {
                        event.stopPropagation()
                        onUngroupCrop?.(crop.id)
                      }}
                    >
                      <Unlink size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="crop-list-item__action-btn"
                      aria-label="Editar corte"
                      title="Editar corte"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEditCrop?.(crop.id)
                      }}
                    >
                      <Crop size={14} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

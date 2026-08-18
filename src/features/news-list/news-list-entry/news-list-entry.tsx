import type { Crop, CropDisplayNode } from '@/features/crops'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import { cropColor } from '@/features/crops/colors'
import { pageScopeKey } from '@/features/page-navigation/page-key'
import { CropGroupItem, CropListItem } from '../crop-list-item'

interface NewsListEntryProps {
  node: CropDisplayNode
  newsId: string | null
  cropDisplayIndex: Map<string, CropDisplayInfo>
  selectedCropId: string | null
  dragId: string | null
  dropTargetId: string | null
  expandedGroups: Record<string, boolean>
  highlightedNewsByPage: Record<string, Record<string, true>>
  isCropLinkedToSelectedNews: (cropId: string | undefined, newsItemId: string | null | undefined) => boolean
  resolvePageImageUrl: (pageNumber: string | undefined) => string | undefined
  findNewsByCropId: (cropId: string) => { id: string } | undefined
  onSetDropTargetId: (cropId: string) => void
  onToggleGroup: (groupId: string) => void
  onDragStart: (event: React.DragEvent, cropId: string) => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent, cropId: string) => void
  onGroupTitleChange: (groupId: string, title: string) => void
  onCropTitleChange: (cropId: string, title: string) => void
  onViewText: (id: string) => void
  onSelect: (cropId: string, event?: React.MouseEvent) => void
  onDelete: (cropId: string) => void
  onUngroup: (cropId: string) => void
}

export function NewsListEntry({
  node,
  newsId,
  cropDisplayIndex,
  selectedCropId,
  dragId,
  dropTargetId,
  expandedGroups,
  highlightedNewsByPage,
  isCropLinkedToSelectedNews,
  resolvePageImageUrl,
  findNewsByCropId,
  onSetDropTargetId,
  onToggleGroup,
  onDragStart,
  onDragOver,
  onDrop,
  onGroupTitleChange,
  onCropTitleChange,
  onViewText,
  onSelect,
  onDelete,
  onUngroup,
}: NewsListEntryProps) {
  const cropId = node.crop?.id
  const info = cropId ? cropDisplayIndex.get(cropId) : undefined
  const cropIndex = info?.displayIndex
  const accent = cropColor(info?.colorIndex ?? 0)
  const newsSelected = isCropLinkedToSelectedNews(cropId, node.crop?.newsItemId)
  const pageImageUrl = resolvePageImageUrl(node.crop?.pageNumber)
  const resolvedNewsId =
    newsId ?? (cropId ? findNewsByCropId(cropId)?.id ?? node.crop?.newsItemId : null)
  const highlightScope = node.crop ? pageScopeKey(node.crop.pdfId, node.crop.pageNumber) : null
  const highlightProps = resolvedNewsId
    ? {
        isHighlightedOnImage: !!(
          highlightScope && highlightedNewsByPage[highlightScope]?.[resolvedNewsId]
        ),
      }
    : {}

  if (node.type === 'group' && node.group && node.crop) {
    const childCrops = (node.children ?? [])
      .map((child) => child.crop)
      .filter((crop): crop is Crop => !!crop)

    return (
      <div key={node.id} onDragEnter={() => onSetDropTargetId(node.crop!.id)}>
        <CropGroupItem
          group={node.group}
          rootCrop={node.crop}
          childCrops={childCrops}
          pdfUrl={pageImageUrl}
          index={cropIndex}
          accentColor={accent}
          expanded={expandedGroups[node.group.id] ?? true}
          isDropTarget={dropTargetId === node.crop.id}
          selectedCropId={selectedCropId}
          isNewsSelected={newsSelected}
          dragId={dragId}
          dropTargetId={dropTargetId}
          compact
          onToggle={onToggleGroup}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnter={onSetDropTargetId}
          onGroupTitleChange={onGroupTitleChange}
          onViewText={onViewText}
          onSelect={onSelect}
          onDelete={onDelete}
          onUngroup={onUngroup}
          {...highlightProps}
        />
      </div>
    )
  }

  if (!node.crop) return null

  const crop = node.group ? { ...node.crop, title: node.group.title } : node.crop
  const viewTextId = node.group?.id ?? node.crop.id

  return (
    <div key={node.id} onDragEnter={() => onSetDropTargetId(node.crop!.id)}>
      <CropListItem
        crop={crop}
        pdfUrl={pageImageUrl}
        index={cropIndex}
        accentColor={accent}
        isDragging={dragId === node.crop.id}
        isDropTarget={dropTargetId === node.crop.id}
        isSelected={selectedCropId === node.crop.id || newsSelected}
        isActiveNews={newsSelected}
        compact
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onTitleChange={
          node.group
            ? (_id, title) => onGroupTitleChange(node.group!.id, title)
            : onCropTitleChange
        }
        onViewText={() => onViewText(viewTextId)}
        onSelect={onSelect}
        onDelete={onDelete}
        onUngroup={node.group ? onUngroup : undefined}
        {...highlightProps}
      />
    </div>
  )
}

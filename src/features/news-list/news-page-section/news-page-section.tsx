import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/ui/utils/cn'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import type { NewsPageSection } from '@/features/news/view-model'
import { canDeleteNewsItem } from '@/features/news/model'
import { PendingNewsListItem } from '../pending-news-list-item'
import { NewsListEntry } from '../news-list-entry'

interface NewsPageSectionListProps {
  section: NewsPageSection
  expanded: boolean
  isCurrentPage: boolean
  selectedCropId: string | null
  selectedNewsItemId: string | null
  dragId: string | null
  dropTargetId: string | null
  expandedGroups: Record<string, boolean>
  cropDisplayIndex: Map<string, CropDisplayInfo>
  highlightedNewsByPage: Record<string, Record<string, true>>
  isCropLinkedToSelectedNews: (cropId: string | undefined, newsItemId: string | null | undefined) => boolean
  resolvePageImageUrl: (pageNumber: string | undefined) => string | undefined
  findNewsByCropId: (cropId: string) => { id: string } | undefined
  onToggle: (pageNumber: string) => void
  onSetDropTargetId: (cropId: string) => void
  onToggleGroup: (groupId: string) => void
  onDragStart: (event: React.DragEvent, cropId: string) => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent, cropId: string) => void
  onGroupTitleChange: (groupId: string, title: string) => void
  onCropTitleChange: (cropId: string, title: string) => void
  onViewText: (id: string) => void
  onSelectCrop: (cropId: string, event?: React.MouseEvent) => void
  onDeleteCrop: (cropId: string) => void
  onUngroup: (cropId: string) => void
  onSelectNews: (newsId: string, pageNumber: string, event?: React.MouseEvent) => void
  onViewNewsText: (newsId: string) => void
  onDeleteNews: (newsId: string) => void
}

export function NewsPageSectionList({
  section,
  expanded,
  isCurrentPage,
  selectedCropId,
  selectedNewsItemId,
  dragId,
  dropTargetId,
  expandedGroups,
  cropDisplayIndex,
  highlightedNewsByPage,
  isCropLinkedToSelectedNews,
  resolvePageImageUrl,
  findNewsByCropId,
  onToggle,
  onSetDropTargetId,
  onToggleGroup,
  onDragStart,
  onDragOver,
  onDrop,
  onGroupTitleChange,
  onCropTitleChange,
  onViewText,
  onSelectCrop,
  onDeleteCrop,
  onUngroup,
  onSelectNews,
  onViewNewsText,
  onDeleteNews,
}: NewsPageSectionListProps) {
  const newsCount = section.entries.length
  const pendingCount = section.entries.filter((entry) => entry.kind === 'pending').length
  const hasActiveNews =
    !!selectedNewsItemId &&
    section.entries.some((entry) => {
      if (entry.kind === 'pending') return entry.item.id === selectedNewsItemId
      return isCropLinkedToSelectedNews(entry.node.crop?.id, entry.node.crop?.newsItemId)
    })

  return (
    <section
      className={cn(
        'crops-tab__page-section',
        !expanded && 'crops-tab__page-section--collapsed',
        isCurrentPage && 'crops-tab__page-section--current',
        hasActiveNews && 'crops-tab__page-section--has-active-news',
      )}
    >
      <button
        type="button"
        className="crops-tab__page-header"
        onClick={() => onToggle(section.pageNumber)}
        aria-expanded={expanded}
      >
        <span className="crops-tab__page-toggle" aria-hidden>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="crops-tab__page-title">
          Página {section.pageNumber}
          {hasActiveNews && <span className="crops-tab__page-active-dot" aria-hidden />}
        </span>
        <span className="crops-tab__page-count">
          {newsCount} {newsCount === 1 ? 'notícia' : 'notícias'}
          {pendingCount > 0 && (
            <span className="crops-tab__page-pending" title={`${pendingCount} sem corte`}>
              {' '}
              · {pendingCount} sem corte
            </span>
          )}
        </span>
      </button>
      {expanded && (
        <div className="crops-tab__page-items">
          {section.entries.map((entry) => {
            if (entry.kind === 'crop') {
              return (
                <NewsListEntry
                  key={entry.node.id}
                  node={entry.node}
                  newsId={entry.newsId}
                  cropDisplayIndex={cropDisplayIndex}
                  selectedCropId={selectedCropId}
                  dragId={dragId}
                  dropTargetId={dropTargetId}
                  expandedGroups={expandedGroups}
                  highlightedNewsByPage={highlightedNewsByPage}
                  isCropLinkedToSelectedNews={isCropLinkedToSelectedNews}
                  resolvePageImageUrl={resolvePageImageUrl}
                  findNewsByCropId={findNewsByCropId}
                  onSetDropTargetId={onSetDropTargetId}
                  onToggleGroup={onToggleGroup}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onGroupTitleChange={onGroupTitleChange}
                  onCropTitleChange={onCropTitleChange}
                  onViewText={onViewText}
                  onSelect={onSelectCrop}
                  onDelete={onDeleteCrop}
                  onUngroup={onUngroup}
                />
              )
            }

            const item = entry.item
            const deletable = canDeleteNewsItem(item)
            return (
              <PendingNewsListItem
                key={item.id}
                item={item}
                pageNumber={section.pageNumber}
                isSelected={selectedNewsItemId === item.id}
                isActiveNews={selectedNewsItemId === item.id}
                canDelete={deletable}
                onSelect={(event) => onSelectNews(item.id, section.pageNumber, event)}
                onViewText={() => onViewNewsText(item.id)}
                onDelete={deletable ? () => onDeleteNews(item.id) : undefined}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Link2, List, Scissors } from 'lucide-react'
import type { Crop, CropDisplayNode } from '@/features/crops'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import type { NewsPageEntry, NewsPageSection } from '@/features/news/view-model'
import { cropColor } from '@/features/crops/colors'
import { resolveCropImageUrl } from '@/features/text-extraction'
import { cn } from '@/shared/ui/utils/cn'
import { ListCropThumbnail } from '@/features/news-list/list-crop-thumbnail'
import { useSessionStore } from '@/features/edition-session'
import './news-detail-news-list.css'

export interface NewsDetailBrowseTarget {
  pageNumber: string
  newsId: string | null
  cropIds: string[]
}

interface NewsDetailNewsListProps {
  sections: NewsPageSection[]
  currentNewsId: string | null
  currentCropIds: Set<string>
  currentGroupId: string | null
  previewNewsId: string | null
  previewCropIds: string[]
  viewPageNumber: string | null
  collapsed: boolean
  canMerge: boolean
  cropDisplayIndex: Map<string, CropDisplayInfo>
  onToggleCollapsed: () => void
  onSelectPage: (pageNumber: string) => void
  onSelectNews: (target: NewsDetailBrowseTarget) => void
  onMergeCrop: (sourceCropId: string) => void
}

function entryCropIds(node: CropDisplayNode): string[] {
  if (node.group?.cropIds.length) return node.group.cropIds
  return node.crop ? [node.crop.id] : []
}

function isCurrentEntry(
  entry: NewsPageEntry,
  currentNewsId: string | null,
  currentCropIds: Set<string>,
  currentGroupId: string | null,
): boolean {
  if (entry.kind === 'pending') return entry.item.id === currentNewsId
  if (currentGroupId && entry.node.group?.id === currentGroupId) return true
  if (entry.newsId && currentNewsId && entry.newsId === currentNewsId) return true
  if (entry.node.crop?.newsItemId && entry.node.crop.newsItemId === currentNewsId) return true
  if (entry.node.crop && currentCropIds.has(entry.node.crop.id)) return true
  if (entry.node.group?.cropIds.some((id) => currentCropIds.has(id))) return true
  return false
}

interface BrowseNewsRowProps {
  title: string
  crop?: Crop
  pdfUrl?: string
  accentColor?: string
  indexLabel?: string
  isCurrent: boolean
  isPreview: boolean
  canMerge: boolean
  pending?: boolean
  onSelect: () => void
  onMerge?: () => void
}

function BrowseNewsRow({
  title,
  crop,
  pdfUrl,
  accentColor,
  indexLabel,
  isCurrent,
  isPreview,
  canMerge,
  pending,
  onSelect,
  onMerge,
}: BrowseNewsRowProps) {
  return (
    <div
      className={cn(
        'news-detail-news-list__item',
        isCurrent && 'news-detail-news-list__item--current',
        isPreview && 'news-detail-news-list__item--preview',
        pending && 'news-detail-news-list__item--pending',
      )}
      style={accentColor ? { ['--crop-accent' as string]: accentColor } : undefined}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      {crop && pdfUrl ? (
        <ListCropThumbnail
          pdfUrl={pdfUrl}
          crop={crop}
          displayIndex={indexLabel}
          accentColor={accentColor}
        />
      ) : (
        <div className="list-thumbnail list-thumbnail--crop list-thumbnail--pending" aria-hidden>
          <span className="list-thumbnail__pending-icon">
            <Scissors size={14} strokeWidth={1.75} />
          </span>
        </div>
      )}
      <span className="news-detail-news-list__item-title">{title || 'Sem título'}</span>
      {canMerge && !isCurrent && onMerge && (
        <button
          type="button"
          className="news-detail-news-list__merge-btn"
          title="Juntar a esta notícia"
          aria-label="Juntar a esta notícia"
          onClick={(event) => {
            event.stopPropagation()
            onMerge()
          }}
        >
          <Link2 size={13} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  )
}

export function NewsDetailNewsList({
  sections,
  currentNewsId,
  currentCropIds,
  currentGroupId,
  previewNewsId,
  previewCropIds,
  viewPageNumber,
  collapsed,
  canMerge,
  cropDisplayIndex,
  onToggleCollapsed,
  onSelectPage,
  onSelectNews,
  onMergeCrop,
}: NewsDetailNewsListProps) {
  const editions = useSessionStore((s) => s.editions)
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({})

  const isPageExpanded = useCallback(
    (pageNumber: string) => {
      if (pageNumber in collapsedPages) return !collapsedPages[pageNumber]
      return pageNumber === viewPageNumber
    },
    [collapsedPages, viewPageNumber],
  )

  const togglePage = useCallback((pageNumber: string) => {
    setCollapsedPages((prev) => {
      const expanded = pageNumber in prev ? !prev[pageNumber] : pageNumber === viewPageNumber
      return { ...prev, [pageNumber]: expanded }
    })
  }, [viewPageNumber])

  const resolvePdfUrl = useCallback(
    (crop: Crop) => resolveCropImageUrl(crop, editions),
    [editions],
  )

  const currentPageSet = useMemo(() => new Set(viewPageNumber ? [viewPageNumber] : []), [viewPageNumber])

  if (collapsed) {
    return (
      <aside className="news-detail-news-list news-detail-news-list--collapsed">
        <button
          type="button"
          className="news-detail-news-list__expand-btn"
          onClick={onToggleCollapsed}
          title="Mostrar páginas e notícias"
          aria-label="Mostrar páginas e notícias"
        >
          <List size={16} strokeWidth={2.25} aria-hidden />
          <span>Notícias</span>
        </button>
      </aside>
    )
  }

  return (
    <aside className="news-detail-news-list">
      <header className="news-detail-news-list__header">
        <h2 className="news-detail-news-list__title">Notícias</h2>
        <button
          type="button"
          className="news-detail-news-list__collapse-btn"
          onClick={onToggleCollapsed}
          title="Recolher lista"
          aria-label="Recolher lista"
        >
          <ChevronRight size={15} strokeWidth={2.25} aria-hidden />
        </button>
      </header>

      <div className="news-detail-news-list__scroll">
        {sections.length === 0 && (
          <p className="news-detail-news-list__empty">Nenhuma página disponível</p>
        )}

        {sections.map((section) => {
          const expanded = isPageExpanded(section.pageNumber)
          const isViewedPage = currentPageSet.has(section.pageNumber)
          const newsCount = section.entries.length

          return (
            <section
              key={section.pageNumber}
              className={cn(
                'news-detail-news-list__page',
                isViewedPage && 'news-detail-news-list__page--current',
              )}
            >
              <button
                type="button"
                className="news-detail-news-list__page-header"
                onClick={() => {
                  togglePage(section.pageNumber)
                  onSelectPage(section.pageNumber)
                }}
                aria-expanded={expanded}
              >
                <span className="news-detail-news-list__page-toggle" aria-hidden>
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <span className="news-detail-news-list__page-title">Pág. {section.pageNumber}</span>
                <span className="news-detail-news-list__page-count">
                  {newsCount} {newsCount === 1 ? 'notícia' : 'notícias'}
                </span>
              </button>

              {expanded && (
                <div className="news-detail-news-list__items">
                  {section.entries.length === 0 && (
                    <p className="news-detail-news-list__page-empty">Nenhuma notícia nesta página</p>
                  )}

                  {section.entries.map((entry) => {
                    if (entry.kind === 'pending') {
                      const isCurrent = isCurrentEntry(entry, currentNewsId, currentCropIds, currentGroupId)
                      return (
                        <BrowseNewsRow
                          key={entry.item.id}
                          title={entry.item.title}
                          pending
                          isCurrent={isCurrent}
                          isPreview={previewNewsId === entry.item.id}
                          canMerge={false}
                          onSelect={() =>
                            onSelectNews({
                              pageNumber: section.pageNumber,
                              newsId: entry.item.id,
                              cropIds: [],
                            })
                          }
                        />
                      )
                    }

                    const crop = entry.node.crop
                    if (!crop) return null

                    const info = cropDisplayIndex.get(crop.id)
                    const isCurrent = isCurrentEntry(entry, currentNewsId, currentCropIds, currentGroupId)
                    const newsId = entry.newsId ?? crop.newsItemId ?? null
                    const cropIds = entryCropIds(entry.node)
                    const mergeSourceId = crop.id

                    return (
                      <BrowseNewsRow
                        key={entry.node.id}
                        title={entry.node.group?.title ?? crop.title}
                        crop={crop}
                        pdfUrl={resolvePdfUrl(crop)}
                        accentColor={cropColor(info?.colorIndex ?? 0)}
                        indexLabel={info ? String(info.displayIndex) : undefined}
                        isCurrent={isCurrent}
                        isPreview={
                          previewCropIds.includes(crop.id) ||
                          (!!newsId && previewNewsId === newsId)
                        }
                        canMerge={canMerge && !!mergeSourceId}
                        onSelect={() =>
                          onSelectNews({
                            pageNumber: crop.pageNumber,
                            newsId,
                            cropIds,
                          })
                        }
                        onMerge={() => onMergeCrop(mergeSourceId)}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </aside>
  )
}

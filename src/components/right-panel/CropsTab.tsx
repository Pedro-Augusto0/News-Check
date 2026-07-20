import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Filter, Plus, Search, Unlink } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useCurrentPdf } from '@/hooks/useSessionSelectors'
import {
  extractAndSaveGroupText,
  resolveCropPdfUrl,
} from '@/services/cropTextExtraction'
import { useCropDisplayTree, useCropDisplayIndexMap } from '@/hooks/useCropSelectors'
import { buildCropsByPageSections } from '@/utils/cropDisplayTree'
import { cropColor } from '@/utils/cropColors'
import { newsDisplayNodeHasClient } from '@/utils/cropClientStats'
import type { CropDisplayNode } from '@/types/session'
import { CropListItem, CropGroupItem } from './CropListItem'
import { PendingNewsListItem } from './PendingNewsListItem'
import { ActiveNewsBanner } from './ActiveNewsBanner'
import { buildNewsPageSections, newsItemHasClient } from '@/utils/pendingNews'
import { canDeleteNewsItem } from '@/utils/newsItem'
import { resolveNewsAccentColor } from '@/utils/newsAccentColor'
import './crops-tab.css'

export function CropsTab() {
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  const selectPage = useSessionStore((s) => s.selectPage)
  const newsViewFilter = useSessionStore((s) => s.newsViewFilter)
  const editions = useSessionStore((s) => s.editions)
  const currentPdf = useCurrentPdf()

  const displayTree = useCropDisplayTree(selectedEditionId, currentPdf?.id)
  const cropDisplayIndex = useCropDisplayIndexMap(selectedEditionId, currentPdf?.id)
  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)
  const selectedCropId = useCropsStore((s) => s.selectedCropId)
  const expandedGroups = useCropsStore((s) => s.expandedGroups)
  const mergeCrops = useCropsStore((s) => s.mergeCrops)
  const ungroupCrop = useCropsStore((s) => s.ungroupCrop)
  const deleteCrop = useCropsStore((s) => s.deleteCrop)
  const updateCropTitle = useCropsStore((s) => s.updateCropTitle)
  const updateGroupTitle = useCropsStore((s) => s.updateGroupTitle)
  const toggleGroupExpanded = useCropsStore((s) => s.toggleGroupExpanded)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const selectCrop = useCropsStore((s) => s.selectCrop)

  const newsItems = useNewsStore((s) => s.items)
  const selectedNewsItemId = useNewsStore((s) => s.selectedNewsItemId)
  const selectNewsItem = useNewsStore((s) => s.selectNewsItem)
  const addManualNewsItem = useNewsStore((s) => s.addManualNewsItem)
  const deleteManualNewsItem = useNewsStore((s) => s.deleteManualNewsItem)
  const findNewsByCropId = useNewsStore((s) => s.findNewsByCropId)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)
  const ensureNewsForCrop = useNewsStore((s) => s.ensureNewsForCrop)

  const [search, setSearch] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [ungroupZoneActive, setUngroupZoneActive] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({})

  const pageSectionKey = useCallback(
    (pageNumber: number) => `${currentPdf?.id ?? 'pdf'}:${pageNumber}`,
    [currentPdf?.id],
  )

  const isPageExpanded = useCallback(
    (pageNumber: number) => {
      if (search.trim()) return true
      const key = pageSectionKey(pageNumber)
      const collapsed = key in collapsedPages
        ? collapsedPages[key]
        : pageNumber !== selectedPageNumber
      return !collapsed
    },
    [collapsedPages, pageSectionKey, selectedPageNumber, search],
  )

  const togglePageSection = useCallback(
    (pageNumber: number) => {
      const key = pageSectionKey(pageNumber)
      setCollapsedPages((prev) => {
        const collapsed = key in prev ? prev[key] : pageNumber !== selectedPageNumber
        return { ...prev, [key]: !collapsed }
      })
    },
    [pageSectionKey, selectedPageNumber],
  )

  useEffect(() => {
    if (search.trim()) return
    setCollapsedPages({})
  }, [selectedPageNumber, currentPdf?.id, search])

  const dragSourceInGroup = dragId ? !!crops[dragId]?.groupId : false

  const pdfNews = useMemo(
    () => Object.values(newsItems).filter((item) => item.pdfId === currentPdf?.id),
    [newsItems, currentPdf?.id],
  )

  const pageSections = useMemo(
    () =>
      buildNewsPageSections(
        buildCropsByPageSections(displayTree, pdfNews),
        pdfNews,
        currentPdf?.id ?? '',
        crops,
      ),
    [displayTree, pdfNews, currentPdf?.id, crops],
  )

  const filteredPageSections = useMemo(() => {
    const q = search.trim().toLowerCase()

    return pageSections
      .map((section) => {
        let entries = section.entries

        if (q) {
          entries = entries.filter((entry) => {
            if (entry.kind === 'pending') {
              return entry.item.title.toLowerCase().includes(q)
            }
            const title = entry.node.group?.title ?? entry.node.crop?.title ?? ''
            return title.toLowerCase().includes(q)
          })
        }

        if (newsViewFilter === 'withClient') {
          entries = entries.filter((entry) => {
            if (entry.kind === 'pending') return newsItemHasClient(entry.item)
            return newsDisplayNodeHasClient(entry.node, crops)
          })
        }

        return { ...section, entries }
      })
      .filter((section) => section.entries.length > 0)
  }, [pageSections, search, newsViewFilter, crops])

  const selectedNewsItem = selectedNewsItemId ? getNewsItem(selectedNewsItemId) : undefined

  const activeNewsAccent = useMemo(() => {
    if (!selectedNewsItem) return undefined
    return resolveNewsAccentColor(selectedNewsItem, crops, groups, cropDisplayIndex)
  }, [selectedNewsItem, crops, groups, cropDisplayIndex])

  const activeNewsHasCrop = useMemo(() => {
    if (!selectedNewsItem) return false
    if (selectedNewsItem.cropId && crops[selectedNewsItem.cropId]) return true
    return Object.values(crops).some((crop) => crop.newsItemId === selectedNewsItem.id)
  }, [selectedNewsItem, crops])

  useEffect(() => {
    if (!selectedNewsItemId && !selectedCropId) return
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[data-active-news="true"]')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedNewsItemId, selectedCropId])

  const isCropLinkedToSelectedNews = useCallback(
    (cropId?: string, newsItemId?: string | null) => {
      if (!selectedNewsItemId) return false
      if (newsItemId === selectedNewsItemId) return true
      if (!cropId) return false
      return findNewsByCropId(cropId)?.id === selectedNewsItemId
    },
    [selectedNewsItemId, findNewsByCropId],
  )

  const handleSelectNews = useCallback(
    (newsId: string, pageNumber: number) => {
      selectNewsItem(newsId)
      selectCrop(null)
      selectPage(pageNumber)
    },
    [selectNewsItem, selectCrop, selectPage],
  )

  const handleSelectCrop = useCallback(
    (cropId: string) => {
      selectCrop(cropId)
      const crop = crops[cropId]
      if (!crop) return
      selectPage(crop.pageNumber)
      const newsId = ensureNewsForCrop(cropId)
      selectNewsItem(newsId)
    },
    [selectCrop, crops, selectPage, ensureNewsForCrop, selectNewsItem],
  )

  const handleDeleteNews = useCallback(
    (newsId: string) => {
      deleteManualNewsItem(newsId)
      selectCrop(null)
    },
    [deleteManualNewsItem, selectCrop],
  )

  const handleAddNews = useCallback(() => {
    if (!selectedEditionId || !currentPdf) return
    const newsId = addManualNewsItem({
      editionId: selectedEditionId,
      pdfId: currentPdf.id,
      pageNumber: selectedPageNumber,
    })
    selectCrop(null)
    selectNewsItem(newsId)
  }, [selectedEditionId, currentPdf, selectedPageNumber, addManualNewsItem, selectCrop, selectNewsItem])

  const handleDragStart = useCallback((e: React.DragEvent, cropId: string) => {
    e.dataTransfer.setData('text/plain', cropId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(cropId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = e.dataTransfer.getData('text/plain') || dragId
      if (sourceId && sourceId !== targetId) {
        const groupId = mergeCrops(sourceId, targetId)
        if (groupId) {
          void extractAndSaveGroupText(groupId, (crop) =>
            resolveCropPdfUrl(crop, editions),
          )
        }
      }
      setDragId(null)
      setDropTargetId(null)
      setUngroupZoneActive(false)
    },
    [dragId, mergeCrops, editions],
  )

  const handleUngroupDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData('text/plain') || dragId
      if (sourceId && crops[sourceId]?.groupId) ungroupCrop(sourceId)
      setDragId(null)
      setDropTargetId(null)
      setUngroupZoneActive(false)
    },
    [dragId, crops, ungroupCrop],
  )

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDropTargetId(null)
    setUngroupZoneActive(false)
  }, [])

  const renderNode = (node: CropDisplayNode) => {
    const cropId = node.crop?.id
    const info = cropId ? cropDisplayIndex.get(cropId) : undefined
    const cropIndex = info?.displayIndex
    const accent = cropColor(info?.colorIndex ?? 0)
    const newsSelected = isCropLinkedToSelectedNews(cropId, node.crop?.newsItemId)

    if (node.type === 'group' && node.group && node.crop) {
      const childCrops = (node.children ?? [])
        .map((c) => c.crop)
        .filter((c): c is NonNullable<typeof c> => !!c)

      return (
        <div key={node.id} onDragEnter={() => setDropTargetId(node.crop!.id)}>
          <CropGroupItem
            group={node.group}
            rootCrop={node.crop}
            childCrops={childCrops}
            pdfUrl={currentPdf?.url}
            index={cropIndex}
            accentColor={accent}
            expanded={expandedGroups[node.group.id] ?? true}
            isDropTarget={dropTargetId === node.crop.id}
            selectedCropId={selectedCropId}
            isNewsSelected={newsSelected}
            compact
            onToggle={toggleGroupExpanded}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onGroupTitleChange={updateGroupTitle}
            onViewText={openTextModal}
            onSelect={handleSelectCrop}
            onDelete={deleteCrop}
            onUngroup={ungroupCrop}
          />
        </div>
      )
    }

    if (node.crop) {
      const crop = node.group
        ? { ...node.crop, title: node.group.title }
        : node.crop
      const viewTextId = node.group?.id ?? node.crop.id

      return (
        <div key={node.id} onDragEnter={() => setDropTargetId(node.crop!.id)}>
          <CropListItem
            crop={crop}
            pdfUrl={currentPdf?.url}
            index={cropIndex}
            accentColor={accent}
            isDragging={dragId === node.crop.id}
            isDropTarget={dropTargetId === node.crop.id}
            isSelected={selectedCropId === node.crop.id || newsSelected}
            isActiveNews={newsSelected}
            compact
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onTitleChange={
              node.group
                ? (_id, title) => updateGroupTitle(node.group!.id, title)
                : updateCropTitle
            }
            onViewText={() => openTextModal(viewTextId)}
            onSelect={handleSelectCrop}
            onDelete={deleteCrop}
            onUngroup={node.group ? ungroupCrop : undefined}
          />
        </div>
      )
    }

    return null
  }

  if (!currentPdf) {
    return <div className="crops-tab crops-tab--empty">Selecione um PDF</div>
  }

  return (
    <div className="crops-tab">
      <div className="crops-tab__toolbar">
        <div className="crops-tab__search-row">
          <label className="crops-tab__search">
            <Search size={15} className="crops-tab__search-icon" aria-hidden />
            <input
              type="search"
              className="crops-tab__search-input"
              placeholder="Buscar notícia ou corte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="button" className="crops-tab__filter-btn" aria-label="Filtros">
            <Filter size={15} aria-hidden />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="crops-tab__add-news-btn"
        onClick={handleAddNews}
      >
        <Plus size={14} aria-hidden />
        <span>Adicionar notícia</span>
      </button>

      <ActiveNewsBanner
        newsItem={selectedNewsItem}
        hasCrop={activeNewsHasCrop}
        accentColor={activeNewsAccent}
        onClear={() => {
          selectNewsItem(null)
          selectCrop(null)
        }}
        onDelete={
          selectedNewsItemId && canDeleteNewsItem(selectedNewsItem)
            ? () => handleDeleteNews(selectedNewsItemId)
            : undefined
        }
      />

      <div className="crops-tab__list" ref={listRef} onDragEnd={handleDragEnd}>
        {filteredPageSections.length === 0 && (
          <p className="crops-tab__empty">Nenhuma notícia encontrada</p>
        )}

        {filteredPageSections.map((section) => {
          const expanded = isPageExpanded(section.pageNumber)
          const newsCount = section.entries.length
          const pendingCount = section.entries.filter((entry) => entry.kind === 'pending').length
          const isCurrentPage = section.pageNumber === selectedPageNumber
          const hasActiveNews =
            !!selectedNewsItemId &&
            section.entries.some((entry) => {
              if (entry.kind === 'pending') return entry.item.id === selectedNewsItemId
              return isCropLinkedToSelectedNews(
                entry.node.crop?.id,
                entry.node.crop?.newsItemId,
              )
            })

          return (
            <section
              key={section.pageNumber}
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
                onClick={() => togglePageSection(section.pageNumber)}
                aria-expanded={expanded}
              >
                <span className="crops-tab__page-toggle" aria-hidden>
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <span className="crops-tab__page-title">
                  Página {section.pageNumber}
                  {hasActiveNews && (
                    <span className="crops-tab__page-active-dot" aria-hidden />
                  )}
                </span>
                <span className="crops-tab__page-count">
                  {newsCount} {newsCount === 1 ? 'notícia' : 'notícias'}
                  {pendingCount > 0 && (
                    <span className="crops-tab__page-pending" title={`${pendingCount} sem corte`}>
                      {' '}· {pendingCount} sem corte
                    </span>
                  )}
                </span>
              </button>
              {expanded && (
                <div className="crops-tab__page-items">
                  {section.entries.map((entry) => {
                    if (entry.kind === 'crop') {
                      return renderNode(entry.node)
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
                        onSelect={() => handleSelectNews(item.id, section.pageNumber)}
                        onDelete={deletable ? () => handleDeleteNews(item.id) : undefined}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}

        {dragSourceInGroup && (
          <div
            className={cn(
              'crops-tab__ungroup-zone',
              ungroupZoneActive && 'crops-tab__ungroup-zone--active',
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
            <Unlink size={14} aria-hidden />
            <span>Solte aqui para desagrupar</span>
          </div>
        )}
      </div>
    </div>
  )
}

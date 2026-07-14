import { useMemo, useState, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronRight, Filter, Info, Plus, Search, Unlink } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useCurrentPdf } from '@/hooks/useSessionSelectors'
import { useCropDisplayTree, useCropDisplayIndexMap } from '@/hooks/useCropSelectors'
import { buildCropsByPageSections } from '@/utils/cropDisplayTree'
import { cropColor } from '@/utils/cropColors'
import { newsDisplayNodeHasClient } from '@/utils/cropClientStats'
import type { CropDisplayNode } from '@/types/session'
import { CropListItem, CropGroupItem } from './CropListItem'
import './crops-tab.css'

type CropFilter = 'all' | 'pending' | 'grouped' | 'ungrouped'

const FILTER_OPTIONS: { value: CropFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'grouped', label: 'Agrupadas' },
  { value: 'ungrouped', label: 'Sem grupo' },
]

export function CropsTab() {
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  const selectPage = useSessionStore((s) => s.selectPage)
  const newsViewFilter = useSessionStore((s) => s.newsViewFilter)
  const currentPdf = useCurrentPdf()
  const exitPanMode = useViewerStore((s) => s.exitPanMode)

  const displayTree = useCropDisplayTree(selectedEditionId, currentPdf?.id)
  const cropDisplayIndex = useCropDisplayIndexMap(selectedEditionId, currentPdf?.id)
  const crops = useCropsStore((s) => s.crops)
  const selectedCropId = useCropsStore((s) => s.selectedCropId)
  const expandedGroups = useCropsStore((s) => s.expandedGroups)
  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)
  const mergeCrops = useCropsStore((s) => s.mergeCrops)
  const ungroupCrop = useCropsStore((s) => s.ungroupCrop)
  const deleteCrop = useCropsStore((s) => s.deleteCrop)
  const updateCropTitle = useCropsStore((s) => s.updateCropTitle)
  const updateGroupTitle = useCropsStore((s) => s.updateGroupTitle)
  const toggleGroupExpanded = useCropsStore((s) => s.toggleGroupExpanded)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const selectCrop = useCropsStore((s) => s.selectCrop)

  const [search, setSearch] = useState('')
  const [cropFilter, setCropFilter] = useState<CropFilter>('all')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [ungroupZoneActive, setUngroupZoneActive] = useState(false)
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

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase()
    let nodes = displayTree

    if (q) {
      nodes = nodes.filter((node) => {
        const title = node.group?.title ?? node.crop?.title ?? ''
        return title.toLowerCase().includes(q)
      })
    }

    if (newsViewFilter === 'withClient') {
      nodes = nodes.filter((node) => newsDisplayNodeHasClient(node, crops))
    }

    if (cropFilter === 'all') return nodes

    return nodes.filter((node) => {
      const cropId = node.crop?.id
      if (!cropId) return false

      if (cropFilter === 'pending') return !isNewsItemFinalized(cropId)
      if (cropFilter === 'grouped') return node.type === 'group'
      if (cropFilter === 'ungrouped') return node.type === 'crop'
      return true
    })
  }, [displayTree, search, newsViewFilter, crops, cropFilter, isNewsItemFinalized])

  const pageSections = useMemo(
    () => buildCropsByPageSections(filteredTree),
    [filteredTree],
  )

  const handleSelectCrop = useCallback(
    (cropId: string) => {
      selectCrop(cropId)
      const crop = crops[cropId]
      if (crop) selectPage(crop.pageNumber)
    },
    [selectCrop, crops, selectPage],
  )

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
      if (sourceId && sourceId !== targetId) mergeCrops(sourceId, targetId)
      setDragId(null)
      setDropTargetId(null)
      setUngroupZoneActive(false)
    },
    [dragId, mergeCrops],
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
            index={cropIndex}
            accentColor={accent}
            expanded={expandedGroups[node.group.id] ?? true}
            isDropTarget={dropTargetId === node.crop.id}
            selectedCropId={selectedCropId}
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
            index={cropIndex}
            accentColor={accent}
            isDragging={dragId === node.crop.id}
            isDropTarget={dropTargetId === node.crop.id}
            isSelected={selectedCropId === node.crop.id}
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

        <button type="button" className="crops-tab__new-btn" onClick={exitPanMode}>
          <Plus size={15} aria-hidden />
          Novo corte
        </button>
      </div>

      <div className="crops-tab__filters" role="group" aria-label="Filtrar cortes">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              'crops-tab__filter-chip',
              cropFilter === opt.value && 'crops-tab__filter-chip--active',
            )}
            onClick={() => setCropFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="crops-tab__hint">
        <Info size={13} aria-hidden />
        <span>Arraste um corte sobre outro para unir e formar uma única notícia.</span>
      </p>

      <div className="crops-tab__list" onDragEnd={handleDragEnd}>
        {pageSections.length === 0 && (
          <p className="crops-tab__empty">Nenhum corte encontrado</p>
        )}

        {pageSections.map((section) => {
          const expanded = isPageExpanded(section.pageNumber)
          const cropCount = section.nodes.length
          const isCurrentPage = section.pageNumber === selectedPageNumber

          return (
            <section
              key={section.pageNumber}
              className={cn(
                'crops-tab__page-section',
                !expanded && 'crops-tab__page-section--collapsed',
                isCurrentPage && 'crops-tab__page-section--current',
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
                <span className="crops-tab__page-title">Página {section.pageNumber}</span>
                <span className="crops-tab__page-count">
                  {cropCount} {cropCount === 1 ? 'corte' : 'cortes'}
                </span>
              </button>
              {expanded && (
                <div className="crops-tab__page-items">
                  {section.nodes.map(renderNode)}
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

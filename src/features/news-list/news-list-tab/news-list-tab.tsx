import { ActiveNewsBanner } from '../active-news-banner'
import { NewsPageSectionList } from '../news-page-section'
import { NewsListToolbar } from '../news-list-toolbar'
import { NewsListUngroupZone } from '../news-list-ungroup-zone'
import { useNewsListTab } from '../hooks'
import './news-list-tab.css'

export function CropsTab() {
  const tab = useNewsListTab()

  if (!tab.currentPdf) {
    return <div className="crops-tab crops-tab--empty">Selecione um veículo</div>
  }

  if (tab.isLoadingNews) {
    return <div className="crops-tab crops-tab--empty">Carregando notícias...</div>
  }

  return (
    <div className="crops-tab">
      <NewsListToolbar
        search={tab.search}
        onSearchChange={tab.setSearch}
        onAddNews={tab.handleAddNews}
      />

      <ActiveNewsBanner
        newsItem={tab.selectedNewsItem}
        hasCrop={tab.activeNewsHasCrop}
        accentColor={tab.activeNewsAccent}
        droppable={tab.canDropOnActiveBanner}
        dropActive={tab.bannerDropActive && tab.activeNewsHasCrop}
        onDragOver={tab.handleBannerDragOver}
        onDragEnter={tab.handleBannerDragEnter}
        onDragLeave={tab.handleBannerDragLeave}
        onDrop={tab.handleBannerDrop}
        onClear={tab.handleClearActiveNews}
        onDelete={
          tab.canDeleteSelectedNews && tab.selectedNewsItemId
            ? () => tab.handleDeleteNews(tab.selectedNewsItemId!)
            : undefined
        }
      />

      <div className="crops-tab__list" ref={tab.listRef} onDragEnd={tab.handleDragEnd}>
        {tab.filteredPageSections.length === 0 && (
          <p className="crops-tab__empty">Nenhuma notícia encontrada</p>
        )}

        {tab.filteredPageSections.map((section) => (
          <NewsPageSectionList
            key={section.pageNumber}
            section={section}
            expanded={tab.isPageExpanded(section.pageNumber)}
            isCurrentPage={section.pageNumber === tab.selectedPageNumber}
            selectedCropId={tab.selectedCropId}
            selectedNewsItemId={tab.selectedNewsItemId}
            dragId={tab.dragId}
            dropTargetId={tab.dropTargetId}
            expandedGroups={tab.expandedGroups}
            cropDisplayIndex={tab.cropDisplayIndex}
            highlightedNewsByPage={tab.highlightedNewsByPage}
            isCropLinkedToSelectedNews={tab.isCropLinkedToSelectedNews}
            resolvePageImageUrl={tab.resolvePageImageUrl}
            findNewsByCropId={tab.findNewsByCropId}
            onToggle={tab.togglePageSection}
            onSetDropTargetId={tab.setDropTargetId}
            onToggleGroup={tab.toggleGroupExpanded}
            onDragStart={tab.handleDragStart}
            onDragOver={tab.handleDragOver}
            onDrop={tab.handleDrop}
            onGroupTitleChange={tab.updateGroupTitle}
            onCropTitleChange={tab.updateCropTitle}
            onViewText={tab.openTextModal}
            onSelectCrop={tab.handleSelectCrop}
            onDeleteCrop={tab.deleteCrop}
            onUngroup={tab.ungroupCrop}
            onSelectNews={tab.handleSelectNews}
            onViewNewsText={tab.openNewsTextModal}
            onDeleteNews={tab.handleDeleteNews}
          />
        ))}

        {tab.dragSourceInGroup && (
          <NewsListUngroupZone
            active={tab.ungroupZoneActive}
            onDragEnter={() => tab.setUngroupZoneActive(true)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                tab.setUngroupZoneActive(false)
              }
            }}
            onDragOver={tab.handleDragOver}
            onDrop={tab.handleUngroupDrop}
          />
        )}
      </div>
    </div>
  )
}

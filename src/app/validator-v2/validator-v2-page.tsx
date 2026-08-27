import { useCallback, useEffect, useState } from 'react'
import { NotificationToast } from '@/shared/ui/notification-toast'
import { loadPublicationEditions } from '@/features/publication-api'
import { hydrateEditionNews, useSessionStore } from '@/features/edition-session'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import { cropColor, stableColorIndex } from '@/features/crops/colors'
import {
  ReviewActiveNewsBar,
  ReviewLayout,
  ReviewLeftRail,
  ReviewNewsAreasRail,
  ReviewNewsDetailModal,
  ReviewPageRail,
  ReviewQueuePanel,
  ReviewStage,
  useReviewKeyboard,
  useReviewSession,
} from '@/features/review-queue'
import type { ReviewQueueItem } from '@/features/review-queue'
import './validator-v2-page.css'

export function ValidatorV2Page() {
  const isLoading = useSessionStore((state) => state.isLoading)
  const error = useSessionStore((state) => state.error)
  const editions = useSessionStore((state) => state.editions)
  const selectedEditionId = useSessionStore((state) => state.selectedEditionId)
  const setEditions = useSessionStore((state) => state.setEditions)
  const setLoading = useSessionStore((state) => state.setLoading)
  const setError = useSessionStore((state) => state.setError)
  const selectEdition = useSessionStore((state) => state.selectEdition)
  const hydrateFromEdition = useCropsStore((state) => state.hydrateFromEdition)
  const hydrateNewsFromEdition = useNewsStore((state) => state.hydrateFromEdition)
  const setLoadingNews = useNewsStore((state) => state.setLoadingNews)
  const crops = useCropsStore((state) => state.crops)
  const review = useReviewSession()
  const [detailItem, setDetailItem] = useState<ReviewQueueItem | null>(null)
  const activeNewsIndex = Math.max(
    0,
    review.queue.findIndex((item) => item.id === review.currentItem?.id),
  )
  const activeNewsPosition = review.currentItem ? activeNewsIndex + 1 : 0

  const viewCurrentDetails = useCallback(() => {
    if (review.currentItem) setDetailItem(review.currentItem)
  }, [review.currentItem])

  useEffect(() => {
    if (editions.length > 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function bootstrap() {
      setLoading(true)
      try {
        const loaded = await loadPublicationEditions()
        if (cancelled) return
        setEditions(loaded)
        const first = loaded[0]
        if (first) {
          hydrateFromEdition(first)
          await hydrateEditionNews(first)
        }
        if (!cancelled) setLoading(false)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [editions.length, setEditions, setLoading, setError, hydrateFromEdition])

  const handleEditionChange = useCallback(
    async (id: string) => {
      selectEdition(id)
      const edition = editions.find((item) => item.id === id)
      if (!edition) return
      hydrateFromEdition(edition)
      hydrateNewsFromEdition(edition)
      setLoadingNews(true)
      try {
        await hydrateEditionNews(edition)
      } catch (err: unknown) {
        setLoadingNews(false)
        console.error(err instanceof Error ? err.message : 'Erro ao carregar notícias')
      }
    },
    [editions, selectEdition, hydrateFromEdition, hydrateNewsFromEdition, setLoadingNews],
  )

  useReviewKeyboard({
    approve: review.approve,
    reject: review.reject,
    next: review.next,
    prev: review.prev,
    undo: review.undo,
    toggleClientOnly: review.toggleClientOnly,
    setDrawMode: review.setDrawMode,
    drawMode: review.drawMode,
    cycleCrop: review.cycleCrop,
    mergeSuggested: review.mergeSuggested,
    attachInspected: review.attachInspected,
    clearInspect: review.clearInspect,
    splitActive: review.splitActive,
    openDetails: viewCurrentDetails,
    closeDetails: () => setDetailItem(null),
    detailsOpen: !!detailItem,
  })

  if (isLoading) {
    return (
      <div className="validator-v2-page validator-v2-page--loading">
        <div className="validator-v2-page__spinner" />
        <p>Carregando sessão...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="validator-v2-page validator-v2-page--error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <>
      <ReviewLayout
        header={
          <ReviewActiveNewsBar
            item={review.currentItem}
            index={activeNewsPosition}
            total={review.queue.length}
            accentColor={
              review.currentItem
                ? cropColor(stableColorIndex(review.currentItem.newsId ?? review.currentItem.id))
                : undefined
            }
            onApprove={review.approve}
            onViewDetails={viewCurrentDetails}
          />
        }
        rail={
          <ReviewLeftRail
            pages={
              <ReviewPageRail
                pages={review.pageStats}
                currentPageNumber={review.selectedPageNumber}
                done={review.progress.done}
                total={review.progress.total}
                lastUpdated={review.edition?.editionDate}
                editions={editions}
                selectedEditionId={selectedEditionId}
                onEditionChange={(id) => void handleEditionChange(id)}
                onSelectPage={review.viewPage}
              />
            }
            areas={
              <ReviewNewsAreasRail
                crops={review.currentCrops}
                activeCropId={review.activeCrop?.id}
                edition={review.edition}
                accentColor={
                  review.currentItem
                    ? cropColor(stableColorIndex(review.currentItem.newsId ?? review.currentItem.id))
                    : undefined
                }
                onSelectArea={review.selectCrop}
              />
            }
          />
        }
        stage={
          <ReviewStage
            imageUrl={review.currentPage?.imageUrl}
            viewedPageNumber={review.selectedPageNumber}
            drawMode={review.drawMode}
            needsCrop={review.needsCrop}
            currentItem={review.currentItem}
            pageCrops={review.pageCrops}
            currentCropIds={review.currentItem?.cropIds ?? []}
            activeCrop={review.activeCrop}
            inspectCropIds={review.inspectItem?.cropIds ?? []}
            inspectCrop={review.inspectCrop}
            mergeCandidateId={review.mergeCandidate?.id ?? null}
            approvedCropIds={review.approvedCropIds}
            onDrawn={review.handleDrawnRect}
            onCommitRect={review.updateCropRect}
            onDeleteCrop={review.discardCrop}
            onSelectCrop={review.selectCrop}
            peekOtherCrops
            inspecting={!!review.inspectItem}
            workMode={review.workMode}
            onWorkModeChange={review.setWorkMode}
          />
        }
        queue={
          <ReviewQueuePanel
            items={review.queue}
            currentId={review.currentItem?.id ?? null}
            inspectItem={review.inspectItem}
            viewPageNumber={review.selectedPageNumber}
            canAttach={review.canAttach}
            statuses={review.statuses}
            crops={crops}
            edition={review.edition}
            onSelect={review.goTo}
            onDiscard={review.rejectItem}
            onViewDetails={setDetailItem}
            onInspect={review.inspectNews}
            onAttach={review.attachInspected}
            onClearInspect={review.clearInspect}
            onSelectPage={review.viewPage}
            selectionLocked={review.workMode === 'focus'}
            activeCropId={review.inspectCrop?.id ?? review.activeCrop?.id ?? null}
            onUngroupCrop={review.ungroupRelatedCrop}
            onEditCrop={review.editRelatedCrop}
          />
        }
      />
      <ReviewNewsDetailModal
        item={detailItem}
        crops={crops}
        edition={review.edition}
        status={detailItem ? review.statuses[detailItem.id] : undefined}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
      <NotificationToast />
    </>
  )
}

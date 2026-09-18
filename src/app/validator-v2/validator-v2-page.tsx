import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
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
  ReviewLoadingOverlay,
  ReviewMergeModeBanner,
  ReviewNewsAreasRail,
  ReviewNewsDetailModal,
  ReviewPageRail,
  ReviewQueuePanel,
  ReviewStage,
  useReviewKeyboard,
  useReviewSession,
} from '@/features/review-queue'
import type { ReviewQueueItem } from '@/features/review-queue'
import {
  isCreationSessionLocked,
  shouldAutoRunCreatedNewsOcr,
  shouldConfirmDiscardCreationDraft,
} from '@/features/review-queue/application'
import { pageIdOf, resolvePageId } from '@/features/page-navigation/page-key'
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
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false)
  const [confirmFinishPublication, setConfirmFinishPublication] = useState(false)
  const resolvedDetailItem = detailItem
    ? (review.queue.find((item) => item.id === detailItem.id) ?? detailItem)
    : null
  const isCreationDetail = !!resolvedDetailItem && review.creationDraft?.itemId === resolvedDetailItem.id
  const activeNewsOcr =
    review.newsOcr && resolvedDetailItem && review.newsOcr.itemId === resolvedDetailItem.id
      ? review.newsOcr
      : null
  const detailOcrStatus = activeNewsOcr?.status ?? (isCreationDetail ? review.creationDraft?.ocrStatus : 'idle')
  const detailOcrError = activeNewsOcr?.error ?? (isCreationDetail ? review.creationDraft?.ocrError : null)
  const activeNewsIndex = Math.max(
    0,
    review.queue.findIndex((item) => item.id === review.currentItem?.id),
  )
  const activeNewsPosition = review.currentItem ? activeNewsIndex + 1 : 0
  const coverPageNumber = review.pdf?.pages[0]?.pageNumber ?? null
  const viewedPageNumber = review.currentPage?.pageNumber ?? ''
  const currentPageId = review.currentPage
    ? resolvePageId(review.currentPage)
    : review.currentItem
      ? pageIdOf(review.currentItem)
      : review.selectedPageNumber
  const isOnCover = !!coverPageNumber && viewedPageNumber === coverPageNumber

  const openNewsDetails = useCallback(
    (item: ReviewQueueItem) => {
      setDetailItem(item)
      if (shouldAutoRunCreatedNewsOcr({ open: true, item })) {
        void review.runNewsOcr(item).catch(() => undefined)
      }
    },
    [review],
  )

  const viewCurrentDetails = useCallback(() => {
    if (review.currentItem) openNewsDetails(review.currentItem)
  }, [review.currentItem, openNewsDetails])

  const requestCloseDetails = useCallback(() => {
    setDetailItem(null)
  }, [])

  const setReviewDrawMode = useCallback(
    (mode: Parameters<typeof review.setDrawMode>[0]) => {
      if (
        mode === 'off' &&
        shouldConfirmDiscardCreationDraft({
          reason: 'cancel-incomplete-draw',
          isCreationDraft: !!review.creationDraft,
          hasCrop: !!review.creationDraft?.cropId,
        })
      ) {
        setConfirmDiscardDraft(true)
        return
      }
      review.setDrawMode(mode)
    },
    [review],
  )

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
  }, [editions.length, setEditions, setLoading, setError])

  const handleEditionChange = useCallback(
    async (id: string) => {
      const edition = editions.find((item) => item.id === id)
      if (!edition) return
      setLoadingNews(true)
      selectEdition(id)
      hydrateFromEdition(edition)
      hydrateNewsFromEdition(edition)
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
    approve: viewCurrentDetails,
    reject: review.reject,
    next: review.next,
    prev: review.prev,
    undo: review.undo,
    toggleClientOnly: review.toggleClientOnly,
    setDrawMode: setReviewDrawMode,
    drawMode: review.drawMode,
    cycleCrop: review.cycleCrop,
    mergeSuggested: review.mergeSuggested,
    attachInspected: review.attachInspected,
    clearInspect: review.clearInspect,
    splitActive: review.splitActive,
    addSegment: review.addSegment,
    openDetails: viewCurrentDetails,
    closeDetails: requestCloseDetails,
    detailsOpen: !!detailItem,
  })

  if (isLoading) {
    return (
      <ReviewLoadingOverlay
        className="review-loading-overlay--page"
        label="Carregando sessão…"
      />
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
        loading={review.isLoadingNews}
        loadingLabel="Carregando edição…"
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
            focusLocked={review.workMode === 'focus'}
            coverPageNumber={coverPageNumber}
            isOnCover={isOnCover}
            onAddSegment={review.addSegment}
            onApprove={viewCurrentDetails}
            onViewCover={
              coverPageNumber ? () => review.viewPage(coverPageNumber) : undefined
            }
            onViewDetails={viewCurrentDetails}
            emptyLabel={
              selectedEditionId ? 'Nenhuma notícia na fila' : 'Selecione uma edição para começar'
            }
          />
        }
        banner={
          review.currentItem ? (
            <ReviewMergeModeBanner
              open={review.workMode === 'focus'}
              baseTitle={review.currentItem.title}
              segmentTitle={review.inspectItem?.title ?? null}
              currentPageNumber={viewedPageNumber}
              relatedPage={review.currentItem.relatedPage}
              onGoToRelatedPage={() => {
                const relatedPage = review.currentItem?.relatedPage
                if (relatedPage) review.viewPage(relatedPage)
              }}
              onExit={() => review.setWorkMode('free')}
            />
          ) : undefined
        }
        rail={
          <ReviewLeftRail
            pages={
              <ReviewPageRail
                pages={review.pageStats}
                currentPageNumber={viewedPageNumber}
                currentPageId={currentPageId}
                done={review.progress.done}
                total={review.progress.total}
                lastUpdated={review.edition?.editionDate}
                editions={editions}
                selectedEditionId={selectedEditionId}
                onEditionChange={(id) => void handleEditionChange(id)}
                onSelectPage={review.viewPage}
                pageFinished={review.pageFinished}
                canFinishPage={review.canFinishPage}
                finishingPage={review.finishingPage}
                onTogglePageFinished={() => void review.togglePageFinished()}
                publicationFinished={review.publicationFinished}
                canFinishPublication={review.canFinishPublication}
                finishingPublication={review.finishingPublication}
                onFinishPublication={() => setConfirmFinishPublication(true)}
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
            viewedPageNumber={viewedPageNumber}
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
            emptyMessage={
              selectedEditionId ? 'Nenhum item na fila' : 'Selecione uma edição para começar'
            }
          />
        }
        queue={
          <ReviewQueuePanel
            items={review.queue}
            currentId={review.currentItem?.id ?? null}
            inspectItem={review.inspectItem}
            viewPageNumber={currentPageId}
            canAttach={review.canAttach}
            statuses={review.statuses}
            crops={crops}
            edition={review.edition}
            onSelect={review.goTo}
            onDiscard={(itemId) => {
              if (
                shouldConfirmDiscardCreationDraft({
                  reason: 'discard-item',
                  isCreationDraft:
                    isCreationSessionLocked(review.creationDraft) &&
                    review.creationDraft?.itemId === itemId,
                })
              ) {
                setConfirmDiscardDraft(true)
                return
              }
              review.rejectItem(itemId)
            }}
            onViewDetails={openNewsDetails}
            onInspect={review.inspectNews}
            onAttach={review.attachInspected}
            onClearInspect={review.clearInspect}
            onSelectPage={review.viewPage}
            selectionLocked={review.workMode === 'focus'}
            activeCropId={review.inspectCrop?.id ?? review.activeCrop?.id ?? null}
            onUngroupCrop={review.ungroupRelatedCrop}
            onEditCrop={review.editRelatedCrop}
            onCreateNews={review.startNewsCreation}
            canCreateNews={review.canStartNewsCreation}
            creatingNews={isCreationSessionLocked(review.creationDraft)}
            creationItemId={review.creationDraft?.itemId}
            creationOcrStatus={review.creationDraft?.ocrStatus}
          />
        }
      />
      <ReviewNewsDetailModal
        item={resolvedDetailItem}
        crops={crops}
        edition={review.edition}
        status={resolvedDetailItem ? review.statuses[resolvedDetailItem.id] : undefined}
        open={!!resolvedDetailItem}
        onClose={requestCloseDetails}
        mode={isCreationDetail ? 'create' : 'review'}
        ocrStatus={detailOcrStatus ?? 'idle'}
        ocrError={detailOcrError}
        autoRunOcr={shouldAutoRunCreatedNewsOcr({
          open: !!resolvedDetailItem,
          item: resolvedDetailItem,
        })}
        onRunOcr={
          resolvedDetailItem ? () => review.runNewsOcr(resolvedDetailItem) : undefined
        }
        onApprove={
          resolvedDetailItem &&
          (!review.statuses[resolvedDetailItem.id] ||
            review.statuses[resolvedDetailItem.id] === 'pending')
            ? async (content) => {
                review.updateItemContent(resolvedDetailItem, content)
                const saved = await review.approveItem(resolvedDetailItem.id, content)
                if (saved) {
                  if (review.creationDraft?.itemId === resolvedDetailItem.id) {
                    review.finishCreationDraft()
                  }
                  setDetailItem(null)
                }
                return saved
              }
            : undefined
        }
        onChangeTitle={(title) => {
          if (!resolvedDetailItem) return
          review.updateItemContent(resolvedDetailItem, { title })
          setDetailItem({ ...resolvedDetailItem, title })
        }}
        onChangeText={(text) => {
          if (!resolvedDetailItem) return
          review.updateItemContent(resolvedDetailItem, { text })
          setDetailItem({ ...resolvedDetailItem, text })
        }}
      />
      <Modal
        open={confirmDiscardDraft}
        title="Descartar nova notícia?"
        onClose={() => setConfirmDiscardDraft(false)}
        size="md"
      >
        <p>O recorte e o texto deste rascunho serão removidos.</p>
        <div className="validator-v2-page__confirm-actions">
          <Button variant="secondary" onClick={() => setConfirmDiscardDraft(false)}>
            Continuar editando
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              review.discardCreationDraft()
              setConfirmDiscardDraft(false)
              setDetailItem(null)
            }}
          >
            Descartar
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirmFinishPublication}
        title="Finalizar jornal?"
        onClose={() => setConfirmFinishPublication(false)}
        size="md"
      >
        <p>Tem certeza que deseja finalizar este jornal? Essa ação não pode ser desfeita.</p>
        <div className="validator-v2-page__confirm-actions">
          <Button variant="secondary" onClick={() => setConfirmFinishPublication(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={review.finishingPublication}
            onClick={() => {
              void review.finishPublication().then((saved) => {
                if (!saved) return
                setConfirmFinishPublication(false)
                setDetailItem(null)
              })
            }}
          >
            {review.finishingPublication ? 'Finalizando…' : 'Finalizar jornal'}
          </Button>
        </div>
      </Modal>
      <NotificationToast />
    </>
  )
}

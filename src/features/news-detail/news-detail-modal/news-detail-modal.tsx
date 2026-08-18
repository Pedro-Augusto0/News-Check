import { ArrowLeft, CheckCircle2, X } from 'lucide-react'
import { Modal } from '@/shared/ui/modal'
import { cn } from '@/shared/ui/utils/cn'
import { NewsDetailCropEditor } from '../news-detail-crop-editor'
import { NewsDetailInfoPanel } from '../news-detail-info-panel'
import { NewsDetailNewsList } from '../news-detail-news-list'
import { useNewsDetailModal } from '../hooks'
import './news-detail-modal.css'

function formatTime(value: Date): string {
  return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CropTextModal() {
  const modal = useNewsDetailModal()

  if (!modal.isOpen) return null
  return (
    <Modal open hideHeader size="fullscreen" onClose={modal.handleClose}>
      <div className="news-detail-modal">
        <header className="news-detail-modal__topbar">
          <button
            type="button"
            className="news-detail-modal__back"
            onClick={modal.handleClose}
          >
            <ArrowLeft size={15} strokeWidth={2.25} aria-hidden />
            Voltar
          </button>

          <div className="news-detail-modal__topbar-end">
            {modal.lastTextUpdate && (
              <div className="news-detail-modal__footer-status">
                <CheckCircle2 size={14} aria-hidden />
                <span>OCR atualizado {formatTime(modal.lastTextUpdate)}</span>
              </div>
            )}
            <button type="button" className="news-detail-modal__save-btn" onClick={modal.handleClose}>
              Salvar
            </button>
            <button
              type="button"
              className="news-detail-modal__close"
              onClick={modal.handleClose}
              aria-label="Fechar"
            >
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        <div
          className={cn(
            'news-detail-modal__layout',
            modal.listCollapsed && 'news-detail-modal__layout--list-collapsed',
          )}
        >
          <NewsDetailInfoPanel
            title={modal.title}
            text={modal.text}
            extracting={modal.extracting}
            canRunOcr={modal.modalCrops.length > 0 && !modal.isPendingNewsModal}
            onRunOcr={() => void modal.handleRunOcr()}
            clientRows={modal.clientRows}
            metadata={{
              vehicleName: modal.edition?.vehicleName ?? '',
              editionDate: modal.edition?.editionDate ?? '',
              pageLabel: modal.pageLabel,
            }}
          />

          <NewsDetailCropEditor
            modalCrops={modal.modalCrops}
            modalRootId={modal.modalRootId}
            pendingNewsItem={modal.isPendingNewsModal ? modal.pendingNewsItem : undefined}
            cropDisplayIndex={modal.cropDisplayIndex}
            viewPageNumber={modal.viewPageNumber}
            onViewPage={modal.setViewPageNumber}
            previewCrops={modal.previewCrops}
          />

          <NewsDetailNewsList
            sections={modal.pageSections}
            currentNewsId={modal.currentNewsId}
            currentCropIds={modal.currentCropIds}
            currentGroupId={modal.group?.id ?? null}
            previewNewsId={modal.previewNewsId}
            previewCropIds={modal.previewCropIds}
            viewPageNumber={modal.viewPageNumber}
            collapsed={modal.listCollapsed}
            canMerge={modal.modalCrops.length > 0}
            cropDisplayIndex={modal.cropDisplayIndex}
            onToggleCollapsed={() => modal.setListCollapsed((value) => !value)}
            onSelectPage={modal.handleSelectPage}
            onSelectNews={modal.handleSelectNews}
            onMergeCrop={modal.handleMergeCrop}
          />
        </div>
      </div>
    </Modal>
  )
}

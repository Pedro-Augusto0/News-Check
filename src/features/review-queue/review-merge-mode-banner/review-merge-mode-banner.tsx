import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Link2, Lock, Newspaper, X } from 'lucide-react'
import { cn } from '@/shared/ui/utils/cn'
import './review-merge-mode-banner.css'

const BANNER_TRANSITION_MS = 300

interface ReviewMergeModeBannerProps {
  open: boolean
  baseTitle: string
  segmentTitle?: string | null
  relatedPage?: string
  currentPageNumber?: string | null
  onGoToRelatedPage?: () => void
  onExit: () => void
}

export function ReviewMergeModeBanner({
  open,
  baseTitle,
  segmentTitle,
  relatedPage,
  currentPageNumber,
  onGoToRelatedPage,
  onExit,
}: ReviewMergeModeBannerProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const hasSegment = !!segmentTitle
  const continuationPage = relatedPage?.trim() || ''
  const isOnRelatedPage = !!continuationPage && currentPageNumber === continuationPage

  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)
  }, [open])

  useEffect(() => {
    if (open || !mounted) return

    const shell = shellRef.current
    let done = false

    const finish = () => {
      if (done) return
      done = true
      setMounted(false)
    }

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== shell || event.propertyName !== 'height') return
      finish()
    }

    shell?.addEventListener('transitionend', onTransitionEnd)
    const fallback = window.setTimeout(finish, BANNER_TRANSITION_MS + 40)

    return () => {
      shell?.removeEventListener('transitionend', onTransitionEnd)
      window.clearTimeout(fallback)
    }
  }, [open, mounted])

  if (!mounted) return null

  return (
    <div
      ref={shellRef}
      className={cn(
        'review-merge-mode-banner__shell',
        visible && 'review-merge-mode-banner__shell--visible',
      )}
    >
      <div className="review-merge-mode-banner" role="status" aria-live="polite">
        <div className="review-merge-mode-banner__main">
          <span className="review-merge-mode-banner__mode">
            <Link2 size={12} strokeWidth={2.3} aria-hidden />
            Modo junção
          </span>

          <div className="review-merge-mode-banner__flow">
            <div className="review-merge-mode-banner__node review-merge-mode-banner__node--base">
              <span className="review-merge-mode-banner__node-tag review-merge-mode-banner__node-tag--base">
                <Lock size={10} strokeWidth={2.5} aria-hidden />
                Notícia base
              </span>
              <span className="review-merge-mode-banner__node-title" title={baseTitle}>
                {baseTitle}
              </span>
            </div>

            <span className="review-merge-mode-banner__arrow" aria-hidden>
              <ArrowRight size={14} strokeWidth={2} />
            </span>

            {hasSegment ? (
              <div className="review-merge-mode-banner__node review-merge-mode-banner__node--segment">
                <span className="review-merge-mode-banner__node-tag review-merge-mode-banner__node-tag--segment">
                  Visualizando
                </span>
                <span className="review-merge-mode-banner__node-title" title={segmentTitle}>
                  {segmentTitle}
                </span>
              </div>
            ) : (
              <p className="review-merge-mode-banner__hint">
                Selecione outra notícia na fila para juntar à base
              </p>
            )}
          </div>
        </div>

        <div className="review-merge-mode-banner__actions">
          {continuationPage ? (
            <button
              type="button"
              className="review-merge-mode-banner__related"
              onClick={onGoToRelatedPage}
              disabled={isOnRelatedPage || !onGoToRelatedPage}
              title={
                isOnRelatedPage
                  ? `Já está na página ${continuationPage}`
                  : `Ir para a continuação na página ${continuationPage}`
              }
            >
              <Newspaper size={13} strokeWidth={2.2} aria-hidden />
              Continua na pág. {continuationPage}
              <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
            </button>
          ) : null}

          <button
            type="button"
            className="review-merge-mode-banner__exit"
            onClick={onExit}
            title="Sair do modo junção"
          >
            Sair
            <X size={14} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

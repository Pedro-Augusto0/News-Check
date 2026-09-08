import { cn } from '@/shared/ui/utils/cn'
import './review-loading-overlay.css'

interface ReviewLoadingOverlayProps {
  label: string
  compact?: boolean
  stage?: boolean
  width?: number
  height?: number
  className?: string
}

type SkeletonLineWidth = 'full' | '96' | '94' | '92' | '90' | '88' | '86' | '84' | '82' | '78' | '72' | '68' | '64' | '58' | '42' | '32' | '28' | '24' | '18' | '14'

interface SkeletonLineProps {
  tone?: 'muted' | 'soft' | 'strong'
  size?: 'body' | 'deck' | 'headline'
  width?: SkeletonLineWidth
}

function SkeletonLine({
  tone = 'soft',
  size = 'body',
  width = 'full',
}: SkeletonLineProps) {
  return (
    <span
      className={cn(
        'review-loading-overlay__line',
        `review-loading-overlay__line--tone-${tone}`,
        `review-loading-overlay__line--size-${size}`,
        width !== 'full' && `review-loading-overlay__line--w${width}`,
      )}
    />
  )
}

function SkeletonParagraph({ lines }: { lines: SkeletonLineWidth[] }) {
  return (
    <div className="review-loading-overlay__paragraph">
      {lines.map((width, index) => (
        <SkeletonLine
          key={index}
          width={width}
          tone={index === lines.length - 1 ? 'muted' : 'soft'}
        />
      ))}
    </div>
  )
}

function CompactSkeleton() {
  return (
    <>
      <SkeletonLine tone="strong" size="headline" width="88" />
      <SkeletonLine size="body" width="96" />
      <SkeletonLine size="body" width="92" />
      <SkeletonLine size="body" width="78" />
    </>
  )
}

function StageSkeleton() {
  return (
    <>
      <div className="review-loading-overlay__header">
        <SkeletonLine tone="strong" size="headline" width="42" />
        <div className="review-loading-overlay__header-meta">
          <SkeletonLine tone="muted" width="18" />
          <SkeletonLine tone="muted" width="14" />
        </div>
      </div>

      <div className="review-loading-overlay__hero">
        <div className="review-loading-overlay__headline">
          <SkeletonLine tone="strong" size="headline" width="96" />
          <SkeletonLine tone="strong" size="headline" width="88" />
          <SkeletonLine tone="strong" size="headline" width="72" />
          <SkeletonLine tone="muted" size="deck" width="84" />
          <SkeletonLine tone="muted" size="deck" width="68" />
        </div>
        <span className="review-loading-overlay__photo" aria-hidden />
      </div>

      <div className="review-loading-overlay__columns">
        <div className="review-loading-overlay__column">
          <SkeletonParagraph lines={['96', '94', '92', '90', '88', '72']} />
          <SkeletonParagraph lines={['96', '94', '92', '90', '86', '68']} />
          <SkeletonParagraph lines={['94', '90', '88', '84', '78']} />
          <SkeletonParagraph lines={['96', '94', '92', '88', '86', '84', '64']} />
          <SkeletonParagraph lines={['94', '92', '90', '88', '82', '72']} />
          <SkeletonParagraph lines={['96', '92', '90', '88', '84', '78', '64']} />
        </div>
        <div className="review-loading-overlay__column">
          <SkeletonParagraph lines={['96', '94', '92', '88', '84', '68']} />
          <SkeletonParagraph lines={['94', '92', '90', '86', '82', '64']} />
          <SkeletonParagraph lines={['96', '92', '88', '86', '78', '72', '58']} />
          <SkeletonParagraph lines={['96', '94', '92', '90', '86', '82', '78']} />
          <SkeletonParagraph lines={['94', '90', '88', '84', '82', '78', '68']} />
          <SkeletonParagraph lines={['96', '94', '92', '88', '86', '72']} />
        </div>
      </div>

      <div className="review-loading-overlay__lower">
        <SkeletonLine tone="strong" size="deck" width="58" />
        <div className="review-loading-overlay__columns review-loading-overlay__columns--compact">
          <div className="review-loading-overlay__column">
            <SkeletonParagraph lines={['96', '92', '90', '86', '78']} />
            <SkeletonParagraph lines={['94', '90', '88', '84', '78', '64']} />
          </div>
          <div className="review-loading-overlay__column">
            <SkeletonParagraph lines={['94', '92', '88', '84', '78', '68']} />
            <SkeletonParagraph lines={['96', '94', '90', '86', '82', '68']} />
          </div>
        </div>
      </div>

      <div className="review-loading-overlay__footer">
        <SkeletonLine tone="muted" width="32" />
        <SkeletonLine tone="muted" width="28" />
        <SkeletonLine tone="muted" width="24" />
      </div>
    </>
  )
}

export function ReviewLoadingOverlay({
  label,
  compact = false,
  stage = false,
  width,
  height,
  className,
}: ReviewLoadingOverlayProps) {
  const sheetStyle =
    stage && width && height
      ? { width: `${width}px`, height: `${height}px` }
      : undefined

  return (
    <div
      className={cn(
        'review-loading-overlay',
        compact && 'review-loading-overlay--compact',
        stage && 'review-loading-overlay--stage',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="review-loading-overlay__sheet" style={sheetStyle} aria-hidden>
        {stage ? <StageSkeleton /> : <CompactSkeleton />}
        <span className="review-loading-overlay__shimmer" />
      </div>
      <p className="review-loading-overlay__label">{label}</p>
    </div>
  )
}

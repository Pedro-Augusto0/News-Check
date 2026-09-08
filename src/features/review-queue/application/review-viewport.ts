export const VIEWPORT_STABILITY_PX = 2
export const REVIEW_FIT_SCALE = 0.75
export const REVIEW_DEFAULT_ZOOM = 1
export const REVIEW_MIN_ZOOM = 0.5
export const REVIEW_MAX_ZOOM = 2.5
export const REVIEW_ZOOM_STEP = 0.1

export interface ViewportSize {
  width: number
  height: number
}

export function nextStableViewport(
  previous: ViewportSize,
  measured: ViewportSize,
  threshold = VIEWPORT_STABILITY_PX,
): ViewportSize {
  const width = Math.round(measured.width)
  const height = Math.round(measured.height)
  if (
    Math.abs(previous.width - width) < threshold &&
    Math.abs(previous.height - height) < threshold
  ) {
    return previous
  }
  return { width, height }
}

export const REVIEW_PAGE_ASPECT_WIDTH = 595
export const REVIEW_PAGE_ASPECT_HEIGHT = 842

export function computeReviewPageDisplaySize(
  viewportWidth: number,
  zoom: number,
  naturalWidth = REVIEW_PAGE_ASPECT_WIDTH,
  naturalHeight = REVIEW_PAGE_ASPECT_HEIGHT,
): { width: number; height: number } {
  if (viewportWidth < 40) return { width: 0, height: 0 }

  const usableWidth = Math.max(240, viewportWidth - 8)
  const scale = computeReviewPageScale({ naturalWidth, usableWidth, zoom })

  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  }
}

export function clampReviewZoom(zoom: number): number {
  return Math.min(REVIEW_MAX_ZOOM, Math.max(REVIEW_MIN_ZOOM, Number(zoom.toFixed(2))))
}

export function stepReviewZoom(zoom: number, direction: 1 | -1): number {
  return clampReviewZoom(zoom + direction * REVIEW_ZOOM_STEP)
}

interface ReviewPageScaleInput {
  naturalWidth: number
  usableWidth: number
  zoom: number
}

export function computeReviewPageScale({
  naturalWidth,
  usableWidth,
  zoom,
}: ReviewPageScaleInput): number {
  if (naturalWidth <= 0 || usableWidth <= 0) return 0.05
  const widthFit = usableWidth / naturalWidth
  return Math.max(0.05, widthFit * REVIEW_FIT_SCALE * clampReviewZoom(zoom))
}

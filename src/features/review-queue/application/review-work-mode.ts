import type { ReviewWorkMode } from '../model'

export function resolveReviewItemClick(
  workMode: ReviewWorkMode,
  currentId: string | null,
  clickedId: string,
): 'activate' | 'preview' {
  if (workMode === 'focus' && clickedId !== currentId) return 'preview'
  return 'activate'
}

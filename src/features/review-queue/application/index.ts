export { canAttachNews } from './attach-news'
export {
  isCreationSessionLocked,
  shouldConfirmDiscardCreationDraft,
  type CreationDraftConfirmReason,
} from './creation-draft-guard'
export {
  buildReviewQueue,
  collectApprovedCropIds,
  filterActiveReviewItems,
  firstPendingId,
  rankQueueForReview,
} from './build-review-queue'
export { cropBelongsOnViewedPage, resolveCropPageId } from './crop-on-viewed-page'
export { filterReviewQueueByTitle } from './filter-review-queue-by-title'
export {
  formatIncompleteNewsTip,
  missingApprovalRequirements,
} from './missing-approval-requirements'
export {
  groupClientMatches,
  resolveClientMatchGroups,
} from './group-client-matches'
export type { GroupedClientChannel, GroupedClientMatch } from './group-client-matches'
export { highlightKeywordSegments, normalizeKeyword, uniqueKeywords } from './highlight-keywords'
export type { KeywordSegment } from './highlight-keywords'
export {
  comparePageOccurrences,
  groupBySection,
  pageIdOf,
  pageOccurrenceKey,
  resolvePageId,
  resolvePageListSection,
  resolvePageSection,
  resolveSectionLabel,
  UNSECTIONED_LABEL,
} from './group-by-section'
export type { SectionGroup } from './group-by-section'
export { buildReviewPageStats, type ReviewPageStat } from './build-review-page-stats'
export { groupReviewQueueByPage, pageGroupTitle, type ReviewPageGroup } from './group-review-queue-by-page'
export { resolveReviewShortcut } from './resolve-review-shortcut'
export type { ReviewShortcutAction } from './resolve-review-shortcut'
export { findMergeCandidate } from './find-merge-candidate'
export { resolveReviewItemClick } from './review-work-mode'
export { saveApprovedNews } from './save-approved-news'
export { shouldAutoRunCreatedNewsOcr } from './should-auto-run-created-news-ocr'
export { commitDiscardNews, resolveDiscardArticleIds } from './commit-discard-news'
export {
  REVIEW_DEFAULT_ZOOM,
  REVIEW_FIT_SCALE,
  REVIEW_PAGE_ASPECT_HEIGHT,
  REVIEW_PAGE_ASPECT_WIDTH,
  clampReviewZoom,
  computeReviewPageDisplaySize,
  computeReviewPageScale,
  nextStableViewport,
  stepReviewZoom,
} from './review-viewport'
export { cropAreaPercent, cropOverlapRatio, detectCropSuspects } from './suspect-heuristics'

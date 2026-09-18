export type CreationDraftConfirmReason =
  | 'close-details'
  | 'discard-item'
  | 'cancel-incomplete-draw'

export function isCreationSessionLocked(
  draft: { cropId: string | null } | null | undefined,
): boolean {
  return !!draft && !draft.cropId
}

export function shouldConfirmDiscardCreationDraft(input: {
  reason: CreationDraftConfirmReason
  isCreationDraft: boolean
  hasCrop?: boolean
}): boolean {
  if (!input.isCreationDraft) return false
  if (input.reason === 'close-details') return false
  if (input.reason === 'cancel-incomplete-draw') return !input.hasCrop
  return true
}

import { isDefaultCropTitle } from '@/features/text-extraction'

export function shouldAutoRunCreatedNewsOcr(input: {
  open: boolean
  item: {
    kind?: string
    manual?: boolean
    cropIds: string[]
    title: string
    text: string
  } | null
}): boolean {
  if (!input.open || !input.item) return false
  if (input.item.kind && input.item.kind !== 'news') return false
  if (!input.item.manual) return false
  if (input.item.cropIds.length === 0) return false
  if (!isDefaultCropTitle(input.item.title)) return false
  return input.item.text.trim().length === 0
}

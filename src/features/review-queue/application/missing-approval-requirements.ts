import { isDefaultCropTitle } from '@/features/text-extraction'

export type ApprovalRequirement = 'título' | 'texto' | 'recorte'

export function missingApprovalRequirements(input: {
  title: string
  text: string
  cropCount: number
}): ApprovalRequirement[] {
  const missing: ApprovalRequirement[] = []
  if (isDefaultCropTitle(input.title)) missing.push('título')
  if (!input.text.trim()) missing.push('texto')
  if (input.cropCount <= 0) missing.push('recorte')
  return missing
}

export function formatIncompleteNewsTip(missing: ApprovalRequirement[]): string | null {
  if (missing.length === 0) return null
  if (missing.length === 1) return `Notícia incompleta, falta ${missing[0]}.`
  if (missing.length === 2) return `Notícia incompleta, falta ${missing[0]} e ${missing[1]}.`
  return `Notícia incompleta, falta ${missing.slice(0, -1).join(', ')} e ${missing[missing.length - 1]}.`
}

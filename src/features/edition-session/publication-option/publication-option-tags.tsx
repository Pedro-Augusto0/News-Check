import { readTypeLabel } from '@/features/publication-api'
import { Badge } from '@/shared/ui/badge'
import type { VehicleEdition } from '../model'
import './publication-option-tags.css'

export function PublicationOptionTags({
  edition,
  placement,
}: {
  edition: VehicleEdition
  placement: 'option' | 'selected'
}) {
  if (placement === 'option') {
    if (edition.hasSourceMapping !== false) return null
    return (
      <span className="publication-option-tags">
        <Badge variant="warning">Sem mapeamento</Badge>
      </span>
    )
  }

  const readLabel = readTypeLabel(edition.readType)
  if (!readLabel) return null

  return (
    <span className="publication-option-tags">
      <Badge variant="neutral">{readLabel}</Badge>
    </span>
  )
}

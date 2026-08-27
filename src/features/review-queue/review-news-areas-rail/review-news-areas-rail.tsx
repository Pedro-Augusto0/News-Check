import { Scissors, UserRound } from 'lucide-react'
import type { Crop } from '@/features/crops'
import { cropHasClient } from '@/features/crops/client-stats'
import type { VehicleEdition } from '@/features/edition-session'
import { ListCropThumbnail } from '@/features/news-list/list-crop-thumbnail'
import { resolveCropImageUrl } from '@/features/text-extraction'
import { cn } from '@/shared/ui/utils/cn'
import '@/features/news-list/list-crop-thumbnail/list-thumbnail.css'
import './review-news-areas-rail.css'

interface ReviewNewsAreasRailProps {
  crops: Crop[]
  activeCropId: string | undefined
  edition: VehicleEdition | undefined
  accentColor?: string
  onSelectArea: (cropId: string) => void
}

export function ReviewNewsAreasRail({
  crops,
  activeCropId,
  edition,
  accentColor,
  onSelectArea,
}: ReviewNewsAreasRailProps) {
  return (
    <aside
      className="review-areas-rail"
      aria-label="Áreas da notícia"
      style={accentColor ? { ['--crop-accent' as string]: accentColor } : undefined}
    >
      <p className="review-areas-rail__label">Áreas</p>

      {crops.length === 0 ? (
        <div className="review-areas-rail__empty">
          <Scissors size={16} strokeWidth={2.1} aria-hidden />
          <p>Sem recortes</p>
        </div>
      ) : (
        <ul className="review-areas-rail__list" role="listbox" aria-label="Recortes da notícia">
          {crops.map((crop, index) => {
            const isActive = crop.id === activeCropId
            const hasClient = cropHasClient(crop)

            return (
              <li key={crop.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-label={`Área ${index + 1}, página ${crop.pageNumber}${hasClient ? ', com cliente' : ''}`}
                  className={cn(
                    'review-areas-rail__item',
                    isActive && 'review-areas-rail__item--active',
                    hasClient && 'review-areas-rail__item--client',
                  )}
                  onClick={() => onSelectArea(crop.id)}
                >
                  <span className="review-areas-rail__thumb-wrap">
                    <ListCropThumbnail
                      pdfUrl={edition ? resolveCropImageUrl(crop, [edition]) : undefined}
                      crop={crop}
                      displayIndex={index + 1}
                      accentColor={accentColor}
                    />
                    {hasClient && (
                      <span className="review-areas-rail__client-dot" title="Com cliente" aria-hidden>
                        <UserRound size={8} strokeWidth={2.5} />
                      </span>
                    )}
                  </span>
                  <span className="review-areas-rail__page">{crop.pageNumber}</span>
                </button>
              </li>
            )
          })}        </ul>
      )}
    </aside>
  )
}

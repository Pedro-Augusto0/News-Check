import type { Crop } from '@/features/crops'
import { percentToPx } from '@/features/crops/geometry'
import { cn } from '@/shared/ui/utils/cn'

interface ModalCropBoxProps {
  crop: Crop
  selected: boolean
  preview?: boolean
  finalized?: boolean
  label: string
  accentColor: string
  width: number
  height: number
  onSelect?: () => void
  onDelete?: () => void
}

export function ModalCropBox({
  crop,
  selected,
  preview,
  finalized,
  label,
  accentColor,
  width,
  height,
  onSelect,
  onDelete,
}: ModalCropBoxProps) {
  const px = percentToPx(crop.rect, width, height)
  const interactive = !preview && !finalized

  if (finalized) {
    return (
      <div
        className="modal-crop-box modal-crop-box--finalized"
        style={{
          left: px.x,
          top: px.y,
          width: px.width,
          height: px.height,
        }}
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'modal-crop-box',
        selected && 'modal-crop-box--selected',
        preview && 'modal-crop-box--preview',
      )}
      style={{
        left: px.x,
        top: px.y,
        width: px.width,
        height: px.height,
        ['--crop-accent' as string]: accentColor,
      }}
      onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation()
              onSelect?.()
            }
          : undefined
      }
      onContextMenu={
        interactive
          ? (event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete?.()
            }
          : undefined
      }
      disabled={preview}
      title={preview ? 'Corte de outra notícia' : 'Botão direito para excluir'}
      aria-label={
        preview
          ? `Marcação de outra notícia na página ${crop.pageNumber}`
          : `Corte da página ${crop.pageNumber}. Botão direito para excluir`
      }
    >
      <span className="modal-crop-box__badge">{label}</span>
    </button>
  )
}

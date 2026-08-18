import { Unlink } from 'lucide-react'
import { cn } from '@/shared/ui/utils/cn'

interface NewsListUngroupZoneProps {
  active: boolean
  onDragEnter: () => void
  onDragLeave: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
}

export function NewsListUngroupZone({
  active,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: NewsListUngroupZoneProps) {
  return (
    <div
      className={cn(
        'crops-tab__ungroup-zone',
        active && 'crops-tab__ungroup-zone--active',
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Unlink size={14} aria-hidden />
      <span>Solte aqui para desagrupar</span>
    </div>
  )
}

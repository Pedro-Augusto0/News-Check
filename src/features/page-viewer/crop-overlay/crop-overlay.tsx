import { useMemo } from 'react'
import { Link2, Unlink } from 'lucide-react'
import { cn } from '@/shared/ui/utils/cn'
import type { Crop } from '@/features/crops'
import type { CropRect } from '@/features/crops/geometry'
import { cropColor } from '@/features/crops/colors'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import { cropHasClient } from '@/features/crops/client-stats'
import { useCropsStore } from '@/features/crops/store'
import { useViewerStore } from '../store'
import { cropRectArea } from '@/features/crop-news-linking/domain'
import { CropBox, FinalizedCropBox } from './crop-box'
import { useCropOverlayMerge } from './use-crop-overlay-merge'
import './crop-overlay.css'

interface CropOverlayProps {
  crops: Crop[]
  finalizedCrops?: Crop[]
  cropDisplayIndex: Map<string, CropDisplayInfo>
  selectedCropId: string | null
  editingCropId: string | null
  draftRect: CropRect | null
  width: number
  height: number
  onSelectCrop: (cropId: string, event?: React.MouseEvent) => void
  onViewText: (cropId: string) => void
  onEditCrop: (cropId: string) => void
  onFinalizeCrop: (cropId: string) => void
  onDeleteCrop: (cropId: string) => void
}

export function CropOverlay({
  crops,
  finalizedCrops = [],
  cropDisplayIndex,
  selectedCropId,
  editingCropId,
  draftRect,
  width,
  height,
  onSelectCrop,
  onViewText,
  onEditCrop,
  onFinalizeCrop,
  onDeleteCrop,
}: CropOverlayProps) {
  const cropsMap = useCropsStore((s) => s.crops)
  const panMode = useViewerStore((s) => s.panMode)
  const merge = useCropOverlayMerge(cropsMap, cropDisplayIndex)

  const mergeEnabled = !panMode && !editingCropId
  const dragSourceInGroup = merge.dragId ? !!cropsMap[merge.dragId]?.groupId : false

  const visibleInteractive = useMemo(() => {
    if (editingCropId) return []
    return [...crops].sort((a, b) => cropRectArea(b.rect) - cropRectArea(a.rect))
  }, [crops, editingCropId])

  if (width <= 0 || height <= 0) return null

  if (visibleInteractive.length === 0 && finalizedCrops.length === 0 && !draftRect) {
    return null
  }

  return (
    <div
      ref={merge.overlayRef}
      className={cn('crop-overlay', merge.dragId && 'crop-overlay--merge-active')}
      style={{ width, height }}
      onDragOver={merge.dragId ? merge.handleDragOver : undefined}
      onDragLeave={merge.dragId ? merge.handleDragLeaveOverlay : undefined}
      onDragEnd={merge.handleDragEnd}
    >
      {mergeEnabled && merge.dragId && (
        <div className="crop-overlay__merge-hint" aria-live="polite">
          <Link2 size={13} strokeWidth={2.25} />
          <span>Solte sobre outro corte para juntar</span>
        </div>
      )}

      {finalizedCrops.map((crop) => (
        <FinalizedCropBox
          key={`finalized-${crop.id}`}
          rect={crop.rect}
          containerWidth={width}
          containerHeight={height}
        />
      ))}

      {visibleInteractive.map((crop) => {
        const info = cropDisplayIndex.get(crop.id)
        const clientKeywords = cropHasClient(crop) ? crop.clientKeywordsFound : undefined
        return (
          <CropBox
            key={crop.id}
            cropId={crop.id}
            rect={crop.rect}
            containerWidth={width}
            containerHeight={height}
            color={cropColor(info?.colorIndex ?? 0)}
            selected={selectedCropId === crop.id}
            index={info?.displayIndex}
            title={crop.title}
            clientKeywords={clientKeywords}
            mergeEnabled={mergeEnabled}
            isDragging={merge.dragId === crop.id}
            isDropTarget={merge.dropTargetId === crop.id}
            mergeFlash={merge.mergeFlashId === crop.id}
            onDoubleClick={(event) => merge.handleMergeCropClick(crop.id, onSelectCrop, event)}
            onViewText={() => onViewText(crop.id)}
            onEdit={() => onEditCrop(crop.id)}
            onFinalize={() => onFinalizeCrop(crop.id)}
            onDelete={() => onDeleteCrop(crop.id)}
            onMergeDragStart={merge.handleDragStart}
            onMergeDragOver={merge.handleDragOver}
            onMergeDrop={merge.handleDrop}
            onMergeDragEnter={merge.handleDragEnter}
            onMergeDragLeave={merge.handleDragLeave}
          />
        )
      })}
      {draftRect && (
        <CropBox
          cropId="__draft__"
          rect={draftRect}
          containerWidth={width}
          containerHeight={height}
          color="var(--color-primary)"
          selected
          draft
        />
      )}
      {mergeEnabled && dragSourceInGroup && (
        <div
          className={cn(
            'crop-overlay__ungroup-zone',
            merge.ungroupZoneActive && 'crop-overlay__ungroup-zone--active',
          )}
          onDragEnter={() => merge.setUngroupZoneActive(true)}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              merge.setUngroupZoneActive(false)
            }
          }}
          onDragOver={merge.handleDragOver}
          onDrop={merge.handleUngroupDrop}
        >
          <Unlink size={14} strokeWidth={2} />
          <span>Solte para desagrupar</span>
        </div>
      )}
    </div>
  )
}

import { CropOverlay } from '../crop-overlay'
import { CropEditOverlay } from '../crop-edit-overlay'
import { ViewerToolbar } from '../viewer-toolbar'
import { usePageViewer } from '../hooks/use-page-viewer'
import './page-viewer.css'

export function PageViewer() {
  const viewer = usePageViewer()

  if (!viewer.currentPdf || !viewer.currentPage) {
    return (
      <div className="page-viewer page-viewer--empty">
        <p>Selecione um veículo e uma página</p>
      </div>
    )
  }

  return (
    <div className="page-viewer">
      <ViewerToolbar />
      <div className="page-viewer__scroll" ref={viewer.scrollRef}>
        <div
          className="page-viewer__stage"
          style={{ transform: `translate(${viewer.panOffset.x}px, ${viewer.panOffset.y}px)` }}
        >
          <div
            className="page-viewer__canvas-wrap"
            style={{ cursor: viewer.canvasCursor }}
            onPointerDown={viewer.handleCanvasPointerDown}
            onPointerMove={viewer.handleCanvasPointerMove}
            onPointerUp={viewer.handleCanvasPointerUp}
            onDoubleClick={viewer.handleCanvasDoubleClick}
          >
            <canvas ref={viewer.canvasRef} className="page-viewer__canvas" />
            <CropOverlay
              crops={viewer.overlayInteractiveCrops}
              finalizedCrops={viewer.overlayFinalizedCrops}
              cropDisplayIndex={viewer.cropDisplayIndex}
              selectedCropId={viewer.selectedCropId}
              editingCropId={viewer.editingCropId}
              draftRect={viewer.draftRect}
              width={viewer.dimensions.width}
              height={viewer.dimensions.height}
              onSelectCrop={viewer.handleSelectCrop}
              onViewText={viewer.handleViewText}
              onEditCrop={viewer.handleEditCrop}
              onFinalizeCrop={viewer.handleFinalizeCrop}
              onDeleteCrop={viewer.handleDeleteCrop}
            />
            {viewer.editingCrop && (
              <CropEditOverlay
                key={viewer.editingCrop.id}
                crop={viewer.editingCrop}
                cropDisplayInfo={viewer.cropDisplayIndex.get(viewer.editingCrop.id)}
                containerWidth={viewer.dimensions.width}
                containerHeight={viewer.dimensions.height}
                onSave={viewer.handleSaveEdit}
                onCancel={viewer.cancelEditCrop}
              />
            )}
          </div>
          {viewer.error && <p className="page-viewer__error">{viewer.error}</p>}
        </div>
      </div>
    </div>
  )
}

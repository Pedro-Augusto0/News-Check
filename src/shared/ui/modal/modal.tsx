import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/ui/utils/cn'
import type { ModalProps } from './modal-types'
import './modal.css'

export function Modal({ open, title = '', onClose, children, size = 'md', hideHeader = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={`modal modal--${size}`} onClose={onClose} onClick={(e) => {
      if (e.target === dialogRef.current) onClose()
    }}>
      <div className="modal__content">
        {!hideHeader && (
          <header className="modal__header">
            <h2 className="modal__title">{title}</h2>
            <Button variant="icon" size="sm" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </Button>
          </header>
        )}
        <div className={cn('modal__body', hideHeader && 'modal__body--flush')}>{children}</div>
      </div>
    </dialog>
  )
}

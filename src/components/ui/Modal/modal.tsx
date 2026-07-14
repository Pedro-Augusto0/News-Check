import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button/button'
import { cn } from '@/utils/cn'
import './modal.css'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg' | 'fullscreen'
  hideHeader?: boolean
}

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

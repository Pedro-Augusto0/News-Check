import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Crop, FileText, Trash2, Unlink } from 'lucide-react'
import { cn } from '@/utils/cn'
import './crop-item-menu.css'

interface CropItemMenuProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  onViewText: () => void
  onEditCrop: () => void
  onFinalize?: () => void
  onDelete: () => void
  onUngroup?: () => void
  canUngroup?: boolean
  isFinalized?: boolean
}

interface MenuItemProps {
  icon: ReactNode
  iconVariant?: 'default' | 'edit' | 'finalize' | 'danger'
  label: string
  onClick: () => void
  danger?: boolean
}

function MenuItem({ icon, iconVariant = 'default', label, onClick, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      className={cn('crop-item-menu__item', danger && 'crop-item-menu__item--danger')}
      role="menuitem"
      onClick={onClick}
    >
      <span className={cn('crop-item-menu__icon', `crop-item-menu__icon--${iconVariant}`)}>
        {icon}
      </span>
      <span className="crop-item-menu__label">{label}</span>
    </button>
  )
}

function getMenuPosition(anchor: HTMLElement, menu: HTMLElement): CSSProperties {
  const anchorRect = anchor.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const gap = 4
  const margin = 8

  let top = anchorRect.bottom + gap
  let left = anchorRect.right - menuRect.width

  if (top + menuRect.height > window.innerHeight - margin) {
    top = anchorRect.top - menuRect.height - gap
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - menuRect.width - margin))
  top = Math.max(margin, Math.min(top, window.innerHeight - menuRect.height - margin))

  return { top, left }
}

export function CropItemMenu({
  open,
  anchorRef,
  onClose,
  onViewText,
  onEditCrop,
  onFinalize,
  onDelete,
  onUngroup,
  canUngroup,
  isFinalized,
}: CropItemMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !ref.current) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      if (!anchorRef.current || !ref.current) return
      setPosition(getMenuPosition(anchorRef.current, ref.current))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, anchorRef, canUngroup, isFinalized])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  const closeAnd = (action: () => void) => {
    action()
    onClose()
  }

  return createPortal(
    <div
      ref={ref}
      className={cn('crop-item-menu', position && 'crop-item-menu--positioned')}
      style={position ?? undefined}
      role="menu"
    >
      <MenuItem
        icon={<FileText size={13} strokeWidth={2} />}
        label="Ver detalhes"
        onClick={() => closeAnd(onViewText)}
      />
      <MenuItem
        icon={<Crop size={13} strokeWidth={2} />}
        iconVariant="edit"
        label="Editar corte"
        onClick={() => closeAnd(onEditCrop)}
      />
      {!isFinalized && onFinalize && (
        <MenuItem
          icon={<Check size={13} strokeWidth={2.25} />}
          iconVariant="finalize"
          label="Finalizar"
          onClick={() => closeAnd(onFinalize)}
        />
      )}
      {canUngroup && onUngroup && (
        <MenuItem
          icon={<Unlink size={13} strokeWidth={2} />}
          label="Desagrupar"
          onClick={() => closeAnd(onUngroup)}
        />
      )}
      <div className="crop-item-menu__divider" role="separator" />
      <MenuItem
        icon={<Trash2 size={13} strokeWidth={2} />}
        iconVariant="danger"
        label="Excluir"
        danger
        onClick={() => closeAnd(onDelete)}
      />
    </div>,
    document.body,
  )
}

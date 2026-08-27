import {
  CheckCircle2,
  GitMerge,
  Pencil,
  Scissors,
  XCircle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import './review-action-bar.css'

interface ReviewActionBarProps {
  canMerge: boolean
  canSplit: boolean
  drawing: boolean
  onApprove: () => void
  onReject: () => void
  onRedraw: () => void
  onMerge: () => void
  onSplit: () => void
}

export function ReviewActionBar({
  canMerge,
  canSplit,
  drawing,
  onApprove,
  onReject,
  onRedraw,
  onMerge,
  onSplit,
}: ReviewActionBarProps) {
  return (
    <div className="review-action-bar">
      <div className="review-action-bar__primary">
        <Button variant="primary" onClick={onApprove} title="Aprovar e ir à próxima (Space)">
          <CheckCircle2 size={15} strokeWidth={2.2} />
          Aprovar e próxima
          <kbd>Space</kbd>
        </Button>
      </div>

      <div className="review-action-bar__tools">
        <Button variant="secondary" onClick={onReject} title="Não é notícia (N)">
          <XCircle size={14} strokeWidth={2} />
          Não é notícia
          <kbd>N</kbd>
        </Button>
        <Button variant="secondary" onClick={onRedraw} title="Redesenhar (R)">
          <Pencil size={14} strokeWidth={2} />
          {drawing ? 'Cancelar' : 'Redesenhar'}
          <kbd>R</kbd>
        </Button>
        <Button
          variant="secondary"
          onClick={onMerge}
          disabled={!canMerge}
          title="Juntar com o vizinho (M)"
        >
          <GitMerge size={14} strokeWidth={2} />
          Juntar
          <kbd>M</kbd>
        </Button>
        <Button
          variant="secondary"
          onClick={onSplit}
          disabled={!canSplit}
          title="Separar recorte (X)"
        >
          <Scissors size={14} strokeWidth={2} />
          Separar
          <kbd>X</kbd>
        </Button>
      </div>

      <p className="review-action-bar__nav">
        <kbd>J</kbd>
        <kbd>K</kbd>
        navegar
        <span className="review-action-bar__nav-gap" />
        <kbd>U</kbd>
        desfazer
      </p>
    </div>
  )
}

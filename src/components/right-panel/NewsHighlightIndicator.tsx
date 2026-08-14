import { cn } from '@/utils/cn'
import './news-mark-checkbox.css'

interface NewsHighlightIndicatorProps {
  active: boolean
}

/** Indicador discreto de que a notícia está isolada na imagem. */
export function NewsHighlightIndicator({ active }: NewsHighlightIndicatorProps) {
  return (
    <span
      className={cn('news-highlight-indicator', active && 'news-highlight-indicator--active')}
      title={active ? 'Visível na imagem' : 'Clique para isolar na imagem · Ctrl+clique para múltiplas'}
      aria-hidden
    />
  )
}

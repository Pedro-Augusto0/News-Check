import { Plus, Search } from 'lucide-react'

interface NewsListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  onAddNews: () => void
}

export function NewsListToolbar({ search, onSearchChange, onAddNews }: NewsListToolbarProps) {
  return (
    <>
      <div className="crops-tab__toolbar">
        <div className="crops-tab__search-row">
          <label className="crops-tab__search">
            <Search size={15} className="crops-tab__search-icon" aria-hidden />
            <input
              type="search"
              className="crops-tab__search-input"
              placeholder="Buscar notícia ou corte..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        className="crops-tab__add-news-btn"
        onClick={onAddNews}
      >
        <Plus size={14} aria-hidden />
        <span>Adicionar notícia</span>
      </button>
    </>
  )
}

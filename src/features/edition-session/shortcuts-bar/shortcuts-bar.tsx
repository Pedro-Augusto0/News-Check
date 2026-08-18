import './shortcuts-bar.css'

const SHORTCUTS = [
  { keys: '↑ / ↓', label: 'Navegar páginas' },
  { keys: 'D', label: 'Modo desenho' },
  { keys: 'Espaço', label: 'Modo pan' },
  { keys: 'Ctrl + +/-', label: 'Zoom' },
  { keys: 'Esc', label: 'Desselecionar corte' },
]

export function ShortcutsBar() {
  return (
    <footer className="shortcuts-bar">
      {SHORTCUTS.map((s) => (
        <span key={s.keys} className="shortcuts-bar__item">
          <kbd className="shortcuts-bar__kbd">{s.keys}</kbd>
          <span>{s.label}</span>
        </span>
      ))}
    </footer>
  )
}

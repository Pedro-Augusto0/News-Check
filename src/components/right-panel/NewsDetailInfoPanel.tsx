import { useMemo } from 'react'
import { ScanText } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ClientKeywordRow } from '@/utils/newsDetailClients'
import './news-detail-info-panel.css'

interface NewsDetailInfoPanelProps {
  title: string
  text: string
  extracting: boolean
  canRunOcr?: boolean
  onRunOcr?: () => void
  clientRows: ClientKeywordRow[]
  metadata: {
    vehicleName: string
    editionDate: string
    pageLabel: string
  }
}

function formatEditionDate(value: string): string {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function splitParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim())
}

function groupClientRows(rows: ClientKeywordRow[]): [string, ClientKeywordRow[]][] {
  const map = new Map<string, ClientKeywordRow[]>()
  for (const row of rows) {
    const list = map.get(row.clientName) ?? []
    list.push(row)
    map.set(row.clientName, list)
  }
  return [...map.entries()]
}

export function NewsDetailInfoPanel({
  title,
  text,
  extracting,
  canRunOcr = false,
  onRunOcr,
  clientRows,
  metadata,
}: NewsDetailInfoPanelProps) {
  const paragraphs = useMemo(() => splitParagraphs(text), [text])
  const clients = useMemo(() => groupClientRows(clientRows), [clientRows])
  const showClientNames = clients.length > 1 || (clients[0]?.[0] && clients[0][0] !== 'Cliente')
  const sourceLine = [
    metadata.vehicleName,
    formatEditionDate(metadata.editionDate),
    metadata.pageLabel && metadata.pageLabel !== '—' ? `Pág. ${metadata.pageLabel}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="news-detail-info">
      <header className="news-detail-info__header">
        <div className="news-detail-info__heading">
          <h2 className="news-detail-info__headline">{title || 'Sem título'}</h2>
          {sourceLine ? <p className="news-detail-info__source">{sourceLine}</p> : null}
        </div>
        {onRunOcr && (
          <button
            type="button"
            className="news-detail-info__ocr-btn"
            onClick={onRunOcr}
            disabled={!canRunOcr || extracting}
          >
            <ScanText size={14} strokeWidth={2.25} aria-hidden />
            {extracting ? 'Extraindo…' : 'Passar OCR'}
          </button>
        )}
      </header>

      <div className="news-detail-info__body">
        {extracting ? (
          <p className="news-detail-info__empty">Extraindo texto da notícia…</p>
        ) : paragraphs.length > 0 ? (
          <div className="news-detail-info__ocr">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="news-detail-info__empty">Sem texto disponível para esta notícia.</p>
        )}
      </div>

      {clients.length > 0 && (
      <section className="news-detail-info__clients" aria-label="Clientes e palavras-chave">
        <h3 className="news-detail-info__section-title">Clientes</h3>
        <ul className="news-detail-info__client-list">
          {clients.map(([name, rows]) => (
            <li key={name} className="news-detail-info__client">
              {showClientNames && <p className="news-detail-info__client-name">{name}</p>}
              <ul className="news-detail-info__chips">
                {rows.map((row) => (
                  <li
                    key={`${row.clientName}-${row.keyword}`}
                    className={cn('news-detail-info__chip', `news-detail-info__chip--${row.tone}`)}
                  >
                    {row.keyword}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      )}
    </aside>
  )
}

import { useMemo } from 'react'
import { Check, Circle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button/button'
import { useCurrentPage } from '@/hooks/useSessionSelectors'
import './keywords-tab.css'

export function KeywordsTab() {
  const currentPage = useCurrentPage()

  const occurrenceCounts = useMemo(() => {
    if (!currentPage) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const occ of currentPage.keywordOccurrences) {
      counts.set(occ.keyword, (counts.get(occ.keyword) ?? 0) + 1)
    }
    for (const kw of currentPage.keywordsFound) {
      if (!counts.has(kw)) counts.set(kw, 1)
    }
    return counts
  }, [currentPage])

  const totalOccurrences = useMemo(() => {
    if (!currentPage) return 0
    return currentPage.keywordOccurrences.length || currentPage.keywordsFound.length
  }, [currentPage])

  if (!currentPage) {
    return <div className="keywords-tab keywords-tab--empty">Selecione uma página</div>
  }

  const { keywordsFound, keywordsMissing } = currentPage

  return (
    <div className="keywords-tab">
      <section className="keywords-tab__section">
        <h3 className="keywords-tab__heading">
          <Check size={14} className="keywords-tab__icon keywords-tab__icon--found" />
          Encontradas ({keywordsFound.length})
        </h3>
        {keywordsFound.length > 0 ? (
          <ul className="keywords-tab__list">
            {keywordsFound.map((kw) => {
              const count = occurrenceCounts.get(kw) ?? 1
              return (
                <li key={kw} className="keywords-tab__item keywords-tab__item--found">
                  <Check size={14} className="keywords-tab__item-icon" />
                  <span>
                    {kw}
                    <span className="keywords-tab__count"> — {count} ocorrência{count !== 1 ? 's' : ''}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="keywords-tab__none">Nenhuma palavra-chave encontrada</p>
        )}
      </section>

      <section className="keywords-tab__section">
        <h3 className="keywords-tab__heading">
          <Circle size={14} className="keywords-tab__icon keywords-tab__icon--missing" />
          Não encontradas ({keywordsMissing.length})
        </h3>
        {keywordsMissing.length > 0 ? (
          <ul className="keywords-tab__list">
            {keywordsMissing.map((kw) => (
              <li key={kw} className="keywords-tab__item keywords-tab__item--missing">
                <Circle size={14} className="keywords-tab__item-icon" />
                {kw}
              </li>
            ))}
          </ul>
        ) : (
          <p className="keywords-tab__none">Todas as palavras foram encontradas</p>
        )}
      </section>

      <section className="keywords-tab__summary">
        <div className="keywords-tab__summary-text">
          <span className="keywords-tab__summary-label">Ocorrências na página</span>
          <span className="keywords-tab__summary-value">{totalOccurrences}</span>
          <span className="keywords-tab__summary-sub">Total de ocorrências</span>
        </div>
        <Button variant="secondary" size="sm" className="keywords-tab__highlights-btn">
          <Eye size={14} />
          Ver destaques
        </Button>
      </section>

    </div>
  )
}

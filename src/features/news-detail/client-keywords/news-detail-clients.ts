export type ClientKeywordTone = 'rose' | 'blue' | 'green' | 'amber' | 'violet'

export interface ClientKeywordRow {
  clientName: string
  keyword: string
  tone: ClientKeywordTone
}

const CLIENT_TONES: ClientKeywordTone[] = ['rose', 'blue', 'green', 'amber', 'violet']

function capitalizeKeyword(keyword: string): string {
  if (!keyword) return keyword
  return keyword.charAt(0).toUpperCase() + keyword.slice(1)
}

export function buildClientKeywordRows(keywords: string[]): ClientKeywordRow[] {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))]
  return unique.map((keyword, index) => ({
    clientName: 'Cliente',
    keyword: capitalizeKeyword(keyword),
    tone: CLIENT_TONES[index % CLIENT_TONES.length],
  }))
}

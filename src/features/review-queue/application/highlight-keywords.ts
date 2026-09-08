function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeKeyword(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const ACCENT_CLASS: Record<string, string> = {
  a: '[aáàâãäAÁÀÂÃÄ]',
  e: '[eéèêëEÉÈÊË]',
  i: '[iíìîïIÍÌÎÏ]',
  o: '[oóòôõöOÓÒÔÕÖ]',
  u: '[uúùûüUÚÙÛÜ]',
  c: '[cçCÇ]',
}

function keywordToPattern(keyword: string): string {
  return [...keyword.trim()]
    .map((char) => {
      const base = char.toLocaleLowerCase('pt-BR').normalize('NFD')[0] ?? char
      return ACCENT_CLASS[base] ?? escapeRegExp(char)
    })
    .join('')
}

export interface KeywordSegment {
  text: string
  matched: boolean
}

export function highlightKeywordSegments(
  text: string,
  keywords: string[],
): KeywordSegment[] {
  const terms = [
    ...new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length >= 2),
    ),
  ].sort((a, b) => b.length - a.length)

  if (!text || terms.length === 0) return [{ text, matched: false }]

  const pattern = new RegExp(`(${terms.map(keywordToPattern).join('|')})`, 'gi')
  const normalizedTerms = new Set(terms.map(normalizeKeyword))
  return text.split(pattern).flatMap((part) => {
    if (!part) return []
    return [
      {
        text: part,
        matched: normalizedTerms.has(normalizeKeyword(part)),
      },
    ]
  })
}

export function uniqueKeywords(groups: Array<string[] | undefined>): string[] {
  const keywords = new Set<string>()
  for (const group of groups) {
    for (const keyword of group ?? []) {
      const value = keyword.trim()
      if (value) keywords.add(value)
    }
  }
  return [...keywords]
}

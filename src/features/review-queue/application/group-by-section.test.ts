import { describe, expect, it } from 'vitest'
import { groupBySection, resolvePageSection, UNSECTIONED_LABEL } from './group-by-section'

describe('resolvePageSection', () => {
  it('uses the most common named section', () => {
    expect(resolvePageSection(['Cidades', 'Cidades', 'Esportes'])).toBe('Cidades')
  })

  it('ignores empty values when a named section exists', () => {
    expect(resolvePageSection([undefined, '  ', 'Política'])).toBe('Política')
  })

  it('falls back when nothing is named', () => {
    expect(resolvePageSection([undefined, ''])).toBe(UNSECTIONED_LABEL)
  })

  it('treats sections with different case or accents as the same', () => {
    expect(resolvePageSection(['Política', 'POLITICA', 'Esportes'])).toBe('Política')
  })
})

describe('groupBySection', () => {
  it('groups items in first-seen section order and keeps unsectioned last', () => {
    const groups = groupBySection(
      [
        { id: '1', section: 'Esportes' },
        { id: '2', section: undefined },
        { id: '3', section: 'Cidades' },
        { id: '4', section: 'Esportes' },
        { id: '5', section: '  ' },
      ],
      (item) => item.section,
    )

    expect(groups.map((group) => group.section)).toEqual(['Esportes', 'Cidades', UNSECTIONED_LABEL])
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['1', '4'])
    expect(groups[2]?.items.map((item) => item.id)).toEqual(['2', '5'])
  })

  it('merges sections that differ only by case or accents', () => {
    const groups = groupBySection(
      [
        { id: '1', section: 'Política' },
        { id: '2', section: 'POLITICA' },
        { id: '3', section: 'politica' },
        { id: '4', section: 'Esportes' },
      ],
      (item) => item.section,
    )

    expect(groups.map((group) => group.section)).toEqual(['Política', 'Esportes'])
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['1', '2', '3'])
  })
})

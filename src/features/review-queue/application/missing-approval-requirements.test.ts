import { describe, expect, it } from 'vitest'
import {
  formatIncompleteNewsTip,
  missingApprovalRequirements,
} from './missing-approval-requirements'

describe('missingApprovalRequirements', () => {
  it('accepts a news with title, text and crop', () => {
    expect(
      missingApprovalRequirements({
        title: 'Prefeitura anuncia obra',
        text: 'A prefeitura informou nesta terça.',
        cropCount: 1,
      }),
    ).toEqual([])
  })

  it('rejects placeholder titles such as Nova notícia', () => {
    expect(
      missingApprovalRequirements({
        title: 'Nova notícia',
        text: 'Texto extraído',
        cropCount: 1,
      }),
    ).toEqual(['título'])
    expect(
      missingApprovalRequirements({
        title: 'Sem título',
        text: 'Texto extraído',
        cropCount: 1,
      }),
    ).toEqual(['título'])
    expect(
      missingApprovalRequirements({
        title: '   ',
        text: 'Texto extraído',
        cropCount: 1,
      }),
    ).toEqual(['título'])
  })

  it('lists every missing piece', () => {
    expect(
      missingApprovalRequirements({
        title: 'Nova notícia',
        text: '',
        cropCount: 0,
      }),
    ).toEqual(['título', 'texto', 'recorte'])
  })
})

describe('formatIncompleteNewsTip', () => {
  it('returns null when nothing is missing', () => {
    expect(formatIncompleteNewsTip([])).toBeNull()
  })

  it('names the missing fields in Portuguese', () => {
    expect(formatIncompleteNewsTip(['título'])).toBe('Notícia incompleta, falta título.')
    expect(formatIncompleteNewsTip(['título', 'texto'])).toBe(
      'Notícia incompleta, falta título e texto.',
    )
    expect(formatIncompleteNewsTip(['título', 'texto', 'recorte'])).toBe(
      'Notícia incompleta, falta título, texto e recorte.',
    )
  })
})

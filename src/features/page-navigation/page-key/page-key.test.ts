import { describe, expect, it } from 'vitest'
import { comparePageKeys, pageScopeKey, toProxiedImageUrl } from './page-key'

describe('pageKey', () => {
  it('sorts alphanumeric page keys naturally', () => {
    expect(['B1', 'A10', 'A2'].sort(comparePageKeys)).toEqual(['A2', 'A10', 'B1'])
  })

  it('builds the persisted page scope key', () => {
    expect(pageScopeKey('pdf-7', 'A2')).toBe('pdf-7:A2')
  })

  it('proxies scancontrol URLs while preserving path and query', () => {
    expect(toProxiedImageUrl(' http://170.80.70.78/images/page.jpg?size=large ')).toBe(
      '/images/page.jpg?size=large',
    )
  })

  it('keeps relative, invalid, and other-host URLs unchanged after trimming', () => {
    expect(toProxiedImageUrl('/images/page.jpg')).toBe('/images/page.jpg')
    expect(toProxiedImageUrl('https://example.com/page.jpg')).toBe(
      'https://example.com/page.jpg',
    )
    expect(toProxiedImageUrl('http://[invalid')).toBe('http://[invalid')
    expect(toProxiedImageUrl('  ')).toBe('')
  })
})

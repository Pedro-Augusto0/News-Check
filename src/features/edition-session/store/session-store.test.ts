import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleEdition } from '../model'
import { useSessionStore } from './session-store'

const page = {
  pageNumber: '1',
  imageUrl: '/p1.jpg',
  hasClient: false,
  keywordsFound: [],
  keywordsMissing: [],
  keywordOccurrences: [],
  crops: [],
}

const editionA: VehicleEdition = {
  id: '10',
  vehicleName: 'Gazeta',
  editionDate: '2026-08-18',
  label: 'Gazeta',
  clientKeywords: [],
  pdfs: [{ id: 'pdf-a', name: 'Gazeta', url: '', pages: [page] }],
}

const editionB: VehicleEdition = {
  id: '20',
  vehicleName: 'Zero Hora',
  editionDate: '2026-08-19',
  label: 'Zero Hora',
  clientKeywords: [],
  pdfs: [{ id: 'pdf-b', name: 'Zero Hora', url: '', pages: [page] }],
}

describe('useSessionStore editions', () => {
  beforeEach(() => {
    useSessionStore.setState({
      editions: [],
      selectedEditionId: null,
      selectedPdfId: null,
      selectedPageNumber: '',
      pageFilter: 'all',
      newsViewFilter: 'all',
      isLoading: true,
      error: null,
    })
  })

  it('does not auto-select an edition when loading the list', () => {
    useSessionStore.getState().setEditions([editionA, editionB])

    const state = useSessionStore.getState()
    expect(state.editions).toHaveLength(2)
    expect(state.selectedEditionId).toBeNull()
    expect(state.selectedPdfId).toBeNull()
    expect(state.selectedPageNumber).toBe('')
  })

  it('keeps the current edition when the list is refreshed', () => {
    useSessionStore.getState().setEditions([editionA, editionB])
    useSessionStore.getState().selectEdition(editionB.id)
    useSessionStore.getState().setEditions([editionA, editionB])

    expect(useSessionStore.getState().selectedEditionId).toBe(editionB.id)
    expect(useSessionStore.getState().selectedPdfId).toBe('pdf-b')
  })

  it('clears the current edition', () => {
    useSessionStore.getState().setEditions([editionA])
    useSessionStore.getState().selectEdition(editionA.id)
    useSessionStore.getState().clearEditionSelection()

    const state = useSessionStore.getState()
    expect(state.selectedEditionId).toBeNull()
    expect(state.selectedPdfId).toBeNull()
    expect(state.selectedPageNumber).toBe('')
  })
})

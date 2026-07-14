import { create } from 'zustand'
import type { PageData, PageFilter, PdfFile, VehicleEdition, NewsViewFilter } from '@/types/session'
import { filterPagesByClient, pageHasClientCrops } from '@/utils/cropClientStats'
import { useCropsStore } from '@/stores/cropsStore'

interface SessionState {
  editions: VehicleEdition[]
  selectedEditionId: string | null
  selectedPdfId: string | null
  selectedPageNumber: number
  pageFilter: PageFilter
  newsViewFilter: NewsViewFilter
  isLoading: boolean
  error: string | null

  setEditions: (editions: VehicleEdition[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  selectEdition: (id: string) => void
  selectPdf: (id: string) => void
  selectPage: (pageNumber: number) => void
  setPageFilter: (filter: PageFilter) => void
  setNewsViewFilter: (filter: NewsViewFilter) => void
  nextPage: () => void
  prevPage: () => void

  getCurrentEdition: () => VehicleEdition | undefined
  getCurrentPdf: () => PdfFile | undefined
  getCurrentPage: () => PageData | undefined
  getFilteredPages: () => PageData[]
}

export const useSessionStore = create<SessionState>((set, get) => ({
  editions: [],
  selectedEditionId: null,
  selectedPdfId: null,
  selectedPageNumber: 2,
  pageFilter: 'all',
  newsViewFilter: 'all',
  isLoading: true,
  error: null,

  setEditions: (editions) => {
    const first = editions[0]
    const firstPdf = first?.pdfs[0]
    set({
      editions,
      selectedEditionId: first?.id ?? null,
      selectedPdfId: firstPdf?.id ?? null,
      selectedPageNumber: firstPdf?.pages[0]?.pageNumber ?? 1,
      isLoading: false,
      error: null,
    })
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  selectEdition: (id) => {
    const edition = get().editions.find((e) => e.id === id)
    const firstPdf = edition?.pdfs[0]
    const { newsViewFilter } = get()
    let selectedPageNumber = firstPdf?.pages[0]?.pageNumber ?? 1

    if (newsViewFilter === 'withClient' && firstPdf) {
      const crops = useCropsStore.getState().crops
      const firstPageWithClient = firstPdf.pages.find((page) =>
        pageHasClientCrops(crops, firstPdf.id, page.pageNumber),
      )
      if (firstPageWithClient) {
        selectedPageNumber = firstPageWithClient.pageNumber
      }
    }

    set({
      selectedEditionId: id,
      selectedPdfId: firstPdf?.id ?? null,
      selectedPageNumber,
      pageFilter: newsViewFilter === 'withClient' ? 'withClient' : get().pageFilter,
    })
  },

  selectPdf: (id) => {
    const pdf = get().getCurrentEdition()?.pdfs.find((p) => p.id === id)
    const { newsViewFilter } = get()
    let selectedPageNumber = pdf?.pages[0]?.pageNumber ?? 1

    if (newsViewFilter === 'withClient' && pdf) {
      const crops = useCropsStore.getState().crops
      const firstPageWithClient = pdf.pages.find((page) =>
        pageHasClientCrops(crops, pdf.id, page.pageNumber),
      )
      if (firstPageWithClient) {
        selectedPageNumber = firstPageWithClient.pageNumber
      }
    }

    set({
      selectedPdfId: id,
      selectedPageNumber,
      pageFilter: newsViewFilter === 'withClient' ? 'withClient' : get().pageFilter,
    })
  },

  selectPage: (pageNumber) => set({ selectedPageNumber: pageNumber }),
  setPageFilter: (pageFilter) => set({ pageFilter }),

  setNewsViewFilter: (newsViewFilter) => {
    const pdf = get().getCurrentPdf()
    const crops = useCropsStore.getState().crops
    const pageFilter: PageFilter = newsViewFilter === 'withClient' ? 'withClient' : 'all'

    let selectedPageNumber = get().selectedPageNumber
    if (newsViewFilter === 'withClient' && pdf) {
      const firstPageWithClient = pdf.pages.find((page) =>
        pageHasClientCrops(crops, pdf.id, page.pageNumber),
      )
      if (firstPageWithClient) {
        selectedPageNumber = firstPageWithClient.pageNumber
      }
    }

    set({ newsViewFilter, pageFilter, selectedPageNumber })
  },

  nextPage: () => {
    const pages = get().getFilteredPages()
    const current = get().selectedPageNumber
    const idx = pages.findIndex((p) => p.pageNumber === current)
    if (idx >= 0 && idx < pages.length - 1) {
      set({ selectedPageNumber: pages[idx + 1].pageNumber })
    }
  },

  prevPage: () => {
    const pages = get().getFilteredPages()
    const current = get().selectedPageNumber
    const idx = pages.findIndex((p) => p.pageNumber === current)
    if (idx > 0) {
      set({ selectedPageNumber: pages[idx - 1].pageNumber })
    }
  },

  getCurrentEdition: () => {
    const { editions, selectedEditionId } = get()
    return editions.find((e) => e.id === selectedEditionId)
  },

  getCurrentPdf: () => {
    const edition = get().getCurrentEdition()
    const { selectedPdfId } = get()
    return edition?.pdfs.find((p) => p.id === selectedPdfId)
  },

  getCurrentPage: () => {
    const pdf = get().getCurrentPdf()
    const { selectedPageNumber } = get()
    return pdf?.pages.find((p) => p.pageNumber === selectedPageNumber)
  },

  getFilteredPages: () => {
    const pdf = get().getCurrentPdf()
    if (!pdf) return []
    const { pageFilter } = get()
    const crops = useCropsStore.getState().crops
    return filterPagesByClient(pdf.pages, pageFilter, crops, pdf.id)
  },
}))

import { create } from 'zustand'
import type { PdfFile, VehicleEdition } from '../model'
import type { NewsViewFilter } from '@/features/news'
import type { PageData, PageFilter } from '@/features/page-navigation'
import { findPageBySelection, resolvePageId } from '@/features/page-navigation/page-key'
import { filterPagesByClient, pageHasClientCrops } from '@/features/crops/client-stats'
import { useCropsStore } from '@/features/crops/store'

interface SessionState {
  editions: VehicleEdition[]
  selectedEditionId: string | null
  selectedPdfId: string | null
  selectedPageNumber: string
  pageFilter: PageFilter
  newsViewFilter: NewsViewFilter
  isLoading: boolean
  error: string | null

  setEditions: (editions: VehicleEdition[]) => void
  clearEditionSelection: () => void
  updateEditionPages: (editionId: string, pages: PageData[]) => void
  setPublicationPageFinished: (
    editionId: string,
    publicationPageId: number,
    finished: boolean,
  ) => void
  setPublicationFinished: (editionId: string, finished: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  selectEdition: (id: string) => void
  selectPdf: (id: string) => void
  selectPage: (pageNumber: string) => void
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
  selectedPageNumber: '',
  pageFilter: 'all',
  newsViewFilter: 'all',
  isLoading: true,
  error: null,

  setEditions: (editions) => {
    const { selectedEditionId, selectedPdfId, selectedPageNumber } = get()
    const current = editions.find((edition) => edition.id === selectedEditionId)
    const currentPdf =
      current?.pdfs.find((pdf) => pdf.id === selectedPdfId) ?? current?.pdfs[0] ?? null
    set({
      editions,
      selectedEditionId: current?.id ?? null,
      selectedPdfId: currentPdf?.id ?? null,
      selectedPageNumber: current ? selectedPageNumber : '',
      error: null,
    })
  },

  clearEditionSelection: () => {
    set({
      selectedEditionId: null,
      selectedPdfId: null,
      selectedPageNumber: '',
    })
  },

  updateEditionPages: (editionId, pages) => {
    const { editions, selectedEditionId, selectedPageNumber } = get()
    const nextEditions = editions.map((edition) => {
      if (edition.id !== editionId) return edition
      const pdf = edition.pdfs[0]
      if (!pdf) return edition
      return {
        ...edition,
        pdfs: [{ ...pdf, pages }],
      }
    })

    const current = nextEditions.find((e) => e.id === editionId)
    const firstPage = current?.pdfs[0]?.pages[0]
    const selectedPage = findPageBySelection(current?.pdfs[0]?.pages, selectedPageNumber)

    set({
      editions: nextEditions,
      selectedPageNumber:
        selectedEditionId !== editionId
          ? selectedPageNumber
          : selectedPage
            ? resolvePageId(selectedPage)
            : firstPage
              ? resolvePageId(firstPage)
              : '',
    })
  },

  setPublicationPageFinished: (editionId, publicationPageId, finished) => {
    const { editions } = get()
    set({
      editions: editions.map((edition) => {
        if (edition.id !== editionId) return edition
        return {
          ...edition,
          pdfs: edition.pdfs.map((pdf) => ({
            ...pdf,
            pages: pdf.pages.map((page) =>
              page.publicationPageId === publicationPageId ? { ...page, finished } : page,
            ),
          })),
        }
      }),
    })
  },

  setPublicationFinished: (editionId, finished) => {
    const { editions } = get()
    set({
      editions: editions.map((edition) =>
        edition.id === editionId ? { ...edition, finished } : edition,
      ),
    })
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  selectEdition: (id) => {
    const edition = get().editions.find((e) => e.id === id)
    if (!edition || edition.hasSourceMapping === false) return
    const firstPdf = edition.pdfs[0]
    const { newsViewFilter } = get()
    let selectedPageNumber = firstPdf?.pages[0] ? resolvePageId(firstPdf.pages[0]) : ''

    if (newsViewFilter === 'withClient' && firstPdf) {
      const crops = useCropsStore.getState().crops
      const firstPageWithClient = firstPdf.pages.find((page) =>
        pageHasClientCrops(crops, firstPdf.id, page.pageNumber),
      )
      if (firstPageWithClient) {
        selectedPageNumber = resolvePageId(firstPageWithClient)
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
    let selectedPageNumber = pdf?.pages[0] ? resolvePageId(pdf.pages[0]) : ''

    if (newsViewFilter === 'withClient' && pdf) {
      const crops = useCropsStore.getState().crops
      const firstPageWithClient = pdf.pages.find((page) =>
        pageHasClientCrops(crops, pdf.id, page.pageNumber),
      )
      if (firstPageWithClient) {
        selectedPageNumber = resolvePageId(firstPageWithClient)
      }
    }

    set({
      selectedPdfId: id,
      selectedPageNumber,
      pageFilter: newsViewFilter === 'withClient' ? 'withClient' : get().pageFilter,
    })
  },

  selectPage: (pageIdOrNumber) => {
    const page = findPageBySelection(get().getCurrentPdf()?.pages, pageIdOrNumber)
    set({ selectedPageNumber: page ? resolvePageId(page) : pageIdOrNumber })
  },
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
        selectedPageNumber = resolvePageId(firstPageWithClient)
      }
    }

    set({ newsViewFilter, pageFilter, selectedPageNumber })
  },

  nextPage: () => {
    const pages = get().getFilteredPages()
    const current = findPageBySelection(pages, get().selectedPageNumber)
    const idx = current ? pages.findIndex((page) => resolvePageId(page) === resolvePageId(current)) : -1
    if (idx >= 0 && idx < pages.length - 1) {
      set({ selectedPageNumber: resolvePageId(pages[idx + 1]) })
    }
  },

  prevPage: () => {
    const pages = get().getFilteredPages()
    const current = findPageBySelection(pages, get().selectedPageNumber)
    const idx = current ? pages.findIndex((page) => resolvePageId(page) === resolvePageId(current)) : -1
    if (idx > 0) {
      set({ selectedPageNumber: resolvePageId(pages[idx - 1]) })
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
    return findPageBySelection(get().getCurrentPdf()?.pages, get().selectedPageNumber)
  },

  getFilteredPages: () => {
    const pdf = get().getCurrentPdf()
    if (!pdf) return []
    const { pageFilter } = get()
    const crops = useCropsStore.getState().crops
    return filterPagesByClient(pdf.pages, pageFilter, crops, pdf.id)
  },
}))

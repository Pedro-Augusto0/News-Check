import { create } from 'zustand'
import type { Crop, CropDisplayNode, CropGroup, PersistedCropState, VehicleEdition } from '@/types/session'
import { getSeedCropsForEdition, normalizeSeedCrop } from '@/data/seedCropsCampineiro'
import { generateId } from '@/utils/cn'
import type { CropRect } from '@/utils/cropGeometry'
import { ensureDisplayIndices, nextDisplayIndex } from '@/utils/cropDisplayIndex'
import { isPageFinalizedInState, pageFinalizationKey } from '@/utils/pageFinalization'
import { useNewsStore } from '@/stores/newsStore'
import type { StoredNewsItem } from '@/types/session'

interface CropsState {
  crops: Record<string, Crop>
  groups: Record<string, CropGroup>
  finalizedPages: Record<string, true>
  selectedCropId: string | null
  editingCropId: string | null
  expandedGroups: Record<string, boolean>
  textModalCropId: string | null
  extractingTextIds: Record<string, true>

  hydrateFromEdition: (edition: VehicleEdition) => void
  addCrop: (params: {
    editionId: string
    pdfId: string
    pageNumber: number
    rect: CropRect
    title?: string
    text?: string
    newsItemId?: string | null
    clientKeywordsFound?: string[]
  }) => string
  addCropToNews: (params: {
    editionId: string
    pdfId: string
    pageNumber: number
    rect: CropRect
    newsItem: StoredNewsItem
  }) => string | null
  updateCropTitle: (cropId: string, title: string) => void
  updateGroupTitle: (groupId: string, title: string) => void
  selectCrop: (cropId: string | null) => void
  setNewsItemIdForRelatedCrops: (rootCropId: string, newsItemId: string) => void
  startEditCrop: (cropId: string) => void
  cancelEditCrop: () => void
  updateCropRect: (cropId: string, rect: CropRect) => void
  commitEditCrop: (cropId: string, rect: CropRect) => void
  mergeCrops: (sourceId: string, targetId: string) => string | null
  reorderGroupCrops: (groupId: string, sourceId: string, targetId: string) => void
  ungroupCrop: (cropId: string) => void
  deleteCrop: (cropId: string) => void
  updateCropText: (cropId: string, text: string) => void
  updateGroupText: (groupId: string, text: string) => void
  finalizeCrop: (cropId: string) => void
  reopenCrop: (cropId: string) => void
  isNewsItemFinalized: (cropId: string) => boolean
  isPageFinalized: (pdfId: string, pageNumber: number) => boolean
  finalizePage: (editionId: string, pdfId: string, pageNumber: number) => void
  reopenPage: (editionId: string, pdfId: string, pageNumber: number) => void
  toggleGroupExpanded: (groupId: string) => void
  openTextModal: (cropOrGroupId: string) => void
  closeTextModal: () => void
  setTextExtracting: (id: string, extracting: boolean) => void
  isTextExtracting: (id: string) => boolean
  getCropsForPage: (pdfId: string, pageNumber: number) => Crop[]
  getDisplayTreeForPage: (editionId: string, pdfId: string, pageNumber: number) => CropDisplayNode[]
  getGroupText: (groupId: string) => string
  getCropText: (cropId: string) => string
  getModalText: () => string
  getModalTitle: () => string
}

function storageKey(editionId: string) {
  return `feature-crops-state-${editionId}`
}

function loadPersisted(editionId: string): PersistedCropState | null {
  try {
    const raw = localStorage.getItem(storageKey(editionId))
    if (!raw) return null
    return JSON.parse(raw) as PersistedCropState
  } catch {
    return null
  }
}

function savePersisted(
  editionId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  finalizedPages: Record<string, true>,
) {
  const editionCrops: Record<string, Crop> = {}
  const editionGroups: Record<string, CropGroup> = {}
  for (const [id, crop] of Object.entries(crops)) {
    if (crop.editionId === editionId) editionCrops[id] = crop
  }
  for (const [id, group] of Object.entries(groups)) {
    if (group.editionId === editionId) editionGroups[id] = group
  }
  localStorage.setItem(
    storageKey(editionId),
    JSON.stringify({ crops: editionCrops, groups: editionGroups, finalizedPages }),
  )
}

function reopenPageInState(
  finalizedPages: Record<string, true>,
  pdfId: string,
  pageNumber: number,
): Record<string, true> {
  const key = pageFinalizationKey(pdfId, pageNumber)
  if (!finalizedPages[key]) return finalizedPages
  const next = { ...finalizedPages }
  delete next[key]
  return next
}

function finalizeNewsItemsOnPage(
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  pdfId: string,
  pageNumber: number,
): Record<string, Crop> {
  const pageCrops = Object.values(crops).filter(
    (crop) => crop.pdfId === pdfId && crop.pageNumber === pageNumber,
  )
  const processedNewsItems = new Set<string>()
  const nextCrops = { ...crops }

  for (const crop of pageCrops) {
    const newsKey = crop.groupId ?? crop.id
    if (processedNewsItems.has(newsKey)) continue
    processedNewsItems.add(newsKey)

    for (const id of getRelatedCropIds(crop.id, crops, groups)) {
      if (nextCrops[id]) {
        nextCrops[id] = { ...nextCrops[id], finalized: true }
      }
    }
  }

  return nextCrops
}

function sortCropIds(crops: Record<string, Crop>, ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ca = crops[a]
    const cb = crops[b]
    if (!ca || !cb) return 0
    if (ca.pageNumber !== cb.pageNumber) return ca.pageNumber - cb.pageNumber
    return ca.rect.y - cb.rect.y
  })
}

function combineGroupCropTexts(
  crops: Record<string, Crop>,
  cropIds: string[],
): Record<string, Crop> {
  const combined = cropIds
    .map((id) => crops[id]?.text ?? '')
    .filter(Boolean)
    .join('\n\n')

  if (!combined) return crops

  const next = { ...crops }
  const [firstId, ...restIds] = cropIds
  if (firstId && next[firstId]) {
    next[firstId] = { ...next[firstId], text: combined }
  }
  for (const id of restIds) {
    if (next[id]) {
      next[id] = { ...next[id], text: '' }
    }
  }
  return next
}

function getRelatedCropIds(
  cropId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): string[] {
  const crop = crops[cropId]
  if (!crop) return []
  if (crop.groupId && groups[crop.groupId]) {
    return groups[crop.groupId].cropIds.filter((id) => crops[id])
  }
  return [cropId]
}

export const useCropsStore = create<CropsState>((set, get) => ({
  crops: {},
  groups: {},
  finalizedPages: {},
  selectedCropId: null,
  editingCropId: null,
  expandedGroups: {},
  textModalCropId: null,
  extractingTextIds: {},

  hydrateFromEdition: (edition) => {
    const persisted = loadPersisted(edition.id)
    const seed = getSeedCropsForEdition(edition.id)
    const shouldUseSeed = !!seed && (!persisted || !persisted.crops['crop-f20beba8'])

    let crops: Record<string, Crop> = {}
    let groups: Record<string, CropGroup> = {}
    let finalizedPages: Record<string, true> = {}

    const source = shouldUseSeed ? seed : persisted

    if (source) {
      crops = Object.fromEntries(
        Object.entries(source.crops).map(([id, crop]) => [id, normalizeSeedCrop(crop)]),
      )
      groups = { ...source.groups }
      finalizedPages = { ...(source.finalizedPages ?? {}) }

      if (persisted && seed && !shouldUseSeed) {
        for (const [id, seedCrop] of Object.entries(seed.crops)) {
          if (crops[id] && seedCrop.clientKeywordsFound?.length) {
            crops[id] = {
              ...crops[id],
              clientKeywordsFound: seedCrop.clientKeywordsFound,
            }
          }
        }
      }
      for (const group of Object.values(groups)) {
        for (const cropId of group.cropIds) {
          if (crops[cropId]) {
            crops[cropId] = { ...crops[cropId], title: group.title }
          }
        }
      }
      for (const crop of Object.values(crops)) {
        if (crop.groupId && !groups[crop.groupId]) {
          crop.groupId = null
        }
      }
      crops = ensureDisplayIndices(crops, edition.id)
      savePersisted(edition.id, crops, groups, finalizedPages)
    }

    set({
      crops,
      groups,
      finalizedPages,
      selectedCropId: null,
      editingCropId: null,
      expandedGroups: {},
      textModalCropId: null,
      extractingTextIds: {},
    })
  },

  addCrop: ({ editionId, pdfId, pageNumber, rect, title, text, newsItemId, clientKeywordsFound }) => {
    const id = generateId('crop')
    const displayIndex = nextDisplayIndex(get().crops, editionId, pdfId)
    const crop: Crop = {
      id,
      rect,
      title: title ?? `Novo corte ${displayIndex}`,
      text: text ?? '',
      groupId: null,
      finalized: false,
      displayIndex,
      pdfId,
      pageNumber,
      editionId,
      newsItemId: newsItemId ?? null,
      clientKeywordsFound: clientKeywordsFound ?? [],
    }
    set((state) => {
      const crops = { ...state.crops, [id]: crop }
      const finalizedPages = reopenPageInState(state.finalizedPages, pdfId, pageNumber)
      savePersisted(editionId, crops, state.groups, finalizedPages)
      return { crops, finalizedPages, selectedCropId: id }
    })
    return id
  },

  addCropToNews: ({ editionId, pdfId, pageNumber, rect, newsItem }) => {
    const { crops, groups } = get()

    let existingCropId: string | null = null
    if (newsItem.cropId && crops[newsItem.cropId]) {
      existingCropId = newsItem.cropId
    } else {
      const linked = Object.values(crops).find((c) => c.newsItemId === newsItem.id)
      if (linked) {
        existingCropId =
          linked.groupId && groups[linked.groupId]
            ? groups[linked.groupId].cropIds[0]
            : linked.id
      }
    }

    const cropId = get().addCrop({
      editionId,
      pdfId,
      pageNumber,
      rect,
      title: newsItem.title,
      text: '',
      newsItemId: newsItem.id,
      clientKeywordsFound: newsItem.clientKeywordsFound,
    })

    if (existingCropId) {
      get().mergeCrops(cropId, existingCropId)
      return existingCropId
    }

    useNewsStore.getState().linkCropToNews(newsItem.id, cropId)
    return cropId
  },

  updateCropTitle: (cropId, title) => {
    const crop = get().crops[cropId]
    if (!crop) return
    if (crop.groupId && get().groups[crop.groupId]) {
      get().updateGroupTitle(crop.groupId, title)
      return
    }
    set((state) => {
      const current = state.crops[cropId]
      if (!current) return state
      const crops = { ...state.crops, [cropId]: { ...current, title } }
      savePersisted(current.editionId, crops, state.groups, state.finalizedPages)
      return { crops }
    })
  },

  updateGroupTitle: (groupId, title) => {
    set((state) => {
      const group = state.groups[groupId]
      if (!group) return state
      const groups = { ...state.groups, [groupId]: { ...group, title } }
      const crops = { ...state.crops }
      for (const cropId of group.cropIds) {
        if (crops[cropId]) {
          crops[cropId] = { ...crops[cropId], title }
        }
      }
      savePersisted(group.editionId, crops, groups, state.finalizedPages)
      return { crops, groups }
    })
  },

  selectCrop: (cropId) => set({ selectedCropId: cropId }),

  setNewsItemIdForRelatedCrops: (rootCropId, newsItemId) => {
    const { crops, groups } = get()
    const rootCrop = crops[rootCropId]
    if (!rootCrop) return

    const cropIds = rootCrop.groupId && groups[rootCrop.groupId]
      ? groups[rootCrop.groupId].cropIds
      : [rootCropId]

    set((state) => {
      const nextCrops = { ...state.crops }
      for (const id of cropIds) {
        if (nextCrops[id]) {
          nextCrops[id] = { ...nextCrops[id], newsItemId }
        }
      }
      savePersisted(rootCrop.editionId, nextCrops, state.groups, state.finalizedPages)
      return { crops: nextCrops }
    })
  },

  startEditCrop: (cropId) => {
    const crop = get().crops[cropId]
    if (!crop) return
    if (get().isNewsItemFinalized(cropId)) {
      get().reopenCrop(cropId)
    }
    const finalizedPages = reopenPageInState(
      get().finalizedPages,
      crop.pdfId,
      crop.pageNumber,
    )
    if (finalizedPages !== get().finalizedPages) {
      savePersisted(crop.editionId, get().crops, get().groups, finalizedPages)
    }
    set({ editingCropId: cropId, selectedCropId: cropId, finalizedPages })
  },

  cancelEditCrop: () => set({ editingCropId: null }),

  updateCropRect: (cropId, rect) => {
    set((state) => {
      const crop = state.crops[cropId]
      if (!crop) return state
      const crops = { ...state.crops, [cropId]: { ...crop, rect } }
      const finalizedPages = reopenPageInState(state.finalizedPages, crop.pdfId, crop.pageNumber)
      savePersisted(crop.editionId, crops, state.groups, finalizedPages)
      return { crops, finalizedPages }
    })
  },

  commitEditCrop: (cropId, rect) => {
    get().updateCropRect(cropId, rect)
    set({ editingCropId: null })
  },

  mergeCrops: (sourceId, targetId) => {
    if (sourceId === targetId) return null
    const { crops, groups, finalizedPages } = get()
    const source = crops[sourceId]
    const target = crops[targetId]
    if (!source || !target || source.editionId !== target.editionId) return null

    const sourceGroupId = source.groupId
    const targetGroupId = target.groupId

    let newGroups = { ...groups }
    let newCrops = { ...crops }

    const sourceIds = sourceGroupId && groups[sourceGroupId]
      ? [...groups[sourceGroupId].cropIds]
      : [sourceId]
    const targetIds = targetGroupId && groups[targetGroupId]
      ? [...groups[targetGroupId].cropIds]
      : [targetId]

    const mergedIds = sortCropIds(crops, [...new Set([...targetIds, ...sourceIds])])
    const groupId = targetGroupId ?? sourceGroupId ?? generateId('group')

    if (sourceGroupId && sourceGroupId !== groupId) delete newGroups[sourceGroupId]
    if (targetGroupId && targetGroupId !== groupId) delete newGroups[targetGroupId]

    const groupTitle = newGroups[targetGroupId ?? '']?.title ?? target.title

    newGroups[groupId] = {
      id: groupId,
      title: groupTitle,
      cropIds: mergedIds,
      editionId: target.editionId,
    }

    const groupDisplayIndex = target.displayIndex
    const newsItemId =
      target.newsItemId ??
      source.newsItemId ??
      mergedIds.map((id) => crops[id]?.newsItemId).find(Boolean) ??
      null

    for (const id of mergedIds) {
      if (newCrops[id]) {
        newCrops[id] = {
          ...newCrops[id],
          groupId,
          displayIndex: groupDisplayIndex,
          title: groupTitle,
          ...(newsItemId ? { newsItemId } : {}),
        }
      }
    }

    newCrops = combineGroupCropTexts(newCrops, mergedIds)

    let nextFinalizedPages = finalizedPages
    for (const id of mergedIds) {
      const mergedCrop = newCrops[id]
      if (mergedCrop) {
        nextFinalizedPages = reopenPageInState(nextFinalizedPages, mergedCrop.pdfId, mergedCrop.pageNumber)
      }
    }

    savePersisted(target.editionId, newCrops, newGroups, nextFinalizedPages)
    set({
      crops: newCrops,
      groups: newGroups,
      finalizedPages: nextFinalizedPages,
      expandedGroups: { ...get().expandedGroups, [groupId]: true },
    })
    return groupId
  },

  reorderGroupCrops: (groupId, sourceId, targetId) => {
    if (sourceId === targetId) return
    const { crops, groups, finalizedPages } = get()
    const group = groups[groupId]
    if (!group) return

    const ids = [...group.cropIds]
    const sourceIndex = ids.indexOf(sourceId)
    const targetIndex = ids.indexOf(targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    ids.splice(sourceIndex, 1)
    ids.splice(targetIndex, 0, sourceId)

    const newGroups = { ...groups, [groupId]: { ...group, cropIds: ids } }
    const newCrops = combineGroupCropTexts(crops, ids)

    savePersisted(group.editionId, newCrops, newGroups, finalizedPages)
    set({ crops: newCrops, groups: newGroups })

    const newsItemId = newCrops[ids[0]]?.newsItemId
    if (newsItemId) {
      useNewsStore.getState().syncNewsCropLink(newsItemId)
    }
  },

  ungroupCrop: (cropId) => {
    const { crops, groups, finalizedPages } = get()
    const crop = crops[cropId]
    if (!crop?.groupId) return

    const group = groups[crop.groupId]
    if (!group) return

    const newCrops = { ...crops }
    const newGroups = { ...groups }
    const remainingIds = group.cropIds.filter((id) => id !== cropId)

    const newDisplayIndex = nextDisplayIndex(newCrops, crop.editionId, crop.pdfId)
    newCrops[cropId] = { ...crop, groupId: null, displayIndex: newDisplayIndex }

    if (remainingIds.length <= 1) {
      delete newGroups[group.id]
      for (const id of remainingIds) {
        if (newCrops[id]) {
          newCrops[id] = { ...newCrops[id], groupId: null }
        }
      }
    } else {
      newGroups[group.id] = { ...group, cropIds: remainingIds }
    }

    const nextFinalizedPages = reopenPageInState(finalizedPages, crop.pdfId, crop.pageNumber)
    savePersisted(crop.editionId, newCrops, newGroups, nextFinalizedPages)
    set({ crops: newCrops, groups: newGroups, finalizedPages: nextFinalizedPages })
  },

  deleteCrop: (cropId) => {
    const { crops, groups, selectedCropId, textModalCropId, finalizedPages } = get()
    const crop = crops[cropId]
    if (!crop) return

    const newsItemId =
      crop.newsItemId ?? useNewsStore.getState().findNewsByCropId(cropId)?.id ?? null

    const newCrops = { ...crops }
    delete newCrops[cropId]

    const newGroups = { ...groups }
    if (crop.groupId && newGroups[crop.groupId]) {
      const group = newGroups[crop.groupId]
      const remainingIds = group.cropIds.filter((id) => id !== cropId)
      if (remainingIds.length <= 1) {
        delete newGroups[group.id]
        for (const id of remainingIds) {
          if (newCrops[id]) {
            newCrops[id] = { ...newCrops[id], groupId: null }
          }
        }
      } else {
        newGroups[group.id] = { ...group, cropIds: remainingIds }
      }
    }

    const closedGroupModal = textModalCropId && !newGroups[textModalCropId]
    const nextFinalizedPages = reopenPageInState(finalizedPages, crop.pdfId, crop.pageNumber)
    savePersisted(crop.editionId, newCrops, newGroups, nextFinalizedPages)

    if (newsItemId) {
      useNewsStore.getState().syncNewsCropLink(newsItemId)
    }

    set({
      crops: newCrops,
      groups: newGroups,
      finalizedPages: nextFinalizedPages,
      selectedCropId: selectedCropId === cropId ? null : selectedCropId,
      textModalCropId:
        textModalCropId === cropId || closedGroupModal ? null : textModalCropId,
    })
  },

  updateCropText: (cropId, text) => {
    set((state) => {
      const crop = state.crops[cropId]
      if (!crop) return state
      const crops = { ...state.crops, [cropId]: { ...crop, text } }
      savePersisted(crop.editionId, crops, state.groups, state.finalizedPages)
      return { crops }
    })
  },

  updateGroupText: (groupId, text) => {
    set((state) => {
      const group = state.groups[groupId]
      if (!group) return state

      const newCrops = { ...state.crops }
      const [firstId, ...restIds] = group.cropIds

      if (firstId && newCrops[firstId]) {
        newCrops[firstId] = { ...newCrops[firstId], text }
      }
      for (const id of restIds) {
        if (newCrops[id]) {
          newCrops[id] = { ...newCrops[id], text: '' }
        }
      }

      savePersisted(group.editionId, newCrops, state.groups, state.finalizedPages)
      return { crops: newCrops }
    })
  },

  finalizeCrop: (cropId) => {
    set((state) => {
      const crop = state.crops[cropId]
      if (!crop) return state

      const ids = getRelatedCropIds(cropId, state.crops, state.groups)
      const allFinalized = ids.every((id) => state.crops[id]?.finalized)
      if (allFinalized) return state

      const crops = { ...state.crops }
      for (const id of ids) {
        if (crops[id]) {
          crops[id] = { ...crops[id], finalized: true }
        }
      }
      savePersisted(crop.editionId, crops, state.groups, state.finalizedPages)
      return { crops }
    })
  },

  reopenCrop: (cropId) => {
    set((state) => {
      const crop = state.crops[cropId]
      if (!crop) return state

      const ids = getRelatedCropIds(cropId, state.crops, state.groups)
      const anyOpen = ids.some((id) => !state.crops[id]?.finalized)
      if (anyOpen) return state

      const crops = { ...state.crops }
      for (const id of ids) {
        if (crops[id]) {
          crops[id] = { ...crops[id], finalized: false }
        }
      }
      const finalizedPages = reopenPageInState(state.finalizedPages, crop.pdfId, crop.pageNumber)
      savePersisted(crop.editionId, crops, state.groups, finalizedPages)
      return { crops, finalizedPages }
    })
  },

  isNewsItemFinalized: (cropId) => {
    const { crops, groups } = get()
    const ids = getRelatedCropIds(cropId, crops, groups)
    return ids.length > 0 && ids.every((id) => crops[id]?.finalized)
  },

  isPageFinalized: (pdfId, pageNumber) =>
    isPageFinalizedInState(get().finalizedPages, pdfId, pageNumber),

  finalizePage: (editionId, pdfId, pageNumber) => {
    set((state) => {
      const crops = finalizeNewsItemsOnPage(state.crops, state.groups, pdfId, pageNumber)
      const finalizedPages = {
        ...state.finalizedPages,
        [pageFinalizationKey(pdfId, pageNumber)]: true as const,
      }
      savePersisted(editionId, crops, state.groups, finalizedPages)
      return { crops, finalizedPages }
    })
  },

  reopenPage: (editionId, pdfId, pageNumber) => {
    set((state) => {
      const finalizedPages = reopenPageInState(state.finalizedPages, pdfId, pageNumber)
      savePersisted(editionId, state.crops, state.groups, finalizedPages)
      return { finalizedPages }
    })
  },

  toggleGroupExpanded: (groupId) =>
    set((state) => ({
      expandedGroups: { ...state.expandedGroups, [groupId]: !state.expandedGroups[groupId] },
    })),

  openTextModal: (cropOrGroupId) => set({ textModalCropId: cropOrGroupId }),
  closeTextModal: () => set({ textModalCropId: null }),

  setTextExtracting: (id, extracting) =>
    set((state) => {
      const next = { ...state.extractingTextIds }
      if (extracting) next[id] = true
      else delete next[id]
      return { extractingTextIds: next }
    }),

  isTextExtracting: (id) => !!get().extractingTextIds[id],

  getCropsForPage: (pdfId, pageNumber) =>
    Object.values(get().crops).filter((c) => c.pdfId === pdfId && c.pageNumber === pageNumber),

  getDisplayTreeForPage: (editionId, pdfId, pageNumber) => {
    const { crops, groups } = get()
    const pageCrops = Object.values(crops).filter(
      (c) => c.editionId === editionId && c.pdfId === pdfId && c.pageNumber === pageNumber,
    )

    const seenGroups = new Set<string>()
    const nodes: CropDisplayNode[] = []

    for (const crop of pageCrops) {
      if (crop.groupId && groups[crop.groupId]) {
        if (seenGroups.has(crop.groupId)) continue
        seenGroups.add(crop.groupId)
        const group = groups[crop.groupId]
        const rootId = group.cropIds[0]
        const childCrops = group.cropIds
          .slice(1)
          .map((id) => crops[id])
          .filter(Boolean)
        nodes.push({
          type: 'group',
          id: group.id,
          group,
          crop: crops[rootId],
          children: childCrops.map((c) => ({ type: 'crop' as const, id: c.id, crop: c })),
        })
      } else if (!crop.groupId) {
        nodes.push({ type: 'crop', id: crop.id, crop })
      }
    }

    return nodes
  },

  getGroupText: (groupId) => {
    const { crops, groups } = get()
    const group = groups[groupId]
    if (!group) return ''
    return group.cropIds
      .map((id) => crops[id]?.text ?? '')
      .filter(Boolean)
      .join('\n\n')
  },

  getCropText: (cropId) => get().crops[cropId]?.text ?? '',

  getModalText: () => {
    const id = get().textModalCropId
    if (!id) return ''
    const group = get().groups[id]
    if (group) return get().getGroupText(id)
    return get().getCropText(id)
  },

  getModalTitle: () => {
    const id = get().textModalCropId
    if (!id) return ''
    const group = get().groups[id]
    if (group) return group.title
    return get().crops[id]?.title ?? ''
  },
}))

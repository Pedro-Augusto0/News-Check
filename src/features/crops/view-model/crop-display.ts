import type { Crop, CropDisplayNode, CropGroup } from '../model'
import { stableColorIndex } from '@/features/crops/colors'
import { comparePageKeys } from '@/features/page-navigation/page-key'

export interface CropDisplayInfo {
  displayIndex: number
  colorIndex: number
}

export interface CropPageSection {
  pageNumber: string
  nodes: CropDisplayNode[]
}

export interface CropListPageNewsRef {
  id: string
  pageNumber: string
}

function sortCropsByPagePosition(crops: Crop[]): Crop[] {
  return [...crops].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return comparePageKeys(a.pageNumber, b.pageNumber)
    return a.rect.y - b.rect.y
  })
}

export function cropDisplayInfoFromIndex(
  displayIndex: number,
  colorIndex = displayIndex - 1,
): CropDisplayInfo {
  return { displayIndex, colorIndex }
}

export function nextDisplayIndex(
  crops: Record<string, Crop>,
  editionId: string,
  pdfId: string,
): number {
  let max = 0
  for (const crop of Object.values(crops)) {
    if (crop.editionId !== editionId || crop.pdfId !== pdfId) continue
    if (typeof crop.displayIndex === 'number' && crop.displayIndex > max) {
      max = crop.displayIndex
    }
  }
  return max + 1
}

/** Garante displayIndex persistente para dados antigos sem o campo. */
export function ensureDisplayIndices(
  crops: Record<string, Crop>,
  editionId: string,
): Record<string, Crop> {
  const byPdf = new Map<string, Crop[]>()

  for (const crop of Object.values(crops)) {
    if (crop.editionId !== editionId) continue
    const list = byPdf.get(crop.pdfId) ?? []
    list.push(crop)
    byPdf.set(crop.pdfId, list)
  }

  let changed = false
  const next = { ...crops }

  for (const pdfCrops of byPdf.values()) {
    const withIndex = pdfCrops.filter(
      (crop) => typeof crop.displayIndex === 'number' && crop.displayIndex > 0,
    )
    const withoutIndex = pdfCrops.filter(
      (crop) => typeof crop.displayIndex !== 'number' || crop.displayIndex <= 0,
    )

    if (withoutIndex.length === 0) continue

    if (withIndex.length === 0) {
      for (const [index, crop] of sortCropsByPagePosition(pdfCrops).entries()) {
        const displayIndex = index + 1
        if (next[crop.id].displayIndex !== displayIndex) {
          next[crop.id] = { ...next[crop.id], displayIndex }
          changed = true
        }
      }
      continue
    }

    let nextIndex = Math.max(...withIndex.map((crop) => crop.displayIndex!)) + 1
    for (const crop of sortCropsByPagePosition(withoutIndex)) {
      next[crop.id] = { ...next[crop.id], displayIndex: nextIndex }
      nextIndex += 1
      changed = true
    }
  }

  return changed ? next : crops
}

export function resolveCropDisplayIndex(
  crop: Crop | undefined,
  crops: Record<string, Crop>,
): number {
  if (!crop) return 1
  if (typeof crop.displayIndex === 'number' && crop.displayIndex > 0) {
    return crop.displayIndex
  }
  return nextDisplayIndex(crops, crop.editionId, crop.pdfId)
}

export function buildCropDisplayTree(
  editionId: string,
  pdfId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): CropDisplayNode[] {
  const pdfCrops = Object.values(crops)
    .filter((crop) => crop.editionId === editionId && crop.pdfId === pdfId)
    .sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return comparePageKeys(a.pageNumber, b.pageNumber)
      return a.rect.y - b.rect.y
    })

  const seenGroups = new Set<string>()
  const nodes: CropDisplayNode[] = []

  for (const crop of pdfCrops) {
    if (crop.groupId && groups[crop.groupId]) {
      const group = groups[crop.groupId]
      if (seenGroups.has(crop.groupId)) continue

      seenGroups.add(crop.groupId)
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
        children: childCrops.map((child) => ({
          type: 'crop' as const,
          id: child.id,
          crop: child,
        })),
      })
    } else if (!crop.groupId) {
      nodes.push({ type: 'crop', id: crop.id, crop })
    }
  }

  return nodes
}

export function buildCropDisplayIndexMap(
  editionId: string,
  pdfId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): Map<string, CropDisplayInfo> {
  const tree = buildCropDisplayTree(editionId, pdfId, crops, groups)
  const byPage = new Map<string, CropDisplayNode[]>()

  for (const node of tree) {
    const pageNumber = node.crop?.pageNumber
    if (!pageNumber) continue
    const list = byPage.get(pageNumber) ?? []
    list.push(node)
    byPage.set(pageNumber, list)
  }

  const map = new Map<string, CropDisplayInfo>()
  let displayIndex = 1

  for (const [, nodes] of [...byPage.entries()].sort(([a], [b]) => comparePageKeys(a, b))) {
    const sorted = [...nodes].sort(
      (a, b) => (a.crop?.rect.y ?? 0) - (b.crop?.rect.y ?? 0),
    )

    for (const node of sorted) {
      const colorKey =
        node.crop?.newsItemId ?? node.group?.id ?? node.crop?.id ?? String(displayIndex)
      const info = cropDisplayInfoFromIndex(displayIndex++, stableColorIndex(colorKey))

      if (node.type === 'group' && node.group) {
        for (const cropId of node.group.cropIds) map.set(cropId, info)
      } else if (node.crop) {
        map.set(node.crop.id, info)
      }
    }
  }

  return map
}

export function resolveCropListPageNumber(
  crop: Crop,
  newsById: Map<string, CropListPageNewsRef>,
): string {
  if (crop.newsItemId) {
    const news = newsById.get(crop.newsItemId)
    if (news) return news.pageNumber
  }
  return crop.pageNumber
}

export function buildCropsByPageSections(
  tree: CropDisplayNode[],
  newsItems: CropListPageNewsRef[] = [],
): CropPageSection[] {
  const newsById = new Map(newsItems.map((item) => [item.id, item]))
  const byPage = new Map<string, CropDisplayNode[]>()

  for (const node of tree) {
    const crop = node.crop
    if (!crop) continue
    const pageNumber = resolveCropListPageNumber(crop, newsById)
    const section = byPage.get(pageNumber) ?? []
    section.push(node)
    byPage.set(pageNumber, section)
  }

  return [...byPage.entries()]
    .sort(([a], [b]) => comparePageKeys(a, b))
    .map(([pageNumber, nodes]) => ({ pageNumber, nodes }))
}

export function formatCropPagesLabel(pageNumbers: string[]): string {
  const unique = [...new Set(pageNumbers)].sort(comparePageKeys)
  if (unique.length === 0) return ''
  if (unique.length === 1) return `p. ${unique[0]}`
  if (unique.length === 2) return `p. ${unique[0]} e ${unique[1]}`
  const last = unique.pop()!
  return `p. ${unique.join(', ')} e ${last}`
}

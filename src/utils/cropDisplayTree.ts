import type { Crop, CropDisplayNode, CropGroup } from '@/types/session'
import { cropDisplayInfoFromIndex } from '@/utils/cropDisplayIndex'
import { comparePageKeys } from '@/utils/pageKey'

export interface CropDisplayInfo {
  displayIndex: number
  colorIndex: number
}

export function buildCropDisplayTree(
  editionId: string,
  pdfId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): CropDisplayNode[] {
  const pdfCrops = Object.values(crops)
    .filter((c) => c.editionId === editionId && c.pdfId === pdfId)
    .sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return comparePageKeys(a.pageNumber, b.pageNumber)
      return a.rect.y - b.rect.y
    })

  const seenGroups = new Set<string>()
  const nodes: CropDisplayNode[] = []

  for (const crop of pdfCrops) {
    if (crop.groupId && groups[crop.groupId]) {
      const group = groups[crop.groupId]

      if (seenGroups.has(crop.groupId)) {
        continue
      }

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
        children: childCrops.map((c) => ({ type: 'crop' as const, id: c.id, crop: c })),
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
      const info = cropDisplayInfoFromIndex(displayIndex++)

      if (node.type === 'group' && node.group) {
        for (const cropId of node.group.cropIds) {
          map.set(cropId, info)
        }
      } else if (node.crop) {
        map.set(node.crop.id, info)
      }
    }
  }

  return map
}

export interface CropPageSection {
  pageNumber: string
  nodes: CropDisplayNode[]
}

export interface CropListPageNewsRef {
  id: string
  pageNumber: string
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

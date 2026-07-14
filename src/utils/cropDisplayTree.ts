import type { Crop, CropDisplayNode, CropGroup } from '@/types/session'
import { cropDisplayInfoFromIndex, resolveCropDisplayIndex } from '@/utils/cropDisplayIndex'

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
      if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber
      return a.rect.y - b.rect.y
    })

  const seenGroups = new Set<string>()
  const nodes: CropDisplayNode[] = []

  for (const crop of pdfCrops) {
    if (crop.groupId && groups[crop.groupId]) {
      const group = groups[crop.groupId]
      const rootCrop = crops[group.cropIds[0]]

      if (seenGroups.has(crop.groupId)) {
        if (rootCrop && crop.pageNumber !== rootCrop.pageNumber) {
          nodes.push({ type: 'crop', id: crop.id, crop, group })
        }
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
  const map = new Map<string, CropDisplayInfo>()

  for (const node of tree) {
    const rootCrop = node.crop
    const displayIndex = resolveCropDisplayIndex(rootCrop, crops)
    const info = cropDisplayInfoFromIndex(displayIndex)

    if (node.type === 'group' && node.group) {
      for (const cropId of node.group.cropIds) {
        map.set(cropId, info)
      }
    } else if (rootCrop) {
      map.set(rootCrop.id, info)
    }
  }

  return map
}

export interface CropPageSection {
  pageNumber: number
  nodes: CropDisplayNode[]
}

export function buildCropsByPageSections(tree: CropDisplayNode[]): CropPageSection[] {
  const byPage = new Map<number, CropDisplayNode[]>()

  for (const node of tree) {
    const pageNumber = node.crop?.pageNumber
    if (pageNumber === undefined) continue
    const section = byPage.get(pageNumber) ?? []
    section.push(node)
    byPage.set(pageNumber, section)
  }

  return [...byPage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, nodes]) => ({ pageNumber, nodes }))
}

export function formatCropPagesLabel(pageNumbers: number[]): string {
  const unique = [...new Set(pageNumbers)].sort((a, b) => a - b)
  if (unique.length === 0) return ''
  if (unique.length === 1) return `p. ${unique[0]}`
  if (unique.length === 2) return `p. ${unique[0]} e ${unique[1]}`
  const last = unique.pop()!
  return `p. ${unique.join(', ')} e ${last}`
}

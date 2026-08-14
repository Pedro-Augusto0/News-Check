import type { CropDisplayInfo } from '@/utils/cropDisplayTree'
import { cropDisplayInfoFromIndex } from '@/utils/cropDisplayIndex'
import type { NewsPageSection } from '@/utils/pendingNews'

function assignSequentialIndices(pageSections: NewsPageSection[]) {
  const cropMap = new Map<string, CropDisplayInfo>()
  const newsMap = new Map<string, number>()
  let displayIndex = 1

  for (const section of pageSections) {
    for (const entry of section.entries) {
      const index = displayIndex++

      if (entry.kind === 'pending') {
        newsMap.set(entry.item.id, index)
        continue
      }

      const newsId = entry.newsId ?? entry.node.crop?.newsItemId
      if (newsId) newsMap.set(newsId, index)

      const info = cropDisplayInfoFromIndex(index)
      const node = entry.node

      if (node.type === 'group' && node.group) {
        for (const cropId of node.group.cropIds) {
          cropMap.set(cropId, info)
        }
      } else if (node.crop) {
        cropMap.set(node.crop.id, info)
      }
    }
  }

  return { cropMap, newsMap }
}

/** Índices sequenciais (1, 2, 3…) por ordem de página e posição na página. */
export function buildCropDisplayIndexMapFromNewsSections(
  pageSections: NewsPageSection[],
): Map<string, CropDisplayInfo> {
  return assignSequentialIndices(pageSections).cropMap
}

export function buildNewsDisplayIndexMap(
  pageSections: NewsPageSection[],
): Map<string, number> {
  return assignSequentialIndices(pageSections).newsMap
}

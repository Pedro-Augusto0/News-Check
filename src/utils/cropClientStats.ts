import type { Crop, CropDisplayNode, PageData, PageFilter } from '@/types/session'

export function cropHasClient(crop: Pick<Crop, 'clientKeywordsFound'>): boolean {
  return (crop.clientKeywordsFound?.length ?? 0) > 0
}

export function buildClientCountByPage(
  crops: Record<string, Crop>,
  pdfId: string,
): Map<number, number> {
  const map = new Map<number, number>()
  for (const crop of Object.values(crops)) {
    if (crop.pdfId !== pdfId || !cropHasClient(crop)) continue
    map.set(crop.pageNumber, (map.get(crop.pageNumber) ?? 0) + 1)
  }
  return map
}

export function pageHasClientCrops(
  crops: Record<string, Crop>,
  pdfId: string,
  pageNumber: number,
): boolean {
  return (buildClientCountByPage(crops, pdfId).get(pageNumber) ?? 0) > 0
}

export function countPagesWithClientCrops(
  pages: PageData[],
  crops: Record<string, Crop>,
  pdfId: string,
): { all: number; withClient: number; withoutClient: number } {
  const withClient = pages.filter((page) =>
    pageHasClientCrops(crops, pdfId, page.pageNumber),
  ).length
  return {
    all: pages.length,
    withClient,
    withoutClient: pages.length - withClient,
  }
}

export function filterPagesByClient(
  pages: PageData[],
  pageFilter: PageFilter,
  crops: Record<string, Crop>,
  pdfId: string,
): PageData[] {
  if (pageFilter === 'all') return pages
  return pages.filter((page) => {
    const hasClient = pageHasClientCrops(crops, pdfId, page.pageNumber)
    return pageFilter === 'withClient' ? hasClient : !hasClient
  })
}

export function formatClientKeywords(keywords: string[] | undefined): string {
  if (!keywords?.length) return ''
  return keywords.join(' · ')
}

export function mergeClientKeywords(crops: Pick<Crop, 'clientKeywordsFound'>[]): string[] {
  const keywords = new Set<string>()
  for (const crop of crops) {
    for (const keyword of crop.clientKeywordsFound ?? []) {
      keywords.add(keyword)
    }
  }
  return [...keywords]
}

export function newsDisplayNodeHasClient(
  node: CropDisplayNode,
  crops: Record<string, Crop>,
): boolean {
  if (node.type === 'group' && node.group) {
    return node.group.cropIds.some((id) => {
      const crop = crops[id]
      return crop ? cropHasClient(crop) : false
    })
  }
  if (node.crop) return cropHasClient(node.crop)
  return false
}

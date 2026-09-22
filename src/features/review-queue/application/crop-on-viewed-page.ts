import type { Crop } from '@/features/crops'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import { pageIdOf, resolvePageId } from '@/features/page-navigation/page-key'

type CropPageRef = Pick<Crop, 'pdfId' | 'pageNumber' | 'newsItemId'>
type NewsPageRef = Pick<StoredNewsItem, 'pageNumber' | 'filePath' | 'section' | 'suggestedSection'>

export function cropBelongsOnViewedPage(input: {
  crop: CropPageRef
  pdfId: string
  page: PageData
  newsItems: Record<string, StoredNewsItem>
}): boolean {
  const { crop, pdfId, page, newsItems } = input
  if (crop.pdfId !== pdfId || crop.pageNumber !== page.pageNumber) return false

  const news = crop.newsItemId ? newsItems[crop.newsItemId] : undefined
  if (!news) return true

  // Same printed number as the news home page: keep section/filePath identity.
  if (news.pageNumber === crop.pageNumber) {
    return pageIdOf(news) === resolvePageId(page)
  }

  // Continuation crop: show it on the page it was drawn on.
  return true
}

export function resolveCropPageId(
  crop: Pick<Crop, 'pageNumber' | 'newsItemId'>,
  pages: PageData[] | undefined,
  news?: NewsPageRef,
): string {
  const matches = pages?.filter((page) => page.pageNumber === crop.pageNumber) ?? []
  if (matches.length === 1) return resolvePageId(matches[0])

  if (matches.length > 1 && news?.pageNumber === crop.pageNumber) {
    const byFile = news.filePath
      ? matches.find((page) => page.filePath === news.filePath)
      : undefined
    if (byFile) return resolvePageId(byFile)
    const byNews = matches.find((page) => resolvePageId(page) === pageIdOf(news))
    if (byNews) return resolvePageId(byNews)
  }

  if (matches[0]) return resolvePageId(matches[0])
  return crop.pageNumber
}

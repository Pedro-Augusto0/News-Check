export function pageFinalizationKey(pdfId: string, pageNumber: string): string {
  return `${pdfId}:${pageNumber}`
}

export function isPageFinalizedInState(
  finalizedPages: Record<string, true> | undefined,
  pdfId: string,
  pageNumber: string,
): boolean {
  return !!finalizedPages?.[pageFinalizationKey(pdfId, pageNumber)]
}

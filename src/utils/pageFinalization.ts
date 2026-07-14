export function pageFinalizationKey(pdfId: string, pageNumber: number): string {
  return `${pdfId}:${pageNumber}`
}

export function isPageFinalizedInState(
  finalizedPages: Record<string, true> | undefined,
  pdfId: string,
  pageNumber: number,
): boolean {
  return !!finalizedPages?.[pageFinalizationKey(pdfId, pageNumber)]
}

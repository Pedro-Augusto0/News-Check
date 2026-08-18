/** Compara chaves de página alfanuméricas (ex.: A2 < A10 < B1). */
export function comparePageKeys(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** Escopo de página no documento: `${pdfId}:${pageNumber}`. */
export function pageScopeKey(pdfId: string, pageNumber: string): string {
  return `${pdfId}:${pageNumber}`
}

/**
 * Converte URL absoluta do scancontrol para path local (proxy Vite),
 * evitando CORS ao desenhar no canvas.
 */
export function toProxiedImageUrl(filePath: string | null | undefined): string {
  const raw = filePath?.trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    if (url.hostname === '170.80.70.78') {
      return `${url.pathname}${url.search}`
    }
  } catch {
    // relative or invalid — use as-is
  }

  return raw
}

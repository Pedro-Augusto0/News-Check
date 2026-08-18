const API_ORIGIN = 'https://prd-api.cservice.io'

export default async (request: Request) => {
  const incoming = new URL(request.url)
  const target = new URL(`${incoming.pathname}${incoming.search}`, API_ORIGIN)
  const headers = new Headers()

  for (const name of ['accept', 'authorization', 'content-type']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const method = request.method.toUpperCase()
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()

  const response = await fetch(target, { method, headers, body })
  const outbound = new Headers(response.headers)
  outbound.delete('content-encoding')
  outbound.delete('content-length')
  outbound.delete('transfer-encoding')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outbound,
  })
}

import type { CreateNewsRequestDto } from '../dto'
import { apiFetch } from '../http/api-client'

export const CREATE_NEWS_PATH = '/printed-clipping/Info4AINews/news/create'

export async function createNews(request: CreateNewsRequestDto): Promise<void> {
  await apiFetch<unknown>(CREATE_NEWS_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(request),
  })
}

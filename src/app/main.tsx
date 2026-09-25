import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import '@/styles/globals.css'

const LOCAL_CACHE_PREFIXES = [
  'feature-crops-state-',
  'feature-crops-news-',
  'feature-crops.review-queue.v2.',
]

function clearLocalCache() {
  try {
    const keys: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && LOCAL_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keys.push(key)
      }
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    // ignore quota / private mode
  }
}

clearLocalCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

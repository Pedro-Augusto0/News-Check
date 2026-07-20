import { create } from 'zustand'

interface NotificationState {
  message: string | null
  timeoutId: ReturnType<typeof setTimeout> | null
  show: (message: string, durationMs?: number) => void
  dismiss: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  message: null,
  timeoutId: null,
  show: (message, durationMs = 3500) => {
    const prev = get().timeoutId
    if (prev) clearTimeout(prev)
    const timeoutId = setTimeout(() => {
      set({ message: null, timeoutId: null })
    }, durationMs)
    set({ message, timeoutId })
  },
  dismiss: () => {
    const prev = get().timeoutId
    if (prev) clearTimeout(prev)
    set({ message: null, timeoutId: null })
  },
}))

import { create } from 'zustand'

export type NotificationTone = 'success' | 'info' | 'error'

export interface NotificationAction {
  label: string
  onClick: () => void
}

export interface NotificationShowOptions {
  durationMs?: number
  action?: NotificationAction
  onExpire?: () => void
  tone?: NotificationTone
}

interface NotificationState {
  message: string | null
  action: NotificationAction | null
  timeoutId: ReturnType<typeof setTimeout> | null
  onExpire: (() => void) | null
  durationMs: number | null
  tone: NotificationTone | null
  show: (message: string, options?: number | NotificationShowOptions) => void
  undo: () => void
  dismiss: () => void
}

function resolveShowOptions(options?: number | NotificationShowOptions): NotificationShowOptions {
  if (typeof options === 'number') return { durationMs: options }
  return options ?? {}
}

function resolveTone(message: string, action: NotificationAction | undefined, tone?: NotificationTone): NotificationTone {
  if (tone) return tone
  if (/erro/i.test(message)) return 'error'
  if (action) return 'info'
  return 'success'
}

function clearNotificationState(
  set: (partial: Partial<NotificationState>) => void,
  get: () => NotificationState,
) {
  const prev = get().timeoutId
  if (prev) clearTimeout(prev)
  set({
    message: null,
    action: null,
    timeoutId: null,
    onExpire: null,
    durationMs: null,
    tone: null,
  })
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  message: null,
  action: null,
  timeoutId: null,
  onExpire: null,
  durationMs: null,
  tone: null,

  show: (message, options) => {
    const { durationMs = 3500, action, onExpire, tone } = resolveShowOptions(options)
    const prev = get()

    if (prev.timeoutId) clearTimeout(prev.timeoutId)
    if (prev.onExpire) prev.onExpire()

    const timeoutId = setTimeout(() => {
      const expire = get().onExpire
      clearNotificationState(set, get)
      expire?.()
    }, durationMs)

    set({
      message,
      action: action ?? null,
      onExpire: onExpire ?? null,
      timeoutId,
      durationMs,
      tone: resolveTone(message, action, tone),
    })
  },

  undo: () => {
    const { timeoutId, action } = get()
    if (timeoutId) clearTimeout(timeoutId)
    action?.onClick()
    set({
      message: null,
      action: null,
      timeoutId: null,
      onExpire: null,
      durationMs: null,
      tone: null,
    })
  },

  dismiss: () => {
    const { timeoutId, onExpire } = get()
    if (timeoutId) clearTimeout(timeoutId)
    clearNotificationState(set, get)
    onExpire?.()
  },
}))

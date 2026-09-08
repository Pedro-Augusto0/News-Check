import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationStore } from './notification-store'

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useNotificationStore.setState({
      message: null,
      action: null,
      timeoutId: null,
      onExpire: null,
      durationMs: null,
      tone: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onExpire when the toast times out', () => {
    const onExpire = vi.fn()

    useNotificationStore.getState().show('Notícia descartada', {
      durationMs: 4000,
      onExpire,
    })

    vi.advanceTimersByTime(4000)

    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(useNotificationStore.getState().message).toBeNull()
  })

  it('reverts without calling onExpire', () => {
    const onExpire = vi.fn()
    const onRevert = vi.fn()

    useNotificationStore.getState().show('Notícia descartada', {
      action: { label: 'Reverter', onClick: onRevert },
      onExpire,
    })

    useNotificationStore.getState().undo()

    expect(onRevert).toHaveBeenCalledTimes(1)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('commits pending discard when a new toast replaces it', () => {
    const firstExpire = vi.fn()
    const secondExpire = vi.fn()

    useNotificationStore.getState().show('Primeira', { onExpire: firstExpire })
    useNotificationStore.getState().show('Segunda', { onExpire: secondExpire })

    expect(firstExpire).toHaveBeenCalledTimes(1)
    expect(secondExpire).not.toHaveBeenCalled()
  })
})

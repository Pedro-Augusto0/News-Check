import { AlertCircle, CheckCircle2, RotateCcw, Trash2, X } from 'lucide-react'
import { useNotificationStore } from '@/features/notifications'
import { cn } from '@/shared/ui/utils/cn'
import './notification-toast.css'

const TONE_ICONS = {
  success: CheckCircle2,
  info: Trash2,
  error: AlertCircle,
} as const

export function NotificationToast() {
  const message = useNotificationStore((s) => s.message)
  const action = useNotificationStore((s) => s.action)
  const durationMs = useNotificationStore((s) => s.durationMs)
  const tone = useNotificationStore((s) => s.tone)
  const undo = useNotificationStore((s) => s.undo)
  const dismiss = useNotificationStore((s) => s.dismiss)

  if (!message || !tone) return null

  const Icon = TONE_ICONS[tone]

  return (
    <div
      className={cn('notification-toast', `notification-toast--${tone}`)}
      style={{ ['--toast-duration' as string]: `${durationMs ?? 3500}ms` }}
      role="status"
      aria-live="polite"
    >
      <div className="notification-toast__shell">
        <div className="notification-toast__icon-wrap" aria-hidden>
          <Icon size={18} strokeWidth={2.1} />
        </div>

        <div className="notification-toast__content">
          <p className="notification-toast__message">{message}</p>
          {action && (
            <button type="button" className="notification-toast__action" onClick={undo}>
              <RotateCcw size={13} strokeWidth={2.2} aria-hidden />
              {action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          className="notification-toast__dismiss"
          onClick={dismiss}
          aria-label="Fechar aviso"
        >
          <X size={15} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <span className="notification-toast__progress" aria-hidden />
    </div>
  )
}

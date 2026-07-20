import { CheckCircle2, X } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import './notification-toast.css'

export function NotificationToast() {
  const message = useNotificationStore((s) => s.message)
  const dismiss = useNotificationStore((s) => s.dismiss)

  if (!message) return null

  return (
    <div className="notification-toast" role="status" aria-live="polite">
      <CheckCircle2 size={16} strokeWidth={2.1} className="notification-toast__icon" aria-hidden />
      <span className="notification-toast__message">{message}</span>
      <button
        type="button"
        className="notification-toast__dismiss"
        onClick={dismiss}
        aria-label="Fechar aviso"
      >
        <X size={14} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

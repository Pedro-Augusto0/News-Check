import { useEffect } from 'react'
import { ValidationLayout } from '@/app/validation-layout'
import { AppHeader } from '@/features/edition-session'
import { PageList } from '@/features/page-navigation'
import { PageViewer } from '@/features/page-viewer'
import { RightPanel } from '@/features/news-list'
import { NotificationToast } from '@/shared/ui/notification-toast'
import { useKeyboardShortcuts } from '@/features/page-viewer'
import { loadPublicationEditions } from '@/features/publication-api'
import { hydrateEditionNews } from '@/features/edition-session'
import { useSessionStore } from '@/features/edition-session'
import { useCropsStore } from '@/features/crops'
import './validator-page.css'

export function ValidatorPage() {
  const isLoading = useSessionStore((s) => s.isLoading)
  const error = useSessionStore((s) => s.error)
  const setEditions = useSessionStore((s) => s.setEditions)
  const setLoading = useSessionStore((s) => s.setLoading)
  const setError = useSessionStore((s) => s.setError)
  const hydrateFromEdition = useCropsStore((s) => s.hydrateFromEdition)

  useKeyboardShortcuts()

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setLoading(true)
      try {
        const editions = await loadPublicationEditions()
        if (cancelled) return

        setEditions(editions)
        const first = editions[0]
        if (first) {
          hydrateFromEdition(first)
          await hydrateEditionNews(first)
        }
        if (!cancelled) setLoading(false)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [setEditions, setLoading, setError, hydrateFromEdition])

  if (isLoading) {
    return (
      <div className="validator-page validator-page--loading">
        <div className="validator-page__spinner" />
        <p>Carregando sessão...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="validator-page validator-page--error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <>
      <ValidationLayout
        header={<AppHeader />}
        left={<PageList />}
        center={<PageViewer />}
        right={<RightPanel />}
      />
      <NotificationToast />
    </>
  )
}

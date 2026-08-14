import { useEffect } from 'react'
import { ValidationLayout } from '@/components/layout/ValidationLayout/validation-layout'
import { AppHeader } from '@/components/layout/AppHeader/app-header'
import { PageList } from '@/components/page-list/PageList'
import { PageViewer } from '@/components/page-viewer/PageViewer'
import { RightPanel } from '@/components/right-panel/RightPanel'
import { NotificationToast } from '@/components/ui/NotificationToast/notification-toast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { loadPublicationEditions } from '@/services/api/publications'
import { hydrateEditionNews } from '@/services/hydrateEditionNews'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
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

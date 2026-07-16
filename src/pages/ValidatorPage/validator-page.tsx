import { useEffect } from 'react'
import { ValidationLayout } from '@/components/layout/ValidationLayout/validation-layout'
import { AppHeader } from '@/components/layout/AppHeader/app-header'
import { PageList } from '@/components/page-list/PageList'
import { PageViewer } from '@/components/page-viewer/PageViewer'
import { RightPanel } from '@/components/right-panel/RightPanel'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { loadSession } from '@/services/loadSession'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import './validator-page.css'

export function ValidatorPage() {
  const isLoading = useSessionStore((s) => s.isLoading)
  const error = useSessionStore((s) => s.error)
  const setEditions = useSessionStore((s) => s.setEditions)
  const setLoading = useSessionStore((s) => s.setLoading)
  const setError = useSessionStore((s) => s.setError)
  const hydrateFromEdition = useCropsStore((s) => s.hydrateFromEdition)
  const hydrateNewsFromEdition = useNewsStore((s) => s.hydrateFromEdition)

  useKeyboardShortcuts()

  useEffect(() => {
    setLoading(true)
    loadSession()
      .then((payload) => {
        setEditions(payload.editions)
        const first = payload.editions[0]
        if (first) {
          hydrateFromEdition(first)
          hydrateNewsFromEdition(first)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      })
  }, [setEditions, setLoading, setError, hydrateFromEdition, hydrateNewsFromEdition])

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
    <ValidationLayout
      header={<AppHeader />}
      left={<PageList />}
      center={<PageViewer />}
      right={<RightPanel />}
    />
  )
}

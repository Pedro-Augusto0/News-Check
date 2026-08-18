import { useState, type CSSProperties, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRightCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuthStore, validateAccessToken } from '@/features/auth'
import './login-page.css'
import backgroundPng from '@/assets/background.png'
import logoClipping from '@/assets/logocs-aberto.png'

export function LoginPage() {
  const navigate = useNavigate()
  const existingToken = useAuthStore((state) => state.token)
  const setToken = useAuthStore((state) => state.setToken)
  const [token, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingToken) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) {
      setError('Informe o token de acesso')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await validateAccessToken(trimmed)
      setToken(trimmed)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível validar o token')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-root">
      <div
        className="auth-panel-left"
        style={
          {
            '--auth-background-url': `url(${backgroundPng})`,
          } as CSSProperties
        }
      >
        <div className="auth-panel-left__content">
          <header className="auth-panel-left__intro">
            <div className="auth-brand">
              <img
                className="auth-brand__logo"
                src={logoClipping}
                alt="CService"
              />
            </div>
          </header>
        </div>
      </div>

      <div className="auth-panel-right">
        <div className="auth-dots" aria-hidden />
        <div className="auth-card">
          <header className="auth-card__head">
            <h2 className="auth-card__title">Bem-vindo de volta!</h2>
            <p className="auth-card__subtitle">
              Informe o token de acesso para entrar na plataforma
            </p>
          </header>

          {error && (
            <p className="auth-banner auth-banner--error" role="alert">
              {error}
            </p>
          )}

          <LoginForm
            token={token}
            setToken={setTokenInput}
            showToken={showToken}
            setShowToken={setShowToken}
            busy={busy}
            onSubmit={handleSubmit}
          />
        </div>

        <p className="auth-footer-note">
          <span className="auth-footer-note__lead">
            Acesso restrito. O token é fornecido pelo administrador.
          </span>
        </p>
      </div>
    </div>
  )
}

interface LoginFormProps {
  token: string
  setToken: (value: string) => void
  showToken: boolean
  setShowToken: (value: boolean | ((previous: boolean) => boolean)) => void
  busy: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function LoginForm({
  token,
  setToken,
  showToken,
  setShowToken,
  busy,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="auth-field">
        <label className="auth-label" htmlFor="auth-login-token">
          Token
        </label>
        <div className="auth-input-shell">
          <KeyRound size={18} strokeWidth={1.8} aria-hidden />
          <input
            id="auth-login-token"
            type={showToken ? 'text' : 'password'}
            autoComplete="off"
            placeholder="Cole o token de acesso"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            disabled={busy}
          />
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowToken((visible) => !visible)}
            aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
            disabled={busy}
          >
            {showToken ? (
              <EyeOff size={18} strokeWidth={1.8} />
            ) : (
              <Eye size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      <button type="submit" className="auth-submit" disabled={busy}>
        <ArrowRightCircle size={20} strokeWidth={2} aria-hidden />
        {busy ? 'Validando...' : 'Entrar na plataforma'}
      </button>
    </form>
  )
}

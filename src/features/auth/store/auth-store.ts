import { create } from 'zustand'
import {
  clearStoredAccessToken,
  persistAccessToken,
  readStoredAccessToken,
} from '../storage'

interface AuthState {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readStoredAccessToken(),
  setToken: (token) => {
    persistAccessToken(token)
    set({ token })
  },
  clearToken: () => {
    clearStoredAccessToken()
    set({ token: null })
  },
}))

import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  defaultTab?: string
}

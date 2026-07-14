import { useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import './tabs.css'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}
interface TabsProps {
  items: TabItem[]
  defaultTab?: string
}

export function Tabs({ items, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? items[0]?.id ?? '')

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
  }, [])

  const activeContent = items.find((item) => item.id === activeTab)?.content

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={activeTab === item.id}
            className={cn('tabs__tab', activeTab === item.id && 'tabs__tab--active')}
            onClick={() => handleTabChange(item.id)}
          >
            {item.icon && <span className="tabs__tab-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="tabs__content" role="tabpanel">
        {activeContent}
      </div>
    </div>
  )
}

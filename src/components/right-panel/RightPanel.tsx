import { KeyRound, Newspaper } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs/tabs'
import { KeywordsTab } from './KeywordsTab'
import { CropsTab } from './CropsTab'
import { CropTextModal } from './CropTextModal'
import './right-panel.css'

export function RightPanel() {
  return (
    <div className="right-panel">
      <Tabs
        items={[
          {
            id: 'crops',
            label: 'Cortes',
            icon: <Newspaper size={15} strokeWidth={2} aria-hidden />,
            content: <CropsTab />,
          },
          {
            id: 'keywords',
            label: 'Palavras-chave',
            icon: <KeyRound size={15} strokeWidth={2} aria-hidden />,
            content: <KeywordsTab />,
          },
        ]}
        defaultTab="crops"
      />
      <CropTextModal />
    </div>
  )
}

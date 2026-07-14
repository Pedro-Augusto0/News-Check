import { Newspaper } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs/tabs'
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
            label: 'Notícias',
            icon: <Newspaper size={15} strokeWidth={2} aria-hidden />,
            content: <CropsTab />,
          }
        ]}
        defaultTab="crops"
      />
      <CropTextModal />
    </div>
  )
}

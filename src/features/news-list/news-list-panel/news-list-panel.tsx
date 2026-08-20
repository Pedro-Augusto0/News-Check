import { Newspaper } from 'lucide-react'
import { Tabs } from '@/shared/ui/tabs'
import { CropsTab } from '../news-list-tab'
import { CropTextModal } from '@/features/news-detail'
import './news-list-panel.css'

export function RightPanel() {
  return (
    <div className="right-panel sidebar-panel">
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

import { Apple, BarChart3, BookOpen, Dumbbell, House } from 'lucide-react'
import type { Tab } from '../types'

const items: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: '首页', icon: House },
  { id: 'workout', label: '训练', icon: Dumbbell },
  { id: 'nutrition', label: '饮食', icon: Apple },
  { id: 'progress', label: '进度', icon: BarChart3 },
  { id: 'library', label: '动作库', icon: BookOpen }
]

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-black/8 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
    {items.map(item => { const Icon = item.icon; const active = tab === item.id; return <button key={item.id} onClick={() => onChange(item.id)} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-bold ${active ? 'text-ink' : 'text-black/35'}`}><Icon size={20} strokeWidth={active ? 2.7 : 2} />{item.label}</button> })}
  </nav>
}

import { Bookmark, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { exercises } from '../data/exercises'
import type { AppData, Exercise } from '../types'
import { Card, PageHeader } from '../components/ui'

export default function Library({ data, onDetail, onFavorite }: { data: AppData; onDetail: (exercise: Exercise) => void; onFavorite: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState('全部')
  const filtered = exercises.filter(e => (muscle === '全部' || e.muscle === muscle) && e.name.includes(query))
  return <div>
    <PageHeader title="动作库" subtitle={`${exercises.length} 个基础动作`} action={<button title="添加自定义动作" className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white"><Plus size={20} /></button>} />
    <div className="flex gap-2"><label className="flex min-h-12 flex-1 items-center gap-2 rounded-lg border border-black/8 bg-white px-3"><Search size={18} className="text-black/35" /><input value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="搜索动作" /></label><button title="筛选" className="grid h-12 w-12 place-items-center rounded-lg border border-black/8 bg-white"><SlidersHorizontal size={18} /></button></div>
    <div className="scrollbar-none -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">{['全部','胸','背','腿','肩','二头','三头','腹','有氧'].map(item => <button key={item} onClick={() => setMuscle(item)} className={`min-h-10 shrink-0 rounded-md px-4 text-xs font-bold ${muscle === item ? 'bg-ink text-white' : 'bg-white'}`}>{item}</button>)}</div>
    <div className="mt-4 space-y-3">{filtered.map(exercise => <Card key={exercise.id} onClick={() => onDetail(exercise)} className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-paper text-lg font-extrabold">{exercise.muscle === '有氧' ? '氧' : exercise.muscle.slice(0,1)}</span>
      <span className="min-w-0 flex-1"><strong className="block">{exercise.name}</strong><small className="text-black/45">{exercise.equipment} · {exercise.difficulty} · 风险{exercise.risk}</small></span>
      <button onClick={e => { e.stopPropagation(); onFavorite(exercise.id) }} title="收藏" className="grid h-10 w-10 place-items-center"><Bookmark size={19} className={data.favoriteExercises.includes(exercise.id) ? 'fill-cobalt text-cobalt' : 'text-black/25'} /></button>
    </Card>)}</div>
  </div>
}

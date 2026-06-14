import { Activity, Check, ChevronDown, CircleAlert, Dumbbell, Info, RefreshCw, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import type { AppData, Exercise } from '../types'
import { Card, PageHeader, primaryButton, secondaryButton } from '../components/ui'

export default function Workout({ data, onComplete, onCompleteCardio, onLowerWeight, onReplace, onDetail, onLiveFeedback, onFinish }: { data: AppData; onComplete: (id: string) => void; onCompleteCardio: () => void; onLowerWeight: (exercise: Exercise) => void; onReplace: (exercise: Exercise) => void; onDetail: (exercise: Exercise) => void; onLiveFeedback: (message: string) => Promise<string>; onFinish: () => void }) {
  const [open, setOpen] = useState<string | null>(data.plan.exercises[0]?.id ?? null)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<{ role: 'user' | 'coach'; text: string }[]>([{ role: 'coach', text: '训练中遇到重量、动作感觉或疼痛问题，直接告诉我。' }])
  const [chatLoading, setChatLoading] = useState(false)
  const done = data.completedExercises.length
  const sendFeedback = async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChat(current => [...current, { role: 'user', text }])
    setChatInput(''); setChatLoading(true)
    try { const reply = await onLiveFeedback(text); setChat(current => [...current, { role: 'coach', text: reply }]) }
    catch { setChat(current => [...current, { role: 'coach', text: '分析失败，请稍后再试。' }]) }
    finally { setChatLoading(false) }
  }
  return <div>
    <PageHeader title="今日训练" subtitle={`${data.plan.focus} · ${data.plan.duration} 分钟`} action={<span className="rounded-md bg-lime px-3 py-2 text-xs font-bold">{done}/{data.plan.exercises.length}</span>} />
    <Card className="mb-4 !bg-ink text-white"><small className="font-bold text-lime">今日目标</small><h2 className="mt-2 text-xl font-extrabold">{data.plan.focus}</h2><p className="mt-2 text-sm leading-6 text-white/65">{data.plan.coachMessage}</p></Card>
    <Card className="mb-4 !border-cobalt/20 !bg-blue-50"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-cobalt text-white">AI</span><div><strong className="block text-sm">训练实时反馈</strong><small className="text-black/45">边练边调整重量、次数和动作</small></div></div><div className="mt-3 max-h-40 space-y-2 overflow-y-auto">{chat.map((item, index) => <div key={`${item.role}-${index}`} className={`rounded-lg px-3 py-2 text-xs leading-5 ${item.role === 'user' ? 'ml-8 bg-ink text-white' : 'mr-5 bg-white text-black/65'}`}>{item.text}</div>)}</div><div className="mt-3 flex gap-2"><input value={chatInput} onChange={event => setChatInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendFeedback()} className="min-h-11 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none" placeholder="例如：高位下拉55kg只能做3次" /><button disabled={!chatInput.trim() || chatLoading} onClick={sendFeedback} className="min-h-11 rounded-lg bg-cobalt px-4 text-xs font-bold text-white disabled:opacity-40">{chatLoading ? '分析中' : '发送'}</button></div></Card>
    {data.plan.warnings.map(w => <div key={w} className="mb-4 flex gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700"><CircleAlert size={20} className="shrink-0" />{w}</div>)}
    {data.plan.exercises.length === 0 ? <Card className="py-10 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-paper"><Dumbbell /></div><h2 className="mt-4 font-extrabold">今天安排恢复</h2><p className="mt-2 text-sm text-black/50">散步 20 分钟，完成拉伸并保持蛋白质摄入。</p></Card> :
    <div className="space-y-3">{data.plan.exercises.map((exercise, index) => {
      const completed = data.completedExercises.includes(exercise.id)
      const expanded = open === exercise.id
      return <Card key={exercise.id} className={completed ? '!border-green-200 !bg-green-50' : ''}>
        <button onClick={() => setOpen(expanded ? null : exercise.id)} className="flex w-full items-center gap-3 text-left">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md font-extrabold ${completed ? 'bg-green-500 text-white' : 'bg-ink text-lime'}`}>{completed ? <Check size={19} /> : index + 1}</span>
          <span className="min-w-0 flex-1"><strong className="block">{exercise.name}</strong><small className="text-black/45">{exercise.muscle} · {exercise.sets} 组 × {exercise.reps}</small></span>
          <ChevronDown size={19} className={`transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && <div className="mt-4 border-t border-black/7 pt-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-paper p-3"><small className="block text-black/40">建议重量</small><strong className="mt-1 block text-sm">{exercise.weight}</strong></div>
            <div className="rounded-md bg-paper p-3"><small className="block text-black/40">上次</small><strong className="mt-1 block text-sm">{exercise.lastWeight}</strong></div>
            <div className="rounded-md bg-paper p-3"><small className="block text-black/40">RPE</small><strong className="mt-1 block text-sm">7-8</strong></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2"><input aria-label="本次重量" inputMode="decimal" placeholder="实际重量" className="min-h-11 min-w-0 rounded-md border border-black/10 px-2 text-xs" /><input aria-label="实际次数" inputMode="numeric" placeholder="实际次数" className="min-h-11 min-w-0 rounded-md border border-black/10 px-2 text-xs" /><input aria-label="RPE" inputMode="numeric" placeholder="RPE 1-10" className="min-h-11 min-w-0 rounded-md border border-black/10 px-2 text-xs" /></div>
          <button onClick={() => onLowerWeight(exercise)} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-50 text-xs font-bold text-amber-800"><TrendingDown size={15} /> 当前建议重量拉不动，帮我降重</button>
          <p className="mt-3 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800">{exercise.cues}</p>
          <div className="mt-3 flex gap-2"><button onClick={() => onReplace(exercise)} className={`${secondaryButton} flex flex-1 items-center justify-center gap-2`}><RefreshCw size={15} /> 替换</button><button onClick={() => onDetail(exercise)} className={`${secondaryButton} flex flex-1 items-center justify-center gap-2`}><Info size={15} /> 要领</button></div>
          <button onClick={() => onComplete(exercise.id)} className={`${primaryButton} mt-3 flex w-full items-center justify-center gap-2 ${completed ? '!bg-green-600' : ''}`}><Check size={17} /> {completed ? '已完成' : '完成动作'}</button>
        </div>}
      </Card>
    })}</div>}
    {data.plan.cardio.enabled && <Card className={`mt-4 ${data.completedCardio ? '!border-green-200 !bg-green-50' : '!bg-[#e2f5f2]'}`}><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-[#168b80]"><Activity size={21} /></span><span className="flex-1"><small className="font-bold text-[#168b80]">训练后有氧</small><h3 className="mt-1 font-extrabold">{data.plan.cardio.type} · {data.plan.cardio.duration} 分钟</h3><p className="mt-1 text-xs leading-5 text-black/50">{data.plan.cardio.intensity} · {data.plan.cardio.target}</p></span></div><button onClick={onCompleteCardio} className={`mt-4 min-h-11 w-full rounded-lg text-sm font-bold text-white ${data.completedCardio ? 'bg-green-600' : 'bg-[#168b80]'}`}>{data.completedCardio ? '有氧已完成' : '完成有氧'}</button></Card>}
    <button onClick={onFinish} className={`${primaryButton} mt-5 w-full`}>结束并保存训练</button>
  </div>
}

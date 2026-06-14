import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, FileText, Minus } from 'lucide-react'
import type { AppData } from '../types'
import { Card, PageHeader, ProgressBar, primaryButton } from '../components/ui'

export default function Progress({ data, onReport, onCalendar }: { data: AppData; onReport: () => void; onCalendar: () => void }) {
  const [metric, setMetric] = useState<'weight' | 'waist'>('weight')
  const today = new Date().toISOString().slice(0, 10)
  const todayFoods = data.foods.filter(food => (food.loggedDate || today) === today)
  const calories = todayFoods.reduce((sum, food) => sum + food.calories, 0)
  const protein = todayFoods.reduce((sum, food) => sum + food.protein, 0)
  const workoutRate = data.plan.exercises.length ? Math.round(data.completedExercises.length / data.plan.exercises.length * 100) : 0
  const proteinRate = data.plan.proteinTarget && protein ? Math.min(100, Math.round(protein / data.plan.proteinTarget * 100)) : 0
  const calorieRate = data.plan.calorieTarget && calories ? Math.max(0, Math.round((1 - Math.abs(calories - data.plan.calorieTarget) / data.plan.calorieTarget) * 100)) : 0
  const sleepRate = data.checkin.sleepHours ? Math.min(100, Math.round(data.checkin.sleepHours / 8 * 100)) : 0
  const first = data.weightHistory[0]
  const last = data.weightHistory[data.weightHistory.length - 1]
  const weightChange = first && last ? last.weight - first.weight : 0
  const waistChange = first && last ? last.waist - first.waist : 0

  return <div>
    <PageHeader title="进度" subtitle="仅显示已记录数据" action={<button onClick={onCalendar} title="查看 7 天计划" className="grid h-11 w-11 place-items-center rounded-lg bg-white"><CalendarDays size={20} /></button>} />
    <div className="mb-4 grid grid-cols-2 gap-3"><Card><span className="text-xs text-black/40">当前体重</span><strong className="mt-1 block text-2xl">{last?.weight ?? data.profile.weightKg}<small className="ml-1 text-sm">kg</small></strong><span className="mt-2 flex items-center gap-1 text-xs text-black/45"><Minus size={14} />{first && last ? `${weightChange.toFixed(1)} kg` : '暂无趋势'}</span></Card><Card><span className="text-xs text-black/40">腰围</span><strong className="mt-1 block text-2xl">{last?.waist ?? 0}<small className="ml-1 text-sm">cm</small></strong><span className="mt-2 flex items-center gap-1 text-xs text-black/45"><Minus size={14} />{first && last ? `${waistChange.toFixed(1)} cm` : '暂无记录'}</span></Card></div>
    <Card>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold">身体趋势</h2><div className="flex rounded-md bg-black/5 p-1 text-xs font-bold"><button onClick={() => setMetric('weight')} className={`rounded px-3 py-1.5 ${metric === 'weight' ? 'bg-white shadow-sm' : 'text-black/40'}`}>体重</button><button onClick={() => setMetric('waist')} className={`rounded px-3 py-1.5 ${metric === 'waist' ? 'bg-white shadow-sm' : 'text-black/40'}`}>腰围</button></div></div>
      {data.weightHistory.length ? <div className="h-52 w-full"><ResponsiveContainer><AreaChart data={data.weightHistory} margin={{ left: -20, right: 4 }}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#275df5" stopOpacity={.35}/><stop offset="1" stopColor="#275df5" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8ebe6" /><XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} /><YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tickLine={false} axisLine={false} fontSize={10} /><Tooltip /><Area type="monotone" dataKey={metric} stroke="#275df5" strokeWidth={3} fill="url(#chartFill)" /></AreaChart></ResponsiveContainer></div> : <div className="grid h-52 place-items-center rounded-lg bg-paper text-center"><div><strong className="text-sm">暂无身体数据</strong><p className="mt-1 text-xs text-black/40">记录体重和腰围后显示趋势</p></div></div>}
    </Card>
    <Card className="mt-4"><h2 className="font-extrabold">今日执行</h2><div className="mt-5 space-y-5">{[['训练完成率',workoutRate,'bg-ink'],['蛋白质达标率',proteinRate,'bg-cobalt'],['热量控制进度',calorieRate,'bg-coral'],['睡眠完成率',sleepRate,'bg-[#32a89d]']].map(([name, value, color]) => <div key={String(name)}><div className="mb-2 flex justify-between text-sm"><span>{name}</span><strong>{value}%</strong></div><ProgressBar value={Number(value)} color={String(color)} /></div>)}</div></Card>
    <Card className="mt-4"><div className="mb-4 flex items-center gap-2"><FileText size={19} /><h2 className="font-extrabold">周报</h2></div><p className="text-sm leading-6 text-black/55">{data.weightHistory.length || todayFoods.length || data.completedExercises.length ? '根据已有记录生成周报；缺失项目会按暂无数据处理。' : '当前没有足够记录。完成饮食、训练或身体数据记录后再生成周报。'}</p><button disabled={!data.weightHistory.length && !todayFoods.length && !data.completedExercises.length} onClick={onReport} className={`${primaryButton} mt-4 w-full`}>生成完整周报</button></Card>
  </div>
}

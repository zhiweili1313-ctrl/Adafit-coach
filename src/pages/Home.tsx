import { Bot, CheckCircle2, Circle, ClipboardCheck, Dumbbell, Settings, Sparkles } from 'lucide-react'
import type { AppData, Tab } from '../types'
import { dailyScore } from '../services/ruleEngine'
import { Card, Metric } from '../components/ui'

export default function Home({ data, onTab, onCheckin, onSettings }: { data: AppData; onTab: (tab: Tab) => void; onCheckin: () => void; onSettings: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const totals = data.foods.filter(food => (food.loggedDate || today) === today).reduce((a, f) => ({ calories: a.calories + f.calories, protein: a.protein + f.protein }), { calories: 0, protein: 0 })
  const score = dailyScore(totals.calories, totals.protein, data.checkin.waterMl, data.completedExercises.length, data.plan.exercises.length, data.checkin.sleepHours, { calories: data.plan.calorieTarget, protein: data.plan.proteinTarget, water: data.plan.waterTarget })
  const intensity = { low: '低强度', medium: '中等强度', high: '高强度' }[data.plan.intensity]
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
  const minimumTasks = [
    { label: `蛋白质至少 ${Math.max(100, data.plan.proteinTarget - 20)}g`, done: totals.protein >= Math.max(100, data.plan.proteinTarget - 20) },
    { label: `饮水至少 ${Math.min(2000, data.plan.waterTarget)}ml`, done: data.checkin.waterMl >= Math.min(2000, data.plan.waterTarget) },
    { label: data.plan.trainingType === 'Rest' ? '完成今日状态记录' : '至少完成 1 个训练动作', done: data.plan.trainingType === 'Rest' ? data.checkin.sleepHours > 0 : data.completedExercises.length > 0 }
  ]
  const regularTasks = [
    { label: `热量控制在 ${data.plan.calorieTarget} kcal 左右`, done: totals.calories > 0 && Math.abs(totals.calories - data.plan.calorieTarget) <= 150 },
    { label: `蛋白质达到 ${data.plan.proteinTarget}g`, done: totals.protein >= data.plan.proteinTarget },
    { label: `饮水达到 ${data.plan.waterTarget}ml`, done: data.checkin.waterMl >= data.plan.waterTarget },
    { label: '完成全部力量动作', done: data.plan.exercises.length > 0 && data.completedExercises.length >= data.plan.exercises.length },
    ...(data.plan.cardio.enabled ? [{ label: `完成 ${data.plan.cardio.duration} 分钟${data.plan.cardio.type}`, done: data.completedCardio }] : [])
  ]
  const minimumDone = minimumTasks.every(task => task.done)
  const allDone = minimumDone && regularTasks.every(task => task.done)

  return <div>
    <header className="mb-5 flex items-center justify-between">
      <div><div className="text-sm text-black/45">{date}</div><h1 className="mt-1 text-2xl font-extrabold">早上好，{data.profile.name}</h1></div>
      <button onClick={onSettings} title="设置" className="grid h-11 w-11 place-items-center rounded-lg bg-white shadow-sm"><Settings size={20} /></button>
    </header>

    <Card className="overflow-hidden !border-0 !bg-ink !p-0 text-white">
      <div className="flex items-start justify-between p-5">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold text-lime"><Sparkles size={14} /> 今日目标</div><h2 className="text-2xl font-extrabold">{data.plan.focus}</h2><p className="mt-1 text-sm text-white/55">{data.plan.trainingType} · {intensity} · {data.plan.duration} 分钟</p></div>
        <div className="relative grid h-16 w-16 place-items-center rounded-full bg-white/10"><strong className="text-xl">{score}</strong><span className="absolute -bottom-4 text-[10px] text-white/45">今日分数</span></div>
      </div>
      <div className="border-t border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/75"><p>{data.plan.coachMessage}</p><p className="mt-2 text-xs text-white/45">调整依据：{data.plan.reason}</p>{data.plan.cardio.enabled && <p className="mt-2 font-bold text-lime">有氧：{data.plan.cardio.type} {data.plan.cardio.duration} 分钟</p>}</div>
      <button onClick={() => onTab('workout')} className="m-4 mt-0 flex min-h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-lg bg-lime font-extrabold text-ink"><Dumbbell size={18} /> 开始训练</button>
    </Card>

    <Card onClick={onCheckin} className="mt-4 flex items-center gap-4 !bg-[#fff2dd]"><span className="grid h-11 w-11 place-items-center rounded-lg bg-white"><ClipboardCheck size={20} /></span><span><strong className="block">今日状态</strong><small className="text-black/45">疲劳 {data.checkin.fatigue}/5 · 睡眠 {data.checkin.sleepHours}h · 点击更新并生成计划</small></span></Card>

    <Card className="mt-4">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold">今日摄入</h3><button onClick={() => onTab('nutrition')} className="text-xs font-bold text-cobalt">去记录</button></div>
      <div className="space-y-4">
        <Metric label="热量" value={totals.calories} target={data.plan.calorieTarget} unit=" kcal" color="bg-coral" />
        <Metric label="蛋白质" value={totals.protein} target={data.plan.proteinTarget} unit="g" color="bg-cobalt" />
        <Metric label="水分" value={data.checkin.waterMl} target={data.plan.waterTarget} unit="ml" color="bg-[#32a89d]" />
      </div>
    </Card>

    <Card className="mt-4">
      <div className="flex items-center gap-2 text-xs font-bold text-cobalt"><Bot size={15} /> 教练提醒</div>
      <p className="mt-3 text-sm leading-6 text-black/65">{totals.protein < data.plan.proteinTarget - 30 ? `目前还差 ${data.plan.proteinTarget - totals.protein}g 蛋白质，晚餐优先鱼、瘦肉或低脂奶。` : '蛋白质进度良好，保持总热量稳定。'}</p>
    </Card>

    <Card className={`mt-4 ${minimumDone ? '!border-green-200 !bg-green-50' : ''}`}>
      {allDone ? <div className="flex items-center gap-3"><CheckCircle2 className="text-green-600" /><div><strong className="block text-green-800">恭喜你，今天的全部任务已完成</strong><small className="text-green-700/70">保持恢复，明天继续按计划推进。</small></div></div> : minimumDone ? <div className="flex items-center gap-3"><CheckCircle2 className="text-green-600" /><div><strong className="block text-green-800">你已完成今日最低任务</strong><small className="text-green-700/70">还有 {regularTasks.filter(task => !task.done).length} 项完整目标可以继续完成。</small></div></div> : <><div className="mb-3"><span className="text-xs text-black/40">今日任务</span><h3 className="mt-1 font-extrabold">先完成最低任务</h3></div><div className="space-y-2">{minimumTasks.map(task => <TaskRow key={task.label} {...task} minimum />)}{regularTasks.map(task => <TaskRow key={task.label} {...task} />)}</div></>}
    </Card>
  </div>
}

function TaskRow({ label, done, minimum = false }: { label: string; done: boolean; minimum?: boolean }) {
  return <div className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${minimum ? 'bg-green-50' : 'bg-white border border-black/5'}`}>{done ? <CheckCircle2 size={18} className="shrink-0 text-green-600" /> : <Circle size={18} className="shrink-0 text-black/20" />}<span className={`flex-1 ${done ? 'text-black/40 line-through' : ''}`}>{label}</span>{minimum && <small className="font-bold text-green-700">最低</small>}</div>
}

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Dumbbell, Moon, Sparkles, UserRound } from 'lucide-react'
import type { Profile } from '../types'
import { calculateTargets, generateRulePlan } from '../services/ruleEngine'
import { fieldClass, primaryButton, Segmented } from './ui'

export default function Onboarding({ profile, onComplete }: { profile: Profile; onComplete: (profile: Profile) => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(profile)
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm(current => ({ ...current, [key]: value }))
  const icons = [UserRound, Sparkles, Dumbbell, Moon, Check]
  const Icon = icons[step - 1]

  const finish = () => {
    const targets = calculateTargets(form)
    const next = { ...form, calorieTarget: targets.calories, proteinTarget: targets.protein, waterTarget: targets.water }
    generateRulePlan(next, { sleepHours: 7, stress: 3, fatigue: 2, hunger: 3, motivation: '可以练', availableMinutes: next.sessionDuration, soreness: '', pain: '', ateOut: false, drankAlcohol: false, wantsCardio: false, cardioType: '跑步机坡度走', waterMl: 0, note: '' })
    onComplete(next)
  }

  return <main className="mx-auto min-h-dvh max-w-[430px] bg-paper px-5 py-6">
    <div className="mb-8 flex items-center justify-between">
      <div><div className="text-xs font-bold uppercase text-black/40">Adaptive Fit Coach</div><div className="mt-1 text-sm">建立你的自适应计划</div></div>
      <span className="text-sm font-bold">{step} / 5</span>
    </div>
    <div className="mb-8 grid grid-cols-5 gap-2">{[1,2,3,4,5].map(item => <div key={item} className={`h-1.5 rounded-full ${item <= step ? 'bg-ink' : 'bg-black/10'}`} />)}</div>
    <div className="mb-6 grid h-14 w-14 place-items-center rounded-lg bg-lime"><Icon size={26} /></div>

    {step === 1 && <div className="space-y-4">
      <div><h1 className="text-3xl font-extrabold">先认识你</h1><p className="mt-2 text-sm text-black/50">这些信息用于估算能量与训练负荷。</p></div>
      <label className="block text-sm font-bold">姓名<input className={fieldClass} value={form.name} onChange={e => update('name', e.target.value)} /></label>
      <div><div className="mb-2 text-sm font-bold">性别</div><Segmented options={['男','女','其他']} value={form.gender} onChange={v => update('gender', v)} /></div>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-bold">年龄<input type="number" className={fieldClass} value={form.age || ''} onFocus={event => event.currentTarget.select()} onChange={e => update('age', +e.target.value)} /></label>
        <label className="text-sm font-bold">身高 cm<input type="number" className={fieldClass} value={form.heightCm || ''} onFocus={event => event.currentTarget.select()} onChange={e => update('heightCm', +e.target.value)} /></label>
        <label className="text-sm font-bold">体重 kg<input type="number" className={fieldClass} value={form.weightKg || ''} onFocus={event => event.currentTarget.select()} onChange={e => update('weightKg', +e.target.value)} /></label>
      </div>
      <label className="block text-sm font-bold">目标体重 kg<input type="number" className={fieldClass} value={form.targetWeightKg || ''} onFocus={event => event.currentTarget.select()} onChange={e => update('targetWeightKg', +e.target.value)} /></label>
    </div>}

    {step === 2 && <div className="space-y-5">
      <div><h1 className="text-3xl font-extrabold">明确目标</h1><p className="mt-2 text-sm text-black/50">计划会随执行情况动态变化。</p></div>
      <div><div className="mb-2 text-sm font-bold">目标类型</div><div className="grid grid-cols-2 gap-2">{(['减脂','增肌','增肌减脂','维持体型','提升体能'] as const).map(v => <button key={v} onClick={() => update('goalType', v)} className={`min-h-12 rounded-lg border text-sm font-bold ${form.goalType === v ? 'border-ink bg-ink text-white' : 'border-black/10 bg-white'}`}>{v}</button>)}</div></div>
      <label className="block text-sm font-bold">目标周期：{form.goalWeeks} 周<input type="range" min="4" max="24" step="2" className="mt-3 w-full accent-black" value={form.goalWeeks} onChange={e => update('goalWeeks', +e.target.value)} /></label>
      <label className="block text-sm font-bold">目标身材<textarea className={`${fieldClass} min-h-24 py-3`} value={form.desiredResult} onChange={e => update('desiredResult', e.target.value)} placeholder="例如：清晰明显的肌肉线条、肩背更宽、体态紧致" /><small className="mt-1 block font-normal leading-5 text-black/40">不要只填写体重。AI 会同时围绕外形、肌肉线条和体能安排计划。</small></label>
      <label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">希望快速见效<input type="checkbox" className="h-5 w-5 accent-black" checked={form.quickResult} onChange={e => update('quickResult', e.target.checked)} /></label>
    </div>}

    {step === 3 && <div className="space-y-5">
      <div><h1 className="text-3xl font-extrabold">训练条件</h1><p className="mt-2 text-sm text-black/50">没有某个器械时，系统会自动替换。</p></div>
      <div><div className="mb-2 text-sm font-bold">训练经验</div><Segmented options={['新手','练过一点','中级','高级']} value={form.trainingLevel} onChange={v => update('trainingLevel', v)} /></div>
      <label className="block text-sm font-bold">每周训练：{form.weeklyTrainingDays} 天<input type="range" min="1" max="7" className="mt-3 w-full accent-black" value={form.weeklyTrainingDays} onChange={e => update('weeklyTrainingDays', +e.target.value)} /></label>
      <div><div className="mb-2 text-sm font-bold">每次时长</div><Segmented options={['20','40','60','90']} value={String(form.sessionDuration)} onChange={v => update('sessionDuration', +v)} /></div>
      <label className="block text-sm font-bold">训练地点<select className={fieldClass} value={form.trainingLocation} onChange={e => update('trainingLocation', e.target.value)}><option>健身房</option><option>家里</option><option>宿舍</option><option>户外</option></select></label>
      <label className="block text-sm font-bold">不适或受伤部位<textarea className={`${fieldClass} min-h-20 py-3`} placeholder="没有可留空" value={form.injuryNotes} onChange={e => update('injuryNotes', e.target.value)} /></label>
    </div>}

    {step === 4 && <div className="space-y-5">
      <div><h1 className="text-3xl font-extrabold">生活节奏</h1><p className="mt-2 text-sm text-black/50">恢复能力决定今天该练多重。</p></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">通常入睡<input type="time" className={fieldClass} value={form.sleepTime} onChange={e => update('sleepTime', e.target.value)} /></label><label className="text-sm font-bold">通常起床<input type="time" className={fieldClass} value={form.wakeTime} onChange={e => update('wakeTime', e.target.value)} /></label></div>
      <label className="block text-sm font-bold">工作/学习压力：{form.workStress} / 5<input type="range" min="1" max="5" className="mt-3 w-full accent-black" value={form.workStress} onChange={e => update('workStress', +e.target.value)} /></label>
      <label className="block text-sm font-bold">每天步数<input type="number" step="500" className={fieldClass} value={form.dailySteps} onChange={e => update('dailySteps', +e.target.value)} /></label>
      <label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">饮食规律<input type="checkbox" className="h-5 w-5 accent-black" checked={form.regularDiet} onChange={e => update('regularDiet', e.target.checked)} /></label>
      <label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">经常外食<input type="checkbox" className="h-5 w-5 accent-black" checked={form.eatsOutOften} onChange={e => update('eatsOutOften', e.target.checked)} /></label>
    </div>}

    {step === 5 && <div className="space-y-5">
      <div><h1 className="text-3xl font-extrabold">计划已就绪</h1><p className="mt-2 text-sm text-black/50">以下目标由基础代谢、活动量与目标综合计算。</p></div>
      {(() => { const target = calculateTargets(form); return <div className="overflow-hidden rounded-xl bg-ink text-white">
        <div className="border-b border-white/10 p-5"><div className="text-xs text-white/50">首个训练周期</div><div className="mt-2 text-3xl font-extrabold">{form.goalWeeks} 周 · {form.goalType}</div></div>
        <div className="grid grid-cols-3 divide-x divide-white/10 p-5 text-center"><div><strong className="block text-xl text-lime">{target.calories}</strong><span className="text-xs text-white/50">kcal</span></div><div><strong className="block text-xl text-lime">{target.protein}g</strong><span className="text-xs text-white/50">蛋白质</span></div><div><strong className="block text-xl text-lime">{target.water / 1000}L</strong><span className="text-xs text-white/50">饮水</span></div></div>
      </div> })()}
      <div className="rounded-lg border border-black/8 bg-white p-4 text-sm leading-7"><strong>第 1 周重点</strong><p className="text-black/55">建立训练节奏，不追求极限重量；完成每次训练反馈，系统会从第 2 周开始自适应调整。</p></div>
    </div>}

    <div className="mt-9 flex gap-3">
      {step > 1 && <button onClick={() => setStep(s => s - 1)} className="grid h-12 w-12 place-items-center rounded-lg border border-black/10 bg-white"><ArrowLeft size={20} /></button>}
      <button onClick={() => step < 5 ? setStep(s => s + 1) : finish()} disabled={!form.name || (step === 2 && !form.desiredResult.trim())} className={`${primaryButton} flex flex-1 items-center justify-center gap-2`}>{step < 5 ? <>继续 <ArrowRight size={18} /></> : <>进入计划 <Check size={18} /></>}</button>
    </div>
  </main>
}

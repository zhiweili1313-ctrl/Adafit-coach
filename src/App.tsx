import { useEffect, useRef, useState } from 'react'
import { Bot, Cloud, Download, LogOut, Maximize2, Minimize2, RefreshCw, Save, Search, Upload } from 'lucide-react'
import type { AppData, Exercise, FoodLog, NutritionPlan, Tab } from './types'
import { exportData, getActiveUsername, loadData, loginLocalUser, logoutLocalUser, registerLocalUser, saveData } from './services/storage'
import { calculateTargets, generateRulePlan } from './services/ruleEngine'
import { analyzeLiveWorkoutFeedback, estimateFoodNutrition, generateDailyPlan, generatePersonalizedNutritionPlan, generateSevenDaySchedule, generateWorkoutAdjustment, processCoachMessage, testAIConnection, type AISettings } from './services/aiCoachService'
import { supabaseEnabled } from './services/supabase'
import { supabase } from './services/supabase'
import { loadAllCloudData, saveCloudData, saveProfile, saveNutritionLog, saveDailyCheckin, saveBodyMetricsEntry, saveWorkoutSession, saveWeeklyReport, saveCoachMessage, signInWithPassword, signOut, signUpWithPassword } from './services/cloudSync'
import BottomNav from './components/BottomNav'
import Onboarding from './components/Onboarding'
import Home from './pages/Home'
import Workout from './pages/Workout'
import Nutrition from './pages/Nutrition'
import Progress from './pages/Progress'
import Library from './pages/Library'
import { Card, fieldClass, Modal, primaryButton, secondaryButton, Segmented } from './components/ui'
import AccountGate from './components/AccountGate'

type ModalName = 'checkin' | 'coach' | 'settings' | 'food' | 'detail' | 'replace' | 'report' | 'calendar' | 'finishWorkout' | 'nutritionPlan' | null

export default function App() {
  const publicUserMode = import.meta.env.VITE_PUBLIC_USER_MODE === 'true'
  const [localUsername, setLocalUsername] = useState(() => getActiveUsername())
  const [data, setData] = useState<AppData>(() => loadData(getActiveUsername()))
  const [tab, setTab] = useState<Tab>('home')
  const [modal, setModal] = useState<ModalName>(null)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [selectedFood, setSelectedFood] = useState<FoodLog | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [message, setMessage] = useState('')
  const [coachReply, setCoachReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [cloudUser, setCloudUser] = useState<{ id: string; email?: string } | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseEnabled)
  const [syncStatus, setSyncStatus] = useState('本地已保存')
  const [aiTestStatus, setAiTestStatus] = useState('')
  const cloudReady = useRef(false)
  const [ai, setAi] = useState<AISettings>(() => {
    try { return JSON.parse(localStorage.getItem('fit-ai-settings') || '') } catch { return { provider: 'None', apiKey: '', model: 'deepseek-chat' } }
  })
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveData(data, localUsername), [data, localUsername])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const user = sessionData.session?.user
      if (!user) { cloudReady.current = true; setAuthReady(true); return }
      setCloudUser({ id: user.id, email: user.email })
      const merged = await loadAllCloudData(user.id)
      if (merged) setData(current => ({ ...current, ...merged, checkin: { ...current.checkin, ...merged.checkin }, plan: { ...current.plan, ...merged.plan, cardio: { ...current.plan.cardio, ...merged.plan?.cardio } } }))
      cloudReady.current = true
      setAuthReady(true)
      setSyncStatus('云端已同步')
    }).catch(() => { cloudReady.current = true; setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user
      if (user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        loadAllCloudData(user.id).then(merged => {
          if (merged) setData(current => ({ ...current, ...merged, checkin: { ...current.checkin, ...merged.checkin }, plan: { ...current.plan, ...merged.plan, cardio: { ...current.plan.cardio, ...merged.plan?.cardio } } }))
        }).catch(() => {})
        setCloudUser({ id: user.id, email: user.email })
      } else if (!user) {
        setCloudUser(null)
      }
      setAuthReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!cloudUser || !cloudReady.current) return
    setSyncStatus('正在同步')
    const timer = window.setTimeout(() => {
      saveCloudData(cloudUser.id, data).then(() => setSyncStatus('云端已同步')).catch(() => setSyncStatus('等待网络恢复'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [data, cloudUser])
  const update = (patch: Partial<AppData>) => setData(current => ({ ...current, ...patch }))

  if (!authReady) return <div className="grid min-h-dvh place-items-center bg-paper text-sm text-black/45">正在检查登录状态...</div>
  if (supabaseEnabled && !cloudUser) return <AccountGate cloudEnabled onLogin={async (account, password) => { const user = await signInWithPassword(account, password); if (user) { const merged = await loadAllCloudData(user.id); if (merged) setData(current => ({ ...current, ...merged, checkin: { ...current.checkin, ...merged.checkin }, plan: { ...current.plan, ...merged.plan, cardio: { ...current.plan.cardio, ...merged.plan?.cardio } } })); setCloudUser({ id: user.id, email: user.email }) } }} onRegister={async (account, password, name) => { const result = await signUpWithPassword(account, password, name); if (!result.session || !result.user) throw new Error('注册成功，请先到邮箱完成验证，再返回登录'); setCloudUser({ id: result.user.id, email: result.user.email }); setData(current => ({ ...current, profile: { ...current.profile, name } })) }} />
  if (!supabaseEnabled && !localUsername) return <AccountGate cloudEnabled={false} onLogin={async (account, password) => { const active = await loginLocalUser(account, password); setLocalUsername(active); setData(loadData(active)) }} onRegister={async (account, password, name) => { const active = await registerLocalUser(account, password, name); setLocalUsername(active); setData(loadData(active)) }} />

  if (!data.onboarded) return <Onboarding profile={data.profile} onComplete={async profile => {
    const checkin = { ...data.checkin, availableMinutes: profile.sessionDuration }
    update({ profile, checkin, onboarded: true })
    if (cloudUser) {
      saveProfile(cloudUser.id, profile).catch(() => {})
      const todayStr = new Date().toISOString().slice(0, 10)
      saveBodyMetricsEntry(cloudUser.id, todayStr, profile.weightKg).catch(() => {})
    }
    try {
      const plan = await generateDailyPlan(profile, {}, checkin, '根据首次问卷生成初始训练、营养和饮水计划', ai)
      const weeklySchedule = await generateSevenDaySchedule(profile, checkin, {}, ai)
      update({ profile, checkin, plan, weeklySchedule, onboarded: true })
    } catch { update({ profile, checkin, onboarded: true }) }
  }} />

  const saveCheckinAndGenerate = async (checkin: AppData['checkin']) => {
    setLoading(true)
    const todayStr = new Date().toISOString().slice(0, 10)
    if (cloudUser) saveDailyCheckin(cloudUser.id, checkin, todayStr).catch(() => {})
    try {
      const plan = await generateDailyPlan(data.profile, { foods: data.foods, weights: data.weightHistory, previousPlan: data.plan }, checkin, '根据我刚更新的今日状态重新生成今天的训练和有氧计划', ai)
      const weeklySchedule = await generateSevenDaySchedule(data.profile, checkin, { foods: data.foods, weights: data.weightHistory }, ai)
      update({ checkin, plan, weeklySchedule, completedExercises: [], completedCardio: false, adjustmentLogs: [...data.adjustmentLogs, { date: new Date().toISOString(), reason: '今日状态更新', change: `${plan.trainingType} / ${plan.intensity} / 有氧${plan.cardio.duration}分钟` }] })
      setModal(null)
    } catch (error) {
      if (checkin.pain.trim()) {
        const safetyPlan = generateRulePlan(data.profile, checkin)
        update({ checkin, plan: safetyPlan, completedExercises: [], completedCardio: false })
      } else update({ checkin })
      setCoachReply(`AI 暂时不可用，今日状态已保存，但训练计划未自动改动：${error instanceof Error ? error.message : '未知错误'}`)
      setModal(null)
    } finally { setLoading(false) }
  }

  const talkToCoach = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const result = await processCoachMessage(data.profile, { foods: data.foods, weights: data.weightHistory }, data.checkin, message, ai)
      const newFoods: FoodLog[] = result.foods.map(food => ({ ...food, id: crypto.randomUUID(), loggedDate: new Date().toISOString().slice(0, 10) }))
      const patch: Partial<AppData> = {}
      if (newFoods.length) patch.foods = [...data.foods, ...newFoods]
      if (result.plan) {
        patch.plan = result.plan
        patch.adjustmentLogs = [...data.adjustmentLogs, { date: new Date().toISOString(), reason: message, change: `${result.plan.trainingType} / ${result.plan.intensity}` }]
      }
      if (Object.keys(patch).length) update(patch)
      const foodSummary = newFoods.length ? `\n已加入 ${newFoods.length} 条饮食记录：${newFoods.map(food => `${food.name} ${food.calories} kcal`).join('；')}` : ''
      const reply = `${result.reply}${foodSummary}`
      if (cloudUser) {
        saveCoachMessage(cloudUser.id, 'user', message).catch(() => {})
        saveCoachMessage(cloudUser.id, 'assistant', reply).catch(() => {})
      }
      setCoachReply(reply)
      setMessage('')
    } catch (error) {
      setCoachReply(error instanceof Error ? error.message : 'AI 分析失败，请重试')
    } finally { setLoading(false) }
  }

  const renderPage = () => {
    if (tab === 'home') return <Home data={data} onTab={setTab} onCheckin={() => setModal('checkin')} onSettings={() => setModal('settings')} />
    if (tab === 'workout') return <Workout data={data} onComplete={id => update({ completedExercises: data.completedExercises.includes(id) ? data.completedExercises.filter(x => x !== id) : [...data.completedExercises, id] })} onCompleteCardio={() => update({ completedCardio: !data.completedCardio })} onLiveFeedback={async message => {
      const result = await analyzeLiveWorkoutFeedback(data.profile, data.plan, message, ai)
      if (result.exerciseId && (result.weight || result.sets || result.reps)) {
        const exercises = data.plan.exercises.map(exercise => exercise.id === result.exerciseId ? { ...exercise, weight: result.weight || exercise.weight, sets: result.sets || exercise.sets, reps: result.reps || exercise.reps } : exercise)
        update({ plan: { ...data.plan, exercises }, adjustmentLogs: [...data.adjustmentLogs, { date: new Date().toISOString(), reason: message, change: result.reply }] })
      }
      return result.reply
    }} onFinish={() => setModal('finishWorkout')} onLowerWeight={exercise => {
      const current = Number.parseFloat(exercise.weight) || 0
      const next = Math.max(0, current - (exercise.equipment === '哑铃' ? 2 : 5))
      const exercises = data.plan.exercises.map(item => item.id === exercise.id ? { ...item, weight: `${next} kg` } : item)
      update({ plan: { ...data.plan, exercises }, adjustmentLogs: [...data.adjustmentLogs, { date: new Date().toISOString(), reason: `${exercise.name} 当前重量无法完成`, change: `建议重量从 ${exercise.weight} 降到 ${next} kg` }] })
    }} onReplace={exercise => { setSelected(exercise); setModal('replace') }} onDetail={exercise => { setSelected(exercise); setModal('detail') }} />
    if (tab === 'nutrition') return <Nutrition data={data} onAdd={() => { setSelectedFood(null); setModal('food') }} onEdit={food => { setSelectedFood(food); setModal('food') }} onDelete={id => update({ foods: data.foods.filter(f => f.id !== id) })} onWaterChange={waterMl => update({ checkin: { ...data.checkin, waterMl } })} onNutritionPlan={async () => { setNutritionPlan(null); setModal('nutritionPlan'); setLoading(true); const today = new Date().toISOString().slice(0, 10); const result = await generatePersonalizedNutritionPlan(data.profile, data.checkin, data.plan, data.foods.filter(food => (food.loggedDate || today) === today), ai); setNutritionPlan(result); setLoading(false) }} />
    if (tab === 'progress') return <Progress data={data} onReport={() => setModal('report')} onCalendar={() => setModal('calendar')} />
    return <Library data={data} onDetail={exercise => { setSelected(exercise); setModal('detail') }} onFavorite={id => update({ favoriteExercises: data.favoriteExercises.includes(id) ? data.favoriteExercises.filter(x => x !== id) : [...data.favoriteExercises, id] })} />
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try { const parsed = JSON.parse(await file.text()); setData({ ...data, ...parsed }); alert('数据导入成功') } catch { alert('JSON 文件无效') }
  }

  return <div className="min-h-dvh bg-[#e9ece7]">
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-paper px-5 pb-28 pt-6 shadow-app">{renderPage()}</main>
    <BottomNav tab={tab} onChange={setTab} />

    {modal === 'checkin' && <CheckinModal data={data} loading={loading} onSave={saveCheckinAndGenerate} onClose={() => setModal(null)} />}
    {modal === 'food' && <FoodModal ai={ai} initialFood={selectedFood} onSave={food => { update({ foods: selectedFood ? data.foods.map(item => item.id === food.id ? food : item) : [...data.foods, food] }); if (cloudUser) saveNutritionLog(cloudUser.id, food).catch(() => {}); setSelectedFood(null); setModal(null) }} onClose={() => { setSelectedFood(null); setModal(null) }} />}
    {modal === 'coach' && <Modal title="AI 教练" onClose={() => setModal(null)}>
      <div className="mb-4 rounded-lg bg-cobalt p-4 text-white"><div className="flex items-center gap-2 text-sm font-bold"><Bot size={18} /> 当前读取范围</div><p className="mt-2 text-xs leading-5 text-white/65">个人档案、今日状态、近期饮食、体重趋势、器械和疼痛记录。</p></div>
      <textarea className={`${fieldClass} min-h-32 py-3`} value={message} onChange={e => setMessage(e.target.value)} placeholder="例如：早上吃了两个鸡蛋和一杯牛奶，中午吃了烤牛肉拌饭。" />
      <div className="mt-3 flex flex-wrap gap-2">{['记录今天吃的东西','今天特别累','只有 20 分钟','膝盖不舒服'].map(v => <button key={v} onClick={() => setMessage(v)} className="rounded-full bg-white px-3 py-2 text-xs font-bold">{v}</button>)}</div>
      {coachReply && <Card className="mt-4 !bg-blue-50"><strong className="text-sm">教练判断</strong><p className="mt-2 text-sm leading-6 text-black/60">{coachReply}</p></Card>}
      <button disabled={loading || !message} onClick={talkToCoach} className={`${primaryButton} mt-4 flex w-full items-center justify-center gap-2`}>{loading ? <RefreshCw size={18} className="animate-spin" /> : <Bot size={18} />} {loading ? '正在分析' : '发送给教练'}</button>
    </Modal>}
    {modal === 'settings' && <Modal title="设置" onClose={() => setModal(null)}>
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-white p-4"><span className="grid h-12 w-12 place-items-center rounded-lg bg-lime text-lg font-extrabold">{data.profile.name.slice(0,1)}</span><span><strong>{data.profile.name}</strong><small className="block text-black/45">{data.profile.goalType} · {data.profile.goalWeeks} 周</small></span></div>
      <label className="block text-sm font-bold">姓名<input className={fieldClass} value={data.profile.name} onChange={e => update({ profile: { ...data.profile, name: e.target.value } })} /></label>
      <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-bold">当前体重<input type="number" className={fieldClass} value={data.profile.weightKg || ''} onFocus={event => event.currentTarget.select()} onChange={e => { const val = +e.target.value; const today = new Date().toISOString().slice(0, 10); const i = data.weightHistory.findIndex(w => w.date === today); update({ profile: { ...data.profile, weightKg: val }, weightHistory: i >= 0 ? data.weightHistory.map((w, idx) => idx === i ? { ...w, weight: val } : w) : [...data.weightHistory, { date: today, weight: val, waist: 0 }] }) }} onBlur={e => { if (cloudUser) { const val = +e.target.value; if (val > 0) saveBodyMetricsEntry(cloudUser.id, new Date().toISOString().slice(0, 10), val).catch(() => {}) } }} /></label><label className="text-sm font-bold">目标体重<input type="number" className={fieldClass} value={data.profile.targetWeightKg || ''} onFocus={event => event.currentTarget.select()} onChange={e => update({ profile: { ...data.profile, targetWeightKg: +e.target.value } })} /></label></div>
      {!publicUserMode && <><h3 className="mb-3 mt-6 font-extrabold">AI 接入</h3>
      <Segmented options={['None','DeepSeek','OpenAI'] as AISettings['provider'][]} value={ai.provider} onChange={provider => setAi({ ...ai, provider, model: provider === 'OpenAI' ? 'gpt-4.1-mini' : 'deepseek-chat' })} />
      <label className="mt-3 block text-sm font-bold">API Key<input type="password" className={fieldClass} value={ai.apiKey} onChange={e => setAi({ ...ai, apiKey: e.target.value })} placeholder="仅保存在当前设备" /></label>
      <label className="mt-3 block text-sm font-bold">模型名称<input className={fieldClass} value={ai.model} onChange={e => setAi({ ...ai, model: e.target.value })} /></label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button disabled={loading || ai.provider === 'None' || !ai.apiKey || !ai.model} onClick={async () => {
          setLoading(true)
          setAiTestStatus('正在连接...')
          try {
            const result = await testAIConnection(ai)
            setAiTestStatus(result.ok ? `连接成功：${result.message}` : '接口有响应，但返回格式异常')
          } catch (error) {
            setAiTestStatus(error instanceof Error ? error.message : '连接失败')
          } finally { setLoading(false) }
        }} className={`${secondaryButton} flex items-center justify-center gap-2 disabled:opacity-40`}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> 测试连接</button>
        <button onClick={() => { localStorage.setItem('fit-ai-settings', JSON.stringify(ai)); setAiTestStatus('AI 设置已保存') }} className={`${primaryButton} flex items-center justify-center gap-2`}><Save size={17} /> 保存设置</button>
      </div>
      {aiTestStatus && <p className={`mt-2 rounded-md p-3 text-xs ${aiTestStatus.startsWith('连接成功') || aiTestStatus.includes('已保存') ? 'bg-green-50 text-green-700' : aiTestStatus === '正在连接...' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{aiTestStatus}</p>}
      </>}
      <h3 className="mb-3 mt-6 font-extrabold">数据与账号</h3>
      <div className="rounded-lg bg-white px-4">
        <div className="flex min-h-14 w-full items-center gap-3 border-b border-black/6 text-sm font-bold"><Cloud size={18} />{cloudUser ? `${syncStatus} · ${cloudUser.email || ''}` : supabaseEnabled ? 'Supabase 已配置，登录后同步' : '当前为本地演示模式'}</div>
        {cloudUser && <button onClick={async () => { await signOut(); setCloudUser(null); setModal(null) }} className="flex min-h-14 w-full items-center gap-3 border-b border-black/6 text-sm font-bold"><LogOut size={18} />退出账号</button>}
        <button onClick={() => exportData(data)} className="flex min-h-14 w-full items-center gap-3 border-b border-black/6 text-sm font-bold"><Download size={18} />导出 JSON</button>
        <button onClick={() => importRef.current?.click()} className="flex min-h-14 w-full items-center gap-3 text-sm font-bold"><Upload size={18} />导入 JSON</button>
        <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={e => importFile(e.target.files?.[0])} />
      </div>
      {!supabaseEnabled && <button onClick={() => { logoutLocalUser(); setLocalUsername(''); setModal(null) }} className={`${secondaryButton} mt-3 flex w-full items-center justify-center gap-2`}><LogOut size={17} /> 退出本地账号</button>}
      <button onClick={() => { const targets = calculateTargets(data.profile); const profile = { ...data.profile, calorieTarget: targets.calories, proteinTarget: targets.protein, waterTarget: targets.water }; update({ profile, plan: generateRulePlan(profile, data.checkin) }); alert('目标与计划已重新计算') }} className={`${secondaryButton} mt-4 flex w-full items-center justify-center gap-2`}><RefreshCw size={17} /> 重新计算计划</button>
    </Modal>}
    {modal === 'detail' && selected && <Modal title={selected.name} onClose={() => setModal(null)}><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-md bg-lime px-3 py-2">{selected.muscle}</span><span className="rounded-md bg-white px-3 py-2">{selected.equipment}</span><span className="rounded-md bg-white px-3 py-2">风险 {selected.risk}</span></div><h3 className="mb-2 mt-5 font-extrabold">动作步骤</h3><ol className="space-y-3">{selected.steps.map((s,i) => <li key={s} className="flex gap-3 text-sm leading-6"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs text-white">{i+1}</span>{s}</li>)}</ol><h3 className="mb-2 mt-5 font-extrabold">发力感觉</h3><p className="rounded-lg bg-blue-50 p-4 text-sm leading-6">{selected.cues}</p><h3 className="mb-2 mt-5 font-extrabold">常见错误</h3><div className="space-y-2">{selected.mistakes.map(m => <p key={m} className="text-sm text-black/60">· {m}</p>)}</div><h3 className="mb-2 mt-5 font-extrabold">替代动作</h3><p className="text-sm leading-6 text-black/60">{selected.alternatives.join('、')}</p></Modal>}
    {modal === 'replace' && selected && <Modal title="替换动作" onClose={() => setModal(null)}><p className="mb-4 text-sm text-black/50">替换 {selected.name}，优先同肌群、低风险和已有器械。</p>{selected.alternatives.map((name,i) => <button key={name} onClick={() => { const replacement = { ...selected, id: `${selected.id}-alt-${i}`, name, risk: '低' }; update({ plan: { ...data.plan, exercises: data.plan.exercises.map(e => e.id === selected.id ? replacement : e) } }); setModal(null) }} className="mb-2 flex min-h-14 w-full items-center justify-between rounded-lg bg-white px-4 text-left text-sm font-bold"><span>{name}</span><small className="text-black/35">{i === 0 ? '首选' : '可用'}</small></button>)}</Modal>}
    {modal === 'report' && <ReportModal data={data} cloudUserId={cloudUser?.id} onClose={() => setModal(null)} />}
    {modal === 'nutritionPlan' && <Modal title="今日饮食计划" onClose={() => setModal(null)}>{loading || !nutritionPlan ? <div className="grid min-h-48 place-items-center text-center text-sm text-black/45"><div><RefreshCw className="mx-auto mb-3 animate-spin" />AI 正在结合你的目标生成</div></div> : <div><Card className="!bg-ink text-white"><small className="font-bold text-lime">目标身材</small><h3 className="mt-2 text-lg font-extrabold">{data.profile.desiredResult}</h3><p className="mt-2 text-sm leading-6 text-white/65">{nutritionPlan.summary}</p></Card><div className="mt-4 space-y-2">{nutritionPlan.meals.map(meal => <Card key={meal.meal}><div className="flex items-center justify-between gap-3"><strong>{meal.meal}</strong><span className="text-right text-xs font-bold text-cobalt">{meal.targetCalories} kcal · {meal.targetProtein}g 蛋白</span></div><p className="mt-2 text-sm leading-6 text-black/55">{meal.suggestion}</p></Card>)}</div><Card className="mt-4 !bg-blue-50"><strong className="text-sm text-cobalt">今日注意</strong>{nutritionPlan.tips.map(tip => <p key={tip} className="mt-2 text-sm text-black/60">· {tip}</p>)}</Card></div>}</Modal>}
    {modal === 'calendar' && <CalendarModal data={data} loading={loading} onClose={() => setModal(null)} onRegenerate={async () => { setLoading(true); try { const weeklySchedule = await generateSevenDaySchedule(data.profile, data.checkin, { foodCount: data.foods.length, latestWeight: data.weightHistory[data.weightHistory.length - 1] }, ai); update({ weeklySchedule }) } catch (error) { setCoachReply(error instanceof Error ? error.message : 'AI 日历生成失败') } finally { setLoading(false) } }} />}
    {modal === 'finishWorkout' && <FinishWorkoutModal loading={loading} onClose={() => setModal(null)} onSave={async feedback => {
      setLoading(true)
      try {
        const result = await generateWorkoutAdjustment(data.profile, { plan: data.plan, completedExercises: data.completedExercises }, feedback, ai) as { reply?: string; volumeChangePercent?: number; reason?: string }
        const volumeChange = Number(result.volumeChangePercent) || 0
        update({ plan: { ...data.plan, volumeChange }, adjustmentLogs: [...data.adjustmentLogs, { date: new Date().toISOString(), reason: result.reason || feedback, change: result.reply || `下次训练量调整 ${volumeChange}%` }] })
        if (cloudUser) {
          const todayStr = new Date().toISOString().slice(0, 10)
          saveWorkoutSession(cloudUser.id, { sessionDate: todayStr, status: 'completed', plan: data.plan, completedExercises: data.completedExercises, completedCardio: data.completedCardio, feedback }).catch(() => {})
        }
        setCoachReply(result.reply || '训练已保存，后续计划已根据反馈更新。')
        setModal(null)
      } catch (error) { setCoachReply(error instanceof Error ? error.message : '反馈分析失败'); setModal(null) }
      finally { setLoading(false) }
    }} />}
    <div className="pointer-events-none fixed bottom-[76px] left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 justify-end px-4">
      <button onClick={() => setModal('coach')} title="打开 AI 教练" className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-cobalt text-white shadow-[0_8px_24px_rgba(39,93,245,.38)] active:scale-95"><Bot size={25} /></button>
    </div>
  </div>
}

function CheckinModal({ data, loading, onSave, onClose }: { data: AppData; loading: boolean; onSave: (checkin: AppData['checkin']) => void; onClose: () => void }) {
  const [form, setForm] = useState(data.checkin)
  return <Modal title="今日状态" onClose={onClose}><div className="space-y-5">
    <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">修改过程中只保存在当前表单，不会调用 AI。点击底部按钮后才会保存并生成新计划。</p>
    <label className="block text-sm font-bold">睡眠：{form.sleepHours} 小时<input type="range" min="3" max="10" step=".5" className="mt-3 w-full accent-black" value={form.sleepHours} onChange={e => setForm({ ...form, sleepHours: +e.target.value })} /></label>
    <label className="block text-sm font-bold">压力：{form.stress} / 5<input type="range" min="1" max="5" className="mt-3 w-full accent-black" value={form.stress} onChange={e => setForm({ ...form, stress: +e.target.value })} /></label>
    <label className="block text-sm font-bold">疲劳：{form.fatigue} / 5<input type="range" min="1" max="5" className="mt-3 w-full accent-black" value={form.fatigue} onChange={e => setForm({ ...form, fatigue: +e.target.value })} /></label>
    <div><div className="mb-2 text-sm font-bold">训练意愿</div><Segmented options={['不想练','一般','可以练','想上强度']} value={form.motivation} onChange={motivation => setForm({ ...form, motivation })} /></div>
    <div><div className="mb-2 text-sm font-bold">可训练时间</div><Segmented options={['0','20','40','60','90']} value={String(form.availableMinutes)} onChange={v => setForm({ ...form, availableMinutes: +v })} /></div>
    <label className="block text-sm font-bold">酸痛部位<input className={fieldClass} value={form.soreness} onChange={e => setForm({ ...form, soreness: e.target.value })} placeholder="没有可留空" /></label>
    <label className="block text-sm font-bold">疼痛/不适<input className={fieldClass} value={form.pain} onChange={e => setForm({ ...form, pain: e.target.value })} placeholder="明显疼痛请如实填写" /></label>
    <div className="grid grid-cols-2 gap-3"><label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">今日外食<input type="checkbox" checked={form.ateOut} onChange={e => setForm({ ...form, ateOut: e.target.checked })} /></label><label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">今日饮酒<input type="checkbox" checked={form.drankAlcohol} onChange={e => setForm({ ...form, drankAlcohol: e.target.checked })} /></label></div>
    <label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">今天想做有氧<input type="checkbox" className="h-5 w-5 accent-black" checked={form.wantsCardio} onChange={e => setForm({ ...form, wantsCardio: e.target.checked })} /></label>
    {form.wantsCardio && <div><div className="mb-2 text-sm font-bold">喜欢的有氧方式</div><div className="grid grid-cols-2 gap-2">{['跑步机坡度走','户外跑步','健身单车','椭圆机','划船机','跳绳'].map(type => <button key={type} onClick={() => setForm({ ...form, cardioType: type })} className={`min-h-11 rounded-lg border px-2 text-xs font-bold ${form.cardioType === type ? 'border-cobalt bg-cobalt text-white' : 'border-black/10 bg-white'}`}>{type}</button>)}</div></div>}
    <label className="block text-sm font-bold">备注<textarea className={`${fieldClass} min-h-20 py-3`} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="例如：今天下班较晚，腿有点沉" /></label>
    <button disabled={loading} onClick={() => onSave(form)} className={`${primaryButton} flex w-full items-center justify-center gap-2`}>{loading && <RefreshCw size={17} className="animate-spin" />}{loading ? 'AI 正在重算计划' : '保存并让 AI 生成计划'}</button>
  </div></Modal>
}

function FoodModal({ ai, initialFood, onSave, onClose }: { ai: AISettings; initialFood: FoodLog | null; onSave: (food: FoodLog) => void; onClose: () => void }) {
  const [food, setFood] = useState({ name: initialFood?.name || '', meal: initialFood?.meal || '午餐', amount: initialFood?.amount || '1 份', calories: initialFood ? String(initialFood.calories) : '', protein: initialFood ? String(initialFood.protein) : '', carbs: initialFood ? String(initialFood.carbs) : '', fat: initialFood ? String(initialFood.fat) : '', ateOut: initialFood?.ateOut || false, estimated: initialFood?.estimated || false, sourceNote: initialFood?.sourceNote || '' })
  const [finding, setFinding] = useState(false)
  const [status, setStatus] = useState('')
  const findWithAI = async () => {
    if (!food.name.trim()) { setStatus('请先输入餐品名称和份量'); return }
    setFinding(true); setStatus('AI 正在估算营养...')
    try {
      const result = await estimateFoodNutrition(`${food.name}，${food.amount}`, food.meal, ai)
      setFood({ ...food, name: result.name, meal: result.meal, amount: result.amount, calories: String(result.calories), protein: String(result.protein), carbs: String(result.carbs), fat: String(result.fat), ateOut: result.ateOut, estimated: true, sourceNote: result.sourceNote || '' })
      setStatus(result.sourceNote || '已按常见份量完成估算，请确认后保存')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'AI 查找失败') } finally { setFinding(false) }
  }
  const numeric = (value: string) => value.trim() === '' ? 0 : Math.max(0, Number(value) || 0)
  return <Modal title={initialFood ? '编辑饮食记录' : '添加食物'} onClose={onClose}><div className="space-y-4">
    <label className="block text-sm font-bold">食物或餐品名称<div className="mt-1 flex gap-2"><input autoFocus className={`${fieldClass} !mt-0 min-w-0 flex-1`} value={food.name} onChange={e => setFood({ ...food, name: e.target.value })} placeholder="例如：米村拌饭烤牛肉拌饭" /><button disabled={finding || !food.name.trim()} onClick={findWithAI} className="flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-cobalt px-3 text-xs font-bold text-white disabled:opacity-40">{finding ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} AI 查找</button></div></label>
    <div><div className="mb-2 text-sm font-bold">餐次</div><Segmented options={['早餐','午餐','晚餐','加餐']} value={food.meal} onChange={meal => setFood({ ...food, meal })} /></div>
    <label className="block text-sm font-bold">份量<input className={fieldClass} value={food.amount} onChange={e => setFood({ ...food, amount: e.target.value })} placeholder="例如：1 份，约 450g" /></label>
    <div className="grid grid-cols-2 gap-3">{([['calories','热量 kcal'],['protein','蛋白质 g'],['carbs','碳水 g'],['fat','脂肪 g']] as const).map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input inputMode="decimal" className={fieldClass} value={food[key]} onFocus={event => event.currentTarget.select()} onChange={event => setFood({ ...food, [key]: event.target.value.replace(/[^0-9.]/g, '') })} placeholder="0" /></label>)}</div>
    {status && <p className={`rounded-lg p-3 text-xs leading-5 ${food.estimated ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>{status}</p>}
    <label className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-bold">外食<input type="checkbox" checked={food.ateOut} onChange={e => setFood({ ...food, ateOut: e.target.checked })} /></label>
    <button disabled={!food.name} onClick={() => onSave({ id: initialFood?.id || crypto.randomUUID(), loggedDate: initialFood?.loggedDate || new Date().toISOString().slice(0, 10), name: food.name, meal: food.meal, amount: food.amount, calories: numeric(food.calories), protein: numeric(food.protein), carbs: numeric(food.carbs), fat: numeric(food.fat), ateOut: food.ateOut, estimated: food.estimated, sourceNote: food.sourceNote })} className={`${primaryButton} w-full`}>保存记录</button>
  </div></Modal>
}

function FinishWorkoutModal({ loading, onSave, onClose }: { loading: boolean; onSave: (feedback: string) => void; onClose: () => void }) {
  const [feedback, setFeedback] = useState('')
  return <Modal title="结束训练" onClose={onClose}><p className="text-sm leading-6 text-black/50">训练已完成。补充实际感受后，AI 会分析并更新下一次训练计划。</p><textarea autoFocus className={`${fieldClass} mt-4 min-h-32 py-3`} value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="哪些动作太重、没感觉或不舒服？整体难度如何？下次是否想加重量？" /><div className="mt-3 flex flex-wrap gap-2">{['整体刚好','强度太高','有动作没感觉','下次想加重量'].map(text => <button key={text} onClick={() => setFeedback(current => `${current}${current ? '；' : ''}${text}`)} className="rounded-full bg-white px-3 py-2 text-xs font-bold">{text}</button>)}</div><button disabled={loading || !feedback.trim()} onClick={() => onSave(feedback)} className={`${primaryButton} mt-4 flex w-full items-center justify-center gap-2`}>{loading && <RefreshCw size={17} className="animate-spin" />}{loading ? 'AI 正在分析' : '保存并更新后续计划'}</button></Modal>
}

function CalendarModal({ data, loading, onRegenerate, onClose }: { data: AppData; loading: boolean; onRegenerate: () => void; onClose: () => void }) {
  const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const todayDate = new Date()
  const today = formatDate(todayDate)
  const [selectedDate, setSelectedDate] = useState(today)
  const [expanded, setExpanded] = useState(false)
  const dayForDate = (date: Date, index: number) => {
    const key = formatDate(date)
    const exact = data.weeklySchedule.find(day => day.date === key)
    if (exact) return exact
    const template = data.weeklySchedule[((index % data.weeklySchedule.length) + data.weeklySchedule.length) % data.weeklySchedule.length]
    return { ...template, date: key, weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date), status: template.trainingType === 'Rest' ? 'rest' as const : 'upcoming' as const }
  }
  const rollingDays = Array.from({ length: 28 }, (_, index) => { const date = new Date(todayDate); date.setDate(date.getDate() + index); return dayForDate(date, index) })
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = new Date(monthStart); gridStart.setDate(monthStart.getDate() - mondayOffset)
  const monthDays = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return { ...dayForDate(date, Math.round((date.getTime() - todayDate.getTime()) / 86400000)), inMonth: date.getMonth() === todayDate.getMonth() } })
  const visibleDays = expanded ? monthDays : rollingDays
  const selected = visibleDays.find(day => day.date === selectedDate) || rollingDays[0]
  const foods = data.foods.filter(food => (food.loggedDate || today) === selected?.date)
  const calories = foods.reduce((sum, food) => sum + food.calories, 0)
  const protein = foods.reduce((sum, food) => sum + food.protein, 0)
  const todayComplete = selected?.date === today && data.completedExercises.length >= data.plan.exercises.length && (!data.plan.cardio.enabled || data.completedCardio) && protein >= data.plan.proteinTarget && data.checkin.waterMl >= data.plan.waterTarget
  return <Modal title="训练计划日历" onClose={onClose}><div className="mb-3 flex items-center justify-between"><strong className="text-sm">{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(todayDate)}</strong><button onClick={() => setExpanded(value => !value)} className="flex min-h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-bold">{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{expanded ? '收起' : '展开月历'}</button></div><div className={expanded ? 'grid grid-cols-7 gap-1' : 'scrollbar-none -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2'}>{visibleDays.map(day => {
    const dayFoods = data.foods.filter(food => (food.loggedDate || today) === day.date)
    const dayProtein = dayFoods.reduce((sum, food) => sum + food.protein, 0)
    const completed = day.status === 'completed' || (day.date === today && data.completedExercises.length >= data.plan.exercises.length && (!data.plan.cardio.enabled || data.completedCardio) && dayProtein >= data.plan.proteinTarget && data.checkin.waterMl >= data.plan.waterTarget)
    const active = day.date === selectedDate
    return <button key={day.date} onClick={() => setSelectedDate(day.date)} className={`${expanded ? 'aspect-[.78] min-w-0' : 'aspect-[.78] w-[calc((100%-1.5rem)/4)] min-w-[72px] shrink-0 snap-start'} rounded-lg border p-1 text-center ${'inMonth' in day && !day.inMonth ? 'opacity-35' : ''} ${completed ? 'border-cobalt bg-cobalt text-white' : active ? 'border-ink bg-white' : 'border-black/5 bg-white'}`}><small className={`block text-[9px] ${completed ? 'text-white/70' : 'text-black/35'}`}>{day.weekday}</small><strong className="mt-1 block text-sm">{Number(day.date.slice(-2))}</strong><span className={`mx-auto mt-2 block h-1.5 w-1.5 rounded-full ${day.trainingType === 'Rest' ? 'bg-black/20' : completed ? 'bg-white' : 'bg-lime'}`} /></button>
  })}</div><div className="mt-3 flex items-center gap-4 text-[10px] text-black/45"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-cobalt" />完成目标</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-lime" />计划训练</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-black/20" />休息</span></div>{selected && <Card className={`mt-4 ${todayComplete ? '!border-cobalt !bg-blue-50' : ''}`}><div className="flex items-center justify-between"><div><small className="text-black/40">{selected.date} · {selected.weekday}</small><h3 className="mt-1 font-extrabold">{selected.focus}</h3></div>{todayComplete && <span className="rounded bg-cobalt px-2 py-1 text-xs font-bold text-white">已完成</span>}</div><p className="mt-2 text-sm text-black/55">{selected.trainingType} · {selected.duration} 分钟{selected.cardioMinutes ? ` · 有氧 ${selected.cardioMinutes} 分钟` : ''}</p><div className="mt-4 border-t border-black/6 pt-3"><div className="flex justify-between text-xs"><strong>饮食记录</strong><span>{foods.length ? `${calories} kcal · ${protein}g 蛋白` : '暂无记录'}</span></div>{foods.length ? <p className="mt-2 text-xs leading-5 text-black/45">{foods.map(food => food.name).join('、')}</p> : <p className="mt-2 text-xs text-black/45">目标 {data.plan.calorieTarget} kcal · 蛋白质 {data.plan.proteinTarget}g</p>}</div></Card>}<button disabled={loading} onClick={onRegenerate} className={`${primaryButton} mt-4 flex w-full items-center justify-center gap-2`}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />AI 重新安排</button></Modal>
}

function ReportModal({ data, cloudUserId, onClose }: { data: AppData; cloudUserId?: string; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const foods = data.foods.filter(food => (food.loggedDate || today) === today)
  const calories = foods.reduce((sum, food) => sum + food.calories, 0)
  const protein = foods.reduce((sum, food) => sum + food.protein, 0)
  const workoutRate = data.plan.exercises.length ? Math.round(data.completedExercises.length / data.plan.exercises.length * 100) : 0
  const nutritionScore = foods.length ? Math.min(50, Math.round(protein / Math.max(1, data.plan.proteinTarget) * 25) + Math.max(0, Math.round((1 - Math.abs(calories - data.plan.calorieTarget) / Math.max(1, data.plan.calorieTarget)) * 25))) : 0
  const score = Math.min(100, nutritionScore + Math.round(workoutRate * .35) + (data.checkin.sleepHours ? Math.min(15, Math.round(data.checkin.sleepHours / 8 * 15)) : 0))
  useEffect(() => {
    if (!cloudUserId) return
    const d = new Date(); const dow = d.getDay()
    const monday = new Date(d); monday.setDate(monday.getDate() - ((dow + 6) % 7))
    saveWeeklyReport(cloudUserId, monday.toISOString().slice(0, 10), { score, date: today, nutrition: { calories, protein }, workout: { completed: data.completedExercises.length, total: data.plan.exercises.length, rate: workoutRate } }).catch(() => {})
  }, [cloudUserId])
  return <Modal title="本周报告" onClose={onClose}><div className="rounded-xl bg-ink p-5 text-white"><small className="text-white/45">当前记录评分</small><strong className="mt-2 block text-4xl text-lime">{score}</strong><p className="mt-3 text-sm text-white/65">未记录项目按 0 分计算</p></div><div className="mt-4 space-y-3"><Card><strong className="text-sm">营养</strong><p className="mt-2 text-sm text-black/55">今日 {calories} kcal，蛋白质 {protein}g。{foods.length ? '统计仅来自实际饮食记录。' : '暂无饮食记录。'}</p></Card><Card><strong className="text-sm">训练</strong><p className="mt-2 text-sm text-black/55">已完成 {data.completedExercises.length}/{data.plan.exercises.length} 个动作，完成率 {workoutRate}%。</p></Card><Card><strong className="text-sm">身体数据</strong><p className="mt-2 text-sm text-black/55">{data.weightHistory.length ? `已有 ${data.weightHistory.length} 条体重/腰围记录。` : '暂无体重和腰围趋势记录。'}</p></Card></div></Modal>
}

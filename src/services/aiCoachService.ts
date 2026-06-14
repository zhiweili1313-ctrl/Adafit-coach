import type { Checkin, DailyPlan, Exercise, FoodLog, NutritionPlan, Profile, ScheduleDay } from '../types'
import { generateRulePlan } from './ruleEngine'
import { supabase } from './supabase'

export type AISettings = { provider: 'None' | 'DeepSeek' | 'OpenAI'; apiKey: string; model: string }

export type CoachResult = {
  reply: string
  foods: Omit<FoodLog, 'id'>[]
  plan?: DailyPlan
}

export type WorkoutLiveResult = {
  reply: string
  exerciseId?: string
  weight?: string
  sets?: number
  reps?: string
}

const systemPrompt = `你是一个谨慎、专业、个性化的 AI 健身教练。根据用户目标、身体信息、训练经验、器械、饮食、睡眠、疲劳、疼痛和执行情况制定建议。不要给极端节食建议，不要让用户在疼痛状态下硬练。明显疼痛或健康风险时提醒停止相关动作并咨询专业人士。只输出合法 JSON。`
const serverAIEnabled = import.meta.env.VITE_SERVER_AI_ENABLED === 'true'
const hasAI = (settings?: AISettings) => serverAIEnabled || Boolean(settings?.apiKey && settings.provider !== 'None')

async function callAI(settings: AISettings | undefined, prompt: string) {
  if (!hasAI(settings)) throw new Error('AI 未配置')
  if (serverAIEnabled) {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ prompt }) })
    if (!response.ok) throw new Error(`AI 服务请求失败 ${response.status}：${(await response.text()).slice(0, 160)}`)
    return response.json()
  }
  const localSettings = settings!
  const endpoint = localSettings.provider === 'DeepSeek'
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localSettings.apiKey}` },
    body: JSON.stringify({
      model: localSettings.model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 900
    })
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`AI 请求失败 ${response.status}：${detail.slice(0, 160)}`)
  }
  const body = await response.json()
  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI 返回内容为空')
  const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try { return JSON.parse(clean) } catch { throw new Error('AI 返回的不是有效 JSON，请重试') }
}

const compactProfile = (profile: Profile) => ({
  gender: profile.gender, age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg,
  targetWeightKg: profile.targetWeightKg, goalType: profile.goalType, physiqueGoal: profile.desiredResult,
  goalWeeks: profile.goalWeeks, trainingLevel: profile.trainingLevel, weeklyTrainingDays: profile.weeklyTrainingDays,
  sessionDuration: profile.sessionDuration, dietaryPreference: profile.dietaryPreference,
  dislikedFoods: profile.dislikedFoods, injuryNotes: profile.injuryNotes
})

const compactCheckin = (checkin: Checkin) => ({
  sleepHours: checkin.sleepHours, stress: checkin.stress, fatigue: checkin.fatigue, hunger: checkin.hunger,
  motivation: checkin.motivation, availableMinutes: checkin.availableMinutes, pain: checkin.pain,
  ateOut: checkin.ateOut, drankAlcohol: checkin.drankAlcohol, wantsCardio: checkin.wantsCardio,
  cardioType: checkin.cardioType, waterMl: checkin.waterMl, note: checkin.note
})

const compactContext = (value: unknown) => {
  const text = JSON.stringify(value)
  return text.length > 2200 ? `${text.slice(0, 2200)}…` : text
}

const numberOr = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback

function normalizeFood(value: unknown, fallbackName = 'AI 识别餐食'): Omit<FoodLog, 'id'> {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const meal = ['早餐', '午餐', '晚餐', '加餐'].includes(String(item.meal)) ? String(item.meal) : '加餐'
  return {
    name: String(item.name || fallbackName),
    meal,
    amount: String(item.amount || '1 份'),
    calories: Math.max(0, Math.round(numberOr(item.calories, 0))),
    protein: Math.max(0, Math.round(numberOr(item.protein, 0))),
    carbs: Math.max(0, Math.round(numberOr(item.carbs, 0))),
    fat: Math.max(0, Math.round(numberOr(item.fat, 0))),
    ateOut: Boolean(item.ateOut),
    estimated: true,
    sourceNote: String(item.sourceNote || 'AI 根据常见份量估算，实际数值会因门店和做法变化')
  }
}

function normalizePlan(value: unknown, fallback: DailyPlan): DailyPlan {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const trainingTypes = ['Push', 'Pull', 'Legs', 'Recovery', 'Rest']
  const intensities = ['low', 'medium', 'high']
  return {
    ...fallback,
    trainingType: trainingTypes.includes(String(item.trainingType)) ? String(item.trainingType) as DailyPlan['trainingType'] : fallback.trainingType,
    focus: typeof item.focus === 'string' ? item.focus : fallback.focus,
    coachMessage: typeof item.coachMessage === 'string' ? item.coachMessage : fallback.coachMessage,
    intensity: intensities.includes(String(item.intensity)) ? String(item.intensity) as DailyPlan['intensity'] : fallback.intensity,
    duration: numberOr(item.duration, fallback.duration),
    reason: typeof item.reason === 'string' ? item.reason : fallback.reason,
    exercises: Array.isArray(item.exercises) ? item.exercises.filter(exercise => exercise && typeof exercise === 'object').map((exercise, index) => ({ ...fallback.exercises[index % Math.max(1, fallback.exercises.length)], ...(exercise as Exercise), id: String((exercise as Exercise).id || `ai-${index}`) })).filter(exercise => exercise.name) : fallback.exercises,
    calorieTarget: numberOr(item.calorieTarget, fallback.calorieTarget),
    proteinTarget: numberOr(item.proteinTarget, fallback.proteinTarget),
    waterTarget: numberOr(item.waterTarget, fallback.waterTarget),
    volumeChange: numberOr(item.volumeChange, fallback.volumeChange),
    minimumTask: typeof item.minimumTask === 'string' ? item.minimumTask : fallback.minimumTask,
    warnings: Array.isArray(item.warnings) ? item.warnings.map(String) : fallback.warnings,
    cardio: item.cardio && typeof item.cardio === 'object' ? {
      enabled: Boolean((item.cardio as Record<string, unknown>).enabled),
      type: String((item.cardio as Record<string, unknown>).type || fallback.cardio.type),
      duration: numberOr((item.cardio as Record<string, unknown>).duration, fallback.cardio.duration),
      intensity: String((item.cardio as Record<string, unknown>).intensity || fallback.cardio.intensity),
      target: String((item.cardio as Record<string, unknown>).target || fallback.cardio.target)
    } : fallback.cardio
  }
}

export async function testAIConnection(settings: AISettings) {
  const result = await callAI(settings, '只输出 JSON：{"ok":true,"message":"连接成功"}')
  return {
    ok: result.ok === true,
    message: typeof result.message === 'string' ? result.message : '连接成功'
  }
}

export async function generateInitialPlan(profile: Profile, settings?: AISettings) {
  if (!hasAI(settings)) return generateRulePlan(profile, { sleepHours: 7, stress: 3, fatigue: 2, hunger: 3, motivation: '可以练', availableMinutes: profile.sessionDuration, soreness: '', pain: '', ateOut: false, drankAlcohol: false, wantsCardio: false, cardioType: '跑步机坡度走', waterMl: 0, note: '' })
  return callAI(settings, `生成初始训练与营养计划。用户档案：${JSON.stringify(profile)}`)
}

export async function generateDailyPlan(profile: Profile, recentData: unknown, todayCheckin: Checkin, userMessage: string, settings?: AISettings): Promise<DailyPlan> {
  const fallback = generateRulePlan(profile, { ...todayCheckin, note: `${todayCheckin.note} ${userMessage}` })
  if (!hasAI(settings)) throw new Error('训练计划需要 AI，请先配置服务端 AI 或开发者 API Key')
  const result = await callAI(settings, `生成今日训练、营养和饮水计划。必须输出这些字段：trainingType、focus、coachMessage、intensity、duration、reason、exercises、calorieTarget、proteinTarget、waterTarget、volumeChange、minimumTask、warnings、cardio。cardio 格式为 {enabled,type,duration,intensity,target}。waterTarget 必须根据体重、训练时长、饮酒、外食和出汗需求给出安全的毫升目标。围绕目标身材安排，不要只关注体重。档案：${JSON.stringify(compactProfile(profile))}；近期摘要：${compactContext(recentData)}；今日：${JSON.stringify(compactCheckin(todayCheckin))}；用户消息：${userMessage}`)
  return normalizePlan(result, fallback)
}

export async function estimateFoodNutrition(description: string, meal: string, settings?: AISettings): Promise<Omit<FoodLog, 'id'>> {
  if (!hasAI(settings)) throw new Error('AI 服务尚未配置')
  const cacheKey = `fit-food-cache:${serverAIEnabled ? 'server' : settings?.provider}:${description.trim().toLowerCase()}:${meal}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null') as { savedAt: number; value: Omit<FoodLog, 'id'> } | null
    if (cached && Date.now() - cached.savedAt < 7 * 24 * 60 * 60 * 1000) return cached.value
  } catch { /* Ignore invalid cache. */ }
  const result = await callAI(settings, `估算这份餐食的营养：${description}。餐次：${meal}。若是连锁餐厅菜品，可参考常见公开信息，但没有可靠官方数据时必须按常见份量保守估算。只输出一个对象，字段必须是 name, meal, amount, calories, protein, carbs, fat, ateOut, sourceNote。数值表示整份餐食。`)
  const normalized = normalizeFood(result, description)
  localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), value: normalized }))
  return normalized
}

export async function generatePersonalizedNutritionPlan(profile: Profile, checkin: Checkin, plan: DailyPlan, currentFoods: FoodLog[], settings?: AISettings): Promise<NutritionPlan> {
  const consumed = currentFoods.reduce((sum, food) => ({ calories: sum.calories + food.calories, protein: sum.protein + food.protein }), { calories: 0, protein: 0 })
  const remainingCalories = Math.max(0, plan.calorieTarget - consumed.calories)
  const remainingProtein = Math.max(0, plan.proteinTarget - consumed.protein)
  const fallback: NutritionPlan = {
    summary: `围绕“${profile.desiredResult || profile.goalType}”安排饮食，今天剩余约 ${remainingCalories} kcal 和 ${remainingProtein}g 蛋白质。`,
    meals: [
      { meal: '早餐', targetCalories: Math.round(plan.calorieTarget * .25), targetProtein: Math.round(plan.proteinTarget * .25), suggestion: '主食、蛋白质和水果搭配' },
      { meal: '午餐', targetCalories: Math.round(plan.calorieTarget * .35), targetProtein: Math.round(plan.proteinTarget * .35), suggestion: '瘦肉或鱼、米饭和两份蔬菜' },
      { meal: '晚餐', targetCalories: Math.round(plan.calorieTarget * .3), targetProtein: Math.round(plan.proteinTarget * .3), suggestion: '优先优质蛋白，按剩余热量调整主食' },
      { meal: '加餐', targetCalories: Math.round(plan.calorieTarget * .1), targetProtein: Math.round(plan.proteinTarget * .1), suggestion: '低脂奶、鸡蛋或水果' }
    ],
    tips: ['不采用极端节食', '训练日和休息日都要保证蛋白质', checkin.ateOut ? '今天外食，注意酱汁和隐形油脂' : '优先选择容易估算份量的食物']
  }
  if (!hasAI(settings)) throw new Error('训练日历需要 AI 服务')
  try {
    const result = await callAI(settings, `制定今天的个性化饮食计划。输出 {"summary":"","meals":[{"meal":"早餐","targetCalories":0,"targetProtein":0,"suggestion":""}],"tips":[""]}。四餐热量总和接近 ${plan.calorieTarget}，蛋白质总和接近 ${plan.proteinTarget}。禁止极端节食。用户：${JSON.stringify(compactProfile(profile))}；今日：${JSON.stringify(compactCheckin(checkin))}；训练：${JSON.stringify({ focus: plan.focus, intensity: plan.intensity, duration: plan.duration, cardio: plan.cardio })}；已摄入：${JSON.stringify(consumed)}`)
    const raw = result as Record<string, unknown>
    const meals = Array.isArray(raw.meals) ? raw.meals.map(item => { const meal = item as Record<string, unknown>; return { meal: String(meal.meal || '加餐'), targetCalories: numberOr(meal.targetCalories, 0), targetProtein: numberOr(meal.targetProtein, 0), suggestion: String(meal.suggestion || '') } }) : fallback.meals
    return { summary: String(raw.summary || fallback.summary), meals, tips: Array.isArray(raw.tips) ? raw.tips.map(String) : fallback.tips }
  } catch { return fallback }
}

export async function processCoachMessage(profile: Profile, recentData: unknown, todayCheckin: Checkin, userMessage: string, settings?: AISettings): Promise<CoachResult> {
  if (!hasAI(settings)) {
    return { reply: '当前未配置 AI。你仍可使用今日状态规则生成训练计划；自动识别餐食需要先配置 API Key。', foods: [] }
  }
  const fallbackPlan = generateRulePlan(profile, todayCheckin)
  const result = await callAI(settings, `理解用户意图并返回 JSON。用户如果描述今天吃过的食物，必须拆成 foods 数组并估算整份热量和三大营养。只有用户明确要求改训练时才返回 plan，否则 plan 为 null。格式：{"reply":"简短回复","foods":[{"name":"","meal":"早餐/午餐/晚餐/加餐","amount":"","calories":0,"protein":0,"carbs":0,"fat":0,"ateOut":false,"sourceNote":"估算依据"}],"plan":null}。档案：${JSON.stringify(compactProfile(profile))}；近期摘要：${compactContext(recentData)}；今日：${JSON.stringify(compactCheckin(todayCheckin))}；消息：${userMessage}`)
  const raw = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  return {
    reply: typeof raw.reply === 'string' ? raw.reply : '已分析你的情况。',
    foods: Array.isArray(raw.foods) ? raw.foods.map(food => normalizeFood(food)) : [],
    plan: raw.plan ? normalizePlan(raw.plan, fallbackPlan) : undefined
  }
}

export async function generateSevenDaySchedule(profile: Profile, todayCheckin: Checkin, recentData: unknown, settings?: AISettings): Promise<ScheduleDay[]> {
  const types: DailyPlan['trainingType'][] = ['Push', 'Pull', 'Legs', 'Recovery', 'Push', 'Pull', 'Rest']
  const fallback = types.map((trainingType, index) => {
    const date = new Date(); date.setDate(date.getDate() + index)
    const focus = trainingType === 'Push' ? '胸、肩与肱三头肌' : trainingType === 'Pull' ? '背部与肱二头肌' : trainingType === 'Legs' ? '腿部与臀部' : trainingType === 'Recovery' ? '恢复、活动度与步行' : '休息与轻松步行'
    return { date: date.toISOString().slice(0, 10), weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date), trainingType, focus, duration: trainingType === 'Rest' ? 20 : trainingType === 'Recovery' ? 35 : profile.sessionDuration, cardioMinutes: profile.goalType === '减脂' || profile.goalType === '增肌减脂' ? (trainingType === 'Rest' ? 20 : 15) : 10, status: index === 0 ? 'today' as const : trainingType === 'Rest' ? 'rest' as const : 'upcoming' as const }
  })
  if (!hasAI(settings)) return fallback
  try {
    const result = await callAI(settings, `安排从今天开始的 7 天训练计划，考虑训练队列、恢复、可训练天数、目标身材和有氧。输出 {"days":[{"trainingType":"Push/Pull/Legs/Recovery/Rest","focus":"训练肌群或恢复目标","duration":60,"cardioMinutes":15}]}，必须恰好 7 天。档案：${JSON.stringify(compactProfile(profile))}；今日：${JSON.stringify(compactCheckin(todayCheckin))}；近期摘要：${compactContext(recentData)}`)
    const days = result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>).days) ? (result as { days: Record<string, unknown>[] }).days : []
    if (days.length !== 7) return fallback
    return days.map((day, index) => ({ ...fallback[index], trainingType: types.includes(String(day.trainingType) as DailyPlan['trainingType']) ? String(day.trainingType) as DailyPlan['trainingType'] : fallback[index].trainingType, focus: String(day.focus || fallback[index].focus), duration: numberOr(day.duration, fallback[index].duration), cardioMinutes: numberOr(day.cardioMinutes, fallback[index].cardioMinutes) }))
  } catch { return fallback }
}

export async function generateDietAdvice(profile: Profile, nutritionLogs: FoodLog[], settings?: AISettings) {
  if (!settings?.apiKey) {
    const protein = nutritionLogs.reduce((sum, item) => sum + item.protein, 0)
    return { summary: protein < profile.proteinTarget - 30 ? `还差 ${profile.proteinTarget - protein}g 蛋白质，下一餐优先瘦肉、鱼、蛋或低脂奶。` : '蛋白质进度良好，保持总热量稳定。' }
  }
  return callAI(settings, `给出饮食建议。档案：${JSON.stringify(profile)}；记录：${JSON.stringify(nutritionLogs)}`)
}

export async function generateWorkoutAdjustment(profile: Profile, workoutLogs: unknown, feedback: string, settings?: AISettings) {
  if (!hasAI(settings)) return { reply: 'AI 服务尚未配置，反馈已保存但不会自动改动训练计划。', volumeChangePercent: 0, reason: '等待 AI 分析' }
  return callAI(settings, `分析训练结束反馈并给出下一次计划调整。输出 {"reply":"给用户的总结","volumeChangePercent":0,"reason":"调整原因"}。档案：${JSON.stringify(profile)}；训练：${JSON.stringify(workoutLogs)}；反馈：${feedback}`)
}

export async function analyzeLiveWorkoutFeedback(profile: Profile, plan: DailyPlan, message: string, settings?: AISettings): Promise<WorkoutLiveResult> {
  const matched = plan.exercises.find(exercise => message.includes(exercise.name) || message.includes(exercise.name.replace(/杠铃|哑铃|坐姿|绳索/g, '')))
  if (!hasAI(settings)) return { reply: 'AI 服务尚未配置，无法自动调整训练重量和组数。' }
  const result = await callAI(settings, `你是训练中的实时教练。先判断信息是否足够：如果缺少当前可完成次数、疼痛情况等关键数据，用 reply 追问且不要调整；信息足够再给安全的重量、组数和次数。只输出 {"reply":"","exerciseId":"可选","weight":"可选，如 45 kg","sets":3,"reps":"8-10"}。不要鼓励疼痛状态硬练。档案：${JSON.stringify(profile)}；今日计划：${JSON.stringify(plan)}；用户反馈：${message}`)
  const raw = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  const exerciseId = typeof raw.exerciseId === 'string' && plan.exercises.some(exercise => exercise.id === raw.exerciseId) ? raw.exerciseId : matched?.id
  return { reply: String(raw.reply || '请补充当前重量、完成次数和疼痛情况。'), exerciseId, weight: typeof raw.weight === 'string' ? raw.weight : undefined, sets: Number.isFinite(Number(raw.sets)) ? Number(raw.sets) : undefined, reps: typeof raw.reps === 'string' ? raw.reps : undefined }
}

export async function generateWeeklyReport(profile: Profile, weeklyData: unknown, settings?: AISettings) {
  if (!hasAI(settings)) return { summary: 'AI 服务尚未配置。', calorieChange: 0, volumeChangePercent: 0 }
  return callAI(settings, `生成周报与下周计划。档案：${JSON.stringify(profile)}；周数据：${JSON.stringify(weeklyData)}`)
}

export async function replaceExercise(exercise: Exercise, availableEquipment: string[], userCondition: string, settings?: AISettings) {
  if (!hasAI(settings)) return { replacement: exercise.alternatives[0], reason: '安全替代动作' }
  return callAI(settings, `替换动作。动作：${JSON.stringify(exercise)}；器械：${availableEquipment.join(',')}；状态：${userCondition}`)
}

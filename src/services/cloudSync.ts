import type { AppData, FoodLog } from '../types'
import { supabase } from './supabase'

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('请先配置 Supabase 环境变量')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  })
  if (error) throw error
}

export async function signUpWithPassword(email: string, password: string, name: string) {
  if (!supabase) throw new Error('请先配置 Supabase 环境变量')
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
  if (error) throw error
  return data
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('请先配置 Supabase 环境变量')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** 从 user_settings 表加载完整 AppData blob */
export async function loadCloudData(userId: string): Promise<AppData | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_settings').select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.data as AppData) ?? null
}

/** 保存完整 AppData blob 到 user_settings 表 */
export async function saveCloudData(userId: string, appData: AppData) {
  if (!supabase) return
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    data: appData,
    updated_at: new Date().toISOString()
  })
  if (error) throw error
}

/** 保存简要 Profile 到 profiles 表 */
export async function saveProfile(userId: string, profile: AppData['profile']) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    data: profile as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString()
  })
  if (error) throw error
}

// ==================== nutrition_logs ====================

export async function saveNutritionLog(userId: string, food: FoodLog) {
  if (!supabase) return
  const { error } = await supabase.from('nutrition_logs').insert({
    user_id: userId,
    logged_at: food.loggedDate
      ? new Date(food.loggedDate + 'T12:00:00').toISOString()
      : new Date().toISOString(),
    data: food as unknown as Record<string, unknown>
  })
  if (error) throw error
}

export async function loadNutritionLogs(userId: string): Promise<FoodLog[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('data')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? [])
    .map(row => row.data as FoodLog)
    .filter(Boolean)
}

// ==================== daily_checkins ====================

export async function saveDailyCheckin(userId: string, checkin: AppData['checkin'], logDate?: string) {
  if (!supabase) return
  const { error } = await supabase.from('daily_checkins').upsert({
    user_id: userId,
    log_date: logDate || new Date().toISOString().slice(0, 10),
    data: checkin as unknown as Record<string, unknown>
  }, { onConflict: 'user_id, log_date' })
  if (error) throw error
}

export async function loadLatestCheckin(userId: string): Promise<AppData['checkin'] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('daily_checkins')
    .select('data')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.data as AppData['checkin']) ?? null
}

// ==================== body_metrics ====================

/** 保存一条身体数据（支持自定义日期） */
export async function saveBodyMetricsEntry(userId: string, measuredAt: string, weightKg: number, waistCm?: number) {
  if (!supabase) return
  const { error } = await supabase.from('body_metrics').upsert({
    user_id: userId,
    measured_at: measuredAt,
    weight_kg: weightKg,
    waist_cm: waistCm ?? null,
    data: {}
  }, { onConflict: 'user_id, measured_at' })
  if (error) throw error
}

/** 加载 body_metrics 中的所有记录，按日期升序返回 */
export async function loadBodyMetricsData(userId: string): Promise<AppData['weightHistory']> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('body_metrics')
    .select('measured_at, weight_kg, waist_cm')
    .eq('user_id', userId)
    .order('measured_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(row => ({
    date: row.measured_at,
    weight: row.weight_kg ?? 0,
    waist: row.waist_cm ?? 0
  }))
}

// ==================== workout_sessions ====================

export async function saveWorkoutSession(
  userId: string,
  session: {
    sessionDate: string
    status: string
    plan: AppData['plan']
    completedExercises: string[]
    completedCardio: boolean
    feedback?: string
  }
) {
  if (!supabase) return
  const { error } = await supabase.from('workout_sessions').insert({
    user_id: userId,
    session_date: session.sessionDate,
    status: session.status,
    data: {
      plan: session.plan,
      completedExercises: session.completedExercises,
      completedCardio: session.completedCardio,
      feedback: session.feedback || ''
    }
  })
  if (error) throw error
}

export async function loadWorkoutSessions(userId: string, maxDays = 30) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('session_date, status, data')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(maxDays)
  if (error) throw error
  return data ?? []
}

// ==================== weekly_reports ====================

export async function saveWeeklyReport(userId: string, weekStart: string, reportData: Record<string, unknown>) {
  if (!supabase) return
  const { error } = await supabase.from('weekly_reports').upsert({
    user_id: userId,
    week_start: weekStart,
    data: reportData
  }, { onConflict: 'user_id, week_start' })
  if (error) throw error
}

// ==================== coach_messages ====================

export async function saveCoachMessage(
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  structuredData?: Record<string, unknown>
) {
  if (!supabase) return
  const { error } = await supabase.from('coach_messages').insert({
    user_id: userId,
    role,
    content,
    structured_data: structuredData ?? null
  })
  if (error) throw error
}

// ==================== 完整数据加载（合并 blob + 单表） ====================

export async function loadAllCloudData(userId: string): Promise<Partial<AppData> | null> {
  if (!supabase) return null

  // 1. 从 user_settings blob 加载完整数据
  const blob = await loadCloudData(userId)

  // 2. 从各独立表加载数据
  const [nutritionLogs, latestCheckin, bodyMetrics] = await Promise.all([
    loadNutritionLogs(userId).catch(() => [] as FoodLog[]),
    loadLatestCheckin(userId).catch(() => null as AppData['checkin'] | null),
    loadBodyMetricsData(userId).catch(() => [] as AppData['weightHistory']),
  ])

  // 没有任何数据
  if (!blob && !nutritionLogs.length && !latestCheckin && !bodyMetrics.length) return null

  // 3. blob 为基础，用独立表数据覆盖对应字段
  const result: Partial<AppData> = { ...blob ?? {} }

  if (nutritionLogs.length > 0) {
    result.foods = nutritionLogs
  }
  if (latestCheckin) {
    result.checkin = latestCheckin
  }
  if (bodyMetrics.length > 0) {
    result.weightHistory = bodyMetrics
    // 用最新的体重更新 profile.weightKg
    const latest = bodyMetrics[bodyMetrics.length - 1]
    if (latest.weight > 0 && result.profile) {
      result.profile = { ...result.profile, weightKg: latest.weight }
    }
  }

  return result
}

import type { AppData } from '../types'
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

export async function loadCloudData(userId: string): Promise<AppData | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_settings').select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.data as AppData) ?? null
}

export async function saveCloudData(userId: string, appData: AppData) {
  if (!supabase) return
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    data: appData,
    updated_at: new Date().toISOString()
  })
  if (error) throw error
}

export async function saveProfile(userId: string, profile: AppData['profile']) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    data: profile as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString()
  })
  if (error) throw error
}

export async function saveBodyMetrics(userId: string, weightKg: number, waistCm?: number) {
  if (!supabase) return
  const { error } = await supabase.from('body_metrics').upsert({
    user_id: userId,
    measured_at: new Date().toISOString().slice(0, 10),
    weight_kg: weightKg,
    waist_cm: waistCm ?? null,
    data: {}
  }, { onConflict: 'user_id, measured_at' })
  if (error) throw error
}

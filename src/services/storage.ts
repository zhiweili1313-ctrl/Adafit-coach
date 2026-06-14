import type { AppData } from '../types'
import { createDefaultData } from '../data/defaults'

const LEGACY_KEY = 'adaptive-fit-coach-v1'
const ACTIVE_USER_KEY = 'adaptive-fit-active-user'
const USERS_KEY = 'adaptive-fit-users'
const CREDENTIALS_KEY = 'adaptive-fit-credentials'

const normalizeUsername = (username: string) => username.trim().toLowerCase()
const userDataKey = (username: string) => `adaptive-fit-coach-user:${encodeURIComponent(normalizeUsername(username))}`

export function getActiveUsername() {
  return localStorage.getItem(ACTIVE_USER_KEY) || ''
}

export function listLocalUsers(): string[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') } catch { return [] }
}

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('')
}

export async function loginLocalUser(username: string, password: string) {
  const clean = username.trim()
  if (!clean) throw new Error('请输入用户名')
  const users = listLocalUsers()
  const existing = users.find(user => normalizeUsername(user) === normalizeUsername(clean))
  if (!existing) throw new Error('没有找到这个用户名，请先注册')
  const credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}') as Record<string, string>
  if (credentials[normalizeUsername(existing)] !== await hashPassword(password)) throw new Error('账号或密码错误')
  localStorage.setItem(ACTIVE_USER_KEY, existing)
  return existing
}

export async function registerLocalUser(username: string, password: string, name: string) {
  const clean = username.trim()
  if (clean.length < 2) throw new Error('用户名至少需要 2 个字符')
  const users = listLocalUsers()
  if (users.some(user => normalizeUsername(user) === normalizeUsername(clean))) throw new Error('用户名已存在，请直接登录')
  const legacy = users.length === 0 ? localStorage.getItem(LEGACY_KEY) : null
  let initial = createDefaultData()
  if (legacy) {
    try { initial = { ...initial, ...JSON.parse(legacy) } } catch { /* Keep fresh defaults. */ }
  }
  initial.profile = { ...initial.profile, name: name.trim() || clean }
  localStorage.setItem(userDataKey(clean), JSON.stringify(initial))
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, clean]))
  const credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}') as Record<string, string>
  credentials[normalizeUsername(clean)] = await hashPassword(password)
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
  localStorage.setItem(ACTIVE_USER_KEY, clean)
  return clean
}

export function logoutLocalUser() {
  localStorage.removeItem(ACTIVE_USER_KEY)
}

export function loadData(username = getActiveUsername()): AppData {
  try {
    const saved = username ? localStorage.getItem(userDataKey(username)) : null
    if (!saved) return createDefaultData()
    const defaults = createDefaultData()
    const parsed = JSON.parse(saved) as Partial<AppData>
    const parsedFoods = parsed.foods || []
    const cleanedFoods = parsedFoods.filter(food => !((food.id === 'f1' && food.name === '燕麦鸡蛋早餐') || (food.id === 'f2' && food.name === '鸡胸肉糙米饭')))
    const demoWeights = new Map([['06/08', 84.8], ['06/09', 84.6], ['06/10', 84.5], ['06/11', 84.3], ['06/12', 84.2], ['06/13', 84.1], ['06/14', 84]])
    const cleanedWeightHistory = (parsed.weightHistory || []).filter(item => demoWeights.get(item.date) !== item.weight)
    const checkin = parsed.checkin ? { ...defaults.checkin, ...parsed.checkin } : defaults.checkin
    const isDemoCheckin = checkin.waterMl === 1200 && checkin.sleepHours === 6.5 && checkin.soreness === '背部轻微'
    if (isDemoCheckin) {
      checkin.waterMl = 0
      checkin.sleepHours = 0
      checkin.soreness = ''
    }
    return {
      ...defaults,
      ...parsed,
      plan: { ...defaults.plan, ...parsed.plan, cardio: { ...defaults.plan.cardio, ...parsed.plan?.cardio } },
      checkin,
      foods: cleanedFoods.map(food => ({ ...food, loggedDate: food.loggedDate || new Date().toISOString().slice(0, 10) })),
      weightHistory: cleanedWeightHistory,
      weeklySchedule: parsed.weeklySchedule?.length ? parsed.weeklySchedule : defaults.weeklySchedule
    }
  } catch {
    return createDefaultData()
  }
}

export function saveData(data: AppData, username = getActiveUsername()) {
  if (!username) return
  localStorage.setItem(userDataKey(username), JSON.stringify(data))
}

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `adaptive-fit-coach-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

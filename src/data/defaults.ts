import type { AppData, Profile } from '../types'
import { exercises } from './exercises'

export const defaultProfile: Profile = {
  name: 'Alex', gender: '男', age: 28, heightCm: 183, weightKg: 84, targetWeightKg: 80,
  goalType: '增肌减脂', goalWeeks: 8, desiredResult: '更清晰的身体线条', quickResult: false,
  trainingLevel: '中级', weeklyTrainingDays: 4, sessionDuration: 60, trainingLocation: '健身房',
  equipment: ['杠铃', '哑铃', '绳索机', '高位下拉机', '深蹲架'], dislikedExercises: '',
  injuryNotes: '', sleepTime: '23:30', wakeTime: '07:00', workStress: 3, dailySteps: 7000,
  regularDiet: true, eatsOutOften: false, dietaryPreference: '均衡饮食', dislikedFoods: '',
  calorieTarget: 2300, proteinTarget: 170, waterTarget: 2500
}

export const createDefaultData = (): AppData => ({
  profile: defaultProfile,
  checkin: { sleepHours: 0, stress: 3, fatigue: 3, hunger: 3, motivation: '一般', availableMinutes: 60, soreness: '', pain: '', ateOut: false, drankAlcohol: false, wantsCardio: false, cardioType: '跑步机坡度走', waterMl: 0, note: '' },
  foods: [],
  completedExercises: [],
  completedCardio: false,
  favoriteExercises: ['pulldown'],
  plan: {
    trainingType: 'Pull', focus: '背部与肱二头肌', coachMessage: '今天练背并完成一段轻有氧，释放工作学习后的紧张感。', intensity: 'medium', duration: 55,
    reason: '昨晚睡眠 6.5 小时，疲劳中等，今天保持训练但暂不冲重量。',
    exercises: exercises.filter(e => ['pulldown', 'row', 'curl'].includes(e.id)),
    calorieTarget: 2300, proteinTarget: 170, waterTarget: 2500, volumeChange: -10,
    minimumTask: '蛋白质达到 150g，喝水 2L，完成 20 分钟保底训练。',
    warnings: [],
    cardio: { enabled: true, type: '坡度走', duration: 15, intensity: '低中强度', target: '心率保持在可正常说短句的范围' }
  },
  onboarded: false,
  weightHistory: [],
  adjustmentLogs: [],
  weeklySchedule: createWeeklySchedule()
})

function createWeeklySchedule() {
  const queue = [
    ['Pull', '背部与肱二头肌', 55, 15], ['Push', '胸、肩与肱三头肌', 60, 15],
    ['Legs', '腿部与臀部', 60, 10], ['Recovery', '恢复、活动度与步行', 35, 25],
    ['Pull', '背部与肱二头肌', 55, 15], ['Push', '胸、肩与肱三头肌', 60, 15],
    ['Rest', '休息与轻松步行', 20, 20]
  ] as const
  return queue.map(([trainingType, focus, duration, cardioMinutes], index) => {
    const date = new Date(); date.setDate(date.getDate() + index)
    return {
      date: date.toISOString().slice(0, 10),
      weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date),
      trainingType, focus, duration, cardioMinutes,
      status: index === 0 ? 'today' as const : trainingType === 'Rest' ? 'rest' as const : 'upcoming' as const
    }
  })
}

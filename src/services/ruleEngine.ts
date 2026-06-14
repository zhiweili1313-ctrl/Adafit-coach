import type { Checkin, DailyPlan, Profile } from '../types'
import { exercises } from '../data/exercises'

const byIds = (ids: string[]) => exercises.filter(item => ids.includes(item.id))

export function calculateTargets(profile: Profile) {
  const bmr = profile.gender === '女'
    ? 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161
    : 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5
  const maintenance = Math.round(bmr * (profile.weeklyTrainingDays >= 4 ? 1.55 : 1.4) / 50) * 50
  const calories = profile.goalType === '减脂' || profile.goalType === '增肌减脂'
    ? maintenance - 350
    : profile.goalType === '增肌' ? maintenance + 200 : maintenance
  return {
    calories: Math.max(1400, calories),
    protein: Math.round(profile.weightKg * (profile.goalType === '提升体能' ? 1.6 : 2)),
    water: Math.round(profile.weightKg * 32 / 100) * 100
  }
}

export function generateRulePlan(profile: Profile, checkin: Checkin, queueIndex = 1): DailyPlan {
  const queue = ['Push', 'Pull', 'Legs'] as const
  let trainingType: DailyPlan['trainingType'] = queue[queueIndex % queue.length]
  let intensity: DailyPlan['intensity'] = 'medium'
  let volumeChange = 0
  const reasons: string[] = []
  const warnings: string[] = []

  if (checkin.availableMinutes === 0 || checkin.motivation === '不想练') {
    trainingType = 'Rest'
    intensity = 'low'
    reasons.push('今天没有可用训练时间，训练队列顺延')
  } else if (checkin.pain.trim()) {
    trainingType = 'Recovery'
    intensity = 'low'
    volumeChange = -40
    reasons.push(`记录到${checkin.pain}不适，优先恢复并避开相关动作`)
    warnings.push('若疼痛明显或持续，请停止相关动作并咨询专业人士。')
  } else {
    if (checkin.sleepHours < 6) {
      intensity = 'low'
      volumeChange -= 20
      reasons.push('睡眠不足 6 小时，不建议加重量')
    }
    if (checkin.fatigue >= 4) {
      intensity = 'low'
      volumeChange -= 20
      reasons.push('疲劳较高，训练量下调')
    }
    if (checkin.availableMinutes === 20) {
      volumeChange = Math.min(volumeChange, -40)
      reasons.push('按 20 分钟生成保底训练')
    }
    if (checkin.motivation === '想上强度' && checkin.fatigue <= 2 && checkin.sleepHours >= 7) {
      intensity = 'high'
      reasons.push('恢复良好且训练意愿强，可小幅提高强度')
    }
  }

  const ids = trainingType === 'Push' ? ['bench', 'shoulder', 'pushdown']
    : trainingType === 'Pull' ? ['pulldown', 'row', 'curl']
    : trainingType === 'Legs' ? ['squat', 'rdl']
    : []
  const focus = trainingType === 'Push' ? '胸、肩与肱三头肌' : trainingType === 'Pull' ? '背部与肱二头肌' : trainingType === 'Legs' ? '腿部与臀部' : trainingType === 'Recovery' ? '恢复与活动度' : '休息与恢复'
  const wantsFatLoss = profile.goalType === '减脂' || profile.goalType === '增肌减脂'
  const cardioEnabled = checkin.wantsCardio && checkin.availableMinutes >= 20 && checkin.fatigue < 5 && !checkin.pain.trim()
  const cardioDuration = cardioEnabled ? (wantsFatLoss ? (checkin.fatigue >= 4 ? 10 : 20) : 10) : 0
  return {
    trainingType, focus,
    coachMessage: trainingType === 'Rest' ? '今天优先恢复，保持饮食和步数，训练队列不会跳过。' : `今天重点练${focus}，${cardioDuration ? `再完成 ${cardioDuration} 分钟有氧` : '专注力量训练'}，按你的恢复状态稳步推进。`,
    intensity,
    duration: trainingType === 'Rest' ? 0 : Math.min(checkin.availableMinutes, profile.sessionDuration),
    reason: reasons.join('；') || '恢复状态稳定，按训练队列正常推进。',
    exercises: byIds(ids),
    calorieTarget: profile.calorieTarget,
    proteinTarget: profile.proteinTarget,
    waterTarget: profile.waterTarget,
    volumeChange,
    minimumTask: trainingType === 'Rest'
      ? `蛋白质 ${profile.proteinTarget}g，喝水 ${profile.waterTarget / 1000}L，散步 20 分钟。`
      : `蛋白质至少 ${Math.max(profile.proteinTarget - 20, 100)}g，喝水 2L，完成 20 分钟保底训练。`,
    warnings,
    cardio: {
      enabled: cardioDuration > 0,
      type: checkin.cardioType || (trainingType === 'Legs' ? '健身单车' : '跑步机坡度走'),
      duration: cardioDuration,
      intensity: checkin.fatigue >= 4 ? '低强度' : '低中强度',
      target: '保持能说短句的呼吸节奏，不追求力竭'
    }
  }
}

export function dailyScore(calories: number, protein: number, water: number, completed: number, total: number, sleep: number, targets = { calories: 2300, protein: 170, water: 2500 }) {
  const calorieScore = calories <= 0 ? 0 : Math.max(0, 25 - Math.abs(calories - targets.calories) / Math.max(1, targets.calories) * 25)
  const proteinScore = Math.min(25, protein / Math.max(1, targets.protein) * 25)
  const workoutScore = total ? completed / total * 25 : 0
  const sleepScore = Math.min(15, sleep / 8 * 15)
  const waterScore = Math.min(10, water / Math.max(1, targets.water) * 10)
  return Math.round(calorieScore + proteinScore + workoutScore + sleepScore + waterScore)
}

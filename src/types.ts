export type Tab = 'home' | 'workout' | 'nutrition' | 'progress' | 'library'
export type GoalType = '减脂' | '增肌' | '增肌减脂' | '维持体型' | '提升体能'
export type TrainingType = 'Push' | 'Pull' | 'Legs' | 'Recovery' | 'Rest'

export interface Profile {
  name: string
  gender: string
  age: number
  heightCm: number
  weightKg: number
  targetWeightKg: number
  goalType: GoalType
  goalWeeks: number
  desiredResult: string
  quickResult: boolean
  trainingLevel: string
  weeklyTrainingDays: number
  sessionDuration: number
  trainingLocation: string
  equipment: string[]
  dislikedExercises: string
  injuryNotes: string
  sleepTime: string
  wakeTime: string
  workStress: number
  dailySteps: number
  regularDiet: boolean
  eatsOutOften: boolean
  dietaryPreference: string
  dislikedFoods: string
  calorieTarget: number
  proteinTarget: number
  waterTarget: number
}

export interface Checkin {
  sleepHours: number
  stress: number
  fatigue: number
  hunger: number
  motivation: string
  availableMinutes: number
  soreness: string
  pain: string
  ateOut: boolean
  drankAlcohol: boolean
  wantsCardio: boolean
  cardioType: string
  waterMl: number
  note: string
}

export interface Exercise {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  risk: string
  sets: number
  reps: string
  weight: string
  lastWeight: string
  cues: string
  steps: string[]
  mistakes: string[]
  alternatives: string[]
}

export interface FoodLog {
  id: string
  loggedDate?: string
  name: string
  meal: string
  amount: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ateOut: boolean
  estimated?: boolean
  sourceNote?: string
}

export interface DailyPlan {
  trainingType: TrainingType
  focus: string
  coachMessage: string
  intensity: 'low' | 'medium' | 'high'
  duration: number
  reason: string
  exercises: Exercise[]
  calorieTarget: number
  proteinTarget: number
  waterTarget: number
  volumeChange: number
  minimumTask: string
  warnings: string[]
  cardio: {
    enabled: boolean
    type: string
    duration: number
    intensity: string
    target: string
  }
}

export interface ScheduleDay {
  date: string
  weekday: string
  trainingType: TrainingType
  focus: string
  duration: number
  cardioMinutes: number
  status: 'today' | 'upcoming' | 'completed' | 'rest'
}

export interface NutritionPlan {
  summary: string
  meals: { meal: string; targetCalories: number; targetProtein: number; suggestion: string }[]
  tips: string[]
}

export interface AppData {
  profile: Profile
  checkin: Checkin
  foods: FoodLog[]
  completedExercises: string[]
  completedCardio: boolean
  favoriteExercises: string[]
  plan: DailyPlan
  onboarded: boolean
  weightHistory: { date: string; weight: number; waist: number }[]
  adjustmentLogs: { date: string; reason: string; change: string }[]
  weeklySchedule: ScheduleDay[]
}

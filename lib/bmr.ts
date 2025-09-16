export interface BMRInput {
  gender: "male" | "female"
  age: number // years
  weight: number // kg
  height: number // cm
  activityLevel: number // activity multiplier
}

export interface BMRResult {
  bmr: number // Basal Metabolic Rate
  tdee: number // Total Daily Energy Expenditure
  macros: {
    protein: { grams: number; kcal: number; percentage: number }
    carb: { grams: number; kcal: number; percentage: number }
    fat: { grams: number; kcal: number; percentage: number }
  }
}

// Activity level multipliers
export const ACTIVITY_LEVELS = {
  sedentary: { value: 1.2, label: "นั่งทำงาน ไม่ออกกำลังกาย", description: "งานโต๊ะ ไม่ค่อยเคลื่อนไหว" },
  light: { value: 1.375, label: "ออกกำลังกายเบา ๆ", description: "1-3 วัน/สัปดาห์" },
  moderate: { value: 1.55, label: "ออกกำลังกายปานกลาง", description: "3-5 วัน/สัปดาห์" },
  active: { value: 1.725, label: "ออกกำลังกายหนัก", description: "6-7 วัน/สัปดาห์" },
  veryActive: { value: 1.9, label: "ออกกำลังกายหนักมาก", description: "วันละ 2 ครั้ง หรืองานหนัก" },
} as const

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) − 161
 */
export function calculateBMR(input: BMRInput): BMRResult {
  const { gender, age, weight, height, activityLevel } = input

  // Validate inputs
  if (age <= 0 || weight <= 0 || height <= 0) {
    throw new Error("อายุ น้ำหนัก และส่วนสูงต้องมีค่ามากกว่า 0")
  }

  if (age > 120) {
    throw new Error("อายุไม่ควรเกิน 120 ปี")
  }

  if (weight > 500) {
    throw new Error("น้ำหนักไม่ควรเกิน 500 กิโลกรัม")
  }

  if (height > 300) {
    throw new Error("ส่วนสูงไม่ควรเกิน 300 เซนติเมตร")
  }

  // Calculate BMR using Mifflin-St Jeor equation
  let bmr = 10 * weight + 6.25 * height - 5 * age

  if (gender === "male") {
    bmr += 5
  } else {
    bmr -= 161
  }

  // Calculate TDEE
  const tdee = bmr * activityLevel

  // Calculate recommended macros (moderate approach)
  // Protein: 1.6-2.2g per kg body weight (average 1.9g/kg)
  // Fat: 20-35% of total calories (average 25%)
  // Carbs: remaining calories
  const proteinGrams = Math.round(weight * 1.9)
  const proteinKcal = proteinGrams * 4
  const proteinPercentage = Math.round((proteinKcal / tdee) * 100)

  const fatPercentage = 25
  const fatKcal = Math.round(tdee * (fatPercentage / 100))
  const fatGrams = Math.round(fatKcal / 9)

  const carbKcal = Math.round(tdee - proteinKcal - fatKcal)
  const carbGrams = Math.round(carbKcal / 4)
  const carbPercentage = Math.round((carbKcal / tdee) * 100)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    macros: {
      protein: {
        grams: proteinGrams,
        kcal: proteinKcal,
        percentage: proteinPercentage,
      },
      carb: {
        grams: carbGrams,
        kcal: carbKcal,
        percentage: carbPercentage,
      },
      fat: {
        grams: fatGrams,
        kcal: fatKcal,
        percentage: fatPercentage,
      },
    },
  }
}

/**
 * Get activity level info by value
 */
export function getActivityLevelInfo(value: number) {
  return Object.values(ACTIVITY_LEVELS).find((level) => level.value === value) || ACTIVITY_LEVELS.sedentary
}

/**
 * Calculate ideal weight range using BMI
 */
export function calculateIdealWeightRange(height: number): { min: number; max: number } {
  const heightM = height / 100
  const minBMI = 18.5
  const maxBMI = 24.9

  return {
    min: Math.round(minBMI * heightM * heightM),
    max: Math.round(maxBMI * heightM * heightM),
  }
}

/**
 * Calculate current BMI
 */
export function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  const heightM = height / 100
  const bmi = weight / (heightM * heightM)

  let category = ""
  if (bmi < 18.5) {
    category = "น้ำหนักน้อย"
  } else if (bmi < 25) {
    category = "น้ำหนักปกติ"
  } else if (bmi < 30) {
    category = "น้ำหนักเกิน"
  } else {
    category = "อ้วน"
  }

  return {
    bmi: Math.round(bmi * 10) / 10,
    category,
  }
}

/**
 * Estimate daily calorie needs for weight goals
 */
export function calculateWeightGoalCalories(
  tdee: number,
  goal: "lose" | "maintain" | "gain",
  rate: "slow" | "moderate" | "fast" = "moderate",
): { dailyKcal: number; weeklyChange: number; description: string } {
  let calorieAdjustment = 0
  let weeklyChange = 0
  let description = ""

  switch (goal) {
    case "lose":
      switch (rate) {
        case "slow":
          calorieAdjustment = -250 // 0.25 kg/week
          weeklyChange = -0.25
          description = "ลดน้ำหนักช้า ๆ (0.25 กก./สัปดาห์)"
          break
        case "moderate":
          calorieAdjustment = -500 // 0.5 kg/week
          weeklyChange = -0.5
          description = "ลดน้ำหนักปานกลาง (0.5 กก./สัปดาห์)"
          break
        case "fast":
          calorieAdjustment = -750 // 0.75 kg/week
          weeklyChange = -0.75
          description = "ลดน้ำหนักเร็ว (0.75 กก./สัปดาห์)"
          break
      }
      break
    case "gain":
      switch (rate) {
        case "slow":
          calorieAdjustment = 250 // 0.25 kg/week
          weeklyChange = 0.25
          description = "เพิ่มน้ำหนักช้า ๆ (0.25 กก./สัปดาห์)"
          break
        case "moderate":
          calorieAdjustment = 500 // 0.5 kg/week
          weeklyChange = 0.5
          description = "เพิ่มน้ำหนักปานกลาง (0.5 กก./สัปดาห์)"
          break
        case "fast":
          calorieAdjustment = 750 // 0.75 kg/week
          weeklyChange = 0.75
          description = "เพิ่มน้ำหนักเร็ว (0.75 กก./สัปดาห์)"
          break
      }
      break
    case "maintain":
    default:
      calorieAdjustment = 0
      weeklyChange = 0
      description = "รักษาน้ำหนักปัจจุบัน"
      break
  }

  return {
    dailyKcal: Math.round(tdee + calorieAdjustment),
    weeklyChange,
    description,
  }
}

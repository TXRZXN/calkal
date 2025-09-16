import Dexie, { type EntityTable } from "dexie"

// Database interfaces
export interface Food {
  id: string
  name_th: string
  name_en: string
  category: string
  kcal_per_100g: number
  protein: number
  carb: number
  fat: number
  fiber: number
  tags: string[]
}

export interface MealEntry {
  id?: number
  food_id: string
  food_name: string
  grams: number
  kcal: number
  protein: number
  carb: number
  fat: number
  fiber: number
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
  created_at: Date
}

export interface UserProfile {
  id?: number
  gender: "male" | "female"
  age: number
  weight: number // kg
  height: number // cm
  activity_level: number // 1.2, 1.375, 1.55, 1.725, 1.9
  bmr: number
  tdee: number
  daily_kcal_goal: number
  updated_at: Date
}

// Database schema
const db = new Dexie("CalCamDB") as Dexie & {
  foods: EntityTable<Food, "id">
  entries: EntityTable<MealEntry, "id">
  profile: EntityTable<UserProfile, "id">
}

db.version(1).stores({
  foods: "id, name_th, name_en, category, *tags",
  entries: "++id, food_id, date, time, created_at",
  profile: "++id, updated_at",
})

// Seed data loader
export async function seedDatabase() {
  try {
    const foodCount = await db.foods.count()
    if (foodCount > 0) {
      console.log("Database already seeded")
      return
    }

    console.log("Seeding database with Thai foods...")
    const response = await fetch("/data/foods.th.seed.json")
    const seedData = await response.json()

    await db.foods.bulkAdd(seedData.foods)
    console.log(`Seeded ${seedData.foods.length} Thai foods`)
  } catch (error) {
    console.error("Error seeding database:", error)
  }
}

// Food search functions
export async function searchFoods(query: string, limit = 20): Promise<Food[]> {
  if (!query.trim()) {
    return await db.foods.limit(limit).toArray()
  }

  const searchTerm = query.toLowerCase()

  // Search in Thai name, English name, and tags
  const results = await db.foods
    .filter(
      (food) =>
        food.name_th.toLowerCase().includes(searchTerm) ||
        food.name_en.toLowerCase().includes(searchTerm) ||
        food.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
        food.category.toLowerCase().includes(searchTerm),
    )
    .limit(limit)
    .toArray()

  return results
}

export async function getFoodById(id: string): Promise<Food | undefined> {
  return await db.foods.get(id)
}

export async function getFoodsByCategory(category: string): Promise<Food[]> {
  return await db.foods.where("category").equals(category).toArray()
}

// Nutrition calculation helpers
export function calculateNutrition(food: Food, grams: number) {
  const multiplier = grams / 100
  return {
    kcal: Math.round(food.kcal_per_100g * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carb: Math.round(food.carb * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    fiber: Math.round(food.fiber * multiplier * 10) / 10,
  }
}

// Meal entry functions
export async function addMealEntry(food: Food, grams: number, date?: string, time?: string): Promise<number> {
  const nutrition = calculateNutrition(food, grams)
  const now = new Date()

  const entry: MealEntry = {
    food_id: food.id,
    food_name: food.name_th,
    grams,
    ...nutrition,
    date: date || now.toISOString().split("T")[0],
    time: time || now.toTimeString().slice(0, 5),
    created_at: now,
  }

  return await db.entries.add(entry)
}

export async function getMealEntriesByDate(date: string): Promise<MealEntry[]> {
  return await db.entries
    .orderBy("time")
    .filter((entry) => entry.date === date)
    .toArray()
}

export async function getDailySummary(date: string) {
  const entries = await getMealEntriesByDate(date)

  const summary = entries.reduce(
    (acc, entry) => ({
      total_kcal: acc.total_kcal + entry.kcal,
      total_protein: acc.total_protein + entry.protein,
      total_carb: acc.total_carb + entry.carb,
      total_fat: acc.total_fat + entry.fat,
      total_fiber: acc.total_fiber + entry.fiber,
      meal_count: acc.meal_count + 1,
    }),
    {
      total_kcal: 0,
      total_protein: 0,
      total_carb: 0,
      total_fat: 0,
      total_fiber: 0,
      meal_count: 0,
    },
  )

  return {
    ...summary,
    total_protein: Math.round(summary.total_protein * 10) / 10,
    total_carb: Math.round(summary.total_carb * 10) / 10,
    total_fat: Math.round(summary.total_fat * 10) / 10,
    total_fiber: Math.round(summary.total_fiber * 10) / 10,
    entries,
  }
}

export async function deleteMealEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}

export async function updateMealEntry(id: number, updates: Partial<MealEntry>): Promise<number> {
  return await db.entries.update(id, updates)
}

// User profile functions
export async function saveUserProfile(profile: Omit<UserProfile, "id" | "updated_at">): Promise<number> {
  const profileData: UserProfile = {
    ...profile,
    updated_at: new Date(),
  }

  // Clear existing profile and add new one
  await db.profile.clear()
  return await db.profile.add(profileData)
}

export async function getUserProfile(): Promise<UserProfile | undefined> {
  return await db.profile.orderBy("updated_at").last()
}

// Storage management
export async function getStorageInfo() {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      quota: estimate.quota,
      usage: estimate.usage,
      available: estimate.quota ? estimate.quota - (estimate.usage || 0) : null,
      usageDetails: estimate.usageDetails,
    }
  }
  return null
}

// Database cleanup
export async function clearOldEntries(daysToKeep = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  const cutoffString = cutoffDate.toISOString().split("T")[0]

  const deletedCount = await db.entries.where("date").below(cutoffString).delete()

  console.log(`Cleaned up ${deletedCount} old entries`)
  return deletedCount
}

// Initialize database
export async function initializeDatabase() {
  try {
    await db.open()
    await seedDatabase()
    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Failed to initialize database:", error)
    throw error
  }
}

export default db

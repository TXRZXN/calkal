"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import {
  getMealEntriesByDate,
  updateMealEntry,
  deleteMealEntry,
  getFoodById,
  type MealEntry,
  type Food,
} from "@/lib/db"
import { calculateNutrition } from "@/lib/db"
import { useDatabase } from "@/components/database-provider"

export default function EditEntryPage() {
  const [entry, setEntry] = useState<MealEntry | null>(null)
  const [food, setFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState("")
  const [customTime, setCustomTime] = useState("")
  const [customDate, setCustomDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const params = useParams()
  const entryId = Number.parseInt(params.id as string)
  const { isReady } = useDatabase()

  useEffect(() => {
    if (isReady && entryId) {
      loadEntry()
    }
  }, [isReady, entryId])

  const loadEntry = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get all entries for today and find the specific one
      // This is a workaround since we don't have a direct getEntryById function
      const today = new Date().toISOString().split("T")[0]
      const entries = await getMealEntriesByDate(today)
      const foundEntry = entries.find((e) => e.id === entryId)

      if (!foundEntry) {
        // Try yesterday and day before if not found today
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayEntries = await getMealEntriesByDate(yesterday.toISOString().split("T")[0])
        const foundYesterday = yesterdayEntries.find((e) => e.id === entryId)

        if (foundYesterday) {
          setEntry(foundYesterday)
          setGrams(foundYesterday.grams.toString())
          setCustomTime(foundYesterday.time)
          setCustomDate(foundYesterday.date)
        } else {
          throw new Error("ไม่พบรายการที่ต้องการแก้ไข")
        }
      } else {
        setEntry(foundEntry)
        setGrams(foundEntry.grams.toString())
        setCustomTime(foundEntry.time)
        setCustomDate(foundEntry.date)
      }

      // Load food details
      if (foundEntry?.food_id) {
        const foodData = await getFoodById(foundEntry.food_id)
        setFood(foodData || null)
      }
    } catch (error) {
      console.error("Failed to load entry:", error)
      setError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = useCallback(async () => {
    if (!entry || !food) return

    const gramsNum = Number.parseFloat(grams)
    if (isNaN(gramsNum) || gramsNum <= 0) {
      setError("กรุณาใส่น้ำหนักที่ถูกต้อง")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // Calculate new nutrition values
      const nutrition = calculateNutrition(food, gramsNum)

      // Update entry
      await updateMealEntry(entry.id!, {
        grams: gramsNum,
        kcal: nutrition.kcal,
        protein: nutrition.protein,
        carb: nutrition.carb,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        date: customDate,
        time: customTime,
      })

      router.push("/history?updated=true")
    } catch (error) {
      console.error("Save error:", error)
      setError("ไม่สามารถบันทึกข้อมูลได้")
    } finally {
      setIsSaving(false)
    }
  }, [entry, food, grams, customDate, customTime, router])

  const handleDelete = useCallback(async () => {
    if (!entry || !confirm("ต้องการลบรายการนี้หรือไม่?")) return

    try {
      await deleteMealEntry(entry.id!)
      router.push("/history?deleted=true")
    } catch (error) {
      console.error("Delete error:", error)
      setError("ไม่สามารถลบรายการได้")
    }
  }, [entry, router])

  // Calculate nutrition preview
  const nutritionPreview = food && grams ? calculateNutrition(food, Number.parseFloat(grams) || 0) : null

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>กำลังโหลด...</p>
        </div>
      </main>
    )
  }

  if (!entry || !food) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">ไม่พบรายการที่ต้องการแก้ไข</p>
          <Link href="/history">
            <Button>กลับไปประวัติ</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">แก้ไขมื้ออาหาร</h1>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Food Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">รายละเอียดอาหาร</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{food.name_th}</h3>
                <p className="text-sm text-muted-foreground">{food.name_en}</p>
                <p className="text-sm text-muted-foreground">หมวด: {food.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">แคลอรี่</div>
                  <div>{food.kcal_per_100g} kcal/100g</div>
                </div>
                <div>
                  <div className="font-medium">โปรตีน</div>
                  <div>{food.protein} g/100g</div>
                </div>
                <div>
                  <div className="font-medium">คาร์โบไฮเดรต</div>
                  <div>{food.carb} g/100g</div>
                </div>
                <div>
                  <div className="font-medium">ไขมัน</div>
                  <div>{food.fat} g/100g</div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grams">น้ำหนัก (กรัม)</Label>
                  <Input
                    id="grams"
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    placeholder="100"
                    min="1"
                    max="2000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">วันที่</Label>
                    <Input
                      id="date"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">เวลา</Label>
                    <Input id="time" type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Nutrition Preview */}
              {nutritionPreview && (
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="text-sm font-medium mb-2">ค่าโภชนาการที่จะได้รับ:</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-emerald-600">{nutritionPreview.kcal}</div>
                      <div className="text-muted-foreground">kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-orange-600">{nutritionPreview.protein}g</div>
                      <div className="text-muted-foreground">โปรตีน</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-yellow-600">{nutritionPreview.carb}g</div>
                      <div className="text-muted-foreground">คาร์บ</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{nutritionPreview.fat}g</div>
                      <div className="text-muted-foreground">ไขมัน</div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} className="w-full" size="lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    บันทึกการแก้ไข
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

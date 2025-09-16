"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getDailySummary, deleteMealEntry, type MealEntry } from "@/lib/db"
import { useDatabase } from "@/components/database-provider"

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [dailySummary, setDailySummary] = useState({
    total_kcal: 0,
    total_protein: 0,
    total_carb: 0,
    total_fat: 0,
    meal_count: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isReady } = useDatabase()

  useEffect(() => {
    if (isReady) {
      loadDayData(selectedDate)
    }
  }, [selectedDate, isReady])

  const loadDayData = async (date: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const summary = await getDailySummary(date)
      setEntries(summary.entries)
      setDailySummary({
        total_kcal: summary.total_kcal,
        total_protein: summary.total_protein,
        total_carb: summary.total_carb,
        total_fat: summary.total_fat,
        meal_count: summary.meal_count,
      })
    } catch (error) {
      console.error("Failed to load day data:", error)
      setError("ไม่สามารถโหลดข้อมูลได้")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm("ต้องการลบรายการนี้หรือไม่?")) return

    try {
      await deleteMealEntry(entryId)
      await loadDayData(selectedDate) // Reload data
    } catch (error) {
      console.error("Failed to delete entry:", error)
      alert("ไม่สามารถลบรายการได้")
    }
  }

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateString === today.toISOString().split("T")[0]) {
      return "วันนี้"
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "เมื่อวาน"
    } else {
      return date.toLocaleDateString("th-TH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // HH:MM format
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>กำลังโหลด...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">ประวัติการบันทึก</h1>
          <Link href="/entry/new">
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="p-4 space-y-4">
          {/* Date Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-center">
                  <div className="font-semibold">{formatDate(selectedDate)}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedDate).toLocaleDateString("th-TH")}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changeDate(1)}
                  disabled={selectedDate >= new Date().toISOString().split("T")[0]}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Daily Summary */}
          {dailySummary.meal_count > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">สรุปประจำวัน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{dailySummary.total_kcal}</div>
                    <div className="text-sm text-muted-foreground">แคลอรี่</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dailySummary.meal_count}</div>
                    <div className="text-sm text-muted-foreground">มื้อ</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-orange-600">{dailySummary.total_protein}g</div>
                    <div className="text-muted-foreground">โปรตีน</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-600">{dailySummary.total_carb}g</div>
                    <div className="text-muted-foreground">คาร์บ</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{dailySummary.total_fat}g</div>
                    <div className="text-muted-foreground">ไขมัน</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meal Entries */}
          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{entry.food_name}</h3>
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                            {formatTime(entry.time)}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">{entry.grams} กรัม</div>

                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <div className="font-medium text-emerald-600">{entry.kcal}</div>
                            <div className="text-muted-foreground">kcal</div>
                          </div>
                          <div>
                            <div className="font-medium text-orange-600">{entry.protein}g</div>
                            <div className="text-muted-foreground">โปรตีน</div>
                          </div>
                          <div>
                            <div className="font-medium text-yellow-600">{entry.carb}g</div>
                            <div className="text-muted-foreground">คาร์บ</div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">{entry.fat}g</div>
                            <div className="text-muted-foreground">ไขมัน</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 ml-2">
                        <Link href={`/entry/${entry.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => entry.id && handleDeleteEntry(entry.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="text-6xl">📊</div>
                  <div>
                    <h3 className="text-lg font-semibold">ไม่มีข้อมูลในวันนี้</h3>
                    <p className="text-muted-foreground">เริ่มบันทึกอาหารเพื่อดูประวัติการกิน</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Link href="/capture">
                      <Button>ถ่ายรูปอาหาร</Button>
                    </Link>
                    <Link href="/entry/new">
                      <Button variant="outline">เพิ่มเอง</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

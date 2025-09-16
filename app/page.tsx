"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Camera, History, Settings, Plus, Target, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getDailySummary, getUserProfile, type UserProfile } from "@/lib/db"
import { format } from "date-fns"
import { th } from "date-fns/locale"

interface DailySummary {
  total_kcal: number
  total_protein: number
  total_carb: number
  total_fat: number
  total_fiber: number
  meal_count: number
  entries: any[]
}

export default function HomePage() {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), "yyyy-MM-dd")
  const todayThai = format(new Date(), "d MMMM yyyy", { locale: th })

  useEffect(() => {
    async function loadData() {
      try {
        const [dailySummary, userProfile] = await Promise.all([getDailySummary(today), getUserProfile()])
        setSummary(dailySummary)
        setProfile(userProfile || null)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [today])

  const calorieGoal = profile?.daily_kcal_goal || 2000
  const calorieProgress = summary ? Math.min((summary.total_kcal / calorieGoal) * 100, 100) : 0
  const remainingCalories = Math.max(calorieGoal - (summary?.total_kcal || 0), 0)

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-6 rounded-b-3xl shadow-lg">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">CalCam</h1>
            <p className="text-emerald-100">บันทึกแคลจากรูป</p>
            <p className="text-sm text-emerald-200">{todayThai}</p>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Calorie Progress */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="text-4xl font-bold text-emerald-600">
                    {loading ? "..." : summary?.total_kcal || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">จาก {calorieGoal.toLocaleString()} แคลอรี่</div>
                </div>

                <Progress value={calorieProgress} className="h-3" />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">เหลือ {remainingCalories.toLocaleString()} แคล</span>
                  <span className="text-emerald-600 font-medium">{Math.round(calorieProgress)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Breakdown */}
          {summary && summary.meal_count > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  สารอาหารวันนี้
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{summary.total_protein}g</div>
                    <div className="text-xs text-muted-foreground">โปรตีน</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{summary.total_carb}g</div>
                    <div className="text-xs text-muted-foreground">คาร์บ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{summary.total_fat}g</div>
                    <div className="text-xs text-muted-foreground">ไขมัน</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/capture">
              <Button className="w-full h-20 flex-col gap-2 bg-emerald-600 hover:bg-emerald-700" size="lg">
                <Camera className="h-6 w-6" />
                <span>ถ่ายรูป</span>
              </Button>
            </Link>
            <Link href="/entry/new">
              <Button variant="outline" className="w-full h-20 flex-col gap-2 bg-transparent" size="lg">
                <Plus className="h-6 w-6" />
                <span>เพิ่มเอง</span>
              </Button>
            </Link>
          </div>

          {/* Today's Meals */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                มื้ออาหารวันนี้
                {summary && summary.meal_count > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({summary.meal_count} มื้อ)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>กำลังโหลด...</p>
                </div>
              ) : summary && summary.entries.length > 0 ? (
                <div className="space-y-3">
                  {summary.entries.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <div className="font-medium">{entry.food_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.time} • {entry.grams}g
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">{entry.kcal}</div>
                        <div className="text-xs text-muted-foreground">แคล</div>
                      </div>
                    </div>
                  ))}
                  {summary.entries.length > 3 && (
                    <Link href="/history">
                      <Button variant="ghost" className="w-full">
                        ดูทั้งหมด ({summary.entries.length} รายการ)
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <p>ยังไม่มีข้อมูลมื้ออาหาร</p>
                  <p className="text-sm">เริ่มต้นด้วยการถ่ายรูปอาหาร</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          {profile && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  เป้าหมายของคุณ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">BMR</span>
                    <span className="font-medium">{Math.round(profile.bmr)} แคล/วัน</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">TDEE</span>
                    <span className="font-medium">{Math.round(profile.tdee)} แคล/วัน</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">เป้าหมายแคลอรี่</span>
                    <span className="font-bold text-emerald-600">{profile.daily_kcal_goal} แคล/วัน</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="mx-auto max-w-md px-4 py-2">
            <div className="flex justify-around">
              <Button variant="ghost" size="sm" className="flex-col gap-1">
                <div className="h-2 w-2 bg-emerald-600 rounded-full"></div>
                <span className="text-xs">หน้าหลัก</span>
              </Button>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="flex-col gap-1">
                  <History className="h-4 w-4" />
                  <span className="text-xs">ประวัติ</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="flex-col gap-1">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">ตั้งค่า</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

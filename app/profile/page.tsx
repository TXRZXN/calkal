"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Calculator } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getUserProfile, saveUserProfile } from "@/lib/db"
import {
  calculateBMR,
  calculateBMI,
  calculateIdealWeightRange,
  calculateWeightGoalCalories,
  ACTIVITY_LEVELS,
  type BMRInput,
} from "@/lib/bmr"
import { useDatabase } from "@/components/database-provider"

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    gender: "male" as "male" | "female",
    age: "",
    weight: "",
    height: "",
    activity_level: 1.375,
    goal: "maintain" as "lose" | "maintain" | "gain",
    goal_rate: "moderate" as "slow" | "moderate" | "fast",
  })

  const [results, setResults] = useState<{
    bmr: number
    tdee: number
    bmi: { bmi: number; category: string }
    idealWeight: { min: number; max: number }
    goalCalories: { dailyKcal: number; description: string }
  } | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const { isReady } = useDatabase()

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      if (!isReady) return

      try {
        const profile = await getUserProfile()
        if (profile) {
          setFormData({
            gender: profile.gender,
            age: profile.age.toString(),
            weight: profile.weight.toString(),
            height: profile.height.toString(),
            activity_level: profile.activity_level,
            goal: "maintain",
            goal_rate: "moderate",
          })

          // Calculate and show results
          calculateResults({
            gender: profile.gender,
            age: profile.age,
            weight: profile.weight,
            height: profile.height,
            activityLevel: profile.activity_level,
          })
        }
      } catch (error) {
        console.error("Failed to load profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [isReady])

  const calculateResults = (input: BMRInput) => {
    try {
      const bmrResult = calculateBMR(input)
      const bmi = calculateBMI(input.weight, input.height)
      const idealWeight = calculateIdealWeightRange(input.height)
      const goalCalories = calculateWeightGoalCalories(bmrResult.tdee, formData.goal, formData.goal_rate)

      setResults({
        bmr: bmrResult.bmr,
        tdee: bmrResult.tdee,
        bmi,
        idealWeight,
        goalCalories,
      })

      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการคำนวณ")
      setResults(null)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)

    // Auto-calculate when all required fields are filled
    if (newFormData.age && newFormData.weight && newFormData.height) {
      const age = Number.parseInt(newFormData.age)
      const weight = Number.parseFloat(newFormData.weight)
      const height = Number.parseFloat(newFormData.height)

      if (!isNaN(age) && !isNaN(weight) && !isNaN(height)) {
        calculateResults({
          gender: newFormData.gender,
          age,
          weight,
          height,
          activityLevel: newFormData.activity_level,
        })
      }
    }
  }

  const handleSave = async () => {
    if (!results) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const profileData = {
        gender: formData.gender,
        age: Number.parseInt(formData.age),
        weight: Number.parseFloat(formData.weight),
        height: Number.parseFloat(formData.height),
        activity_level: formData.activity_level,
        bmr: results.bmr,
        tdee: results.tdee,
        daily_kcal_goal: results.goalCalories.dailyKcal,
      }

      await saveUserProfile(profileData)
      router.push("/settings?saved=true")
    } catch (error) {
      setError("ไม่สามารถบันทึกข้อมูลได้")
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
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
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">ข้อมูลส่วนตัว</h1>
          <div className="w-16"></div>
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

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลพื้นฐาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">เพศ</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ชาย</SelectItem>
                      <SelectItem value="female">หญิง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">อายุ (ปี)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="25"
                    min="10"
                    max="120"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">น้ำหนัก (กก.)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="65"
                    min="20"
                    max="500"
                    step="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">ส่วนสูง (ซม.)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    placeholder="170"
                    min="100"
                    max="250"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity">ระดับกิจกรรม</Label>
                <Select
                  value={formData.activity_level.toString()}
                  onValueChange={(value) => handleInputChange("activity_level", Number.parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                      <SelectItem key={key} value={level.value.toString()}>
                        <div className="text-left">
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Goal Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">เป้าหมาย</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">เป้าหมายน้ำหนัก</Label>
                <Select value={formData.goal} onValueChange={(value) => handleInputChange("goal", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose">ลดน้ำหนัก</SelectItem>
                    <SelectItem value="maintain">รักษาน้ำหนัก</SelectItem>
                    <SelectItem value="gain">เพิ่มน้ำหนัก</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.goal !== "maintain" && (
                <div className="space-y-2">
                  <Label htmlFor="goal_rate">ความเร็วในการเปลี่ยนแปลง</Label>
                  <Select value={formData.goal_rate} onValueChange={(value) => handleInputChange("goal_rate", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">ช้า (0.25 กก./สัปดาห์)</SelectItem>
                      <SelectItem value="moderate">ปานกลาง (0.5 กก./สัปดาห์)</SelectItem>
                      <SelectItem value="fast">เร็ว (0.75 กก./สัปดาห์)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  ผลการคำนวณ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{results.bmr}</div>
                    <div className="text-sm text-blue-700">BMR (kcal/วัน)</div>
                    <div className="text-xs text-muted-foreground">พลังงานพื้นฐาน</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{results.tdee}</div>
                    <div className="text-sm text-emerald-700">TDEE (kcal/วัน)</div>
                    <div className="text-xs text-muted-foreground">พลังงานรวม</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">BMI</span>
                    <span className="font-medium">
                      {results.bmi.bmi} ({results.bmi.category})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">น้ำหนักที่เหมาะสม</span>
                    <span className="font-medium">
                      {results.idealWeight.min}-{results.idealWeight.max} กก.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="font-semibold text-amber-800">เป้าหมายแคลอรี่</div>
                  <div className="text-2xl font-bold text-amber-600">{results.goalCalories.dailyKcal} kcal/วัน</div>
                  <div className="text-sm text-amber-700">{results.goalCalories.description}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full" size="lg" disabled={!results || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                บันทึกข้อมูล
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}

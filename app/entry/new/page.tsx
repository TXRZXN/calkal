"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Search, Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { searchFoods, addMealEntry, type Food } from "@/lib/db"
import { calculateNutrition } from "@/lib/db"

export default function NewEntryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState("100")
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date()
    return now.toTimeString().slice(0, 5) // HH:MM format
  })
  const [customDate, setCustomDate] = useState(() => {
    return new Date().toISOString().split("T")[0] // YYYY-MM-DD format
  })
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const foods = await searchFoods(query, 15)
      setSearchResults(foods)
    } catch (error) {
      console.error("Search error:", error)
      setError("ไม่สามารถค้นหาได้")
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleFoodSelect = useCallback((food: Food) => {
    setSelectedFood(food)
    setSearchQuery("")
    setSearchResults([])
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedFood) {
      setError("กรุณาเลือกอาหาร")
      return
    }

    const gramsNum = Number.parseFloat(grams)
    if (isNaN(gramsNum) || gramsNum <= 0) {
      setError("กรุณาใส่น้ำหนักที่ถูกต้อง")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      await addMealEntry(selectedFood, gramsNum, customDate, customTime)
      router.push("/history?saved=true")
    } catch (error) {
      console.error("Save error:", error)
      setError("ไม่สามารถบันทึกข้อมูลได้")
    } finally {
      setIsSaving(false)
    }
  }, [selectedFood, grams, customDate, customTime, router])

  // Calculate nutrition preview
  const nutritionPreview =
    selectedFood && grams ? calculateNutrition(selectedFood, Number.parseFloat(grams) || 0) : null

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
          <h1 className="text-lg font-semibold">เพิ่มมื้ออาหาร</h1>
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

          {/* Food Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                ค้นหาอาหาร
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="ค้นหาชื่ออาหาร..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((food) => (
                    <Button
                      key={food.id}
                      variant="outline"
                      className="w-full justify-start h-auto p-3 text-left bg-transparent"
                      onClick={() => handleFoodSelect(food)}
                    >
                      <div>
                        <div className="font-medium">{food.name_th}</div>
                        <div className="text-xs text-muted-foreground">
                          {food.kcal_per_100g} kcal/100g • {food.category}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>ไม่พบอาหารที่ค้นหา</p>
                  <p className="text-sm">ลองใช้คำค้นหาอื่น</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Food Details */}
          {selectedFood && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">รายละเอียดอาหาร</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedFood.name_th}</h3>
                  <p className="text-sm text-muted-foreground">{selectedFood.name_en}</p>
                  <p className="text-sm text-muted-foreground">หมวด: {selectedFood.category}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">แคลอรี่</div>
                    <div>{selectedFood.kcal_per_100g} kcal/100g</div>
                  </div>
                  <div>
                    <div className="font-medium">โปรตีน</div>
                    <div>{selectedFood.protein} g/100g</div>
                  </div>
                  <div>
                    <div className="font-medium">คาร์โบไฮเดรต</div>
                    <div>{selectedFood.carb} g/100g</div>
                  </div>
                  <div>
                    <div className="font-medium">ไขมัน</div>
                    <div>{selectedFood.fat} g/100g</div>
                  </div>
                </div>

                {/* Portion Input */}
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
                      <Plus className="h-4 w-4 mr-2" />
                      บันทึกมื้ออาหาร
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Search, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { classifyFood, type ClassificationResult } from "@/lib/session"
import { extractImageData } from "@/lib/processor"
import { searchFoods, getFoodById, addMealEntry, type Food } from "@/lib/db"
import { useDatabase } from "@/components/database-provider"

export default function ProcessPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ClassificationResult[]>([])
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [customSearch, setCustomSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [grams, setGrams] = useState("100")
  const [error, setError] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { isReady } = useDatabase()

  // Get image data from URL params or localStorage
  useEffect(() => {
    const imageParam = searchParams.get("image")
    if (imageParam) {
      setImageData(decodeURIComponent(imageParam))
    } else {
      // Try to get from localStorage as fallback
      const storedImage = localStorage.getItem("capturedImage")
      if (storedImage) {
        setImageData(storedImage)
        localStorage.removeItem("capturedImage") // Clean up
      } else {
        // No image data, redirect back
        router.push("/capture")
      }
    }
  }, [searchParams, router])

  // Process image when component mounts
  useEffect(() => {
    if (imageData && isReady) {
      processImage()
    }
  }, [imageData, isReady])

  const processImage = useCallback(async () => {
    if (!imageData) return

    try {
      setIsProcessing(true)
      setError(null)

      // Create image element and extract ImageData
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageData
      })

      // Extract image data for ML processing
      const imgData = extractImageData(img, 224, 224)

      // Classify the image
      const classifications = await classifyFood(imgData)
      setResults(classifications)

      // Auto-select first result if confidence is high
      if (classifications.length > 0 && classifications[0].confidence > 0.7) {
        const topResult = classifications[0]
        if (topResult.food_id) {
          const food = await getFoodById(topResult.food_id)
          if (food) {
            setSelectedFood(food)
          }
        }
      }
    } catch (error) {
      console.error("Processing error:", error)
      setError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการประมวลผล")
    } finally {
      setIsProcessing(false)
    }
  }, [imageData])

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const foods = await searchFoods(query, 10)
      setSearchResults(foods)
    } catch (error) {
      console.error("Search error:", error)
    }
  }, [])

  const handleFoodSelect = useCallback((food: Food) => {
    setSelectedFood(food)
    setCustomSearch("")
    setSearchResults([])
  }, [])

  const handleSaveMeal = useCallback(async () => {
    if (!selectedFood) return

    try {
      const gramsNum = Number.parseFloat(grams)
      if (isNaN(gramsNum) || gramsNum <= 0) {
        setError("กรุณาใส่น้ำหนักที่ถูกต้อง")
        return
      }

      await addMealEntry(selectedFood, gramsNum)

      // Navigate back to home with success message
      router.push("/?saved=true")
    } catch (error) {
      console.error("Save error:", error)
      setError("ไม่สามารถบันทึกข้อมูลได้")
    }
  }, [selectedFood, grams, router])

  if (!imageData) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
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
          <Link href="/capture">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">วิเคราะห์อาหาร</h1>
          <div className="w-16"></div>
        </div>

        <div className="p-4 space-y-4">
          {/* Image Preview */}
          <Card>
            <CardContent className="p-4">
              <img
                src={imageData || "/placeholder.svg"}
                alt="Food to analyze"
                className="w-full h-48 object-cover rounded-lg"
              />
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

          {/* Processing State */}
          {isProcessing && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <div>
                    <h3 className="font-semibold">กำลังวิเคราะห์รูปภาพ</h3>
                    <p className="text-sm text-muted-foreground">กรุณารอสักครู่...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Classification Results */}
          {results.length > 0 && !isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ผลการวิเคราะห์</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.map((result, index) => (
                  <Button
                    key={index}
                    variant={selectedFood?.id === result.food_id ? "default" : "outline"}
                    className="w-full justify-between h-auto p-3"
                    onClick={async () => {
                      if (result.food_id) {
                        const food = await getFoodById(result.food_id)
                        if (food) handleFoodSelect(food)
                      }
                    }}
                  >
                    <span className="text-left">
                      <div className="font-medium">{result.label}</div>
                      <div className="text-xs opacity-70">ความมั่นใจ: {Math.round(result.confidence * 100)}%</div>
                    </span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Manual Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                ค้นหาเมนูเอง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="ค้นหาชื่ออาหาร..."
                  value={customSearch}
                  onChange={(e) => {
                    setCustomSearch(e.target.value)
                    handleSearch(e.target.value)
                  }}
                />
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((food) => (
                    <Button
                      key={food.id}
                      variant="outline"
                      className="w-full justify-start h-auto p-3 bg-transparent"
                      onClick={() => handleFoodSelect(food)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{food.name_th}</div>
                        <div className="text-xs text-muted-foreground">
                          {food.kcal_per_100g} kcal/100g • {food.category}
                        </div>
                      </div>
                    </Button>
                  ))}
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

                <Button onClick={handleSaveMeal} className="w-full" size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  บันทึกมื้ออาหาร
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

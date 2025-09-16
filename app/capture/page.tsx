"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Upload, RotateCcw, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProcessedImage {
  dataUrl: string
  blob: Blob
  width: number
  height: number
  size: number
}

export default function CapturePage() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<ProcessedImage | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraSupported, setCameraSupported] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Check camera support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false)
      setError("เบราว์เซอร์ไม่รองรับการใช้งานกล้อง")
    }
  }, [])

  const preprocessImage = useCallback(async (imageData: string): Promise<ProcessedImage> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("ไม่สามารถสร้าง canvas context ได้"))
          return
        }

        // Calculate new dimensions (max 640px on longest side)
        const maxSize = 640
        let { width, height } = img

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        // Set canvas size
        canvas.width = width
        canvas.height = height

        // Draw and compress image
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("ไม่สามารถประมวลผลรูปภาพได้"))
              return
            }

            const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
            resolve({
              dataUrl,
              blob,
              width,
              height,
              size: blob.size,
            })
          },
          "image/jpeg",
          0.85,
        )
      }

      img.onerror = () => {
        reject(new Error("ไม่สามารถโหลดรูปภาพได้"))
      }

      img.src = imageData
    })
  }, [])

  const startCamera = useCallback(async () => {
    if (!cameraSupported) return

    try {
      setError(null)
      setIsProcessing(true)

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        // Handle iOS PWA video loading
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error)
          }
        }
      }
    } catch (error) {
      console.error("Camera error:", error)
      let errorMessage = "ไม่สามารถเข้าถึงกล้องได้"

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage = "กรุณาอนุญาตการใช้งานกล้องในการตั้งค่าเบราว์เซอร์"
        } else if (error.name === "NotFoundError") {
          errorMessage = "ไม่พบกล้องในอุปกรณ์"
        } else if (error.name === "NotSupportedError") {
          errorMessage = "เบราว์เซอร์ไม่รองรับการใช้งานกล้อง"
        }
      }

      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [facingMode, stream, cameraSupported])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    try {
      setIsProcessing(true)
      setError(null)

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("ไม่สามารถสร้าง canvas context ได้")
      }

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0)

      // Get image data and preprocess
      const imageData = canvas.toDataURL("image/jpeg", 0.9)
      const processedImage = await preprocessImage(imageData)

      // Validate processed image
      if (processedImage.size > 5 * 1024 * 1024) {
        throw new Error("รูปภาพมีขนาดใหญ่เกินไป (เกิน 5MB)")
      }

      setCapturedImage(processedImage)
      stopCamera()
    } catch (error) {
      console.error("Capture error:", error)
      setError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการถ่ายรูป")
    } finally {
      setIsProcessing(false)
    }
  }, [preprocessImage, stopCamera])

  const switchCamera = useCallback(() => {
    stopCamera()
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [stopCamera])

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        setIsProcessing(true)
        setError(null)

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB")
        }

        // Validate file type
        if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
          throw new Error("รองรับเฉพาะไฟล์ JPG, JPEG และ PNG เท่านั้น")
        }

        // Read and preprocess file
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const imageData = e.target?.result as string
            const processedImage = await preprocessImage(imageData)
            setCapturedImage(processedImage)
          } catch (error) {
            setError(error instanceof Error ? error.message : "ไม่สามารถประมวลผลรูปภาพได้")
          } finally {
            setIsProcessing(false)
          }
        }

        reader.onerror = () => {
          setError("ไม่สามารถอ่านไฟล์ได้")
          setIsProcessing(false)
        }

        reader.readAsDataURL(file)
      } catch (error) {
        setError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลด")
        setIsProcessing(false)
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [preprocessImage],
  )

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setError(null)
    startCamera()
  }, [startCamera])

  const processImage = useCallback(() => {
    if (!capturedImage) return

    // Store image data for processing page
    localStorage.setItem("capturedImage", capturedImage.dataUrl)

    // Navigate to processing page
    router.push("/process")
  }, [capturedImage, router])

  // Auto-start camera when switching modes
  useEffect(() => {
    if (stream && cameraSupported) {
      startCamera()
    }
  }, [facingMode])

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
          <h1 className="text-lg font-semibold">ถ่ายรูปอาหาร</h1>
          <div className="w-16"></div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4">
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Camera/Image Display */}
        <div className="relative aspect-[4/3] bg-black">
          {capturedImage ? (
            <div className="relative w-full h-full">
              <img
                src={capturedImage.dataUrl || "/placeholder.svg"}
                alt="Captured food"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {capturedImage.width}×{capturedImage.height} • {Math.round(capturedImage.size / 1024)}KB
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Loading overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">กำลังประมวลผล...</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Camera Controls Overlay */}
          {!capturedImage && stream && !isProcessing && (
            <div className="absolute top-4 right-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={switchCamera}
                className="bg-black/50 text-white border-0 hover:bg-black/70"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {capturedImage ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">รูปภาพพร้อมสำหรับการประมวลผล</p>
                  <p className="text-xs text-muted-foreground">
                    ขนาด: {capturedImage.width}×{capturedImage.height} • ไฟล์: {Math.round(capturedImage.size / 1024)}KB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1 bg-transparent"
                    disabled={isProcessing}
                  >
                    ถ่ายใหม่
                  </Button>
                  <Button onClick={processImage} className="flex-1" disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ประมวลผล...
                      </>
                    ) : (
                      "ประมวลผล"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {!stream ? (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={startCamera}
                    className="flex-col gap-2 h-16"
                    disabled={!cameraSupported || isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                    <span>{isProcessing ? "กำลังเปิด..." : "เปิดกล้อง"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-col gap-2 h-16"
                    disabled={isProcessing}
                  >
                    <Upload className="h-6 w-6" />
                    <span>อัปโหลด</span>
                  </Button>
                </div>
              ) : (
                <Button onClick={capturePhoto} size="lg" className="w-full" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      กำลังถ่าย...
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      ถ่ายรูป
                    </>
                  )}
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• รองรับไฟล์ JPG, JPEG, PNG</p>
                    <p>• ขนาดไฟล์ไม่เกิน 5MB</p>
                    <p>• รูปจะถูกปรับขนาดเป็น 640px สำหรับการประมวลผล</p>
                    <p>• ถ่ายรูปให้ชัดเจนเพื่อผลลัพธ์ที่แม่นยำ</p>
                  </div>
                </CardContent>
              </Card>

              {/* iOS PWA Help */}
              {!cameraSupported && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-amber-800 space-y-1">
                      <p className="font-semibold">สำหรับผู้ใช้ iOS:</p>
                      <p>• เปิดแอปผ่าน Safari แล้วเลือก "เพิ่มที่หน้าจอหลัก"</p>
                      <p>• อนุญาตการใช้งานกล้องในการตั้งค่า Safari</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

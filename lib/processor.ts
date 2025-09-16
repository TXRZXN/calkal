export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: "jpeg" | "png" | "webp"
}

export interface ProcessedImageResult {
  dataUrl: string
  blob: Blob
  width: number
  height: number
  size: number
  originalSize?: number
}

/**
 * Process and compress image for ML inference
 */
export async function processImageForML(
  imageSource: string | File | Blob,
  options: ImageProcessingOptions = {},
): Promise<ProcessedImageResult> {
  const { maxWidth = 640, maxHeight = 640, quality = 0.85, format = "jpeg" } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Cannot create canvas context"))
          return
        }

        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        const originalSize = width * height

        // Scale down if image is too large
        const scale = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * scale)
        height = Math.round(height * scale)

        // Set canvas size
        canvas.width = width
        canvas.height = height

        // Fill with white background for JPEG
        if (format === "jpeg") {
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, width, height)
        }

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"))
              return
            }

            const dataUrl = canvas.toDataURL(`image/${format}`, quality)
            resolve({
              dataUrl,
              blob,
              width,
              height,
              size: blob.size,
              originalSize,
            })
          },
          `image/${format}`,
          quality,
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    // Handle different input types
    if (typeof imageSource === "string") {
      img.src = imageSource
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(imageSource)
    }
  })
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
    return {
      valid: false,
      error: "รองรับเฉพาะไฟล์ JPG, PNG และ WebP เท่านั้น",
    }
  }

  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB",
    }
  }

  return { valid: true }
}

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert image to tensor-ready format (normalized pixel values)
 */
export function imageToTensor(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData
  const tensorData = new Float32Array(width * height * 3)

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const tensorIndex = pixelIndex * 3

    // Normalize RGB values to [0, 1] range
    tensorData[tensorIndex] = data[i] / 255.0 // R
    tensorData[tensorIndex + 1] = data[i + 1] / 255.0 // G
    tensorData[tensorIndex + 2] = data[i + 2] / 255.0 // B
    // Skip alpha channel (data[i + 3])
  }

  return tensorData
}

/**
 * Extract ImageData from canvas or image element
 */
export function extractImageData(
  source: HTMLCanvasElement | HTMLImageElement,
  width?: number,
  height?: number,
): ImageData {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Cannot create canvas context")
  }

  // Use provided dimensions or source dimensions
  const w = width || (source instanceof HTMLCanvasElement ? source.width : source.naturalWidth)
  const h = height || (source instanceof HTMLCanvasElement ? source.height : source.naturalHeight)

  canvas.width = w
  canvas.height = h

  // Draw source to canvas
  ctx.drawImage(source, 0, 0, w, h)

  // Extract image data
  return ctx.getImageData(0, 0, w, h)
}

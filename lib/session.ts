import * as ort from "onnxruntime-web"

export interface ClassificationResult {
  label: string
  confidence: number
  food_id?: string
}

export interface ModelConfig {
  modelPath: string
  inputSize: number
  topK: number
  threshold: number
}

class MLSession {
  private session: ort.InferenceSession | null = null
  private isInitialized = false
  private config: ModelConfig
  private labels: string[] = []

  constructor(config: ModelConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log("Initializing ONNX Runtime...")

      // Configure execution providers with fallback
      const executionProviders: ort.ExecutionProviderConfig[] = []

      // Try WebGPU first (if available)
      if ("gpu" in navigator) {
        try {
          const adapter = await (navigator as any).gpu?.requestAdapter()
          if (adapter) {
            executionProviders.push("webgpu")
            console.log("WebGPU available, using WebGPU execution provider")
          }
        } catch (error) {
          console.log("WebGPU not available, falling back to WASM")
        }
      }

      // Always add WASM as fallback
      executionProviders.push("wasm")

      // Set ONNX Runtime options
      ort.env.wasm.wasmPaths = "/onnx-wasm/"
      ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4)
      ort.env.logLevel = "warning"

      // Load the model
      console.log(`Loading model from ${this.config.modelPath}...`)
      this.session = await ort.InferenceSession.create(this.config.modelPath, {
        executionProviders,
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
        enableMemPattern: true,
      })

      // Load labels
      await this.loadLabels()

      this.isInitialized = true
      console.log("ML Session initialized successfully")
    } catch (error) {
      console.error("Failed to initialize ML session:", error)
      throw new Error("ไม่สามารถโหลดโมเดล AI ได้ กรุณาลองใหม่อีกครั้ง")
    }
  }

  private async loadLabels(): Promise<void> {
    try {
      const response = await fetch("/models/food-labels.json")
      const data = await response.json()
      this.labels = data.labels || []
      console.log(`Loaded ${this.labels.length} food labels`)
    } catch (error) {
      console.error("Failed to load labels:", error)
      // Fallback labels for Thai foods
      this.labels = [
        "ข้าวผัดกุ้ง",
        "ผัดไทย",
        "ต้มยำกุ้ง",
        "แกงเขียวหวานไก่",
        "ส้มตำไทย",
        "ข้าวขาวสวย",
        "ไก่ย่าง",
        "ข้าวมันไก่",
        "ลาบหมู",
        "มะม่วงข้าวเหนียว",
      ]
    }
  }

  async predict(imageData: ImageData): Promise<ClassificationResult[]> {
    if (!this.session || !this.isInitialized) {
      throw new Error("โมเดล AI ยังไม่พร้อมใช้งาน")
    }

    try {
      // Preprocess image data
      const tensor = this.preprocessImage(imageData)

      // Run inference
      const feeds = { input: tensor }
      const results = await this.session.run(feeds)

      // Get output tensor
      const outputTensor = results[Object.keys(results)[0]]
      const predictions = outputTensor.data as Float32Array

      // Process results
      return this.processResults(predictions)
    } catch (error) {
      console.error("Prediction error:", error)
      throw new Error("เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ")
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const { data, width, height } = imageData
    const inputSize = this.config.inputSize

    // Create tensor data array
    const tensorData = new Float32Array(1 * 3 * inputSize * inputSize)

    // Resize and normalize image
    const scaleX = width / inputSize
    const scaleY = height / inputSize

    for (let y = 0; y < inputSize; y++) {
      for (let x = 0; x < inputSize; x++) {
        const srcX = Math.floor(x * scaleX)
        const srcY = Math.floor(y * scaleY)
        const srcIndex = (srcY * width + srcX) * 4

        const dstIndex = y * inputSize + x

        // Normalize to [-1, 1] range (ImageNet normalization)
        const r = (data[srcIndex] / 255.0 - 0.485) / 0.229
        const g = (data[srcIndex + 1] / 255.0 - 0.456) / 0.224
        const b = (data[srcIndex + 2] / 255.0 - 0.406) / 0.225

        // CHW format (channels first)
        tensorData[dstIndex] = r // R channel
        tensorData[inputSize * inputSize + dstIndex] = g // G channel
        tensorData[2 * inputSize * inputSize + dstIndex] = b // B channel
      }
    }

    return new ort.Tensor("float32", tensorData, [1, 3, inputSize, inputSize])
  }

  private processResults(predictions: Float32Array): ClassificationResult[] {
    // Apply softmax
    const softmaxPredictions = this.softmax(predictions)

    // Get top-k results
    const results: ClassificationResult[] = []
    const indices = Array.from({ length: softmaxPredictions.length }, (_, i) => i)

    // Sort by confidence
    indices.sort((a, b) => softmaxPredictions[b] - softmaxPredictions[a])

    // Take top-k results above threshold
    for (let i = 0; i < Math.min(this.config.topK, indices.length); i++) {
      const index = indices[i]
      const confidence = softmaxPredictions[index]

      if (confidence >= this.config.threshold) {
        results.push({
          label: this.labels[index] || `Unknown_${index}`,
          confidence: Math.round(confidence * 100) / 100,
          food_id: `th_${String(index + 1).padStart(3, "0")}`, // Map to food database
        })
      }
    }

    return results
  }

  private softmax(logits: Float32Array): Float32Array {
    const maxLogit = Math.max(...logits)
    const expLogits = logits.map((x) => Math.exp(x - maxLogit))
    const sumExp = expLogits.reduce((sum, x) => sum + x, 0)
    return new Float32Array(expLogits.map((x) => x / sumExp))
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release()
      this.session = null
    }
    this.isInitialized = false
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

// Singleton instance
let mlSession: MLSession | null = null

export async function getMLSession(): Promise<MLSession> {
  if (!mlSession) {
    const config: ModelConfig = {
      modelPath: "/models/food-classifier.onnx",
      inputSize: 224, // Standard input size for MobileNet
      topK: 5,
      threshold: 0.1,
    }

    mlSession = new MLSession(config)
    await mlSession.initialize()
  }

  return mlSession
}

export async function classifyFood(imageData: ImageData): Promise<ClassificationResult[]> {
  const session = await getMLSession()
  return await session.predict(imageData)
}

export async function disposeMLSession(): Promise<void> {
  if (mlSession) {
    await mlSession.dispose()
    mlSession = null
  }
}

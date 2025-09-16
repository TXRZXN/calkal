# 📸 Calkal — Calorie Logging from Photos

A **Progressive Web App (PWA)** built with **Next.js + TypeScript** for:
- Taking food photos/uploading images → processed by **ONNX Runtime Web** (WebGPU/WASM fallback)  
- Allowing manual input of portion size (grams) → calculating **energy (kcal) + macronutrients (protein/carbs/fat)**  
- Logging daily meals, reviewing summaries, editing history  
- Supporting **BMR/TDEE** calculation from user profile (gender/weight/height/age/activity level)  

> **Fully localized in Thai**  
> **Deploy instantly on Vercel**

---

## ✨ Key Features (MVP)

- 📷 **Take photos / upload images** (JPG/JPEG/PNG ≤ 5MB)
- 🤖 **Automatic food recognition** with lightweight models (MobileNetV3 / EN-Lite0 → ONNX)
- ✍️ **Manual input/editing** when recognition is inaccurate
- 🍚 **Offline nutrition database** (Thai FCD v3 + USDA FDC → JSON + IndexedDB)
- 📊 **BMR/TDEE calculation** (Mifflin-St Jeor + Activity Factors)
- 🗓️ **Daily log & summary** of kcal + macros
- 📱 **PWA Installable** + Offline-first (caching models and nutrition data)
- 🔒 **Secure by default**: HTTPS, CSP, HSTS, NoSniff, max file size ≤ 5MB

---


## 🛠️ Tech Stack

- [Next.js 15 (App Router)](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [onnxruntime-web](https://onnxruntime.ai/docs/api/js/)
- [Dexie.js (IndexedDB)](https://dexie.org/)
- [next-pwa](https://github.com/shadowwalker/next-pwa) (Workbox)

---

## Getting Started

To run the project locally:

1. **Clone the repository:**

```bash
   git clone [your-project-url]
```

2.Remove existing node_modules and package-lock.json :

```bash
    rm -rf node_modules package-lock.json
```

3.Install dependencies:

```bash
    npm install
```

4.Start the development server:

```bash
    npm run dev
```

5.Open your browser and visit:
  [http://localhost:3000](http://localhost:3000/) -local

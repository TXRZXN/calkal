"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { initializeDatabase } from "@/lib/db"

interface DatabaseContextType {
  isReady: boolean
  error: string | null
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
})

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function setupDatabase() {
      try {
        await initializeDatabase()
        setIsReady(true)
      } catch (err) {
        console.error("Database initialization failed:", err)
        setError(err instanceof Error ? err.message : "Database initialization failed")
      }
    }

    setupDatabase()
  }, [])

  return <DatabaseContext.Provider value={{ isReady, error }}>{children}</DatabaseContext.Provider>
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (!context) {
    throw new Error("useDatabase must be used within DatabaseProvider")
  }
  return context
}

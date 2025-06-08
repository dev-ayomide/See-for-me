"use client"

import { createContext, useState, useContext, useEffect } from "react"

// Create context for global voice assistant state
const VoiceAssistantContext = createContext({
  isGloballyEnabled: false, // Changed to false by default
  setGloballyEnabled: () => {},
})

// Provider component to wrap around the application
export function VoiceAssistantProvider({ children }) {
  // Initialize state from localStorage if available, defaulting to FALSE
  const [isGloballyEnabled, setGloballyEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voiceAssistantGloballyEnabled")
      return saved !== null ? JSON.parse(saved) : false // Changed to false by default
    }
    return false // Changed to false by default
  })

  // Save to localStorage whenever the state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("voiceAssistantGloballyEnabled", JSON.stringify(isGloballyEnabled))
    }
  }, [isGloballyEnabled])

  return (
    <VoiceAssistantContext.Provider value={{ isGloballyEnabled, setGloballyEnabled }}>
      {children}
    </VoiceAssistantContext.Provider>
  )
}

// Custom hook to access the voice assistant context
export function useVoiceAssistant() {
  return useContext(VoiceAssistantContext)
}

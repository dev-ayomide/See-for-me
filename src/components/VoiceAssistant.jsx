"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Mic, MicOff, X, Settings } from "lucide-react"
import { useVoiceAssistant } from "./voice-assistant-context"

// Main Voice Assistant Component
const VoiceAssistant = () => {
  const { isGloballyEnabled, setGloballyEnabled } = useVoiceAssistant()
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [isInitialized, setIsInitialized] = useState(false)

  const buttonRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  const reminderTimeoutRef = useRef(null)
  const recognitionState = useRef("stopped")
  const isProcessingSpeech = useRef(false)
  const speechQueueRef = useRef([])
  const initializationRef = useRef(false)

  // Get current page context
  const getCurrentPageInfo = useCallback(() => {
    const path = location.pathname
    switch (path) {
      case "/":
        return {
          name: "home page",
          description:
            "Welcome to the accessibility assistant. You are on the home page with navigation tools, color blindness tools, snap features, and upload functionality.",
          commands: "Say navigation, color blindness, snap, upload, or go back",
        }
      case "/navigation-assistant":
        return {
          name: "navigation page",
          description:
            "You are on the navigation assistance page. This page helps with location and direction services.",
          commands: "Say color blindness, snap, upload, go back, or home",
        }
      case "/color-blindness-tools":
        return {
          name: "color blindness tools page",
          description:
            "You are on the color blindness tools page. This page provides tools to help with color identification and accessibility.",
          commands: "Say navigation, snap, upload, go back, or home",
        }
      case "/camera":
        return {
          name: "camera page",
          description: "You are on the camera page. This page provides camera and image capture functionality.",
          commands: "Say navigation, color blindness, upload, go back, or home",
        }
      case "/upload":
        return {
          name: "upload page",
          description: "You are on the upload page. This page allows you to upload and manage your files.",
          commands: "Say navigation, color blindness, camera, go back, or home",
        }
      default:
        return {
          name: "current page",
          description: "You are on a page within the accessibility assistant application.",
          commands: "Say navigation, color blindness, camera, upload, go back, or home",
        }
    }
  }, [location.pathname])

  // Stop listening function - ensures complete stop
  const stopListening = useCallback(() => {
    if (recognitionRef.current && recognitionState.current !== "stopped") {
      try {
        recognitionRef.current.abort()
      } catch (error) {
        console.log("Recognition already stopped")
      }
    }

    recognitionState.current = "stopped"
    setIsListening(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Process speech queue
  const processSpeechQueue = useCallback(() => {
    if (isProcessingSpeech.current || speechQueueRef.current.length === 0 || !isGloballyEnabled) {
      return
    }

    const nextSpeech = speechQueueRef.current.shift()
    if (!nextSpeech) return

    isProcessingSpeech.current = true
    setIsSpeaking(true)

    // Ensure recognition is completely stopped before speaking
    stopListening()

    setTimeout(() => {
      // Cancel any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      const utterance = new SpeechSynthesisUtterance(nextSpeech.text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      // Try to use a better voice if available
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find((voice) => voice.lang.startsWith("en") && voice.localService)
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setLastInteraction(Date.now())
        setIsSpeaking(false)
        isProcessingSpeech.current = false

        // Execute callback if provided (for navigation)
        if (nextSpeech.callback) {
          setTimeout(() => {
            nextSpeech.callback()
          }, 300)
        } else {
          // Process next item in queue or restart listening
          setTimeout(() => {
            if (speechQueueRef.current.length > 0) {
              processSpeechQueue()
            } else if (isGloballyEnabled && !isSpeaking && isSupported) {
              startListening()
            }
          }, 500)
        }
      }

      utterance.onerror = (error) => {
        console.error("Speech synthesis error:", error)
        setIsSpeaking(false)
        isProcessingSpeech.current = false

        // Process next item or restart listening
        setTimeout(() => {
          if (speechQueueRef.current.length > 0) {
            processSpeechQueue()
          } else if (isGloballyEnabled && !isSpeaking && isSupported) {
            startListening()
          }
        }, 500)
      }

      window.speechSynthesis.speak(utterance)
    }, 100)
  }, [stopListening, isGloballyEnabled, isSpeaking, isSupported])

  // Start listening function
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported || isSpeaking || isProcessingSpeech.current || !isGloballyEnabled) {
      return
    }

    // Ensure we're completely stopped first
    stopListening()

    setTimeout(() => {
      if (recognitionState.current === "stopped" && !isSpeaking && !isProcessingSpeech.current && isGloballyEnabled) {
        try {
          recognitionState.current = "starting"
          setTranscript("")
          recognitionRef.current.start()
          setLastInteraction(Date.now())

          // Set timeout for 15 seconds of silence
          timeoutRef.current = setTimeout(() => {
            if (recognitionState.current === "running" && !isSpeaking && isGloballyEnabled) {
              speak(
                "I'm still here to help. Say a command like navigation, color blindness, camera, upload, or say 'help' for more options.",
              )
            }
          }, 15000)
        } catch (error) {
          console.error("Error starting recognition:", error)
          recognitionState.current = "stopped"
          setIsListening(false)
        }
      }
    }, 200)
  }, [isSupported, isSpeaking, stopListening, isGloballyEnabled])

  // Speech synthesis function with queue
  const speak = useCallback(
    (text, callback) => {
      if (!("speechSynthesis" in window) || !isGloballyEnabled) return

      // Add to queue
      speechQueueRef.current.push({ text, callback })

      // Process queue if not already processing
      if (!isProcessingSpeech.current && !isSpeaking) {
        processSpeechQueue()
      }
    },
    [isGloballyEnabled, isSpeaking, processSpeechQueue],
  )

  // Process voice commands
  const processCommand = useCallback(
    (command) => {
      const lowerCommand = command.toLowerCase().trim()

      if (lowerCommand.includes("navigation")) {
        speak("Navigating to navigation page. This page provides location and direction assistance.", () => {
          navigate("/navigation-assistant")
        })
      } else if (lowerCommand.includes("color") || lowerCommand.includes("color blindness")) {
        speak("Navigating to color blindness tools page.", () => {
          navigate("/color-blindness-tools")
        })
      } else if (lowerCommand.includes("camera") || lowerCommand.includes("snap")) {
        speak("Navigating to camera page. This page provides camera and image capture functionality.", () => {
          navigate("/camera")
        })
      } else if (lowerCommand.includes("upload")) {
        speak("Navigating to upload page.", () => {
          navigate("/upload")
        })
      } else if (lowerCommand.includes("home")) {
        speak("Navigating to home page. This is the main page with access to all features.", () => {
          navigate("/")
        })
      } else if (lowerCommand.includes("go back")) {
        speak("Going back to the previous page.", () => {
          navigate(-1)
        })
      } else if (lowerCommand.includes("help") || lowerCommand.includes("what can you do")) {
        const pageInfo = getCurrentPageInfo()
        speak(`${pageInfo.description} Available commands: ${pageInfo.commands}`)
      } else if (lowerCommand.includes("where am i") || lowerCommand.includes("current page")) {
        const pageInfo = getCurrentPageInfo()
        speak(`You are currently on the ${pageInfo.name}. ${pageInfo.description}`)
      } else if (lowerCommand.includes("minimize") || lowerCommand.includes("hide")) {
        speak("Minimizing voice assistant")
        setIsMinimized(true)
      } else {
        speak(
          "I didn't understand that command. Say 'help' to hear available options, or try commands like navigation, color blindness, camera, upload, home, or go back.",
        )
      }
    },
    [navigate, speak, getCurrentPageInfo],
  )

  // Initialize voice assistant - consistent behavior for all devices
  const initializeVoiceAssistant = useCallback(() => {
    if (!isGloballyEnabled || initializationRef.current || !isSupported) {
      return
    }

    initializationRef.current = true
    setIsInitialized(true)

    // Always speak welcome message first, then start listening
    const pageInfo = getCurrentPageInfo()
    speak(`${pageInfo.description} Available commands: ${pageInfo.commands}`)
  }, [isGloballyEnabled, isSupported, speak, getCurrentPageInfo])

  // Handle enable/disable state changes
  useEffect(() => {
    if (!isGloballyEnabled) {
      // Complete cleanup when disabled
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
      stopListening()
      setIsSpeaking(false)
      setTranscript("")
      speechQueueRef.current = []
      isProcessingSpeech.current = false
      initializationRef.current = false
      setIsInitialized(false)
    } else if (isSupported && !initializationRef.current) {
      // Initialize when enabled (either initially or via button)
      setTimeout(() => {
        initializeVoiceAssistant()
      }, 100)
    }
  }, [isGloballyEnabled, stopListening, initializeVoiceAssistant, isSupported])

  // Handle page changes - announce new page
  useEffect(() => {
    if (!isGloballyEnabled || !isInitialized) return

    const pageInfo = getCurrentPageInfo()

    // Small delay to allow page to load, then announce
    const timer = setTimeout(() => {
      speak(`Page loaded. ${pageInfo.description} Available commands: ${pageInfo.commands}`)
    }, 500)

    return () => clearTimeout(timer)
  }, [location.pathname, speak, getCurrentPageInfo, isGloballyEnabled, isInitialized])

  // Initialize speech recognition
  useEffect(() => {
    if (!isGloballyEnabled) return

    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition || !("speechSynthesis" in window)) {
      setIsSupported(false)
      console.warn("Speech recognition or synthesis not supported in this browser")
      return
    }

    // Create recognition instance
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      recognitionState.current = "running"
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)

      // Only process commands if we're not speaking
      if (!isSpeaking && !isProcessingSpeech.current) {
        processCommand(result)
      }
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      recognitionState.current = "stopped"
      setIsListening(false)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Only speak error message for actual errors, not aborts
      if (event.error !== "aborted" && event.error !== "no-speech" && !isSpeaking && isGloballyEnabled) {
        speak("Sorry, there was an error with voice recognition. Please try the Talk to Assistant button.")
      }
    }

    recognition.onend = () => {
      recognitionState.current = "stopped"
      setIsListening(false)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognition) {
        try {
          recognition.abort()
        } catch (e) {
          console.log("Recognition already stopped")
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (reminderTimeoutRef.current) {
        clearInterval(reminderTimeoutRef.current)
      }
      recognitionState.current = "stopped"
      isProcessingSpeech.current = false
    }
  }, [processCommand, isSpeaking, isGloballyEnabled])

  // Periodic reminder system
  useEffect(() => {
    if (!isGloballyEnabled || !isInitialized) return

    const checkForReactivation = () => {
      const timeSinceLastInteraction = Date.now() - lastInteraction

      if (
        timeSinceLastInteraction > 60000 &&
        !isListening &&
        !isSpeaking &&
        !isProcessingSpeech.current &&
        recognitionState.current === "stopped" &&
        isGloballyEnabled
      ) {
        const pageInfo = getCurrentPageInfo()
        speak(`Voice assistant is ready to help. You're on the ${pageInfo.name}. Say a command or 'help' for options.`)
      }
    }

    reminderTimeoutRef.current = setInterval(checkForReactivation, 30000)

    return () => {
      if (reminderTimeoutRef.current) {
        clearInterval(reminderTimeoutRef.current)
      }
    }
  }, [lastInteraction, isListening, isSpeaking, speak, getCurrentPageInfo, isGloballyEnabled, isInitialized])

  // Auto-focus the button on page load
  useEffect(() => {
    if (buttonRef.current && isGloballyEnabled) {
      buttonRef.current.focus()
    }
  }, [isGloballyEnabled])

  // Handle manual button click
  const handleButtonClick = () => {
    if (isListening || recognitionState.current === "running") {
      stopListening()
    } else if (!isSpeaking && !isProcessingSpeech.current) {
      const pageInfo = getCurrentPageInfo()
      speak(`Voice assistant activated. ${pageInfo.commands}`)
    }
  }

  // Handle local disable (from settings)
  const handleLocalDisable = () => {
    setGloballyEnabled(false)
  }

  // Don't render anything if globally disabled
  if (!isGloballyEnabled) {
    return null
  }

  if (!isSupported) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Voice assistant is not supported in this browser. Please use a modern browser with speech recognition
            support.
          </p>
        </div>
      </div>
    )
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          variant="default"
          size="sm"
          className="rounded-full w-12 h-12 shadow-lg"
          aria-label="Expand voice assistant"
        >
          <Mic className="w-5 h-5" />
        </Button>
      </div>
    )
  }

  // Normal state - consistent across all devices
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm">
      <div className="bg-white dark:bg-gray-800 sepia:bg-amber-50 shadow-lg rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? "bg-green-500 animate-pulse" : isListening ? "bg-blue-500 animate-pulse" : "bg-gray-400"
              }`}
              aria-hidden="true"
            />
            <h3 className="font-semibold text-sm">Voice Assistant</h3>
          </div>
          <div className="flex gap-1">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              aria-label="Voice assistant settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setIsMinimized(true)}
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              aria-label="Minimize voice assistant"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {isSpeaking
              ? "Speaking..."
              : isListening
                ? "Listening..."
                : isInitialized
                  ? "Ready to help"
                  : "Initializing..."}
          </p>
        </div>

        {transcript && (
          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-full text-center mb-3 bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
            Last heard: "{transcript}"
          </div>
        )}

        {showSettings && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
            <Button onClick={handleLocalDisable} variant="destructive" size="sm" className="w-full">
              Disable Voice Assistant
            </Button>
          </div>
        )}

        <Button
          ref={buttonRef}
          onClick={handleButtonClick}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className="w-full mb-2"
          disabled={isSpeaking}
          aria-label={isListening ? "Stop listening to voice commands" : "Start listening to voice commands"}
          aria-pressed={isListening}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Talk to Assistant
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Say: "help", "navigation", "color blindness", "camera", "upload", "home", or "go back"
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistant

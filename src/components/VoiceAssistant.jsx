"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "./ui/button"
import { Mic, MicOff, X, Settings } from "lucide-react"
import { useVoiceAssistant } from "./voice-assistant-context"

// iOS detection utility - more reliable detection
function isIOS() {
  return (
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
  )
}

// Main Voice Assistant Component
const VoiceAssistant = () => {
  const { isGloballyEnabled, setGloballyEnabled } = useVoiceAssistant()
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasSpoken, setHasSpoken] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [isInitialized, setIsInitialized] = useState(false)

  const buttonRef = useRef(null)
  const navigate = (url) => {
    if (typeof window !== "undefined") {
      window.location.href = url
    }
  }
  const location = { pathname: "" }
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  const reminderTimeoutRef = useRef(null)
  const hasSpokenWelcome = useRef(false)
  const lastAnnouncedPage = useRef("")
  const recognitionState = useRef("stopped")
  const isProcessingSpeech = useRef(false)
  const speechQueueRef = useRef([])
  const initializationAttempted = useRef(false)
  const isIOSDevice = isIOS()

  // Get current page context
  const getCurrentPageInfo = useCallback(() => {
    const path = location.pathname
    switch (path) {
      case "/":
        return {
          name: "home page",
          description:
            "Welcome to the accessibility assistant. You are on the home page with navigation tools, color blindness tools, camera features, and upload functionality.",
          commands: "Say navigation, color blindness, camera, upload, or help",
        }
      case "/navigation-assistant":
        return {
          name: "navigation page",
          description:
            "You are on the navigation assistance page. This page helps with location and direction services.",
          commands: "Say color blindness, camera, upload, go back, or home",
        }
      case "/color-blindness-tools":
        return {
          name: "color blindness tools page",
          description:
            "You are on the color blindness tools page. This page provides tools to help with color identification and accessibility.",
          commands: "Say navigation, camera, upload, go back, or home",
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

  // Complete cleanup of all speech and listening activities
  const completeCleanup = useCallback(() => {
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Stop listening
    stopListening()

    // Reset all states
    setIsSpeaking(false)
    setIsListening(false)
    setTranscript("")

    // Clear all queues and flags
    speechQueueRef.current = []
    isProcessingSpeech.current = false

    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (reminderTimeoutRef.current) {
      clearInterval(reminderTimeoutRef.current)
      reminderTimeoutRef.current = null
    }
  }, [stopListening])

  // Process speech queue with better error handling
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

      try {
        const utterance = new SpeechSynthesisUtterance(nextSpeech.text)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1

        // Try to use a better voice if available
        if (window.speechSynthesis.getVoices().length > 0) {
          const voices = window.speechSynthesis.getVoices()
          const preferredVoice = voices.find((voice) => voice.lang.startsWith("en") && voice.localService)
          if (preferredVoice) {
            utterance.voice = preferredVoice
          }
        }

        utterance.onstart = () => {
          setIsSpeaking(true)
        }

        utterance.onend = () => {
          setLastInteraction(Date.now())
          setIsSpeaking(false)
          isProcessingSpeech.current = false
          setHasSpoken(true)

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
              } else if (isGloballyEnabled && !isSpeaking && !isIOSDevice) {
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
            } else if (isGloballyEnabled && !isSpeaking && !isIOSDevice) {
              startListening()
            }
          }, 500)
        }

        window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.error("Error in speech synthesis:", error)
        setIsSpeaking(false)
        isProcessingSpeech.current = false

        // Try to recover
        setTimeout(() => {
          if (isGloballyEnabled && !isIOSDevice) {
            startListening()
          }
        }, 1000)
      }
    }, 100)
  }, [stopListening, isGloballyEnabled, isSpeaking, isIOSDevice])

  // Start listening function - only starts when not speaking
  const startListening = useCallback(() => {
    // Never start listening while speaking or processing speech
    if (
      !recognitionRef.current ||
      !isSupported ||
      isSpeaking ||
      isProcessingSpeech.current ||
      !isGloballyEnabled ||
      isIOSDevice
    ) {
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

          // Set timeout for 15 seconds of silence - only if globally enabled
          if (isGloballyEnabled) {
            timeoutRef.current = setTimeout(() => {
              if (recognitionState.current === "running" && !isSpeaking && isGloballyEnabled) {
                speak(
                  "I'm still here to help. Say a command like navigation, color blindness, camera, upload, or say 'help' for more options.",
                )
              }
            }, 15000)
          }
        } catch (error) {
          console.error("Error starting recognition:", error)
          recognitionState.current = "stopped"
          setIsListening(false)
        }
      }
    }, 300)
  }, [isSupported, isSpeaking, stopListening, isGloballyEnabled, isIOSDevice])

  // Simplified speech synthesis function with queue
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

  // Initialize the voice assistant
  const initializeVoiceAssistant = useCallback(() => {
    if (!isGloballyEnabled || initializationAttempted.current) {
      return
    }

    initializationAttempted.current = true
    setIsInitialized(true)

    // Always speak welcome message first on all devices
    const pageInfo = getCurrentPageInfo()

    // Ensure we're not already speaking
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Speak welcome message
    setTimeout(() => {
      if (isGloballyEnabled) {
        hasSpokenWelcome.current = true
        speak(`${pageInfo.description} Available commands: ${pageInfo.commands}`)
      }
    }, 500) // Small delay to ensure page is fully loaded
  }, [isGloballyEnabled, speak, getCurrentPageInfo])

  // Handle enable/disable state changes
  useEffect(() => {
    if (!isGloballyEnabled) {
      // Complete cleanup when disabled
      completeCleanup()
      hasSpokenWelcome.current = false
      initializationAttempted.current = false
      setIsInitialized(false)
    } else if (!initializationAttempted.current) {
      // Initialize when enabled (either initially or via button)
      initializeVoiceAssistant()
    }
  }, [isGloballyEnabled, completeCleanup, initializeVoiceAssistant])

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
  }, [processCommand, isSpeaking, isGloballyEnabled, speak])

  // Initialize on component mount
  useEffect(() => {
    if (isGloballyEnabled && !initializationAttempted.current) {
      initializeVoiceAssistant()
    }

    // Ensure voices are loaded (helps with iOS)
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        if (isGloballyEnabled && !hasSpokenWelcome.current) {
          initializeVoiceAssistant()
        }
      }
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [isGloballyEnabled, initializeVoiceAssistant])

  // Auto-start listening when appropriate - but only after speech is done
  useEffect(() => {
    if (
      isGloballyEnabled &&
      isSupported &&
      !isSpeaking &&
      !isListening &&
      !isProcessingSpeech.current &&
      hasSpokenWelcome.current &&
      !isIOSDevice
    ) {
      const timer = setTimeout(startListening, 1500)
      return () => clearTimeout(timer)
    }
  }, [isGloballyEnabled, isSupported, isSpeaking, isListening, startListening, isIOSDevice])

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

  // iOS-specific UI
  if (isIOSDevice) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm">
        <div className="bg-white dark:bg-gray-800 sepia:bg-amber-50 shadow-lg rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Voice Assistant</h3>
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

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Voice assistant features are limited on iOS devices. Tap the button below to hear information.
          </p>

          {showSettings && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <Button onClick={handleLocalDisable} variant="destructive" size="sm" className="w-full">
                Disable Voice Assistant
              </Button>
            </div>
          )}

          <Button
            ref={buttonRef}
            onClick={() => {
              const pageInfo = getCurrentPageInfo()
              speak(`${pageInfo.description} Available commands are not supported on iOS.`)
            }}
            disabled={isSpeaking}
            variant="default"
            size="lg"
            className="w-full mb-2"
          >
            {isSpeaking ? "Speaking..." : "Hear Page Information"}
          </Button>

          <div className="text-xs text-gray-500 text-center">Voice commands are limited on iOS devices.</div>
        </div>
      </div>
    )
  }

  // Normal state for Android/Desktop
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
            {isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Ready to help"}
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

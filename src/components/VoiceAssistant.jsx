"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react"

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isSupported, setIsSupported] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [statusMessage, setStatusMessage] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  const reminderTimeoutRef = useRef(null)
  const buttonRef = useRef(null)
  const hasSpokenWelcome = useRef(false)
  const lastAnnouncedPage = useRef("")
  const recognitionState = useRef("stopped") // 'stopped', 'starting', 'running'
  const isProcessingSpeech = useRef(false)

  // Get current page context
  const getCurrentPageInfo = useCallback(() => {
    const path = location.pathname
    switch (path) {
      case "/":
        return {
          name: "home page",
          description:
            "You are on the home page. Available options are navigation tools, color blindness tools, snap features, and upload functionality.",
          commands: "Say navigation, color blindness, snap, upload, or go back",
        }
      case "/navigation":
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
      case "/snap":
        return {
          name: "snap page",
          description: "You are on the snap page. This page provides camera and image capture functionality.",
          commands: "Say navigation, color blindness, upload, go back, or home",
        }
      case "/upload":
        return {
          name: "upload page",
          description: "You are on the upload page. This page allows you to upload and manage your files.",
          commands: "Say navigation, color blindness, snap, go back, or home",
        }
      default:
        return {
          name: "current page",
          description: "You are on a page within the accessibility assistant application.",
          commands: "Say navigation, color blindness, snap, upload, go back, or home",
        }
    }
  }, [location.pathname])

  // Start continuous listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported || recognitionState.current === "running") {
      return
    }

    try {
      recognitionState.current = "starting"
      setTranscript("")
      recognitionRef.current.start()
      setLastInteraction(Date.now())
      setStatusMessage("Voice recognition started")
    } catch (error) {
      console.error("Error starting recognition:", error)
      recognitionState.current = "stopped"
      setIsListening(false)
      setStatusMessage("Error starting voice recognition")
    }
  }, [isSupported])

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && recognitionState.current !== "stopped") {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log("Recognition already stopped")
      }
    }

    recognitionState.current = "stopped"
    setIsListening(false)
    setStatusMessage("Voice recognition stopped")

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Speech synthesis function with toggle support
  const speak = useCallback(
    (text, callback) => {
      // If speech is disabled, just execute callback and show visual feedback
      if (!speechEnabled) {
        setStatusMessage(text)
        setTimeout(() => setStatusMessage(""), 3000)

        if (callback) {
          setTimeout(() => {
            callback()
          }, 500)
        }
        return
      }

      if (!("speechSynthesis" in window) || isProcessingSpeech.current) return

      isProcessingSpeech.current = true
      setIsSpeaking(true)

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => {
        setIsSpeaking(true)
        setStatusMessage("Speaking...")
      }

      utterance.onend = () => {
        setLastInteraction(Date.now())
        setIsSpeaking(false)
        isProcessingSpeech.current = false
        setStatusMessage("")

        // Execute callback if provided (for navigation)
        if (callback) {
          setTimeout(() => {
            callback()
          }, 500)
        }
      }

      utterance.onerror = (error) => {
        console.error("Speech synthesis error:", error)
        setIsSpeaking(false)
        isProcessingSpeech.current = false
        setStatusMessage("Speech error occurred")
      }

      window.speechSynthesis.speak(utterance)
    },
    [speechEnabled],
  )

  // Process voice commands
  const processCommand = useCallback(
    (command) => {
      const lowerCommand = command.toLowerCase().trim()

      // Handle speech toggle commands
      if (
        lowerCommand.includes("disable speech") ||
        lowerCommand.includes("turn off speech") ||
        lowerCommand.includes("mute speech")
      ) {
        setSpeechEnabled(false)
        setStatusMessage("Speech disabled. Voice commands still active.")
        setTimeout(() => setStatusMessage(""), 3000)
        return
      }

      if (
        lowerCommand.includes("enable speech") ||
        lowerCommand.includes("turn on speech") ||
        lowerCommand.includes("unmute speech")
      ) {
        setSpeechEnabled(true)
        speak("Speech enabled. I can talk to you again.")
        return
      }

      // Regular navigation commands
      if (lowerCommand.includes("navigation")) {
        speak("Navigating to navigation page. This page provides location and direction assistance.", () => {
          window.location.href = "https://navigation-assistant.vercel.app/"
        })
      } else if (lowerCommand.includes("color") || lowerCommand.includes("color blindness")) {
        speak(
          "Navigating to color blindness tools page. This page helps with color identification and accessibility features.",
          () => {
            navigate("/color-blindness-tools")
          },
        )
      } else if (lowerCommand.includes("snap") || lowerCommand.includes("camera")) {
        speak("Navigating to snap page. This page provides camera and image capture functionality.", () => {
          navigate("/snap")
        })
      } else if (lowerCommand.includes("upload")) {
        speak("Navigating to upload page. This page allows you to upload and manage your files.", () => {
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
        speak(
          `${pageInfo.description} Available commands: ${pageInfo.commands}. You can also say 'disable speech' to turn off voice responses or 'enable speech' to turn them back on.`,
        )
      } else if (lowerCommand.includes("where am i") || lowerCommand.includes("current page")) {
        const pageInfo = getCurrentPageInfo()
        speak(`You are currently on the ${pageInfo.name}. ${pageInfo.description}`)
      } else {
        speak(
          "I didn't understand that command. Say 'help' to hear available options, or try commands like navigation, color blindness, snap, upload, home, go back, disable speech, or enable speech.",
        )
      }
    },
    [navigate, speak, getCurrentPageInfo],
  )

  // Periodic reminder (only when speech is enabled)
  useEffect(() => {
    const checkForReactivation = () => {
      const timeSinceLastInteraction = Date.now() - lastInteraction

      // If no interaction for 60 seconds and speech is enabled
      if (
        timeSinceLastInteraction > 60000 &&
        speechEnabled &&
        !isSpeaking &&
        !isProcessingSpeech.current &&
        isListening
      ) {
        const pageInfo = getCurrentPageInfo()
        speak(`Voice assistant is ready to help. You're on the ${pageInfo.name}. Say a command or 'help' for options.`)
      }
    }

    // Check every 30 seconds
    reminderTimeoutRef.current = setInterval(checkForReactivation, 30000)

    return () => {
      if (reminderTimeoutRef.current) {
        clearInterval(reminderTimeoutRef.current)
      }
    }
  }, [lastInteraction, speechEnabled, isSpeaking, isListening, speak, getCurrentPageInfo])

  // Announce page changes (only when speech is enabled)
  useEffect(() => {
    const currentPath = location.pathname

    if (lastAnnouncedPage.current !== currentPath && hasSpokenWelcome.current && speechEnabled) {
      lastAnnouncedPage.current = currentPath
      const pageInfo = getCurrentPageInfo()

      // Delay to allow page to load
      setTimeout(() => {
        speak(`Page loaded. ${pageInfo.description} Available commands: ${pageInfo.commands}`)
      }, 1000)
    }
  }, [location.pathname, speechEnabled, speak, getCurrentPageInfo])

  // Initialize speech recognition with continuous mode
  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition || !("speechSynthesis" in window)) {
      setIsSupported(false)
      console.warn("Speech recognition or synthesis not supported in this browser")
      return
    }

    // Create recognition instance
    const recognition = new SpeechRecognition()
    recognition.continuous = true // Enable continuous listening
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      recognitionState.current = "running"
      setIsListening(true)
      setStatusMessage("Listening continuously...")
    }

    recognition.onresult = (event) => {
      // Get the latest result
      const lastResultIndex = event.results.length - 1
      const result = event.results[lastResultIndex][0].transcript
      setTranscript(result)
      setLastInteraction(Date.now())

      // Process the command
      processCommand(result)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)

      if (event.error === "no-speech") {
        // Ignore no-speech errors in continuous mode
        return
      }

      if (event.error === "network") {
        setStatusMessage("Network error. Restarting recognition...")
        // Restart recognition after network error
        setTimeout(() => {
          if (recognitionState.current === "stopped") {
            startListening()
          }
        }, 2000)
        return
      }

      recognitionState.current = "stopped"
      setIsListening(false)
      setStatusMessage(`Recognition error: ${event.error}`)

      // Auto-restart after other errors
      setTimeout(() => {
        if (recognitionState.current === "stopped") {
          startListening()
        }
      }, 3000)
    }

    recognition.onend = () => {
      recognitionState.current = "stopped"
      setIsListening(false)
      setStatusMessage("Recognition ended. Restarting...")

      // Auto-restart recognition to maintain continuous listening
      setTimeout(() => {
        if (recognitionState.current === "stopped") {
          startListening()
        }
      }, 1000)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognition) {
        recognition.stop()
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
  }, [processCommand, startListening])

  // Auto-start listening on component mount
  useEffect(() => {
    if (isSupported && !hasSpokenWelcome.current) {
      hasSpokenWelcome.current = true
      lastAnnouncedPage.current = location.pathname

      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        const pageInfo = getCurrentPageInfo()
        speak(
          `Welcome to the accessibility assistant. Continuous voice recognition is active. ${pageInfo.description} Available commands: ${pageInfo.commands}. Say 'disable speech' to turn off voice responses.`,
        )

        // Start continuous listening
        setTimeout(() => {
          startListening()
        }, 3000)
      }, 1000)
    }
  }, [isSupported, speak, startListening, location.pathname, getCurrentPageInfo])

  // Auto-focus the button on page load
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [])

  // Handle manual listening toggle
  const handleListeningToggle = () => {
    if (isListening || recognitionState.current === "running") {
      stopListening()
    } else {
      startListening()
    }
  }

  // Handle speech toggle
  const handleSpeechToggle = () => {
    setSpeechEnabled(!speechEnabled)
    if (!speechEnabled) {
      speak("Speech enabled. I can talk to you again.")
    } else {
      setStatusMessage("Speech disabled. Voice commands still active.")
      setTimeout(() => setStatusMessage(""), 3000)
    }
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Voice assistant is not supported in this browser. Please use a modern browser with speech recognition support.
        </p>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white shadow-lg rounded-lg p-4 border">
        <div className="flex flex-col items-center space-y-3">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">Voice Assistant</h3>
            <p className="text-sm text-gray-600">
              {isSpeaking ? "Speaking..." : isListening ? "Listening continuously..." : "Ready to help"}
            </p>
            {statusMessage && <p className="text-xs text-blue-600 mt-1">{statusMessage}</p>}
          </div>

          {transcript && <div className="text-xs text-gray-500 max-w-48 text-center">Last heard: "{transcript}"</div>}

          <div className="flex gap-2 w-full">
            <Button
              ref={buttonRef}
              onClick={handleListeningToggle}
              variant={isListening ? "destructive" : "default"}
              size="sm"
              className="flex-1"
              aria-label={isListening ? "Stop continuous listening" : "Start continuous listening"}
              aria-pressed={isListening}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-1" />
                  Listen
                </>
              )}
            </Button>

            <Button
              onClick={handleSpeechToggle}
              variant={speechEnabled ? "default" : "outline"}
              size="sm"
              className="flex-1"
              aria-label={speechEnabled ? "Disable speech responses" : "Enable speech responses"}
              aria-pressed={speechEnabled}
            >
              {speechEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 mr-1" />
                  Speech On
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 mr-1" />
                  Speech Off
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center max-w-48">
            Say: "help", "navigation", "color blindness", "snap", "upload", "home", "go back", "disable speech", or
            "enable speech"
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistant

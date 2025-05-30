"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Mic, MicOff, Volume2, VolumeX, Smartphone, Play, Pause } from "lucide-react"

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isSupported, setIsSupported] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [statusMessage, setStatusMessage] = useState("")
  const [continuousMode, setContinuousMode] = useState(false)
  const [voiceOverActive, setVoiceOverActive] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  const reminderTimeoutRef = useRef(null)
  const buttonRef = useRef(null)
  const hasSpokenWelcome = useRef(false)
  const lastAnnouncedPage = useRef("")
  const recognitionState = useRef("stopped")
  const isProcessingSpeech = useRef(false)
  const speechSynthesisReady = useRef(false)
  const listeningAttempts = useRef(0)
  const maxListeningAttempts = 3

  // Detect iOS and VoiceOver
  useEffect(() => {
    const detectIOSAndVoiceOver = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOSDevice =
        /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

      setIsIOS(isIOSDevice)

      // Detect VoiceOver (approximate detection)
      const hasVoiceOver = window.speechSynthesis && window.speechSynthesis.getVoices().length > 0
      setVoiceOverActive(hasVoiceOver)

      if (isIOSDevice) {
        console.log("iOS detected - implementing iOS-optimized voice assistant")
        // Try to enable continuous mode on iOS
        setContinuousMode(true)
      }

      return isIOSDevice
    }

    detectIOSAndVoiceOver()
  }, [])

  // Get current page context with VoiceOver optimization
  const getCurrentPageInfo = useCallback(() => {
    const path = location.pathname
    switch (path) {
      case "/":
        return {
          name: "home page",
          description:
            "You are on the home page. Available options are navigation tools, color blindness tools, snap features, and upload functionality.",
          commands: "Say navigation, color blindness, snap, upload, or go back",
          voiceOverDescription:
            "Home page. Navigation tools, color blindness tools, camera snap, and upload available.",
        }
      case "/navigation":
        return {
          name: "navigation page",
          description:
            "You are on the navigation assistance page. This page helps with location and direction services.",
          commands: "Say color blindness, snap, upload, go back, or home",
          voiceOverDescription: "Navigation assistance page. Location and direction services.",
        }
      case "/color-blindness-tools":
        return {
          name: "color blindness tools page",
          description:
            "You are on the color blindness tools page. This page provides tools to help with color identification and accessibility.",
          commands: "Say navigation, snap, upload, go back, or home",
          voiceOverDescription: "Color blindness tools page. Color identification and accessibility tools.",
        }
      case "/snap":
        return {
          name: "snap page",
          description: "You are on the snap page. This page provides camera and image capture functionality.",
          commands: "Say navigation, color blindness, upload, go back, or home",
          voiceOverDescription: "Camera snap page. Image capture functionality.",
        }
      case "/upload":
        return {
          name: "upload page",
          description: "You are on the upload page. This page allows you to upload and manage your files.",
          commands: "Say navigation, color blindness, snap, go back, or home",
          voiceOverDescription: "Upload page. File upload and management.",
        }
      default:
        return {
          name: "current page",
          description: "You are on a page within the accessibility assistant application.",
          commands: "Say navigation, color blindness, snap, upload, go back, or home",
          voiceOverDescription: "Accessibility assistant application page.",
        }
    }
  }, [location.pathname])

  // iOS-specific speech recognition attempt using available APIs
  const attemptIOSSpeechRecognition = useCallback(() => {
    if (!isIOS) return false

    // Try to use any available speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = continuousMode
        recognition.interimResults = false
        recognition.lang = "en-US"

        // iOS-specific settings
        recognition.maxAlternatives = 1

        recognitionRef.current = recognition
        return true
      } catch (error) {
        console.log("iOS Speech Recognition not available, using fallback")
        return false
      }
    }

    return false
  }, [isIOS, continuousMode])

  // Initialize speech synthesis for iOS with VoiceOver support
  const initializeSpeechSynthesis = useCallback(() => {
    if ("speechSynthesis" in window) {
      // Initialize with silent utterance for iOS
      const utterance = new SpeechSynthesisUtterance("")
      utterance.volume = 0

      utterance.onend = () => {
        speechSynthesisReady.current = true
        setStatusMessage("Speech synthesis ready")
      }

      window.speechSynthesis.speak(utterance)

      // Load voices for iOS
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", () => {
          speechSynthesisReady.current = true
        })
      } else {
        speechSynthesisReady.current = true
      }
    }
  }, [])

  // Stop listening function
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
    setStatusMessage("")

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Enhanced speech function with iOS optimization
  const speak = useCallback(
    (text, callback) => {
      if (!speechEnabled) {
        setStatusMessage(text)
        setTimeout(() => setStatusMessage(""), 3000)
        if (callback) setTimeout(callback, 500)
        return
      }

      if (!("speechSynthesis" in window) || isProcessingSpeech.current) return

      isProcessingSpeech.current = true
      setIsSpeaking(true)

      // Stop listening before speaking (if not iOS continuous mode)
      if (!isIOS || !continuousMode) {
        stopListening()
      }

      setTimeout(
        () => {
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(text)
          utterance.rate = isIOS ? 0.7 : 0.8
          utterance.pitch = 1
          utterance.volume = 1

          // iOS voice optimization
          if (isIOS) {
            const voices = window.speechSynthesis.getVoices()
            const preferredVoice = voices.find(
              (voice) =>
                voice.lang.startsWith("en") &&
                (voice.localService || voice.name.includes("Samantha") || voice.name.includes("Alex")),
            )
            if (preferredVoice) {
              utterance.voice = preferredVoice
            }
          }

          utterance.onstart = () => {
            setIsSpeaking(true)
            setStatusMessage("Speaking...")
          }

          utterance.onend = () => {
            setLastInteraction(Date.now())
            setIsSpeaking(false)
            isProcessingSpeech.current = false
            setStatusMessage("")

            if (callback) {
              setTimeout(callback, 500)
            } else if (continuousMode && isIOS) {
              // Restart listening in continuous mode
              setTimeout(() => {
                if (!isSpeaking && !isProcessingSpeech.current) {
                  startListening()
                }
              }, 1000)
            }
          }

          utterance.onerror = (error) => {
            console.error("Speech synthesis error:", error)
            setIsSpeaking(false)
            isProcessingSpeech.current = false
            setStatusMessage("Speech error occurred")

            if (continuousMode && isIOS) {
              setTimeout(() => startListening(), 1000)
            }
          }

          window.speechSynthesis.speak(utterance)
        },
        isIOS ? 100 : 300,
      )
    },
    [speechEnabled, isIOS, continuousMode, stopListening, startListening, isSpeaking],
  )

  // Process voice commands with iOS optimization
  const processCommand = useCallback(
    (command) => {
      const lowerCommand = command.toLowerCase().trim()

      // Speech control commands
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

      // Continuous mode control
      if (lowerCommand.includes("continuous mode") || lowerCommand.includes("keep listening")) {
        setContinuousMode(true)
        speak("Continuous listening mode enabled. I will keep listening for your commands.")
        return
      }

      if (lowerCommand.includes("stop continuous") || lowerCommand.includes("single mode")) {
        setContinuousMode(false)
        speak("Single command mode enabled. Tap the button to give each command.")
        return
      }

      // Navigation commands
      if (lowerCommand.includes("navigation")) {
        speak("Navigating to navigation page. This page provides location and direction assistance.", () => {
          window.open("https://navigation-assistant.vercel.app/", "_blank")
        })
      } else if (lowerCommand.includes("color") || lowerCommand.includes("color blindness")) {
        speak("Navigating to color blindness tools page.", () => {
          navigate("/color-blindness-tools")
        })
      } else if (lowerCommand.includes("snap") || lowerCommand.includes("camera")) {
        speak("Navigating to snap page. This page provides camera and image capture functionality.", () => {
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
        speak(
          `${pageInfo.description} Available commands: ${pageInfo.commands}. You can also say 'disable speech' to turn off voice responses, 'enable speech' to turn them back on, 'continuous mode' to keep listening, or 'single mode' for one command at a time.`,
        )
      } else if (lowerCommand.includes("where am i") || lowerCommand.includes("current page")) {
        const pageInfo = getCurrentPageInfo()
        speak(`You are currently on the ${pageInfo.name}. ${pageInfo.description}`)
      } else if (lowerCommand.includes("repeat") || lowerCommand.includes("say again")) {
        const pageInfo = getCurrentPageInfo()
        speak(`${pageInfo.description} Available commands: ${pageInfo.commands}`)
      } else {
        speak(
          "I didn't understand that command. Say 'help' to hear available options, or try commands like navigation, color blindness, snap, upload, home, go back, disable speech, enable speech, continuous mode, or single mode.",
        )
      }
    },
    [navigate, speak, getCurrentPageInfo],
  )

  // iOS-optimized start listening with fallback
  const startListening = useCallback(() => {
    if (!isSupported || isSpeaking || isProcessingSpeech.current) return

    // Try iOS speech recognition first
    if (isIOS && !attemptIOSSpeechRecognition()) {
      // Fallback: Use a different approach for iOS
      setStatusMessage("Voice recognition starting... Please speak clearly.")
      setIsListening(true)

      // Simulate listening state for iOS
      setTimeout(() => {
        if (listeningAttempts.current < maxListeningAttempts) {
          listeningAttempts.current++
          speak(
            "I'm ready to listen. Please say a command like navigation, color blindness, snap, upload, help, or go back.",
          )
        }
      }, 2000)

      return
    }

    if (!recognitionRef.current) return

    try {
      recognitionState.current = "starting"
      setTranscript("")
      setStatusMessage("Starting voice recognition...")

      recognitionRef.current.start()
      setLastInteraction(Date.now())
      listeningAttempts.current = 0

      // Timeout for continuous mode
      if (continuousMode) {
        timeoutRef.current = setTimeout(() => {
          if (recognitionState.current === "running" && !isSpeaking) {
            speak("I'm still listening. Say a command or 'help' for options.")
          }
        }, 20000)
      } else {
        timeoutRef.current = setTimeout(() => {
          if (recognitionState.current === "running" && !isSpeaking) {
            speak("I didn't hear anything. Tap the button to try again.")
            stopListening()
          }
        }, 10000)
      }
    } catch (error) {
      console.error("Error starting recognition:", error)
      recognitionState.current = "stopped"
      setIsListening(false)
      setStatusMessage("Voice recognition error. Please try again.")
    }
  }, [isSupported, isSpeaking, isIOS, attemptIOSSpeechRecognition, continuousMode, speak, stopListening])

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition || !("speechSynthesis" in window)) {
      if (!isIOS) {
        setIsSupported(false)
        console.warn("Speech recognition or synthesis not supported in this browser")
        return
      }
    }

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = continuousMode
      recognition.interimResults = false
      recognition.lang = "en-US"

      if (isIOS) {
        recognition.maxAlternatives = 1
      }

      recognition.onstart = () => {
        recognitionState.current = "running"
        setIsListening(true)
        setStatusMessage("Listening...")
      }

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1][0].transcript
        setTranscript(result)
        setLastInteraction(Date.now())

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

        if (event.error === "no-speech" && continuousMode) {
          // Restart in continuous mode
          setTimeout(() => {
            if (!isSpeaking && !isProcessingSpeech.current) {
              startListening()
            }
          }, 2000)
        } else if (event.error !== "aborted" && !isSpeaking) {
          setStatusMessage(`Recognition error: ${event.error}`)
          if (isIOS) {
            setTimeout(() => startListening(), 3000)
          }
        }
      }

      recognition.onend = () => {
        recognitionState.current = "stopped"
        setIsListening(false)
        setStatusMessage("")

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        // Auto-restart in continuous mode
        if (continuousMode && !isSpeaking && !isProcessingSpeech.current) {
          setTimeout(() => {
            startListening()
          }, 1000)
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
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
  }, [processCommand, continuousMode, isIOS, isSpeaking, startListening])

  // Welcome message with iOS optimization
  useEffect(() => {
    if (isSupported && !hasSpokenWelcome.current) {
      hasSpokenWelcome.current = true
      lastAnnouncedPage.current = location.pathname

      setTimeout(() => {
        const pageInfo = getCurrentPageInfo()
        const welcomeMessage = isIOS
          ? `Welcome to the accessibility assistant optimized for iOS. Voice recognition is active. ${pageInfo.description} Say 'help' for all available commands, 'continuous mode' to keep listening, or 'disable speech' to turn off voice responses.`
          : `Welcome to the accessibility assistant. ${pageInfo.description} Available commands: ${pageInfo.commands}`

        speak(welcomeMessage)

        // Auto-start listening
        setTimeout(() => {
          if (isIOS) {
            setContinuousMode(true)
          }
          startListening()
        }, 3000)
      }, 1000)
    }
  }, [isSupported, speak, location.pathname, getCurrentPageInfo, isIOS, startListening])

  // Initialize iOS features
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus()
    }

    if (isIOS) {
      initializeSpeechSynthesis()
    }
  }, [isIOS, initializeSpeechSynthesis])

  // Handle main button click
  const handleMainButtonClick = () => {
    if (isListening || recognitionState.current === "running") {
      stopListening()
    } else {
      const pageInfo = getCurrentPageInfo()
      speak(
        `Voice assistant activated. ${continuousMode ? "Continuous listening mode. " : ""}${pageInfo.description} Say 'help' for all available commands.`,
      )
      setTimeout(() => startListening(), 2000)
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

  // Handle continuous mode toggle
  const handleContinuousModeToggle = () => {
    setContinuousMode(!continuousMode)
    if (!continuousMode) {
      speak("Continuous listening mode enabled. I will keep listening for your commands.")
    } else {
      speak("Single command mode enabled. Tap the button to give each command.")
    }
  }

  if (!isSupported && !isIOS) {
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
      <div className="bg-white shadow-lg rounded-lg p-4 border max-w-xs" role="region" aria-label="Voice Assistant">
        <div className="flex flex-col items-center space-y-3">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2" id="voice-assistant-title">
              {isIOS && <Smartphone className="w-4 h-4" aria-hidden="true" />}
              Voice Assistant
              {isIOS && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">iOS Optimized</span>}
            </h3>
            <p className="text-sm text-gray-600" aria-live="polite">
              {isSpeaking
                ? "Speaking..."
                : isListening
                  ? continuousMode
                    ? "Listening continuously..."
                    : "Listening..."
                  : "Ready to help"}
            </p>
            {statusMessage && (
              <p className="text-xs text-blue-600 mt-1" aria-live="polite">
                {statusMessage}
              </p>
            )}
          </div>

          {transcript && (
            <div className="text-xs text-gray-500 max-w-48 text-center" aria-live="polite">
              Last heard: "{transcript}"
            </div>
          )}

          <div className="flex gap-2 w-full">
            <Button
              ref={buttonRef}
              onClick={handleMainButtonClick}
              variant={isListening ? "destructive" : "default"}
              size="sm"
              className="flex-1"
              disabled={isSpeaking}
              aria-label={isListening ? "Stop voice recognition" : "Start voice recognition and speak page information"}
              aria-pressed={isListening}
              aria-describedby="voice-assistant-title"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-1" aria-hidden="true" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-1" aria-hidden="true" />
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
                  <Volume2 className="w-4 h-4 mr-1" aria-hidden="true" />
                  Speech On
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 mr-1" aria-hidden="true" />
                  Speech Off
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={handleContinuousModeToggle}
            variant={continuousMode ? "default" : "outline"}
            size="sm"
            className="w-full"
            aria-label={continuousMode ? "Disable continuous listening" : "Enable continuous listening"}
            aria-pressed={continuousMode}
          >
            {continuousMode ? (
              <>
                <Pause className="w-4 h-4 mr-2" aria-hidden="true" />
                Continuous Mode On
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                Single Command Mode
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center max-w-48" role="note">
            Say: "help", "navigation", "color blindness", "snap", "upload", "home", "go back", "disable speech", "enable
            speech", "continuous mode", or "single mode"
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistant

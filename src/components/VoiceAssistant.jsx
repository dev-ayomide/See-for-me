"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Mic, MicOff, Volume2, VolumeX, Smartphone, HelpCircle } from "lucide-react"

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isSupported, setIsSupported] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [statusMessage, setStatusMessage] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [assistantActive, setAssistantActive] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)
  const buttonRef = useRef(null)
  const hasSpokenWelcome = useRef(false)
  const lastAnnouncedPage = useRef("")
  const recognitionState = useRef("stopped")
  const isProcessingSpeech = useRef(false)
  const speechSynthesisReady = useRef(false)

  // Detect iOS
  useEffect(() => {
    const detectIOS = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOSDevice =
        /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

      setIsIOS(isIOSDevice)

      if (isIOSDevice) {
        console.log("iOS detected - using iOS-optimized voice assistant")
        // On iOS, we'll use button-activated speech only
        setIsSupported(true)
      }

      return isIOSDevice
    }

    detectIOS()
  }, [])

  // Get current page context with clear descriptions
  const getCurrentPageInfo = useCallback(() => {
    const path = location.pathname
    switch (path) {
      case "/":
        return {
          name: "home page",
          description:
            "You are on the home page with navigation tools, color blindness tools, camera features, and upload options.",
          commands: ["navigation", "color blindness", "camera", "upload", "help", "go back"],
        }
      case "/navigation":
        return {
          name: "navigation page",
          description: "You are on the navigation assistance page for location and direction services.",
          commands: ["color blindness", "camera", "upload", "home", "go back"],
        }
      case "/color-blindness-tools":
        return {
          name: "color blindness tools page",
          description: "You are on the color blindness tools page for color identification assistance.",
          commands: ["navigation", "camera", "upload", "home", "go back"],
        }
      case "/camera":
        return {
          name: "camera page",
          description: "You are on the camera page for image capture and analysis.",
          commands: ["navigation", "color blindness", "upload", "home", "go back"],
        }
      case "/upload":
        return {
          name: "upload page",
          description: "You are on the upload page for file management.",
          commands: ["navigation", "color blindness", "camera", "home", "go back"],
        }
      default:
        return {
          name: "current page",
          description: "You are on a page within the accessibility assistant application.",
          commands: ["navigation", "color blindness", "camera", "upload", "home", "go back"],
        }
    }
  }, [location.pathname])

  // Initialize speech synthesis for iOS
  const initializeSpeechSynthesis = useCallback(() => {
    if ("speechSynthesis" in window) {
      // Silent initialization for iOS
      const utterance = new SpeechSynthesisUtterance("")
      utterance.volume = 0
      utterance.onend = () => {
        speechSynthesisReady.current = true
      }
      window.speechSynthesis.speak(utterance)

      // Load voices
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", () => {
          speechSynthesisReady.current = true
        })
      } else {
        speechSynthesisReady.current = true
      }
    }
  }, [])

  // Enhanced speech function for iOS
  const speak = useCallback(
    (text, callback) => {
      if (!speechEnabled || !assistantActive) {
        setStatusMessage(text)
        setTimeout(() => setStatusMessage(""), 3000)
        if (callback) setTimeout(callback, 500)
        return
      }

      if (!("speechSynthesis" in window) || isProcessingSpeech.current) return

      isProcessingSpeech.current = true
      setIsSpeaking(true)
      setStatusMessage("Speaking...")

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      setTimeout(() => {
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
          }
        }

        utterance.onerror = (error) => {
          console.error("Speech synthesis error:", error)
          setIsSpeaking(false)
          isProcessingSpeech.current = false
          setStatusMessage("Speech error occurred")
        }

        window.speechSynthesis.speak(utterance)
      }, 100)
    },
    [speechEnabled, assistantActive, isIOS],
  )

  // Process voice commands
  const processCommand = useCallback(
    (command) => {
      if (!assistantActive) return

      const lowerCommand = command.toLowerCase().trim()

      // Assistant control commands
      if (lowerCommand.includes("turn off assistant") || lowerCommand.includes("disable assistant")) {
        setAssistantActive(false)
        speak("Voice assistant disabled. Tap the power button to reactivate.")
        return
      }

      if (lowerCommand.includes("turn on assistant") || lowerCommand.includes("enable assistant")) {
        setAssistantActive(true)
        speak("Voice assistant enabled and ready to help.")
        return
      }

      // Speech control commands
      if (
        lowerCommand.includes("disable speech") ||
        lowerCommand.includes("turn off speech") ||
        lowerCommand.includes("mute speech")
      ) {
        setSpeechEnabled(false)
        setStatusMessage("Speech disabled. Voice commands still work.")
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

      // Navigation commands
      if (lowerCommand.includes("navigation")) {
        speak("Opening navigation assistant in a new tab.", () => {
          window.open("https://navigation-assistant.vercel.app/", "_blank")
        })
      } else if (lowerCommand.includes("color") || lowerCommand.includes("color blindness")) {
        speak("Navigating to color blindness tools.", () => {
          navigate("/color-blindness-tools")
        })
      } else if (lowerCommand.includes("camera") || lowerCommand.includes("snap")) {
        speak("Navigating to camera page.", () => {
          navigate("/camera")
        })
      } else if (lowerCommand.includes("upload")) {
        speak("Navigating to upload page.", () => {
          navigate("/upload")
        })
      } else if (lowerCommand.includes("home")) {
        speak("Navigating to home page.", () => {
          navigate("/")
        })
      } else if (lowerCommand.includes("go back") || lowerCommand.includes("back")) {
        speak("Going back to the previous page.", () => {
          navigate(-1)
        })
      } else if (lowerCommand.includes("help") || lowerCommand.includes("what can you do")) {
        const pageInfo = getCurrentPageInfo()
        const commandsList = pageInfo.commands.join(", ")
        speak(
          `${pageInfo.description} Available commands are: ${commandsList}. You can also say 'disable speech', 'enable speech', 'turn off assistant', or 'turn on assistant'.`,
        )
      } else if (lowerCommand.includes("where am i") || lowerCommand.includes("current page")) {
        const pageInfo = getCurrentPageInfo()
        speak(`You are currently on the ${pageInfo.name}. ${pageInfo.description}`)
      } else if (lowerCommand.includes("repeat") || lowerCommand.includes("say again")) {
        const pageInfo = getCurrentPageInfo()
        speak(pageInfo.description)
      } else {
        speak(
          "I didn't understand that command. Say 'help' to hear all available options, or try commands like navigation, color blindness, camera, upload, home, or go back.",
        )
      }
    },
    [navigate, speak, getCurrentPageInfo, assistantActive],
  )

  // iOS-specific listening simulation (button activated)
  const startIOSListening = useCallback(() => {
    if (!assistantActive) return

    setIsListening(true)
    setStatusMessage("Ready to listen. Speak your command now.")

    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    // Simulate listening for iOS (since we can't actually listen)
    // In a real implementation, this would integrate with iOS speech recognition
    // For now, we'll provide a timeout and ask user to use the command buttons
    timeoutRef.current = setTimeout(() => {
      setIsListening(false)
      setStatusMessage("")
      speak("I couldn't detect speech on iOS. Please use the command buttons below or try the voice button again.")
    }, 5000)
  }, [assistantActive, speak])

  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false)
    setStatusMessage("")
    recognitionState.current = "stopped"

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (recognitionRef.current && recognitionState.current !== "stopped") {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log("Recognition already stopped")
      }
    }
  }, [])

  // Non-iOS speech recognition setup
  useEffect(() => {
    if (isIOS) return // Skip speech recognition setup on iOS

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      recognitionState.current = "running"
      setIsListening(true)
      setStatusMessage("Listening...")
    }

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
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
      setStatusMessage("")

      if (event.error !== "aborted" && event.error !== "no-speech") {
        setStatusMessage("Voice recognition error. Please try again.")
      }
    }

    recognition.onend = () => {
      recognitionState.current = "stopped"
      setIsListening(false)
      setStatusMessage("")
    }

    recognitionRef.current = recognition

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, [processCommand, isSpeaking, isIOS])

  // Start listening (non-iOS)
  const startListening = useCallback(() => {
    if (!assistantActive || isIOS) return

    if (!recognitionRef.current || isSpeaking || isProcessingSpeech.current) return

    try {
      recognitionState.current = "starting"
      setTranscript("")
      recognitionRef.current.start()
      setLastInteraction(Date.now())

      timeoutRef.current = setTimeout(() => {
        if (recognitionState.current === "running") {
          speak("I didn't hear anything. Please try again.")
          stopListening()
        }
      }, 10000)
    } catch (error) {
      console.error("Error starting recognition:", error)
      recognitionState.current = "stopped"
      setIsListening(false)
      setStatusMessage("Voice recognition error. Please try again.")
    }
  }, [assistantActive, isIOS, isSpeaking, speak, stopListening])

  // Welcome message and page announcements
  useEffect(() => {
    if (!assistantActive) return

    const currentPath = location.pathname

    if (lastAnnouncedPage.current !== currentPath) {
      lastAnnouncedPage.current = currentPath
      const pageInfo = getCurrentPageInfo()

      if (!hasSpokenWelcome.current) {
        hasSpokenWelcome.current = true
        setTimeout(() => {
          const welcomeMessage = isIOS
            ? `Welcome to the accessibility assistant optimized for iOS. ${pageInfo.description} Tap the microphone button to give voice commands, or use the command buttons below.`
            : `Welcome to the accessibility assistant. ${pageInfo.description} Tap the microphone to give voice commands.`

          speak(welcomeMessage)
        }, 1000)
      } else {
        setTimeout(() => {
          speak(`Page changed. ${pageInfo.description}`)
        }, 500)
      }
    }
  }, [location.pathname, getCurrentPageInfo, isIOS, speak, assistantActive])

  // Initialize
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus()
    }

    if (isIOS) {
      initializeSpeechSynthesis()
    }
  }, [isIOS, initializeSpeechSynthesis])

  // Handle main voice button
  const handleVoiceButtonClick = () => {
    if (!assistantActive) {
      setAssistantActive(true)
      speak("Voice assistant activated and ready to help.")
      return
    }

    if (isListening) {
      stopListening()
    } else if (!isSpeaking) {
      if (isIOS) {
        startIOSListening()
      } else {
        startListening()
      }
    }
  }

  // Handle speech toggle
  const handleSpeechToggle = () => {
    if (!assistantActive) return

    setSpeechEnabled(!speechEnabled)
    if (!speechEnabled) {
      speak("Speech responses enabled.")
    } else {
      setStatusMessage("Speech responses disabled. Voice commands still work.")
      setTimeout(() => setStatusMessage(""), 3000)
    }
  }

  // Handle assistant power toggle
  const handleAssistantToggle = () => {
    setAssistantActive(!assistantActive)
    if (!assistantActive) {
      speak("Voice assistant activated and ready to help.")
    } else {
      setStatusMessage("Voice assistant disabled.")
      setTimeout(() => setStatusMessage(""), 3000)
    }
  }

  // Quick command buttons for iOS
  const QuickCommandButtons = () => {
    const pageInfo = getCurrentPageInfo()
    const commands = pageInfo.commands.slice(0, 4) // Show first 4 commands

    return (
      <div className="grid grid-cols-2 gap-1 w-full mt-2">
        {commands.map((command) => (
          <Button
            key={command}
            size="sm"
            variant="outline"
            onClick={() => processCommand(command)}
            className="text-xs py-1 px-2"
            disabled={!assistantActive}
          >
            {command === "color blindness" ? "Color Tools" : command.charAt(0).toUpperCase() + command.slice(1)}
          </Button>
        ))}
      </div>
    )
  }

  if (!isSupported && !isIOS) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-xs">
        <p className="text-yellow-800 text-sm text-center">
          Voice assistant is not supported in this browser. Please use a modern browser.
        </p>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={`bg-white shadow-lg rounded-lg p-3 border max-w-sm transition-opacity duration-300 ${
          assistantActive ? "opacity-100" : "opacity-75"
        }`}
        role="region"
        aria-label="Voice Assistant"
      >
        <div className="flex flex-col items-center space-y-2">
          {/* Header */}
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm" id="voice-assistant-title">
              {isIOS && <Smartphone className="w-4 h-4" aria-hidden="true" />}
              Voice Assistant
              {isIOS && <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">iOS</span>}
            </h3>
            <p className="text-xs text-gray-600" aria-live="polite">
              {!assistantActive
                ? "Assistant disabled"
                : isSpeaking
                  ? "Speaking..."
                  : isListening
                    ? "Listening..."
                    : "Ready to help"}
            </p>
            {statusMessage && (
              <p className="text-xs text-blue-600 mt-1" aria-live="polite">
                {statusMessage}
              </p>
            )}
          </div>

          {/* Last heard transcript */}
          {transcript && !isIOS && (
            <div className="text-xs text-gray-500 text-center max-w-full" aria-live="polite">
              Last heard: "{transcript}"
            </div>
          )}

          {/* Main controls */}
          <div className="flex gap-2 w-full">
            <Button
              ref={buttonRef}
              onClick={handleVoiceButtonClick}
              variant={isListening ? "destructive" : assistantActive ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={isSpeaking}
              aria-label={
                !assistantActive
                  ? "Activate voice assistant"
                  : isListening
                    ? "Stop listening"
                    : "Start voice recognition"
              }
              aria-pressed={isListening}
            >
              {!assistantActive ? (
                <>
                  <Mic className="w-4 h-4 mr-1" aria-hidden="true" />
                  Activate
                </>
              ) : isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-1" aria-hidden="true" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-1" aria-hidden="true" />
                  {isIOS ? "Tap to Speak" : "Listen"}
                </>
              )}
            </Button>

            <Button
              onClick={handleSpeechToggle}
              variant={speechEnabled && assistantActive ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={!assistantActive}
              aria-label={speechEnabled ? "Disable speech responses" : "Enable speech responses"}
              aria-pressed={speechEnabled}
            >
              {speechEnabled && assistantActive ? (
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

          {/* iOS Quick Commands */}
          {isIOS && assistantActive && <QuickCommandButtons />}

          {/* Help and Power buttons */}
          <div className="flex gap-2 w-full">
            <Button
              onClick={() => {
                if (assistantActive) {
                  setShowCommands(!showCommands)
                  if (!showCommands) {
                    const pageInfo = getCurrentPageInfo()
                    speak(`Available commands: ${pageInfo.commands.join(", ")}`)
                  }
                }
              }}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!assistantActive}
              aria-label="Show available commands"
            >
              <HelpCircle className="w-4 h-4 mr-1" aria-hidden="true" />
              Help
            </Button>

            <Button
              onClick={handleAssistantToggle}
              variant={assistantActive ? "destructive" : "default"}
              size="sm"
              className="flex-1"
              aria-label={assistantActive ? "Turn off voice assistant" : "Turn on voice assistant"}
              aria-pressed={assistantActive}
            >
              {assistantActive ? "Turn Off" : "Turn On"}
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center max-w-full" role="note">
            {!assistantActive
              ? "Voice assistant is disabled. Tap 'Turn On' to activate."
              : isIOS
                ? "Tap microphone or use buttons above for commands"
                : "Tap microphone and say: navigation, color blindness, camera, upload, home, or help"}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistant

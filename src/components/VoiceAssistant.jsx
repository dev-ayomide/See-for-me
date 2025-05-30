"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Mic, MicOff, Smartphone, Volume2 } from "lucide-react"

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [lastInteraction, setLastInteraction] = useState(Date.now())
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
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

  // Detect iOS
  useEffect(() => {
    const detectIOS = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOSDevice =
        /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      setIsIOS(isIOSDevice)

      if (isIOSDevice) {
        console.log("iOS detected - using iOS-optimized voice assistant")
      }

      return isIOSDevice
    }

    detectIOS()
  }, [])

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

  // Initialize speech synthesis for iOS
  const initializeSpeechSynthesis = useCallback(() => {
    if ("speechSynthesis" in window) {
      // For iOS, we need to initialize speech synthesis with user interaction
      const utterance = new SpeechSynthesisUtterance("")
      utterance.volume = 0
      window.speechSynthesis.speak(utterance)
      speechSynthesisReady.current = true
    }
  }, [])

  // Stop listening function
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

  // Start listening function - with iOS fallback
  const startListening = useCallback(() => {
    if (isIOS) {
      // On iOS, show instructions for manual input
      setShowIOSInstructions(true)
      setTimeout(() => setShowIOSInstructions(false), 5000)
      return
    }

    if (!recognitionRef.current || !isSupported || isSpeaking || isProcessingSpeech.current) {
      return
    }

    stopListening()

    setTimeout(() => {
      if (recognitionState.current === "stopped" && !isSpeaking && !isProcessingSpeech.current) {
        try {
          recognitionState.current = "starting"
          setTranscript("")
          recognitionRef.current.start()
          setLastInteraction(Date.now())

          timeoutRef.current = setTimeout(() => {
            if (recognitionState.current === "running" && !isSpeaking) {
              speak(
                "I'm still here to help. Say a command like navigation, color blindness, snap, upload, or say 'help' for more options.",
              )
            }
          }, 15000)
        } catch (error) {
          console.error("Error starting recognition:", error)
          recognitionState.current = "stopped"
          setIsListening(false)
        }
      }
    }, 500)
  }, [isSupported, isSpeaking, stopListening, isIOS])

  // iOS-optimized speech synthesis
  const speak = useCallback(
    (text, callback) => {
      if (!("speechSynthesis" in window) || isProcessingSpeech.current) return

      isProcessingSpeech.current = true
      setIsSpeaking(true)

      if (!isIOS) {
        stopListening()
      }

      setTimeout(
        () => {
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(text)
          utterance.rate = isIOS ? 0.7 : 0.8 // Slower rate for iOS
          utterance.pitch = 1
          utterance.volume = 1

          // iOS-specific voice selection
          if (isIOS) {
            const voices = window.speechSynthesis.getVoices()
            const englishVoice = voices.find((voice) => voice.lang.startsWith("en") && voice.localService)
            if (englishVoice) {
              utterance.voice = englishVoice
            }
          }

          utterance.onstart = () => {
            setIsSpeaking(true)
          }

          utterance.onend = () => {
            setLastInteraction(Date.now())
            setIsSpeaking(false)
            isProcessingSpeech.current = false

            if (callback) {
              setTimeout(() => {
                callback()
              }, 500)
            } else if (!isIOS) {
              setTimeout(() => {
                if (!isSpeaking && !isProcessingSpeech.current) {
                  startListening()
                }
              }, 1500)
            }
          }

          utterance.onerror = (error) => {
            console.error("Speech synthesis error:", error)
            setIsSpeaking(false)
            isProcessingSpeech.current = false

            if (!isIOS) {
              setTimeout(() => {
                if (!isSpeaking && !isProcessingSpeech.current) {
                  startListening()
                }
              }, 1000)
            }
          }

          window.speechSynthesis.speak(utterance)
        },
        isIOS ? 100 : 300,
      )
    },
    [stopListening, startListening, isSpeaking, isIOS],
  )

  // Process voice commands
  const processCommand = useCallback(
    (command) => {
      const lowerCommand = command.toLowerCase().trim()

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
        speak(`${pageInfo.description} Available commands: ${pageInfo.commands}`)
      } else if (lowerCommand.includes("where am i") || lowerCommand.includes("current page")) {
        const pageInfo = getCurrentPageInfo()
        speak(`You are currently on the ${pageInfo.name}. ${pageInfo.description}`)
      } else {
        speak(
          "I didn't understand that command. Say 'help' to hear available options, or try commands like navigation, color blindness, snap, upload, home, or go back.",
        )
      }
    },
    [navigate, speak, getCurrentPageInfo],
  )

  // iOS manual command buttons
  const IOSCommandButtons = () => (
    <div className="grid grid-cols-2 gap-2 w-full mt-3">
      <Button size="sm" variant="outline" onClick={() => processCommand("navigation")} className="text-xs">
        Navigation
      </Button>
      <Button size="sm" variant="outline" onClick={() => processCommand("color blindness")} className="text-xs">
        Color Tools
      </Button>
      <Button size="sm" variant="outline" onClick={() => processCommand("snap")} className="text-xs">
        Camera
      </Button>
      <Button size="sm" variant="outline" onClick={() => processCommand("upload")} className="text-xs">
        Upload
      </Button>
      <Button size="sm" variant="outline" onClick={() => processCommand("help")} className="text-xs">
        Help
      </Button>
      <Button size="sm" variant="outline" onClick={() => processCommand("go back")} className="text-xs">
        Go Back
      </Button>
    </div>
  )

  // Periodic reminder (disabled on iOS)
  useEffect(() => {
    if (isIOS) return

    const checkForReactivation = () => {
      const timeSinceLastInteraction = Date.now() - lastInteraction

      if (
        timeSinceLastInteraction > 60000 &&
        !isListening &&
        !isSpeaking &&
        !isProcessingSpeech.current &&
        recognitionState.current === "stopped"
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
  }, [lastInteraction, isListening, isSpeaking, speak, getCurrentPageInfo, isIOS])

  // Announce page changes
  useEffect(() => {
    const currentPath = location.pathname

    if (lastAnnouncedPage.current !== currentPath && hasSpokenWelcome.current) {
      lastAnnouncedPage.current = currentPath
      const pageInfo = getCurrentPageInfo()

      setTimeout(() => {
        speak(`Page loaded. ${pageInfo.description} Available commands: ${pageInfo.commands}`)
      }, 1000)
    }
  }, [location.pathname, speak, getCurrentPageInfo])

  // Initialize speech recognition (skip on iOS)
  useEffect(() => {
    if (isIOS) {
      setIsSupported(true) // We support iOS through buttons
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition || !("speechSynthesis" in window)) {
      setIsSupported(false)
      console.warn("Speech recognition or synthesis not supported in this browser")
      return
    }

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

      if (event.error !== "aborted" && event.error !== "no-speech" && !isSpeaking) {
        speak("Sorry, there was an error with voice recognition. Please try the Talk to Assistant button.")
      }
    }

    recognition.onend = () => {
      recognitionState.current = "stopped"
      setIsListening(false)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognition) {
        recognition.abort()
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
  }, [processCommand, isSpeaking, isIOS])

  // Welcome message
  useEffect(() => {
    if (isSupported && !hasSpokenWelcome.current) {
      hasSpokenWelcome.current = true
      lastAnnouncedPage.current = location.pathname

      setTimeout(() => {
        const pageInfo = getCurrentPageInfo()
        const welcomeMessage = isIOS
          ? `Welcome to the accessibility assistant on iOS. ${pageInfo.description} Use the buttons below to navigate or tap the speak button to hear this again.`
          : `Welcome to the accessibility assistant. ${pageInfo.description} Available commands: ${pageInfo.commands}`

        speak(welcomeMessage)
      }, 1000)
    }
  }, [isSupported, speak, location.pathname, getCurrentPageInfo, isIOS])

  // Auto-focus and initialize
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus()
    }

    if (isIOS) {
      initializeSpeechSynthesis()
    }
  }, [isIOS, initializeSpeechSynthesis])

  // Handle button click
  const handleButtonClick = () => {
    if (isIOS) {
      // On iOS, just speak the current page info
      const pageInfo = getCurrentPageInfo()
      speak(`Voice assistant activated. ${pageInfo.description} Use the buttons below to navigate.`)
      return
    }

    if (isListening || recognitionState.current === "running") {
      stopListening()
    } else if (!isSpeaking && !isProcessingSpeech.current) {
      const pageInfo = getCurrentPageInfo()
      speak(`Voice assistant activated. ${pageInfo.commands}`)
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
      <div className="bg-white shadow-lg rounded-lg p-4 border max-w-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {isIOS && <Smartphone className="w-4 h-4" />}
              Voice Assistant
              {isIOS && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">iOS</span>}
            </h3>
            <p className="text-sm text-gray-600">
              {isSpeaking
                ? "Speaking..."
                : isListening
                  ? "Listening..."
                  : isIOS
                    ? "Tap buttons to navigate"
                    : "Ready to help"}
            </p>
          </div>

          {showIOSInstructions && (
            <div className="text-xs text-blue-600 text-center bg-blue-50 p-2 rounded">
              Voice recognition not available on iOS. Use the buttons below to navigate.
            </div>
          )}

          {transcript && !isIOS && (
            <div className="text-xs text-gray-500 max-w-48 text-center">Last heard: "{transcript}"</div>
          )}

          <Button
            ref={buttonRef}
            onClick={handleButtonClick}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="w-full"
            disabled={isSpeaking}
            aria-label={
              isIOS
                ? "Speak current page information"
                : isListening
                  ? "Stop listening to voice commands"
                  : "Start listening to voice commands"
            }
            aria-pressed={isListening}
          >
            {isIOS ? (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Speak Info
              </>
            ) : isListening ? (
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

          {isIOS && <IOSCommandButtons />}

          <div className="text-xs text-gray-500 text-center max-w-48">
            {isIOS
              ? "Tap buttons above to navigate or use the speak button for audio guidance"
              : 'Say: "help", "navigation", "color blindness", "snap", "upload", "home", or "go back"'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistant

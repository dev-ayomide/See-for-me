import { useState } from 'react'
import './App.css'
import React from "react";
import "tailwindcss/tailwind.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroSection from './components/HeroSection';
import FeatureSection from './components/FeatureSection';
import Footer from './components/Footer';
import ColorBlindnessTool from './components/ColorBlindnessTools';
import BlindnessAssistance from './components/BlindnessAssistance';
import ResourcesSection from './components/ResourcesSection';
import { ThemeProvider } from "./context/theme-context"
import ImageUpload from "./components/ImageUpload"
import ImageResult from "./components/ImageResult"
import CameraCapture from "./components/CameraCapture";
import ColorBlindnessResults from './components/ColorBlindnessResults';
import { SpeechProvider } from './context/speech-context';
import VoiceAssistant from './components/VoiceAssistant';
// import SimpleCameraCapture from './components/SimpleCameraCapture';

function App() {
  // const CameraComponent = SimpleCameraCapture
  return (
  <SpeechProvider>
  <ThemeProvider>
   <Router>
    <VoiceAssistant />
    <Navbar/>
    <Routes>
      <Route path="/" element={
						<>
              <HeroSection/>
              <FeatureSection/>
						</>
					} />
      <Route
					path="/color-blindness-tools"
					element={
						<>
							<ColorBlindnessTool />
						</>
					}
				/>
        <Route
					path="/color-blindness-results"
					element={
						<>
							<ColorBlindnessResults />
						</>
					}
				/>
         <Route
					path="/blindness-assistance"
					element={
						<>
							<BlindnessAssistance />
						</>
					}
				/>
        <Route path="/upload" element={<ImageUpload />} />
        <Route path="/result" element={<ImageResult />} />
        <Route path="/camera" element={<CameraCapture />} />
        <Route 
          path="/resources"
          element={
            <>
              <ResourcesSection/>
            </>
          }
        />
      </Routes>
      <Footer/>
   </Router>
   </ThemeProvider>
   </SpeechProvider>
  )
}

export default App

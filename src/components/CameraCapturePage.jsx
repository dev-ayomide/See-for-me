import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getImageColorsAndCoordinates } from "../services/geminiService";
import { Loader2, Camera } from "lucide-react";

export default function CameraCapturePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Start camera on mount
  React.useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera access denied or not available.");
        setCapturing(false);
      }
    })();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL("image/jpeg");
    setCapturing(false);
    setIsProcessing(true);
    // Stop the camera
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }
    try {
      const objects = await getImageColorsAndCoordinates(imageBase64);
      setIsProcessing(false);
      navigate("/color-blindness-results", {
        state: { originalImage: imageBase64, objects },
      });
    } catch (err) {
      setIsProcessing(false);
      setError("Failed to analyze image. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-2xl relative">
        <div className="absolute left-4 top-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-blue-600 text-xl font-bold">←</button>
        </div>
        <Camera className="w-16 h-16 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Camera Capture</h2>
        <p className="text-gray-500 mb-6 text-center text-sm">Take a photo to detect objects and colors in real time.</p>
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-40 w-full">
            <Loader2 className="animate-spin w-12 h-12 text-blue-600 mb-2" />
            <span className="text-blue-600 font-medium text-lg">Processing...</span>
          </div>
        ) : capturing ? (
          <>
            <video ref={videoRef} autoPlay className="w-full max-w-lg rounded-xl mb-4 border border-gray-200 shadow-sm" style={{ minHeight: 320, background: '#f3f4f6' }} />
            <button
              onClick={capturePhoto}
              className="px-6 py-2 bg-green-600 text-white rounded-lg w-full text-base font-semibold shadow hover:bg-green-700 transition-colors"
            >
              Capture Photo
            </button>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </>
        ) : null}
        {error && <div className="text-red-600 mt-4 text-center text-sm">{error}</div>}
      </div>
    </div>
  );
}

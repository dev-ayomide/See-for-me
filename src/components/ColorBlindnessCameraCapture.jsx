import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getImageColorsAndCoordinates } from "../services/geminiService";
import { Loader2, Camera} from "lucide-react"; // If using lucide-react icons

export default function ColorBlindnessCameraCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const startCamera = async () => {
    setError("");
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied or not available.");
      setCapturing(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL("image/jpeg");

    setCapturing(false);
    setIsProcessing(true); // Start spinner

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
    <div className="w-full">
      <div className="border border-gray-200 rounded-lg p-5 flex flex-col items-center shadow-sm bg-white min-h-[220px] min-w-[180px] max-w-[320px] mx-auto transition-all duration-200">
        <h3 className="text-base font-semibold mb-3">Camera</h3>
        <div className="w-12 h-12 flex items-center justify-center text-blue-600 mb-2">
          <Camera className="w-8 h-8" />
        </div>
        {!capturing && !isProcessing ? (
          <button
            onClick={startCamera}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md w-full text-sm"
          >
            Start Camera
          </button>
        ) : isProcessing ? (
          <div className="flex flex-col items-center justify-center h-28 w-full">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-2" />
            <span className="text-blue-600 font-medium text-base">Processing...</span>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay className="w-full max-w-xs rounded-lg mb-3" style={{ minHeight: 120, background: '#eee' }} />
            <button
              onClick={capturePhoto}
              className="px-3 py-1.5 bg-green-600 text-white rounded-md w-full text-sm"
            >
              Capture Photo
            </button>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </>
        )}
        {error && <div className="text-red-600 mt-2 text-xs text-center">{error}</div>}
      </div>
    </div>
  );
}
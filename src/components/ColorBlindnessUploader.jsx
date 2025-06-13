import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { getImageColorsAndCoordinates } from "../services/geminiService";

const matrices = {
  protanopia: [
    [0.567, 0.433, 0.000],
    [0.558, 0.442, 0.000],
    [0.000, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.000],
    [0.700, 0.300, 0.000],
    [0.000, 0.300, 0.700],
  ],
  tritanopia: [
    [0.950, 0.050, 0.000],
    [0.000, 0.433, 0.567],
    [0.000, 0.475, 0.525],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
};

function applyColorBlindnessEffect(imageData, matrix) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    data[i] = r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2]; // R
    data[i + 1] = r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2]; // G
    data[i + 2] = r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2]; // B
  }
  return imageData;
}

export default function ColorBlindnessUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("ai"); // "ai" or "simulate"
  const [simType, setSimType] = useState("protanopia");
  const navigate = useNavigate();

  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError("");
  };

  const onFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }
    setIsUploading(true);
    setError("");
    if (mode === "ai") {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageBase64 = e.target.result;
          try {
            const objects = await getImageColorsAndCoordinates(imageBase64);
            setIsUploading(false);
            navigate("/color-blindness-results", {
              state: { originalImage: imageBase64, objects },
            });
          } catch (err) {
            setIsUploading(false);
            setError("Failed to analyze image. Please try again.");
          }
        };
        reader.readAsDataURL(selectedFile);
      } catch (err) {
        setIsUploading(false);
        setError("Failed to process file. Please try again.");
      }
    } else {
      // Simulation mode
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const matrix = matrices[simType];
            const filteredData = new window.ImageData(
              new Uint8ClampedArray(originalData.data),
              canvas.width,
              canvas.height
            );
            const transformed = applyColorBlindnessEffect(filteredData, matrix);
            ctx.putImageData(transformed, 0, 0);
            const simImage = canvas.toDataURL();
            setIsUploading(false);
            navigate("/color-blindness-results", {
              state: { originalImage: simImage, objects: [] },
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(selectedFile);
      } catch (err) {
        setIsUploading(false);
        setError("Failed to process file. Please try again.");
      }
    }
  };

  return (
    <div className="w-full">
      <div className="p-5 flex flex-col items-center shadow-sm min-h-[220px] min-w-[180px] max-w-[320px] mx-auto transition-all duration-200">
        {/* Toggle for mode */}
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded-l-md border text-sm font-medium ${mode === "ai" ? "bg-blue-600 text-white border-blue-600" : "text-blue-600 border-blue-600"}`}
            onClick={() => setMode("ai")}
            aria-pressed={mode === "ai"}
          >
            AI Color Detection
          </button>
          <button
            className={`px-3 py-1 rounded-r-md border text-sm font-medium ${mode === "simulate" ? "bg-blue-600 text-white border-blue-600" : "text-blue-600 border-blue-600"}`}
            onClick={() => setMode("simulate")}
            aria-pressed={mode === "simulate"}
          >
            Color Blindness Simulation
          </button>
        </div>
        {mode === "simulate" && (
          <div className="mb-3 w-full flex flex-col items-center">
            <label htmlFor="simType" className="text-xs font-medium mb-1 text-gray-700">Simulation Type:</label>
            <select
              id="simType"
              value={simType}
              onChange={e => setSimType(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full bg-white dark:bg-gray-800 sepia:bg-amber-50"
            >
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
              <option value="achromatopsia">Achromatopsia</option>
            </select>
          </div>
        )}
        <label className="w-full cursor-pointer">
          <input type="file" onChange={onFileChange} accept="image/*" className="hidden" />
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Upload className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-blue-600 font-medium text-sm">Click to choose image</span>
          </div>
        </label>
        {selectedFile && (
          <div className="text-center mt-4 w-full">
            <p className="mb-1 text-xs">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </p>
            <button
              onClick={onFileUpload}
              disabled={isUploading}
              className={`px-3 py-1.5 rounded-md w-full mt-1 text-sm ${
                isUploading ? "cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              } text-white transition-colors`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" /> Processing...
                </span>
              ) : (
                mode === "ai" ? "Process File" : `Simulate (${simType.charAt(0).toUpperCase() + simType.slice(1)})`
              )}
            </button>
          </div>
        )}
        {error && <div className="text-red-600 mt-2 text-xs text-center">{error}</div>}
      </div>
    </div>
  );
}
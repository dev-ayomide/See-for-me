import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { getImageColorsAndCoordinates } from "../services/geminiService";

export default function ColorBlindnessUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
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
  };

  return (
    <div className="w-full">
      <div className="p-5 flex flex-col items-center shadow-sm min-h-[220px] min-w-[180px] max-w-[320px] mx-auto transition-all duration-200">
        <h1 className="text-lg font-bold mb-3">Upload Image</h1>
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
                isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              } text-white transition-colors`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" /> Processing...
                </span>
              ) : (
                "Process File"
              )}
            </button>
          </div>
        )}
        {error && <div className="text-red-600 mt-2 text-xs text-center">{error}</div>}
      </div>
    </div>
  );
}
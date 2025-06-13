import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import html2canvas from "html2canvas";

export default function ColorBlindnessResults() {
  const location = useLocation();
  const image = location.state?.originalImage;
  const objects = location.state?.objects || [];
  const imgRef = useRef(null);
  const [imgDims, setImgDims] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (imgRef.current) {
      const updateDims = () => {
        setImgDims({
          width: imgRef.current.naturalWidth,
          height: imgRef.current.naturalHeight,
        });
      };
      imgRef.current.onload = updateDims;
      if (imgRef.current.complete) updateDims();
    }
  }, [image]);

  // Helper to scale coordinates to displayed image size
  const getScaled = (box) => {
    const displayWidth = imgRef.current?.width || 1;
    const displayHeight = imgRef.current?.height || 1;
    return {
      x: (box.x / imgDims.width) * displayWidth,
      y: (box.y / imgDims.height) * displayHeight,
      width: (box.width / imgDims.width) * displayWidth,
      height: (box.height / imgDims.height) * displayHeight,
    };
  };

  // Get dot position (center of bounding box), clamped to image bounds
  const getDotPosition = (box) => {
    if (!imgRef.current) return { left: 0, top: 0, flip: false };
    const rect = imgRef.current.getBoundingClientRect();
    const displayWidth = imgRef.current.width;
    const displayHeight = imgRef.current.height;
    // Scale box to displayed image size
    const x = (box.x / imgDims.width) * displayWidth;
    const y = (box.y / imgDims.height) * displayHeight;
    const w = (box.width / imgDims.width) * displayWidth;
    const h = (box.height / imgDims.height) * displayHeight;
    // Center of box
    let left = x + w / 2;
    let top = y + h / 2;
    // Clamp so the overlay never goes outside the image
    const descW = 120;
    const dotW = 20;
    let flip = false;
    if (left + dotW + descW > displayWidth) {
      flip = true;
      left = Math.min(left, displayWidth - dotW);
    }
    left = Math.max(dotW, Math.min(left, displayWidth - dotW));
    top = Math.max(16, Math.min(top, displayHeight - 16));
    return { left, top, flip };
  };

  // Download the annotated image
  const handleDownload = async () => {
    const container = document.getElementById("annotated-image-container");
    if (!container) return;
    const canvas = await html2canvas(container, { backgroundColor: null });
    const link = document.createElement("a");
    link.download = "colorblindness-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Share the annotated image (Web Share API or copy to clipboard)
  const handleShare = async () => {
    const container = document.getElementById("annotated-image-container");
    if (!container) return;
    const canvas = await html2canvas(container, { backgroundColor: null });
    canvas.toBlob(async (blob) => {
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], "colorblindness-result.png", { type: blob.type })] })) {
        try {
          await navigator.share({
            files: [new File([blob], "colorblindness-result.png", { type: blob.type })],
            title: "Color Blindness Result",
            text: "Check out this annotated image!",
          });
        } catch (e) {
          // User cancelled or error
        }
      } else if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({ [blob.type]: blob })
          ]);
          alert("Image copied to clipboard!");
        } catch (e) {
          alert("Unable to share or copy image.");
        }
      } else {
        alert("Sharing is not supported on this device.");
      }
    }, "image/png");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Color Identification Result
      </h1>
      <div className="relative flex flex-col items-center gap-6" style={{ width: "100%" }}>
        <div id="annotated-image-container" style={{ position: "relative", width: "100%", maxWidth: 600, minHeight: 360 }}>
          <img
            ref={imgRef}
            src={image}
            alt="Captured"
            className="w-full rounded-lg border"
            style={{ display: "block", maxHeight: 480, objectFit: "contain", background: "#f8fafc" }}
          />

          {/* Dots and always-visible descriptions inside the image */}
          {objects.map((obj, idx) => {
            const dot = getDotPosition(obj.box);
            return (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  left: dot.left,
                  top: dot.top,
                  display: "flex",
                  alignItems: "center",
                  zIndex: 30,
                  transform: dot.flip
                    ? "translate(-100%, -50%)"
                    : "translate(0, -50%)",
                  maxWidth: "95%",
                  pointerEvents: "auto",
                }}
                tabIndex={0}
                aria-label={`Object: ${obj.object}, color: ${obj.color}`}
              >
                {/* Dot */}
                <span
                  style={{
                    display: "block",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: obj.hex,
                    border: `2px solid #fff`,
                    boxShadow: `0 0 0 2px ${obj.hex}55`,
                    marginRight: dot.flip ? 0 : 6,
                    marginLeft: dot.flip ? 6 : 0,
                  }}
                />
                {/* Description always visible, beside the dot, smaller and visually appealing */}
                <span
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    border: `1.5px solid ${obj.hex}`,
                    color: "#222",
                    padding: "3px 8px 3px 6px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    whiteSpace: "nowrap",
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ color: obj.hex, fontWeight: "bold", marginRight: 4 }}>⬤</span>
                  <span>{obj.object}</span>
                  <br />
                  <span>
                    <span style={{ color: obj.hex }}>{obj.color}</span>{" "}
                    <span style={{ fontFamily: "monospace", fontSize: "0.8em" }}>{obj.hex}</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Download Result
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            Share
          </button>
        </div>
        <Link
          to="/color-blindness-tools"
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Try Another
        </Link>
      </div>
      <div className="text-center mt-4 text-gray-600">
        {objects.length === 0 && "No objects detected."}
        {objects.length > 0 && "Each dot and description is shown inside the image."}
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Eye, Layers, Crosshair } from 'lucide-react';
import { Detection, SonarImage } from '../../types/analysis';
import { resolveAssetUrl } from '../../services/api';

interface SonarViewerProps {
  image: SonarImage;
  detections: Detection[];
  selectedDetectionId: string | null;
  onSelectDetection: (id: string) => void;
  isSyntheticDemo?: boolean;
}

export const SonarViewer: React.FC<SonarViewerProps> = ({
  image,
  detections,
  selectedDetectionId,
  onSelectDetection,
  isSyntheticDemo = true,
}) => {
  // Transform & Viewport State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layer Visibility Toggles
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [showShadowGuides, setShowShadowGuides] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showNadir, setShowNadir] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });

  // Update container dimensions on resize
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Fit image inside container on initial load
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 40) / image.width;
    const scaleY = (clientHeight - 40) / image.height;
    const newScale = Math.min(scaleX, scaleY, 1.2);
    setScale(newScale);

    // Center in container
    const x = (clientWidth - image.width * newScale) / 2;
    const y = (clientHeight - image.height * newScale) / 2;
    setPan({ x, y });
  }, [image.width, image.height]);

  useEffect(() => {
    handleFitToScreen();
  }, [handleFitToScreen]);

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(s * 1.25, 4.0));
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.25, 0.3));
  const handleResetZoom = () => {
    setScale(1);
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setPan({
        x: (clientWidth - image.width) / 2,
        y: (clientHeight - image.height) / 2,
      });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.3), 4.0);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
      const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Pan event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on primary left click when clicking background
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Pan to a selected detection if requested
  useEffect(() => {
    if (selectedDetectionId && containerRef.current) {
      const det = detections.find((d) => d.id === selectedDetectionId);
      if (det) {
        const { clientWidth, clientHeight } = containerRef.current;
        const targetX = clientWidth / 2 - (det.bbox.x + det.bbox.width / 2) * scale;
        const targetY = clientHeight / 2 - (det.bbox.y + det.bbox.height / 2) * scale;
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [selectedDetectionId]);

  return (
    <div className="relative flex flex-col h-full bg-[#050912] border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* Top Telemetry & Layer Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 z-10 text-xs font-mono">
        {/* Dimensions and Coordinates */}
        <div className="flex items-center space-x-3 text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Crosshair size={14} className="text-cyan-400" />
            <span className="text-slate-200">
              {image.width} × {image.height} PX
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span>SCALE: {Math.round(scale * 100)}%</span>
          {isSyntheticDemo && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                SYNTHETIC ACOUSTIC VIEW
              </span>
            </>
          )}
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center space-x-3 text-slate-300">
          <label className="inline-flex items-center space-x-1.5 cursor-pointer hover:text-cyan-400 transition">
            <input
              type="checkbox"
              checked={showBBoxes}
              onChange={(e) => setShowBBoxes(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>B-Boxes</span>
          </label>

          <label className="inline-flex items-center space-x-1.5 cursor-pointer hover:text-cyan-400 transition">
            <input
              type="checkbox"
              checked={showShadowGuides}
              onChange={(e) => setShowShadowGuides(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Acoustic Shadows</span>
          </label>

          <label className="inline-flex items-center space-x-1.5 cursor-pointer hover:text-cyan-400 transition">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Labels</span>
          </label>

          <label className="inline-flex items-center space-x-1.5 cursor-pointer hover:text-cyan-400 transition">
            <input
              type="checkbox"
              checked={showNadir}
              onChange={(e) => setShowNadir(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Nadir</span>
          </label>
        </div>
      </div>

      {/* Main Interactive Sonar Viewport Canvas */}
      <div
        ref={containerRef}
        className={`relative flex-1 w-full h-full min-h-[500px] overflow-hidden ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transformed Stage */}
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: `${image.width}px`,
            height: `${image.height}px`,
          }}
        >
          {/* Base Sonar Image */}
          <img
            src={resolveAssetUrl(image.url)}
            alt="Side-Scan Sonar Waterfall Scan"
            className="w-full h-full object-contain pointer-events-none block select-none"
            draggable={false}
          />

          {/* Precision SVG Coordinate Mapping Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            viewBox={`0 0 ${image.width} ${image.height}`}
            width={image.width}
            height={image.height}
          >
            {/* Center Nadir Line Guide */}
            {showNadir && (
              <g opacity="0.35">
                <line
                  x1={image.width / 2}
                  y1="0"
                  x2={image.width / 2}
                  y2={image.height}
                  stroke="#00e5ff"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
              </g>
            )}

            {/* Detections Overlay */}
            {detections.map((det) => {
              const isSelected = det.id === selectedDetectionId;
              const { x, y, width, height } = det.bbox;

              // Color coding by verification status
              const colorMap = {
                verified: {
                  stroke: '#10b981',
                  fill: 'rgba(16, 185, 129, 0.12)',
                  badge: 'bg-emerald-500 text-black',
                },
                uncertain: {
                  stroke: '#f59e0b',
                  fill: 'rgba(245, 158, 11, 0.12)',
                  badge: 'bg-amber-500 text-black',
                },
                rejected: {
                  stroke: '#ef4444',
                  fill: 'rgba(239, 68, 68, 0.12)',
                  badge: 'bg-rose-500 text-white',
                },
              };

              const style = colorMap[det.status] || colorMap.uncertain;

              return (
                <g
                  key={det.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDetection(det.id);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Acoustic Shadow Direction Vector */}
                  {showShadowGuides && (
                    <g opacity={isSelected ? 0.9 : 0.5}>
                      {/* Shadow ray: points away from nadir center */}
                      <line
                        x1={x > image.width / 2 ? x + width : x}
                        y1={y + height / 2}
                        x2={
                          x > image.width / 2
                            ? x + width + (det.physics.observed_shadow_length_m / 0.05)
                            : x - (det.physics.observed_shadow_length_m / 0.05)
                        }
                        y2={y + height / 2}
                        stroke={style.stroke}
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                    </g>
                  )}

                  {/* Bounding Box */}
                  {showBBoxes && (
                    <>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={isSelected ? 'rgba(0, 229, 255, 0.18)' : style.fill}
                        stroke={isSelected ? '#00e5ff' : style.stroke}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        rx="3"
                        className="transition-colors duration-150"
                      />

                      {/* Corner Reticle Accents for Selected Candidate */}
                      {isSelected && (
                        <g stroke="#00e5ff" strokeWidth="2.5" fill="none">
                          {/* Top-Left */}
                          <path d={`M ${x - 3} ${y + 6} L ${x - 3} ${y - 3} L ${x + 6} ${y - 3}`} />
                          {/* Top-Right */}
                          <path d={`M ${x + width - 6} ${y - 3} L ${x + width + 3} ${y - 3} L ${x + width + 3} ${y + 6}`} />
                          {/* Bottom-Left */}
                          <path d={`M ${x - 3} ${y + height - 6} L ${x - 3} ${y + height + 3} L ${x + 6} ${y + height + 3}`} />
                          {/* Bottom-Right */}
                          <path d={`M ${x + width - 6} ${y + height + 3} L ${x + width + 3} ${y + height + 3} L ${x + width + 3} ${y + height - 6}`} />
                        </g>
                      )}
                    </>
                  )}

                  {/* Header Label / Pill */}
                  {showLabels && (
                    <foreignObject
                      x={x}
                      y={Math.max(y - 28, 4)}
                      width="180"
                      height="26"
                      className="overflow-visible pointer-events-none"
                    >
                      <div className="flex items-center space-x-1 font-mono text-[10px] select-none">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isSelected ? 'bg-cyan-400 text-black shadow-md' : style.badge
                          }`}
                        >
                          {det.class_name.replace(/_/g, ' ')}
                        </span>
                        <span className="px-1 py-0.5 rounded bg-black/80 text-slate-200 border border-slate-700">
                          {Math.round(det.final_confidence * 100)}%
                        </span>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Viewport Floating Controls */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-xl z-20 backdrop-blur-sm">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
            title="Zoom In (Wheel Up)"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
            title="Zoom Out (Wheel Down)"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-[1px] h-4 bg-slate-800" />
          <button
            onClick={handleFitToScreen}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
            title="Fit to Screen"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
            title="Reset 1:1 Scale"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Compass / Sonar Orientation Indicator */}
        <div className="absolute top-4 left-4 pointer-events-none z-20">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded p-2 text-[10px] font-mono text-slate-400 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>SONAR SWATH DISPLAY</span>
            </div>
            <div>TOWFISH ALTITUDE: 8.0M</div>
            <div>LOOK DIRECTION: PORT/STBD</div>
          </div>
        </div>
      </div>
    </div>
  );
};

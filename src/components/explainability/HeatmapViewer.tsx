import React, { useState } from 'react';
import { Detection, SonarImage } from '../../types/analysis';
import { resolveAssetUrl } from '../../services/api';
import { Flame, Image as ImageIcon, Layers, Sliders, AlertCircle } from 'lucide-react';

interface HeatmapViewerProps {
  detection: Detection;
  fullImage: SonarImage;
}

type TabMode = 'original' | 'heatmap' | 'overlay';

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({
  detection,
  fullImage,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('overlay');
  const [opacity, setOpacity] = useState(0.65);

  const { heatmap_url, bbox } = detection;

  // Compute crop box style for original image
  // The bounding box with margin
  const margin = 20;
  const cropX = Math.max(0, bbox.x - margin);
  const cropY = Math.max(0, bbox.y - margin);
  const cropW = bbox.width + margin * 2;
  const cropH = bbox.height + margin * 2;

  return (
    <div className="bg-sonar-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Flame size={16} className="text-amber-400" />
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            Model Explainability (Attention Heatmap)
          </h3>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('original')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              activeTab === 'original'
                ? 'bg-cyan-500 text-black font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon size={12} />
            <span>Original</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              activeTab === 'heatmap'
                ? 'bg-cyan-500 text-black font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame size={12} />
            <span>Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overlay')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              activeTab === 'overlay'
                ? 'bg-cyan-500 text-black font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={12} />
            <span>Overlay</span>
          </button>
        </div>
      </div>

      {/* Heatmap Visual Area */}
      {!heatmap_url ? (
        <div className="h-56 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-6 text-center bg-slate-950/40">
          <AlertCircle size={24} className="text-slate-500 mb-2" />
          <p className="text-xs font-mono text-slate-400">
            Explainability unavailable
          </p>
          <span className="text-[10px] text-slate-600 font-mono mt-1">
            Grad-CAM heatmap not generated (synthetic demo mode or weights unmounted)
          </span>
        </div>
      ) : (
        <div className="relative h-64 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
          {/* Crop Container */}
          <div className="relative w-56 h-56 rounded border border-slate-700/60 overflow-hidden shadow-2xl">
            {/* Original Sonar Crop */}
            {(activeTab === 'original' || activeTab === 'overlay') && (
              <div
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(${resolveAssetUrl(fullImage.url)})`,
                  backgroundPosition: `-${(cropX / fullImage.width) * 100}% -${(cropY / fullImage.height) * 100}%`,
                  backgroundSize: `${(fullImage.width / cropW) * 100}% ${(fullImage.height / cropH) * 100}%`,
                  filter: 'contrast(1.25) brightness(1.1)',
                }}
              />
            )}

            {/* Heatmap Layer */}
            {(activeTab === 'heatmap' || activeTab === 'overlay') && (
              <img
                src={resolveAssetUrl(heatmap_url)}
                alt={`Explainability Heatmap for ${detection.id}`}
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
                style={{
                  opacity: activeTab === 'overlay' ? opacity : 1,
                }}
              />
            )}

            {/* Scale and Bounding Reticle overlay */}
            <div className="absolute inset-3 border border-cyan-400/40 rounded pointer-events-none" />
            <div className="absolute bottom-2 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">
              {detection.id} CROP
            </div>
          </div>

          {/* Opacity slider for overlay mode */}
          {activeTab === 'overlay' && (
            <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-mono backdrop-blur-sm">
              <Sliders size={12} className="text-cyan-400" />
              <span className="text-slate-400">Opacity</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-slate-200">{Math.round(opacity * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Scientific Legend */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
        <span>Low Activation</span>
        <div className="h-2 w-36 rounded bg-gradient-to-r from-slate-900 via-cyan-500 to-red-500 border border-slate-800" />
        <span>Peak Salience</span>
      </div>
    </div>
  );
};

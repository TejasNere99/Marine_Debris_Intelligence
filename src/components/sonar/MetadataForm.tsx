import React from 'react';
import { SonarMetadata } from '../../types/analysis';
import { Sliders, Info, ShieldAlert } from 'lucide-react';

interface MetadataFormProps {
  metadata: Partial<SonarMetadata>;
  onChange: (updated: Partial<SonarMetadata>) => void;
  isAutoDetected?: boolean;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({
  metadata,
  onChange,
  isAutoDetected = false,
}) => {
  const handleChange = (field: keyof SonarMetadata, value: any) => {
    onChange({
      ...metadata,
      [field]: value === '' ? undefined : Number(value),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sliders size={16} className="text-cyan-400" />
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            Acoustic & Geolocation Metadata
          </h4>
        </div>
        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
            isAutoDetected
              ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60'
              : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
          }`}
        >
          {isAutoDetected ? 'Automatically Detected' : 'Manual Metadata Override'}
        </span>
      </div>

      <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 flex items-start space-x-2 text-xs text-slate-400">
        <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
        <span>
          Metadata feeds the backend acoustic shadow geometry engine. If omitted,
          the backend attempts extraction from image headers or survey logs.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-mono text-slate-400 mb-1">
            Sonar Altitude (m)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 8.0"
            value={metadata.altitude_m ?? ''}
            onChange={(e) => handleChange('altitude_m', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 font-mono text-slate-200 focus:outline-none transition"
          />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Height above seabed (H)
          </span>
        </div>

        <div>
          <label className="block font-mono text-slate-400 mb-1">
            Max Slant Range (m)
          </label>
          <input
            type="number"
            step="0.5"
            placeholder="e.g. 35.0"
            value={metadata.slant_range_m ?? ''}
            onChange={(e) => handleChange('slant_range_m', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 font-mono text-slate-200 focus:outline-none transition"
          />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Acoustic channel swath range (R)
          </span>
        </div>

        <div>
          <label className="block font-mono text-slate-400 mb-1">
            Across-Track Resolution (m/px)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 0.05"
            value={metadata.resolution_m_per_px ?? ''}
            onChange={(e) => handleChange('resolution_m_per_px', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 font-mono text-slate-200 focus:outline-none transition"
          />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Pixel ground scaling factor
          </span>
        </div>

        <div>
          <label className="block font-mono text-slate-400 mb-1">
            Latitude (WGS84)
          </label>
          <input
            type="number"
            step="0.0001"
            placeholder="e.g. 9.2831"
            value={metadata.latitude ?? ''}
            onChange={(e) => handleChange('latitude', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 font-mono text-slate-200 focus:outline-none transition"
          />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Demo default: Gulf of Mannar
          </span>
        </div>

        <div>
          <label className="block font-mono text-slate-400 mb-1">
            Longitude (WGS84)
          </label>
          <input
            type="number"
            step="0.0001"
            placeholder="e.g. 79.1245"
            value={metadata.longitude ?? ''}
            onChange={(e) => handleChange('longitude', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 font-mono text-slate-200 focus:outline-none transition"
          />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Demo default: Palk Bay transect
          </span>
        </div>

        <div>
          <label className="block font-mono text-slate-400 mb-1">
            Survey Timestamp (UTC)
          </label>
          <input
            type="text"
            readOnly
            value={metadata.timestamp || new Date().toISOString()}
            className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 font-mono text-slate-400 cursor-not-allowed text-[11px]"
          />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            ISO 8601 acquisition time
          </span>
        </div>
      </div>
    </div>
  );
};

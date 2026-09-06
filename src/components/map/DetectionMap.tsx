import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Detection } from '../../types/analysis';
import { StatusBadge } from '../common/StatusBadge';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';

interface DetectionMapProps {
  detections: Detection[];
  selectedDetectionId: string | null;
  onSelectDetection: (id: string) => void;
  isSyntheticDemo?: boolean;
}

// Controller component to automatically pan map when selected detection changes
function MapRecenter({ targetCoord }: { targetCoord: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoord) {
      map.flyTo(targetCoord, 15, { duration: 1.2 });
    }
  }, [targetCoord, map]);
  return null;
}

// Helper to create custom colored DivIcon for detections with priority distinction
function createCustomIcon(
  status: string,
  isSelected: boolean,
  id: string,
  priorityLevel?: string
) {
  const priorityColorMap: Record<string, string> = {
    critical: '#f43f5e', // Vibrant crimson
    high: '#f59e0b',     // Amber
    medium: '#06b6d4',   // Cyan
    low: '#64748b',      // Slate
  };

  const statusColorMap: Record<string, string> = {
    verified: '#10b981',
    uncertain: '#f59e0b',
    rejected: '#ef4444',
  };

  const primaryColor = priorityLevel ? priorityColorMap[priorityLevel] || '#00e5ff' : '#00e5ff';
  const innerColor = statusColorMap[status] || '#10b981';
  const isCritical = priorityLevel === 'critical';
  const size = isSelected ? 34 : isCritical ? 28 : 24;

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${
        isSelected || isCritical
          ? `<div style="
              position: absolute;
              width: ${size + (isSelected ? 16 : 10)}px;
              height: ${size + (isSelected ? 16 : 10)}px;
              border-radius: 50%;
              background: ${primaryColor};
              opacity: ${isSelected ? 0.35 : 0.2};
              animation: ping ${isCritical ? '1.2s' : '1.8s'} cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>`
          : ''
      }
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: #09101d;
        border: 2.5px solid ${primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 ${isCritical ? '14px' : '8px'} ${primaryColor}99;
        cursor: pointer;
      ">
        <div style="
          width: ${size / 2.6}px;
          height: ${size / 2.6}px;
          border-radius: 50%;
          background: ${innerColor};
        "></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-sonar-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const DetectionMap: React.FC<DetectionMapProps> = ({
  detections,
  selectedDetectionId,
  onSelectDetection,
  isSyntheticDemo = true,
}) => {
  // Extract detections with valid coordinates
  const validDetections = useMemo(() => {
    return detections.filter(
      (d) =>
        d.geotag &&
        typeof d.geotag.latitude === 'number' &&
        typeof d.geotag.longitude === 'number' &&
        !isNaN(d.geotag.latitude) &&
        !isNaN(d.geotag.longitude)
    );
  }, [detections]);

  // Center coordinate calculation
  const centerCoord: [number, number] = useMemo(() => {
    if (validDetections.length === 0) return [9.2831, 79.1245]; // Gulf of Mannar default
    const avgLat =
      validDetections.reduce((sum, d) => sum + d.geotag!.latitude, 0) /
      validDetections.length;
    const avgLng =
      validDetections.reduce((sum, d) => sum + d.geotag!.longitude, 0) /
      validDetections.length;
    return [avgLat, avgLng];
  }, [validDetections]);

  // Selected detection coordinate
  const selectedCoord = useMemo<[number, number] | null>(() => {
    if (!selectedDetectionId) return null;
    const match = validDetections.find((d) => d.id === selectedDetectionId);
    return match?.geotag ? [match.geotag.latitude, match.geotag.longitude] : null;
  }, [selectedDetectionId, validDetections]);

  if (validDetections.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center p-8 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
        <AlertCircle size={28} className="text-slate-500 mb-2" />
        <h4 className="text-xs font-mono font-medium text-slate-300 uppercase">
          Geospatial Coordinates Unavailable
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          No valid latitude/longitude coordinates supplied in backend detections.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-sonar-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header Ribbon */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Navigation size={14} className="text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider text-slate-200">
            Geospatial Detection Map
          </span>
          <span className="text-slate-500">
            ({validDetections.length} Tagged Targets)
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <Compass size={13} className="text-cyan-400" />
          <span>DATUM: WGS84</span>
          {isSyntheticDemo && (
            <span className="text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
              SYNTHETIC DEMO COORDINATES
            </span>
          )}
        </div>
      </div>

      {/* Interactive Map View */}
      <div className="h-80 w-full relative z-0">
        <MapContainer
          center={centerCoord}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          {/* Dark / CartoDB Dark Matter Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapRecenter targetCoord={selectedCoord} />

          {validDetections.map((det) => {
            const isSelected = det.id === selectedDetectionId;
            const priorityLevel = det.priority?.level;
            const icon = createCustomIcon(det.status, isSelected, det.id, priorityLevel);

            const priorityZOffsets: Record<string, number> = {
              critical: 1000,
              high: 500,
              medium: 200,
              low: 100,
            };
            const zIndexOffset =
              (priorityLevel ? priorityZOffsets[priorityLevel] || 100 : 50) +
              (isSelected ? 2000 : 0);

            return (
              <Marker
                key={det.id}
                position={[det.geotag!.latitude, det.geotag!.longitude]}
                icon={icon}
                zIndexOffset={zIndexOffset}
                eventHandlers={{
                  click: () => onSelectDetection(det.id),
                }}
              >
                <Popup>
                  <div className="p-1 font-mono text-xs space-y-2 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                      <span className="font-bold text-slate-100 uppercase">{det.id}</span>
                      <StatusBadge status={det.status} size="sm" showIcon={false} />
                    </div>

                    {/* Operational Priority Block */}
                    <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 uppercase font-semibold">Priority:</span>
                        {det.priority ? (
                          <span
                            className={`font-bold uppercase ${
                              det.priority.level === 'critical'
                                ? 'text-rose-400'
                                : det.priority.level === 'high'
                                ? 'text-amber-400'
                                : det.priority.level === 'medium'
                                ? 'text-cyan-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {det.priority.level} • {det.priority.score}
                          </span>
                        ) : (
                          <span className="text-slate-500">Unavailable</span>
                        )}
                      </div>
                      {det.priority?.reason && (
                        <p className="text-[10px] text-slate-300 leading-tight">
                          {det.priority.reason}
                        </p>
                      )}
                    </div>

                    <div className="text-slate-300 text-[11px]">
                      Class: <span className="text-cyan-400">{det.class_name.replace(/_/g, ' ')}</span>
                    </div>

                    <div className="text-slate-400 text-[10px]">
                      GPS: {det.geotag!.latitude.toFixed(4)}°N, {det.geotag!.longitude.toFixed(4)}°E
                    </div>

                    <div className="text-slate-400 text-[11px] flex justify-between pt-1 border-t border-slate-800/80">
                      <span>Final AI+Physics Score:</span>
                      <span className="text-cyan-300 font-bold">
                        {Math.round(det.final_confidence * 100)}%
                      </span>
                    </div>

                    {isSyntheticDemo && (
                      <div className="text-[10px] text-amber-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                        <span>[SYNTHETIC SURVEY POINT]</span>
                        {det.context?.near_seagrass && (
                          <span className="text-emerald-400">HABITAT CORRIDOR</span>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Footer Legend */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-slate-500 uppercase text-[10px]">Ring = Priority:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Low</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] text-slate-500">
          <span>Core = Physics Status</span>
          <span>•</span>
          <span>Click marker to select candidate</span>
        </div>
      </div>
    </div>
  );
};

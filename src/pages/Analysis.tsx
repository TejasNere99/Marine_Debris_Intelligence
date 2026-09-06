import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalysis } from '../hooks/useAnalysis';
import { SonarViewer } from '../components/sonar/SonarViewer';
import { DetectionList } from '../components/sonar/DetectionList';
import { DetectionDetails } from '../components/sonar/DetectionDetails';
import { DetectionMap } from '../components/map/DetectionMap';
import { ReportActions } from '../components/reports/ReportActions';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { StatusBadge } from '../components/common/StatusBadge';
import { setIsMockMode } from '../services/api';
import {
  Compass,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Maximize2,
  FileDown,
  Info,
} from 'lucide-react';

export const Analysis: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const idToLoad = analysisId || 'analysis_001';

  const {
    data,
    selectedDetection,
    selectedDetectionId,
    setSelectedDetectionId,
    filteredDetections,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    isLoading,
    currentStage,
    progressPercent,
    error,
    fetchAnalysis,
  } = useAnalysis(idToLoad);

  // Tab mode for sidebar on smaller screens: list vs inspector
  const [sidebarTab, setSidebarTab] = useState<'details' | 'list'>('details');

  if (isLoading) {
    return (
      <div className="py-20 max-w-xl mx-auto">
        <LoadingState stage={currentStage} percent={progressPercent} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 max-w-xl mx-auto space-y-4">
        <ErrorState
          message={error || 'Acoustic survey record not found'}
          onRetry={() => fetchAnalysis(idToLoad)}
        />
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsMockMode(true);
              window.location.reload();
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs uppercase tracking-wider font-semibold rounded-lg shadow-md transition"
          >
            <span>Switch to Demo Mock Mode</span>
          </button>
        </div>
      </div>
    );
  }

  const { metadata, summary, is_synthetic_demo } = data;

  return (
    <div className="space-y-6 pb-16">
      {/* Telemetry Header */}
      <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-base sm:text-lg font-mono font-bold uppercase text-slate-100">
              MISSION ANALYSIS: {data.analysis_id}
            </h1>
            {is_synthetic_demo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-400 border border-amber-800/70">
                SYNTHETIC DEMO DATA
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Calendar size={13} className="text-cyan-400" />
              <span>{new Date(metadata.timestamp).toUTCString()}</span>
            </div>
            <span>•</span>
            <div>ALT: <span className="text-slate-200">{metadata.altitude_m}m</span></div>
            <span>•</span>
            <div>RANGE: <span className="text-slate-200">{metadata.slant_range_m}m</span></div>
            <span>•</span>
            <div>RES: <span className="text-slate-200">{metadata.resolution_m_per_px}m/px</span></div>
            <span>•</span>
            <div>LAT/LNG: <span className="text-slate-200">{metadata.latitude.toFixed(4)}°N, {metadata.longitude.toFixed(4)}°E</span></div>
          </div>
        </div>

        {/* Action Buttons: Export JSON / CSV */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <ReportActions analysis={data} />
        </div>
      </div>

      {/* Main Analysis Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER: Large Sonar Viewer & Detection List (7 cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          {/* Sonar Image Canvas */}
          <div className="h-[520px] w-full">
            <SonarViewer
              image={data.image}
              detections={data.detections}
              selectedDetectionId={selectedDetectionId}
              onSelectDetection={(id) => {
                setSelectedDetectionId(id);
                setSidebarTab('details');
              }}
              isSyntheticDemo={is_synthetic_demo}
            />
          </div>

          {/* Detections List & Filter Table */}
          <div className="h-[360px]">
            <DetectionList
              detections={filteredDetections}
              selectedDetectionId={selectedDetectionId}
              onSelectDetection={(id) => {
                setSelectedDetectionId(id);
                setSidebarTab('details');
              }}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
              sortBy={sortBy}
              onSortChange={setSortBy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              counts={{
                total: summary.total_candidates,
                verified: summary.verified,
                uncertain: summary.uncertain,
                rejected: summary.rejected,
              }}
            />
          </div>
        </div>

        {/* RIGHT: Selected Detection Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <DetectionDetails
            detection={selectedDetection}
            fullImage={data.image}
            metadata={metadata}
          />
        </div>
      </div>

      {/* BOTTOM: Geospatial Detection Map */}
      <div className="pt-2">
        <DetectionMap
          detections={data.detections}
          selectedDetectionId={selectedDetectionId}
          onSelectDetection={(id) => {
            setSelectedDetectionId(id);
            setSidebarTab('details');
          }}
          isSyntheticDemo={is_synthetic_demo}
        />
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileImage, X, Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { SonarMetadata } from '../../types/analysis';
import { MetadataForm } from './MetadataForm';

interface SonarUploaderProps {
  onUpload: (file: File, metadata: Partial<SonarMetadata>) => Promise<void>;
  isLoading: boolean;
}

export const SonarUploader: React.FC<SonarUploaderProps> = ({
  onUpload,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [metadata, setMetadata] = useState<Partial<SonarMetadata>>({
    altitude_m: 8.0,
    slant_range_m: 35.0,
    resolution_m_per_px: 0.05,
    latitude: 9.2831,
    longitude: 79.1245,
    timestamp: new Date().toISOString(),
  });
  const [isAutoDetected, setIsAutoDetected] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (file: File) => {
    setValidationError(null);
    const validExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff'];
    const hasValidType = validExtensions.includes(file.type) || /\.(png|jpe?g|tiff?)$/i.test(file.name);

    if (!hasValidType) {
      setValidationError('Invalid file format. Please provide PNG, JPEG, or TIFF side-scan sonar image.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setValidationError('File size exceeds 50MB limit for sonar analysis.');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsAutoDetected(false); // User provided their own file
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to load synthetic benchmark scan for judges/demo
  const handleLoadSampleScan = () => {
    // Synthetic File object
    const sampleBlob = new Blob(['sample-synthetic-sonar-binary-content'], { type: 'image/png' });
    const sampleFile = new File([sampleBlob], 'synthetic_sonar_sector_04.png', { type: 'image/png' });
    setSelectedFile(sampleFile);
    setPreviewUrl(null); // Will render mock asset in analysis
    setIsAutoDetected(true);
    setMetadata({
      altitude_m: 8.0,
      slant_range_m: 35.0,
      resolution_m_per_px: 0.05,
      latitude: 9.2831,
      longitude: 79.1245,
      timestamp: '2026-09-06T10:30:00Z',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select or drag a sonar scan file first.');
      return;
    }
    await onUpload(selectedFile, metadata);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drag & Drop Zone */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/20'
              : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.tiff,.tif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-14 h-14 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
            <UploadCloud size={28} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1 font-mono tracking-wide">
            DRAG & DROP SIDE-SCAN SONAR IMAGE
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Supported formats: PNG, JPG/JPEG, TIFF (Up to 50MB)
          </p>

          <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
            <span>Dual Swath (Port/Starboard)</span>
            <span>•</span>
            <span>Waterfall Format</span>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 w-full max-w-sm flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSampleScan();
              }}
              className="inline-flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 px-3 py-1.5 rounded border border-cyan-800/60 transition"
            >
              <Sparkles size={14} />
              <span>Load Gulf of Mannar Demo Benchmark</span>
            </button>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Sonar Preview"
                className="w-16 h-16 object-cover rounded border border-slate-700 bg-black shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded border border-cyan-500/30 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shrink-0">
                <FileImage size={28} />
              </div>
            )}
            <div className="overflow-hidden">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-mono text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile.name}
                </p>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  READY
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Size: {formatFileSize(selectedFile.size)} • Type: {selectedFile.type || 'image/png'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="px-3 py-1.5 rounded border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <X size={14} />
              <span>Change File</span>
            </button>
          </div>
        </div>
      )}

      {validationError && (
        <div className="p-3 rounded bg-rose-950/30 border border-rose-900 text-rose-400 text-xs font-mono">
          {validationError}
        </div>
      )}

      {/* Metadata Configuration */}
      <div className="bg-sonar-900/40 border border-slate-800/80 rounded-xl p-5">
        <MetadataForm
          metadata={metadata}
          onChange={setMetadata}
          isAutoDetected={isAutoDetected}
        />
      </div>

      {/* Primary Action Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
          <ShieldCheck size={14} className="text-cyan-400" />
          <span>Stage: Sonar Scan → ML Detection → Physics Verification</span>
        </div>

        <button
          type="submit"
          disabled={!selectedFile || isLoading}
          className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition shadow-lg ${
            !selectedFile || isLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20 active:translate-y-0.5'
          }`}
        >
          <span>{isLoading ? 'Processing Pipeline...' : 'Start Sonar Verification'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
};

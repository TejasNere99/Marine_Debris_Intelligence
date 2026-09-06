/**
 * SIH26057 API Integration Service
 * 
 * Decoupled API abstraction layer for Person C.
 * Supports:
 * - Direct HTTP communication to real FastAPI backend
 * - Autonomous Synthetic Mock Mode for offline demo / development
 * - Runtime toggle support
 */

import axios from 'axios';
import { AnalysisResponse, AnalysisHistoryItem, SonarMetadata } from '../types/analysis';
import { MOCK_ANALYSIS_001, MOCK_HISTORY } from '../mock/mockResponse';

// Centralized configuration
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Runtime mock mode storage key (permits live toggling in UI for demo evaluation)
const STORAGE_KEY_MOCK = 'marine_sonar_use_mock';

export function getIsMockMode(): boolean {
  const saved = sessionStorage.getItem(STORAGE_KEY_MOCK);
  if (saved !== null) {
    return saved === 'true';
  }
  return DEFAULT_USE_MOCK;
}

export function setIsMockMode(useMock: boolean): void {
  sessionStorage.setItem(STORAGE_KEY_MOCK, String(useMock));
}

export function getApiBaseUrl(): string {
  return DEFAULT_BASE_URL;
}

/**
 * Clean URL resolver for relative asset paths returned by backend.
 * Resolves relative paths (e.g., /static/uploads/... or /api/v1/...) against VITE_API_BASE_URL.
 */
export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const base = DEFAULT_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

const apiClient = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

export interface UploadProgressCallback {
  (stage: string, percent: number): void;
}

export const STAGES = [
  'Uploading sonar scan & reading telemetry...',
  'Normalizing acoustic swath & speckle reduction...',
  'Executing detection network (candidate proposal)...',
  'Performing physics-informed shadow verification...',
  'Calibrating fused multi-layer confidence scores...',
  'Finalizing geospatial detection mapping & audit reports...',
];

export interface BackendHealth {
  status: string;
  service: string;
  timestamp: string;
  pipeline_ready: boolean;
  trained_weights_present: boolean;
  mode: 'LIVE_INFERENCE' | 'SYNTHETIC_PIPELINE_INTEGRATION_TEST' | string;
}

/**
 * Check backend health and model weight availability
 */
export async function getBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await apiClient.get<BackendHealth>('/health', { timeout: 3000 });
    return res.data;
  } catch {
    return null;
  }
}

/**
 * Upload sonar scan file and run analysis
 */
export async function uploadAndAnalyzeSonar(
  file: File,
  metadata?: Partial<SonarMetadata>,
  onProgress?: UploadProgressCallback
): Promise<AnalysisResponse> {
  const isMock = getIsMockMode();

  if (isMock) {
    // Simulate scientific pipeline execution stages for high-fidelity demonstration
    for (let i = 0; i < STAGES.length; i++) {
      if (onProgress) {
        onProgress(STAGES[i], Math.round(((i + 1) / STAGES.length) * 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 450));
    }

    // Return mock response populated with any manual metadata overrides
    const response: AnalysisResponse = JSON.parse(JSON.stringify(MOCK_ANALYSIS_001));
    if (metadata) {
      if (metadata.altitude_m !== undefined) response.metadata.altitude_m = metadata.altitude_m;
      if (metadata.slant_range_m !== undefined) response.metadata.slant_range_m = metadata.slant_range_m;
      if (metadata.resolution_m_per_px !== undefined) response.metadata.resolution_m_per_px = metadata.resolution_m_per_px;
      if (metadata.latitude !== undefined) response.metadata.latitude = metadata.latitude;
      if (metadata.longitude !== undefined) response.metadata.longitude = metadata.longitude;
    }

    return response;
  }

  // Real FastAPI Backend Integration (multipart/form-data)
  const formData = new FormData();
  // Backend expects parameter 'file: UploadFile = File(...)'
  formData.append('file', file);

  // Send optional scientific telemetry fields if present
  if (metadata) {
    if (metadata.altitude_m !== undefined && metadata.altitude_m !== null) {
      formData.append('altitude_m', String(metadata.altitude_m));
    }
    if (metadata.slant_range_m !== undefined && metadata.slant_range_m !== null) {
      formData.append('slant_range_m', String(metadata.slant_range_m));
    }
    if (metadata.resolution_m_per_px !== undefined && metadata.resolution_m_per_px !== null) {
      formData.append('resolution_m_per_px', String(metadata.resolution_m_per_px));
    }
    if (metadata.latitude !== undefined && metadata.latitude !== null) {
      formData.append('latitude', String(metadata.latitude));
    }
    if (metadata.longitude !== undefined && metadata.longitude !== null) {
      formData.append('longitude', String(metadata.longitude));
    }
  }

  if (onProgress) {
    onProgress('Uploading sonar payload to FastAPI inference service...', 25);
  }

  try {
    const res = await apiClient.post<AnalysisResponse>('/api/v1/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.min(Math.round((progressEvent.loaded * 50) / progressEvent.total), 50);
          onProgress('Uploading sonar scan payload...', percent);
        }
      },
    });

    if (onProgress) {
      onProgress('FastAPI execution complete. Hydrating analysis workspace...', 100);
    }

    return res.data;
  } catch (err: any) {
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      throw new Error(
        `FastAPI backend at ${DEFAULT_BASE_URL} is unreachable (ERR_CONNECTION_REFUSED). ` +
        `The backend server is not running. Please start FastAPI or switch to Demo Mock Mode.`
      );
    }
    if (err.response?.data?.detail) {
      const detail = err.response.data.detail;
      const detailMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      throw new Error(`Analysis failed (HTTP ${err.response.status}): ${detailMsg}`);
    }
    throw err;
  }
}

/**
 * Fetch past analysis by ID
 */
export async function getAnalysis(analysisId: string): Promise<AnalysisResponse> {
  const isMock = getIsMockMode();

  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return MOCK_ANALYSIS_001;
  }

  try {
    const res = await apiClient.get<AnalysisResponse>(`/api/v1/analysis/${analysisId}`);
    return res.data;
  } catch (err: any) {
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      throw new Error(
        `FastAPI backend at ${DEFAULT_BASE_URL} is unreachable (ERR_CONNECTION_REFUSED). ` +
        `The backend server is not running. Please switch to Demo Mock Mode in the top navigation bar or start your FastAPI server.`
      );
    }
    if (err.response?.status === 404) {
      throw new Error(`Analysis session '${analysisId}' not found on backend.`);
    }
    throw err;
  }
}

/**
 * Fetch recent analysis runs
 */
export async function getRecentAnalyses(): Promise<AnalysisHistoryItem[]> {
  const isMock = getIsMockMode();

  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return MOCK_HISTORY;
  }

  try {
    const res = await apiClient.get<AnalysisHistoryItem[]>('/api/v1/analyses/recent');
    return res.data;
  } catch (err: any) {
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      throw new Error(
        `FastAPI backend at ${DEFAULT_BASE_URL} is unreachable (ERR_CONNECTION_REFUSED).`
      );
    }
    throw err;
  }
}

/**
 * Download JSON Report
 */
export async function downloadJsonReport(analysisId: string, currentData?: AnalysisResponse): Promise<void> {
  const isMock = getIsMockMode();

  if (isMock && currentData) {
    const jsonStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysisId}_report_synthetic.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Real backend endpoint download
  const targetUrl = currentData?.reports?.json_url || `/api/v1/analysis/${analysisId}/report.json`;
  const response = await apiClient.get(targetUrl, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${analysisId}_report.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Download CSV Report
 */
export async function downloadCsvReport(analysisId: string, currentData?: AnalysisResponse): Promise<void> {
  const isMock = getIsMockMode();

  if (isMock && currentData) {
    // Generate authoritative CSV structure matching backend output
    const headers = [
      'detection_id',
      'class_name',
      'status',
      'raw_ai_confidence',
      'physics_consistency_score',
      'final_fused_confidence',
      'expected_shadow_m',
      'observed_shadow_m',
      'difference_percent',
      'latitude',
      'longitude',
      'is_synthetic_demo',
      'reason'
    ];

    const rows = currentData.detections.map((d) => [
      d.id,
      d.class_name,
      d.status,
      d.raw_confidence.toFixed(3),
      d.physics.consistency_score.toFixed(3),
      d.final_confidence.toFixed(3),
      d.physics.expected_shadow_length_m.toFixed(2),
      d.physics.observed_shadow_length_m.toFixed(2),
      d.physics.difference_percent.toFixed(1),
      d.geotag?.latitude ?? '',
      d.geotag?.longitude ?? '',
      'TRUE_DEMO',
      `"${d.physics.reason.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysisId}_detections_synthetic.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Real backend endpoint download
  const targetUrl = currentData?.reports?.csv_url || `/api/v1/analysis/${analysisId}/report.csv`;
  const response = await apiClient.get(targetUrl, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${analysisId}_report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

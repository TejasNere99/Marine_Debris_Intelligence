/**
 * SIH26057 useAnalysis Hook
 * 
 * Centralized state management for sonar analysis visualization.
 * Completely decoupled from ML inference; operates purely on backend contracts.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AnalysisResponse,
  Detection,
  FilterStatus,
  SortOption,
  SonarMetadata,
} from '../types/analysis';
import {
  getAnalysis,
  uploadAndAnalyzeSonar,
  downloadJsonReport,
  downloadCsvReport,
  UploadProgressCallback,
} from '../services/api';

export function useAnalysis(initialAnalysisId?: string) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('confidence_desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Load an existing analysis by ID
  const fetchAnalysis = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentStage('Loading survey analysis record...');
    setProgressPercent(40);
    try {
      const res = await getAnalysis(id);
      setData(res);
      // Auto-select first verified detection if available, or first candidate
      if (res.detections.length > 0) {
        const firstVerified = res.detections.find((d) => d.status === 'verified');
        setSelectedDetectionId(firstVerified ? firstVerified.id : res.detections[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve sonar analysis record');
    } finally {
      setIsLoading(false);
      setCurrentStage('');
      setProgressPercent(0);
    }
  }, []);

  useEffect(() => {
    if (initialAnalysisId) {
      fetchAnalysis(initialAnalysisId);
    }
  }, [initialAnalysisId, fetchAnalysis]);

  // Execute upload and analysis
  const executeAnalysis = useCallback(
    async (file: File, metadata?: Partial<SonarMetadata>) => {
      setIsLoading(true);
      setError(null);
      setProgressPercent(0);

      const progressCb: UploadProgressCallback = (stage, percent) => {
        setCurrentStage(stage);
        setProgressPercent(percent);
      };

      try {
        const res = await uploadAndAnalyzeSonar(file, metadata, progressCb);
        setData(res);
        if (res.detections.length > 0) {
          const firstVerified = res.detections.find((d) => d.status === 'verified');
          setSelectedDetectionId(firstVerified ? firstVerified.id : res.detections[0].id);
        }
        return res;
      } catch (err: any) {
        setError(err?.message || 'Analysis failed. Please verify sonar payload and backend connection.');
        throw err;
      } finally {
        setIsLoading(false);
        setCurrentStage('');
        setProgressPercent(0);
      }
    },
    []
  );

  // Filter and sort detections
  const filteredDetections = useMemo(() => {
    if (!data) return [];
    let list = [...data.detections];

    // Filter by status
    if (filterStatus !== 'all') {
      list = list.filter((d) => d.status === filterStatus);
    }

    // Filter by search query (id or class_name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) => d.id.toLowerCase().includes(q) || d.class_name.toLowerCase().includes(q)
      );
    }

    // Sort using backend-provided attributes (Frontend never calculates scores)
    list.sort((a, b) => {
      if (sortBy === 'priority_desc') {
        const scoreA = a.priority?.score ?? -1;
        const scoreB = b.priority?.score ?? -1;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return b.final_confidence - a.final_confidence;
      }
      if (sortBy === 'confidence_desc') {
        return b.final_confidence - a.final_confidence;
      }
      if (sortBy === 'confidence_asc') {
        return a.final_confidence - b.final_confidence;
      }
      return a.id.localeCompare(b.id);
    });

    return list;
  }, [data, filterStatus, sortBy, searchQuery]);

  // Selected detection object
  const selectedDetection: Detection | null = useMemo(() => {
    if (!data || !selectedDetectionId) return null;
    return data.detections.find((d) => d.id === selectedDetectionId) || null;
  }, [data, selectedDetectionId]);

  // Download handlers
  const handleDownloadJson = useCallback(async () => {
    if (!data) return;
    await downloadJsonReport(data.analysis_id, data);
  }, [data]);

  const handleDownloadCsv = useCallback(async () => {
    if (!data) return;
    await downloadCsvReport(data.analysis_id, data);
  }, [data]);

  return {
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
    executeAnalysis,
    fetchAnalysis,
    handleDownloadJson,
    handleDownloadCsv,
  };
}

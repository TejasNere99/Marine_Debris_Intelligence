/**
 * SIH26057 Marine Debris Detection System
 * Frontend Integration Contracts (Person C)
 * 
 * NOTE: Frontend is strictly a consumer of these contracts.
 * Backend (Person B / ML Inference) is authoritative for all scientific values.
 * Frontend never calculates or modifies physics values or confidence scores.
 */

export type DetectionStatus = 'verified' | 'uncertain' | 'rejected';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface DetectionPriority {
  score: number; // 0 - 100
  level: PriorityLevel;
  reason?: string;
}

export interface DetectionContext {
  near_seagrass?: boolean;
  habitat_distance_m?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhysicsVerification {
  expected_shadow_length_m: number;
  observed_shadow_length_m: number;
  difference_percent: number;
  consistency_score: number;
  is_consistent: boolean;
  reason: string;
  estimated_height_m?: number;
}

export interface Geotag {
  latitude: number;
  longitude: number;
}

export interface Detection {
  id: string;
  class_name: string;
  bbox: BoundingBox;
  raw_confidence: number;
  physics: PhysicsVerification;
  final_confidence: number;
  status: DetectionStatus;
  heatmap_url?: string;
  geotag?: Geotag;
  /** Explicit indicator for synthetic/demo items */
  is_demo?: boolean;
  /** Optional operational priority intelligence provided by backend */
  priority?: DetectionPriority;
  /** Optional ecological context / habitat proximity provided by backend */
  context?: DetectionContext;
}

export interface SonarImage {
  url: string;
  width: number;
  height: number;
}

export interface SonarMetadata {
  altitude_m: number;
  slant_range_m: number;
  resolution_m_per_px: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface AnalysisSummary {
  total_candidates: number;
  verified: number;
  uncertain: number;
  rejected: number;
}

export interface ReportLinks {
  json_url: string;
  csv_url: string;
}

export interface AnalysisResponse {
  analysis_id: string;
  image: SonarImage;
  metadata: SonarMetadata;
  detections: Detection[];
  summary: AnalysisSummary;
  reports: ReportLinks;
  /** Explicit indicator when response is generated in synthetic demo mode */
  is_synthetic_demo?: boolean;
}

export interface AnalysisHistoryItem {
  analysis_id: string;
  timestamp: string;
  filename: string;
  summary: AnalysisSummary;
  location_name: string;
  is_synthetic_demo: boolean;
}

export type FilterStatus = 'all' | 'verified' | 'uncertain' | 'rejected';
export type SortOption = 'priority_desc' | 'confidence_desc' | 'confidence_asc' | 'id';

export interface AnalysisFilterState {
  status: FilterStatus;
  sortBy: SortOption;
  searchQuery: string;
}

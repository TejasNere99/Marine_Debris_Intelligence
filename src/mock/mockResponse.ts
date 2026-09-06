/**
 * SIH26057 Synthetic Demo Data & Mock Backend Response
 * 
 * IMPORTANT COMPLIANCE NOTICE:
 * All records, coordinates (Gulf of Mannar / Palk Strait), and metrics below are
 * explicitly SYNTHETIC DEMO DATA for frontend validation and hackathon demonstrations.
 * No real-world field telemetry or live ML inference is claimed.
 */

import { AnalysisResponse, AnalysisHistoryItem } from '../types/analysis';
import { getMockSonarImageUrl, getMockHeatmapUrl } from './mockSonarAssets';

export const MOCK_ANALYSIS_001: AnalysisResponse = {
  analysis_id: 'analysis_001',
  is_synthetic_demo: true,
  image: {
    url: getMockSonarImageUrl(),
    width: 1024,
    height: 1024,
  },
  metadata: {
    altitude_m: 8.0,
    slant_range_m: 35.0,
    resolution_m_per_px: 0.05,
    latitude: 9.2831,
    longitude: 79.1245,
    timestamp: '2026-09-06T10:30:00Z',
  },
  detections: [
    {
      id: 'det_001',
      class_name: 'ghost_net',
      bbox: {
        x: 280,
        y: 310,
        width: 45,
        height: 30,
      },
      raw_confidence: 0.87,
      physics: {
        expected_shadow_length_m: 5.25,
        observed_shadow_length_m: 5.10,
        difference_percent: 2.9,
        consistency_score: 0.97,
        is_consistent: true,
        reason: 'Shadow geometry is consistent with vertical acoustic relief of entangled net bundle.',
        estimated_height_m: 1.20,
      },
      final_confidence: 0.94,
      status: 'verified',
      heatmap_url: getMockHeatmapUrl('det_001'),
      geotag: {
        latitude: 9.2831,
        longitude: 79.1245,
      },
      is_demo: true,
      priority: {
        score: 94,
        level: 'critical',
        reason: 'Ghost-net candidate near sensitive seagrass habitat',
      },
      context: {
        near_seagrass: true,
        habitat_distance_m: 18.4,
      },
    },
    {
      id: 'det_002',
      class_name: 'trawl_net_fragment',
      bbox: {
        x: 640,
        y: 220,
        width: 55,
        height: 40,
      },
      raw_confidence: 0.82,
      physics: {
        expected_shadow_length_m: 6.40,
        observed_shadow_length_m: 6.22,
        difference_percent: 2.8,
        consistency_score: 0.96,
        is_consistent: true,
        reason: 'High-contrast acoustic backscatter matched with prominent acoustic shadow along starboard swath.',
        estimated_height_m: 1.45,
      },
      final_confidence: 0.91,
      status: 'verified',
      heatmap_url: getMockHeatmapUrl('det_002'),
      geotag: {
        latitude: 9.2845,
        longitude: 79.1272,
      },
      is_demo: true,
      priority: {
        score: 86,
        level: 'high',
        reason: 'Entanglement hazard in active biodiversity corridor',
      },
      context: {
        near_seagrass: true,
        habitat_distance_m: 42.0,
      },
    },
    {
      id: 'det_003',
      class_name: 'submerged_gill_net',
      bbox: {
        x: 720,
        y: 580,
        width: 60,
        height: 35,
      },
      raw_confidence: 0.79,
      physics: {
        expected_shadow_length_m: 5.80,
        observed_shadow_length_m: 5.55,
        difference_percent: 4.3,
        consistency_score: 0.93,
        is_consistent: true,
        reason: 'Linear filamentous highlight with continuous acoustic shadow matching proud debris profile.',
        estimated_height_m: 1.30,
      },
      final_confidence: 0.88,
      status: 'verified',
      heatmap_url: getMockHeatmapUrl('det_003'),
      geotag: {
        latitude: 9.2818,
        longitude: 79.1289,
      },
      is_demo: true,
      priority: {
        score: 78,
        level: 'high',
        reason: 'Commercial monofilament net fouling seabed',
      },
      context: {
        near_seagrass: false,
        habitat_distance_m: 125.0,
      },
    },
    {
      id: 'det_004',
      class_name: 'monofilament_bundle',
      bbox: {
        x: 350,
        y: 740,
        width: 40,
        height: 35,
      },
      raw_confidence: 0.76,
      physics: {
        expected_shadow_length_m: 4.50,
        observed_shadow_length_m: 4.32,
        difference_percent: 4.0,
        consistency_score: 0.94,
        is_consistent: true,
        reason: 'Compact high-density acoustic highlight with shadow matching 1.05m estimated seafloor elevation.',
        estimated_height_m: 1.05,
      },
      final_confidence: 0.87,
      status: 'verified',
      heatmap_url: getMockHeatmapUrl('det_004'),
      geotag: {
        latitude: 9.2798,
        longitude: 79.1230,
      },
      is_demo: true,
      priority: {
        score: 58,
        level: 'medium',
        reason: 'Compact synthetic fiber bundle',
      },
      context: {
        near_seagrass: false,
        habitat_distance_m: 210.0,
      },
    },
    {
      id: 'det_005',
      class_name: 'degraded_fiber_clump',
      bbox: {
        x: 210,
        y: 480,
        width: 50,
        height: 40,
      },
      raw_confidence: 0.65,
      physics: {
        expected_shadow_length_m: 4.20,
        observed_shadow_length_m: 3.40,
        difference_percent: 19.0,
        consistency_score: 0.68,
        is_consistent: false,
        reason: 'Acoustic shadow is partially diffused by sand burial; shadow length is marginally below the 10% tolerance threshold.',
        estimated_height_m: 0.95,
      },
      final_confidence: 0.61,
      status: 'uncertain',
      heatmap_url: getMockHeatmapUrl('det_005'),
      geotag: {
        latitude: 9.2852,
        longitude: 79.1215,
      },
      is_demo: true,
      priority: {
        score: 45,
        level: 'medium',
        reason: 'Buried fiber clump; low immediate hazard',
      },
      context: {
        near_seagrass: false,
        habitat_distance_m: 350.0,
      },
    },
    {
      id: 'det_006',
      class_name: 'submerged_tyre_debris',
      bbox: {
        x: 610,
        y: 810,
        width: 45,
        height: 45,
      },
      raw_confidence: 0.62,
      physics: {
        expected_shadow_length_m: 3.80,
        observed_shadow_length_m: 3.10,
        difference_percent: 18.4,
        consistency_score: 0.65,
        is_consistent: false,
        reason: 'Circular highlight detected, but shadow relief is partially occluded by surrounding sand depression.',
        estimated_height_m: 0.85,
      },
      final_confidence: 0.58,
      status: 'uncertain',
      heatmap_url: getMockHeatmapUrl('det_006'),
      geotag: {
        latitude: 9.2785,
        longitude: 79.1260,
      },
      is_demo: true,
      priority: {
        score: 25,
        level: 'low',
        reason: 'Stable vulcanized rubber debris; low entanglement profile',
      },
    },
    {
      id: 'det_007',
      class_name: 'natural_limestone_outcrop',
      bbox: {
        x: 410,
        y: 150,
        width: 55,
        height: 35,
      },
      raw_confidence: 0.72,
      physics: {
        expected_shadow_length_m: 4.80,
        observed_shadow_length_m: 0.90,
        difference_percent: 81.3,
        consistency_score: 0.12,
        is_consistent: false,
        reason: 'Model proposed candidate due to backscatter brightness, but acoustic shadow is nearly absent (0.90m vs expected 4.80m). Physics check correctly flags natural planar geology (False Positive rejected).',
        estimated_height_m: 0.20,
      },
      final_confidence: 0.15,
      status: 'rejected',
      heatmap_url: getMockHeatmapUrl('det_007'),
      geotag: {
        latitude: 9.2868,
        longitude: 79.1250,
      },
      is_demo: true,
      priority: {
        score: 5,
        level: 'low',
        reason: 'Natural geological substrate; no cleanup action required',
      },
    },
  ],
  summary: {
    total_candidates: 7,
    verified: 4,
    uncertain: 2,
    rejected: 1,
  },
  reports: {
    json_url: '/results/analysis_001/report.json',
    csv_url: '/results/analysis_001/report.csv',
  },
};

export const MOCK_HISTORY: AnalysisHistoryItem[] = [
  {
    analysis_id: 'analysis_001',
    timestamp: '2026-09-06T10:30:00Z',
    filename: 'sonar_scan_sector_04.png',
    location_name: 'Gulf of Mannar Sector 4 (Synthetic)',
    summary: {
      total_candidates: 7,
      verified: 4,
      uncertain: 2,
      rejected: 1,
    },
    is_synthetic_demo: true,
  },
  {
    analysis_id: 'analysis_002',
    timestamp: '2026-09-05T16:15:00Z',
    filename: 'palk_strait_transect_b.png',
    location_name: 'Palk Bay North Transect (Synthetic)',
    summary: {
      total_candidates: 5,
      verified: 3,
      uncertain: 1,
      rejected: 1,
    },
    is_synthetic_demo: true,
  },
  {
    analysis_id: 'analysis_003',
    timestamp: '2026-09-04T08:45:00Z',
    filename: 'mandapam_shoals_run01.png',
    location_name: 'Mandapam Shoals Survey (Synthetic)',
    summary: {
      total_candidates: 4,
      verified: 2,
      uncertain: 1,
      rejected: 1,
    },
    is_synthetic_demo: true,
  },
];

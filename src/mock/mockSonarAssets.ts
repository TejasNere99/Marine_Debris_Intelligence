/**
 * Programmatic Synthetic Sonar Asset Generator
 * 
 * Generates deterministic, high-fidelity side-scan sonar image and detection heatmaps.
 * All imagery is explicitly SYNTHETIC/DEMO for SIH26057 hackathon demonstration.
 */

// Generates an authentic 1024x1024 SVG Data URI representing side-scan sonar
export function getMockSonarImageUrl(): string {
  // SVG with water column, seafloor reverberation grain, and acoustic targets with shadows
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" style="background:#090d14;">
  <defs>
    <!-- Seafloor acoustic texture filter -->
    <filter id="sonar-noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="4" result="noise" />
      <feColorMatrix type="matrix" values="
        0.25 0 0 0 0.08
        0 0.35 0 0 0.12
        0 0 0.40 0 0.16
        0 0 0 1 0" />
    </filter>

    <!-- Side-scan falloff gradient (gain curve) -->
    <linearGradient id="swath-gain" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#182638" stop-opacity="0.9" />
      <stop offset="42%" stop-color="#223955" stop-opacity="0.8" />
      <stop offset="47%" stop-color="#0a121e" stop-opacity="0.95" />
      <!-- Nadir water column track (dark) -->
      <stop offset="49%" stop-color="#04060a" stop-opacity="1" />
      <stop offset="51%" stop-color="#04060a" stop-opacity="1" />
      <stop offset="53%" stop-color="#0a121e" stop-opacity="0.95" />
      <stop offset="58%" stop-color="#223955" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#182638" stop-opacity="0.9" />
    </linearGradient>

    <!-- Synthetic acoustic highlight & shadow filters -->
    <radialGradient id="highlight-net-1" cx="35%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#7dd3fc" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="highlight-net-2" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Base seafloor texture -->
  <rect width="1024" height="1024" fill="#0c1524" />
  <rect width="1024" height="1024" filter="url(#sonar-noise)" opacity="0.85" />
  <rect width="1024" height="1024" fill="url(#swath-gain)" style="mix-blend-mode: overlay;" />

  <!-- Acoustic survey telemetry lines & scan artifacts -->
  <g stroke="#38bdf8" stroke-opacity="0.08" stroke-width="1">
    <line x1="0" y1="128" x2="1024" y2="128" stroke-dasharray="8 8" />
    <line x1="0" y1="256" x2="1024" y2="256" stroke-dasharray="8 8" />
    <line x1="0" y1="384" x2="1024" y2="384" stroke-dasharray="8 8" />
    <line x1="0" y1="512" x2="1024" y2="512" stroke-dasharray="8 8" />
    <line x1="0" y1="640" x2="1024" y2="640" stroke-dasharray="8 8" />
    <line x1="0" y1="768" x2="1024" y2="768" stroke-dasharray="8 8" />
    <line x1="0" y1="896" x2="1024" y2="896" stroke-dasharray="8 8" />
  </g>

  <!-- Center Nadir Track (Water column directly beneath towfish) -->
  <rect x="496" y="0" width="32" height="1024" fill="#020408" />
  <line x1="512" y1="0" x2="512" y2="1024" stroke="#00e5ff" stroke-opacity="0.25" stroke-dasharray="4 4" stroke-width="1" />

  <!-- Towfish heading line & channel indicators -->
  <text x="240" y="40" fill="#64748b" font-family="monospace" font-size="12" letter-spacing="2">PORT SWATH (CH-1)</text>
  <text x="700" y="40" fill="#64748b" font-family="monospace" font-size="12" letter-spacing="2">STARBOARD SWATH (CH-2)</text>
  <text x="512" y="30" fill="#38bdf8" font-family="monospace" font-size="10" text-anchor="middle" letter-spacing="1">NADIR TRACK</text>

  <!-- Watermark: SYNTHETIC DEMO DATA -->
  <text x="20" y="1000" fill="#94a3b8" font-family="monospace" font-size="12" opacity="0.6">
    [SYNTHETIC SONAR MISSION: GULF OF MANNAR SECTOR-4 | ALTITUDE 8.0M | RANGE 35.0M | DEMO MODE]
  </text>

  <!-- ================= DETECTIONS AND ACOUSTIC SHADOWS ================= -->

  <!-- TARGET 1: det_001 (x: 280, y: 310, w: 45, h: 30) - Verified Ghost Net -->
  <!-- Acoustic Highlight -->
  <path d="M 282 312 Q 295 308, 320 316 Q 323 328, 310 338 Q 288 335, 282 312 Z" fill="#e0f2fe" opacity="0.9" />
  <!-- Filamentous mesh pattern -->
  <path d="M 285 315 L 315 330 M 290 335 L 320 318 M 283 325 L 318 322" stroke="#ffffff" stroke-width="1.2" opacity="0.7" />
  <!-- Cast Acoustic Shadow (points away from center nadir 512, so shadow extends leftward) -->
  <polygon points="280,314 210,305 205,335 280,336" fill="#010306" opacity="0.95" />

  <!-- TARGET 2: det_002 (x: 640, y: 220, w: 55, h: 40) - Verified Trawl Net Fragment -->
  <path d="M 645 225 Q 670 218, 690 230 Q 692 250, 665 258 Q 642 250, 645 225 Z" fill="#bae6fd" opacity="0.88" />
  <path d="M 648 230 L 685 248 M 652 252 L 688 228 M 660 220 L 675 258" stroke="#ffffff" stroke-width="1" opacity="0.65" />
  <!-- Shadow (extends rightward away from nadir) -->
  <polygon points="695,224 785,215 792,255 695,256" fill="#010306" opacity="0.95" />

  <!-- TARGET 3: det_003 (x: 720, y: 580, w: 60, h: 35) - Verified Submerged Gill Net -->
  <path d="M 725 585 Q 755 578, 775 590 Q 770 610, 740 612 Q 722 605, 725 585 Z" fill="#e0f2fe" opacity="0.9" />
  <path d="M 730 588 L 770 606 M 735 608 L 768 586" stroke="#ffffff" stroke-width="1" opacity="0.7" />
  <!-- Shadow -->
  <polygon points="775,584 860,576 868,610 775,612" fill="#010306" opacity="0.95" />

  <!-- TARGET 4: det_004 (x: 350, y: 740, w: 40, h: 35) - Verified Monofilament Bundle -->
  <ellipse cx="370" cy="755" rx="18" ry="14" fill="#f0f9ff" opacity="0.85" />
  <polygon points="352,746 295,740 290,772 352,768" fill="#010306" opacity="0.95" />

  <!-- TARGET 5: det_005 (x: 210, y: 480, w: 50, h: 40) - Uncertain Fiber Clump -->
  <path d="M 215 488 Q 235 482, 255 492 Q 250 515, 230 518 Q 212 510, 215 488 Z" fill="#93c5fd" opacity="0.7" />
  <!-- Irregular diffuse shadow -->
  <polygon points="212,486 160,480 152,514 212,516" fill="#02060e" opacity="0.85" />

  <!-- TARGET 6: det_006 (x: 610, y: 810, w: 45, h: 45) - Uncertain Submerged Tyre / Debris -->
  <circle cx="632" cy="832" r="18" fill="none" stroke="#e0f2fe" stroke-width="4" opacity="0.8" />
  <circle cx="632" cy="832" r="8" fill="#030712" />
  <polygon points="648,818 710,812 715,848 648,846" fill="#010306" opacity="0.85" />

  <!-- TARGET 7: det_007 (x: 410, y: 150, w: 55, h: 35) - REJECTED Natural Limestone Outcrop / Sand Ripple -->
  <!-- Note: Model suggested debris candidate, but physics found shadow length mismatch (rock is flat to seafloor, minimal shadow) -->
  <path d="M 412 155 Q 435 150, 460 156 Q 462 178, 440 182 Q 415 178, 412 155 Z" fill="#64748b" opacity="0.75" />
  <!-- Very stubby/negligible shadow despite high altitude expectation -->
  <polygon points="412,156 395,155 394,175 412,176" fill="#030712" opacity="0.7" />
</svg>
`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generates an activation heatmap SVG for a specific detection crop
export function getMockHeatmapUrl(detectionId: string): string {
  const isNet = ['det_001', 'det_002', 'det_003', 'det_004'].includes(detectionId);
  const isRejected = detectionId === 'det_007';

  // Heatmap color distribution based on target type
  const centerColor = isRejected ? '#eab308' : '#ef4444'; // Red intense or amber
  const midColor = isRejected ? '#06b6d4' : '#f59e0b';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300" style="background:#020617;">
  <defs>
    <radialGradient id="heat-grad" cx="50%" cy="48%" r="48%">
      <stop offset="0%" stop-color="${centerColor}" stop-opacity="0.95" />
      <stop offset="35%" stop-color="${midColor}" stop-opacity="0.8" />
      <stop offset="65%" stop-color="#06b6d4" stop-opacity="0.5" />
      <stop offset="85%" stop-color="#1e1b4b" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Heatmap activation field -->
  <rect width="300" height="300" fill="#020617" />
  <circle cx="150" cy="145" r="110" fill="url(#heat-grad)" />

  <!-- Sub-hotspots showing acoustic boundary response -->
  <circle cx="130" cy="140" r="35" fill="${centerColor}" opacity="0.75" />
  <circle cx="165" cy="150" r="40" fill="${midColor}" opacity="0.65" />

  <text x="10" y="290" fill="#94a3b8" font-family="monospace" font-size="10">
    ACTIVATION HEATMAP [DEMO: ${detectionId}]
  </text>
</svg>
`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

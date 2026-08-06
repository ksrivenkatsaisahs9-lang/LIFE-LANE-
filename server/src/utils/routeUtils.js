/**
 * Centralized Route & Coordinate Utilities for LifeLane Platform
 */

/**
 * Calculate straight-line distance in kilometers between two lat/lng points using Haversine formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance in meters between two lat/lng points
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  return calculateHaversineDistance(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Normalize raw coordinate array into Leaflet standard [latitude, longitude] format.
 * Automatically detects and swaps GeoJSON [longitude, latitude] arrays.
 */
function normalizeRouteCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return [];

  return coords.map((pt) => {
    let lat, lng;
    if (Array.isArray(pt)) {
      lat = Number(pt[0]);
      lng = Number(pt[1]);
    } else if (pt && typeof pt === 'object') {
      lat = Number(pt.lat ?? pt.latitude);
      lng = Number(pt.lng ?? pt.longitude);
    } else {
      return null;
    }

    // Detect GeoJSON [longitude, latitude] format (for Bengaluru: lng ~ 77.x, lat ~ 12.x)
    if (lat > 60 && lat < 90 && lng > 0 && lng < 40) {
      const temp = lat;
      lat = lng;
      lng = temp;
    }

    return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
  }).filter((pt) => pt !== null && !isNaN(pt[0]) && !isNaN(pt[1]));
}

/**
 * Validate route coordinates array
 */
function validateRouteCoordinates(coords, start, destination) {
  if (!Array.isArray(coords) || coords.length < 5) return false;

  const first = coords[0];
  const last = coords[coords.length - 1];

  if (!first || !last) return false;

  // Ensure lat/lng are within valid ranges
  for (const [lat, lng] of coords) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  }

  // Ensure route starts near ambulance start and ends near destination
  if (start && start.latitude && start.longitude) {
    const startDist = getDistanceMeters(first[0], first[1], start.latitude, start.longitude);
    if (startDist > 1500) return false;
  }

  if (destination && destination.latitude && destination.longitude) {
    const destDist = getDistanceMeters(last[0], last[1], destination.latitude, destination.longitude);
    if (destDist > 1500) return false;
  }

  return true;
}

/**
 * Distance-Based Resampling / Interpolation (approx. 20 meters per step)
 * Converts raw polyline with uneven spacing into evenly spaced movement points.
 */
function resampleRouteGeometry(coords, stepMeters = 20) {
  const normalized = normalizeRouteCoordinates(coords);
  if (normalized.length < 2) return normalized;

  const resampled = [normalized[0]];
  let currentStart = normalized[0];
  let accumulatedRem = 0;

  for (let i = 0; i < normalized.length - 1; i++) {
    const p1 = normalized[i];
    const p2 = normalized[i + 1];
    const segDist = getDistanceMeters(p1[0], p1[1], p2[0], p2[1]);

    if (segDist === 0) continue;

    let distCovered = stepMeters - accumulatedRem;

    while (distCovered <= segDist) {
      const ratio = distCovered / segDist;
      const lat = p1[0] + (p2[0] - p1[0]) * ratio;
      const lng = p1[1] + (p2[1] - p1[1]) * ratio;
      resampled.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
      distCovered += stepMeters;
    }

    accumulatedRem = segDist - (distCovered - stepMeters);
  }

  // Ensure destination point is included as final coordinate
  const lastNormalized = normalized[normalized.length - 1];
  const lastResampled = resampled[resampled.length - 1];
  if (getDistanceMeters(lastResampled[0], lastResampled[1], lastNormalized[0], lastNormalized[1]) > 5) {
    resampled.push(lastNormalized);
  }

  return resampled;
}

/**
 * Precompute cumulative distance in kilometers along resampled route array
 */
function computeCumulativeDistances(resampledCoords) {
  const dists = [0];
  let total = 0;
  for (let i = 1; i < resampledCoords.length; i++) {
    const prev = resampledCoords[i - 1];
    const curr = resampledCoords[i];
    const d = calculateHaversineDistance(prev[0], prev[1], curr[0], curr[1]);
    total += d;
    dists.push(Number(total.toFixed(4)));
  }
  return dists;
}

/**
 * Calculate bearing angle in degrees (0-360) between two lat/lng points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Derive demonstration junctions positioned DIRECTLY ON the resampled route polyline.
 * Guarantees that route, ambulance movement, and signal positions match 100%.
 */
function deriveJunctionsFromRoute(resampledCoords, customJunctionNames = [], scenarioCode = null) {
  if (!resampledCoords || resampledCoords.length < 4) return [];

  const N = resampledCoords.length;

  // Single Four-Way Intersection Scenario for City General Hospital (SMART_INTERSECTION)
  if (scenarioCode === 'SMART_INTERSECTION' || customJunctionNames.length === 1 || (customJunctionNames[0] && customJunctionNames[0].code === 'JNC-A' && customJunctionNames.length === 1)) {
    const targetIdx = Math.min(N - 2, Math.floor(N * 0.45));
    const pt = resampledCoords[targetIdx];
    const nameMeta = customJunctionNames[0] || { name: 'City General Emergency Intersection', code: 'JNC-A' };

    return [
      {
        id: 'jnc-1',
        name: nameMeta.name || 'City General Emergency Intersection',
        code: nameMeta.code || 'JNC-A',
        latitude: pt[0],
        longitude: pt[1],
        targetIndex: targetIdx,
        signalState: 'NORMAL',
        statusText: 'Normal operation',
        isActive: true,
        signals: [
          { id: 'sig-jnc-1-northbound', junctionId: 'jnc-1', signalCode: 'SIG-A-N', direction: 'NORTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: true },
          { id: 'sig-jnc-1-southbound', junctionId: 'jnc-1', signalCode: 'SIG-A-S', direction: 'SOUTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-jnc-1-eastbound', junctionId: 'jnc-1', signalCode: 'SIG-A-E', direction: 'GREEN', normalState: 'GREEN', isEmergencyRouteSignal: false },
          { id: 'sig-jnc-1-westbound', junctionId: 'jnc-1', signalCode: 'SIG-A-W', direction: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
        ],
      },
    ];
  }

  const ratios = [0.25, 0.50, 0.75];
  const defaultNames = [
    { name: 'Junction 01 (Sony World Signal)', code: 'JNC-A' },
    { name: 'Junction 02 (Dairy Circle Signal)', code: 'JNC-B' },
    { name: 'Junction 03 (Richmond Circle Signal)', code: 'JNC-C' },
  ];

  return ratios.map((ratio, idx) => {
    const targetIdx = Math.min(N - 2, Math.floor(N * ratio));
    const pt = resampledCoords[targetIdx];
    const meta = customJunctionNames[idx] || defaultNames[idx];

    return {
      id: `jnc-${idx + 1}`,
      name: meta.name,
      code: meta.code,
      latitude: pt[0],
      longitude: pt[1],
      targetIndex: targetIdx,
      signalState: 'NORMAL',
      isActive: true,
    };
  });
}

module.exports = {
  calculateHaversineDistance,
  getDistanceMeters,
  normalizeRouteCoordinates,
  validateRouteCoordinates,
  resampleRouteGeometry,
  computeCumulativeDistances,
  calculateBearing,
  deriveJunctionsFromRoute,
};

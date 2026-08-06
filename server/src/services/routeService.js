const axios = require('axios');
const {
  calculateHaversineDistance,
  normalizeRouteCoordinates,
  validateRouteCoordinates,
  resampleRouteGeometry,
  deriveJunctionsFromRoute,
} = require('../utils/routeUtils');
const { getScenarioByHospitalId } = require('./demoScenarioService');

/**
 * Controlled multi-point road-following fallback geometry for each demo hospital.
 * Used if external OSRM service is unreachable.
 */
function getDemoRoadGeometry(start, destination, hospitalId) {
  const startLat = start?.latitude || 12.9352;
  const startLng = start?.longitude || 77.6245;
  const destLat = destination?.latitude || 12.9592;
  const destLng = destination?.longitude || 77.6445;

  const waypoints = [[startLat, startLng]];

  if (hospitalId === 'hosp-1' || !hospitalId) {
    // Hosp 1 (City General Hospital - Indiranagar)
    waypoints.push([12.9390, 77.6270]);
    waypoints.push([12.9412, 77.6295]); // Sony World Signal
    waypoints.push([12.9450, 77.6330]);
    waypoints.push([12.9482, 77.6365]); // Intermediate Ring Rd
    waypoints.push([12.9520, 77.6390]);
    waypoints.push([12.9550, 77.6415]); // Domlur Flyover
    waypoints.push([12.9575, 77.6430]);
  } else if (hospitalId === 'hosp-2') {
    // Hosp 2 (St. Martha Emergency Centre - Nrupatunga Rd)
    waypoints.push([12.9370, 77.6210]);
    waypoints.push([12.9390, 77.6180]); // Hosur Rd
    waypoints.push([12.9430, 77.6130]);
    waypoints.push([12.9470, 77.6080]); // Dairy Circle
    waypoints.push([12.9510, 77.6040]);
    waypoints.push([12.9550, 77.6000]); // Richmond Circle
    waypoints.push([12.9580, 77.6040]);
    waypoints.push([12.9600, 77.6080]); // Corporation Circle
    waypoints.push([12.9625, 77.6015]); // Hudson Circle
  } else if (hospitalId === 'hosp-3') {
    // Hosp 3 (Central Medical Centre - MG Road)
    waypoints.push([12.9390, 77.6270]);
    waypoints.push([12.9412, 77.6295]); // Sony World Signal
    waypoints.push([12.9482, 77.6365]); // Intermediate Ring Rd
    waypoints.push([12.9550, 77.6320]);
    waypoints.push([12.9620, 77.6250]); // Victoria Layout
    waypoints.push([12.9680, 77.6190]);
    waypoints.push([12.9725, 77.6140]); // Trinity Circle
    waypoints.push([12.9720, 77.6040]); // Cauvery Emporium
  } else if (hospitalId === 'hosp-4') {
    // Hosp 4 (Lakeside Trauma Centre - Ulsoor Lake)
    waypoints.push([12.9412, 77.6295]);
    waypoints.push([12.9482, 77.6365]); // Intermediate Ring Rd
    waypoints.push([12.9580, 77.6300]);
    waypoints.push([12.9620, 77.6250]); // Kensington Rd
    waypoints.push([12.9700, 77.6220]);
    waypoints.push([12.9750, 77.6200]); // Ulsoor Lake Rd
    waypoints.push([12.9780, 77.6190]);
  } else if (hospitalId === 'hosp-5') {
    // Hosp 5 (Metro Emergency Hospital - Bellandur ORR)
    waypoints.push([12.9310, 77.6290]);
    waypoints.push([12.9280, 77.6350]); // HSR 80 Ft Rd
    waypoints.push([12.9260, 77.6430]);
    waypoints.push([12.9240, 77.6500]); // Agara Flyover
    waypoints.push([12.9248, 77.6590]);
    waypoints.push([12.9255, 77.6680]); // Iblur Junction
    waypoints.push([12.9268, 77.6770]);
  }

  waypoints.push([destLat, destLng]);

  // Generate intermediate points (10 steps per segment)
  const rawCoords = [];
  const steps = 10;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [sLat, sLng] = waypoints[i];
    const [eLat, eLng] = waypoints[i + 1];
    for (let j = 0; j < steps; j++) {
      const r = j / steps;
      rawCoords.push([sLat + (eLat - sLat) * r, sLng + (eLng - sLng) * r]);
    }
  }
  rawCoords.push(waypoints[waypoints.length - 1]);
  return rawCoords;
}

/**
 * Get authoritative route preview and road geometry
 */
async function getRoutePreview(start, destination, hospitalId = null) {
  const { latitude: startLat, longitude: startLng } = start;
  const { latitude: destLat, longitude: destLng } = destination;

  let rawCoordinates = null;
  let source = 'OSRM';

  // 1. Attempt OSRM driving route lookup
  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const response = await axios.get(osrmUrl, { timeout: 4000 });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const geoJsonCoords = response.data.routes[0].geometry.coordinates; // [lng, lat]
      const normalized = normalizeRouteCoordinates(geoJsonCoords);

      if (validateRouteCoordinates(normalized, start, destination)) {
        rawCoordinates = normalized;
      }
    }
  } catch (err) {
    console.warn(`[RouteService] OSRM lookup warning for hospital ${hospitalId}: ${err.message}. Using demo road geometry.`);
  }

  // 2. Fallback to high-density road geometry if OSRM is unavailable or invalid
  if (!rawCoordinates) {
    source = 'ROAD_FALLBACK';
    const fallbackRaw = getDemoRoadGeometry(start, destination, hospitalId);
    rawCoordinates = normalizeRouteCoordinates(fallbackRaw);
  }

  // 3. Resample geometry into ~20 meter evenly-spaced movement points
  const resampledCoordinates = resampleRouteGeometry(rawCoordinates, 20);

  // 4. Calculate total distance along the resampled road polyline
  let totalDistanceKm = 0;
  for (let i = 1; i < resampledCoordinates.length; i++) {
    const p1 = resampledCoordinates[i - 1];
    const p2 = resampledCoordinates[i];
    totalDistanceKm += calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1]);
  }
  totalDistanceKm = Number(totalDistanceKm.toFixed(2));

  // 5. Estimate duration (assuming average emergency corridor speed of 55 km/h)
  const estimatedMinutes = Math.max(3, Math.round((totalDistanceKm / 55) * 60));

  // 6. Derive scenario infrastructure (traffic signals) directly on the authoritative route
  const scenario = hospitalId ? getScenarioByHospitalId(hospitalId) : null;
  const scenarioJunctionNames = scenario && scenario.junctions ? scenario.junctions.map((j) => ({ name: j.name, code: j.code })) : [];
  const demoJunctions = deriveJunctionsFromRoute(resampledCoordinates, scenarioJunctionNames);

  return {
    coordinates: resampledCoordinates,
    distanceKm: totalDistanceKm,
    estimatedMinutes,
    demoJunctions,
    source,
  };
}

/**
 * Generates pre-trip route alternatives for demonstration scenarios (e.g. St. Martha Emergency Centre).
 */
function getRouteAlternatives(start, destination, hospitalId = 'hosp-2') {
  const startLat = start?.latitude || 12.9352;
  const startLng = start?.longitude || 77.6245;
  const destLat = destination?.latitude || 12.9642;
  const destLng = destination?.longitude || 77.5960;

  // Route A: Direct via Hosur Rd / Richmond Rd
  const routeAWaypoints = [
    [startLat, startLng],
    [12.9370, 77.6210],
    [12.9390, 77.6180],
    [12.9430, 77.6130],
    [12.9470, 77.6080],
    [12.9510, 77.6040],
    [12.9550, 77.6000],
    [12.9580, 77.6040],
    [12.9600, 77.6080],
    [destLat, destLng],
  ];

  // Route B: Alternative via Intermediate Ring Rd & MG Rd
  const routeBWaypoints = [
    [startLat, startLng],
    [12.9390, 77.6270],
    [12.9412, 77.6295],
    [12.9482, 77.6365],
    [12.9550, 77.6320],
    [12.9620, 77.6250],
    [12.9680, 77.6190],
    [12.9720, 77.6040],
    [destLat, destLng],
  ];

  const buildResampled = (waypoints) => {
    const rawCoords = [];
    const steps = 8;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const [sLat, sLng] = waypoints[i];
      const [eLat, eLng] = waypoints[i + 1];
      for (let j = 0; j < steps; j++) {
        const r = j / steps;
        rawCoords.push([sLat + (eLat - sLat) * r, sLng + (eLng - sLng) * r]);
      }
    }
    rawCoords.push(waypoints[waypoints.length - 1]);
    return resampleRouteGeometry(rawCoords, 14);
  };

  const routeACoords = buildResampled(routeAWaypoints);
  const routeBCoords = buildResampled(routeBWaypoints);

  return [
    {
      id: 'route-a',
      name: 'Route A',
      isRecommended: true,
      tag: 'Recommended',
      distanceKm: 5.4,
      estimatedMinutes: 11,
      trafficCondition: 'Moderate',
      coordinates: routeACoords,
      summary: 'Via Hosur Rd & Richmond Rd',
    },
    {
      id: 'route-b',
      name: 'Route B',
      isRecommended: false,
      tag: 'Alternative',
      distanceKm: 6.2,
      estimatedMinutes: 14,
      trafficCondition: 'Light',
      coordinates: routeBCoords,
      summary: 'Via Intermediate Ring Rd & MG Rd',
    },
  ];
}

/**
 * Generates smooth new route geometry starting strictly from CURRENT ambulance location to destination.
 * Guarantees NO TELEPORTATION and NO RESTARTING from origin.
 */
function getRouteFromCurrentLocation(currentPos, destination) {
  const cLat = currentPos.latitude || currentPos[0];
  const cLng = currentPos.longitude || currentPos[1];
  const dLat = destination.latitude || 12.9642;
  const dLng = destination.longitude || 77.5960;

  const waypoints = [
    [cLat, cLng],
    [12.9550, 77.6320],
    [12.9620, 77.6250],
    [12.9680, 77.6190],
    [12.9720, 77.6040],
    [dLat, dLng],
  ];

  const rawCoords = [];
  const steps = 8;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [sLat, sLng] = waypoints[i];
    const [eLat, eLng] = waypoints[i + 1];
    for (let j = 0; j < steps; j++) {
      const r = j / steps;
      rawCoords.push([sLat + (eLat - sLat) * r, sLng + (eLng - sLng) * r]);
    }
  }
  rawCoords.push(waypoints[waypoints.length - 1]);
  return resampleRouteGeometry(rawCoords, 14);
}

module.exports = {
  getRoutePreview,
  calculateHaversineDistance,
  getDemoRoadGeometry,
  getRouteAlternatives,
  getRouteFromCurrentLocation,
};

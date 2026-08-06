const supabase = require('../config/supabase');
const { getIO } = require('../sockets/socketHandler');
const {
  normalizeRouteCoordinates,
  resampleRouteGeometry,
  computeCumulativeDistances,
  calculateBearing,
  deriveJunctionsFromRoute,
  getDistanceMeters,
} = require('../utils/routeUtils');

/**
 * In-memory map of active simulations: tripId -> simulationState object
 */
const activeSimulations = new Map();
let currentSpeedMultiplier = 1;

function getSimulationSpeed() {
  return currentSpeedMultiplier;
}

function setSimulationSpeed(speed) {
  currentSpeedMultiplier = Math.max(1, Math.min(4, Number(speed) || 1));
  for (const [tripId, sim] of activeSimulations.entries()) {
    if (sim.timer) clearInterval(sim.timer);
    if (sim.tick) {
      sim.timer = setInterval(sim.tick, Math.round(380 / currentSpeedMultiplier));
    }
  }
  return currentSpeedMultiplier;
}

/**
 * Start or resume backend simulation for an active emergency trip
 */
function startTripSimulation(trip) {
  const tripId = trip.id;

  if (activeSimulations.has(tripId)) {
    return activeSimulations.get(tripId);
  }

  // 1. Obtain normalized Leaflet coordinates [lat, lng]
  const rawCoords = trip.route_coordinates || [];
  const normalized = normalizeRouteCoordinates(rawCoords);

  // 2. Resample geometry into ~16 meter movement points (fast ~128 km/h emergency corridor speed)
  const coords = resampleRouteGeometry(normalized, 16);
  const totalSteps = coords.length;

  if (totalSteps === 0) {
    console.warn(`[TripSimulation] Cannot start simulation for trip ${tripId}: No coordinates.`);
    return null;
  }

  // 3. Precompute cumulative route distances (in km)
  const cumulativeDistances = computeCumulativeDistances(coords);
  const totalDistanceKm = cumulativeDistances[totalSteps - 1] || trip.estimated_distance_km || 5.0;
  const totalDurationSeconds = Math.max(60, (trip.estimated_duration_minutes || 8) * 60);

  // 4. Derive junctions POSITIONED DIRECTLY ON THE AUTHORITATIVE ROUTE
  const { getScenarioByHospitalId } = require('./demoScenarioService');
  const scenario = getScenarioByHospitalId(trip.hospital_id);
  const scenarioJunctionNames = scenario && scenario.junctions ? scenario.junctions.map((j) => ({ name: j.name, code: j.code })) : [];
  const junctions = deriveJunctionsFromRoute(coords, scenarioJunctionNames, scenario?.scenarioCode);

  let currentIndex = trip.route_index || 0;
  if (currentIndex >= totalSteps - 1) {
    currentIndex = 0;
  }

  const destinationLat = trip.destination_latitude || coords[totalSteps - 1][0];
  const destinationLng = trip.destination_longitude || coords[totalSteps - 1][1];

  let dbSaveCounter = 0;
  let arrivingEmitted = false;

  const simState = {
    tripId,
    ambulanceId: trip.ambulance_id,
    hospitalId: trip.hospital_id,
    currentIndex,
    totalSteps,
    coords,
    cumulativeDistances,
    junctions,
    timer: null,
    tick: null,
    passedJunctions: new Set(),
  };

  const tick = async () => {
    try {
      if (currentIndex >= totalSteps) {
        await completeTrip(simState, coords[totalSteps - 1]);
        return;
      }

      const [currentLat, currentLng] = coords[currentIndex];
      const nextPoint = coords[Math.min(totalSteps - 1, currentIndex + 1)];
      const bearing = calculateBearing(currentLat, currentLng, nextPoint[0], nextPoint[1]);

      const progressRatio = currentIndex / Math.max(1, totalSteps - 1);
      const coveredDistanceKm = cumulativeDistances[currentIndex] || 0;
      const remainingDistanceKm = Number(Math.max(0, totalDistanceKm - coveredDistanceKm).toFixed(2));
      const remainingSeconds = Math.max(0, Math.round(totalDurationSeconds * (1 - progressRatio)));

      const ambProgressMeters = Math.round(coveredDistanceKm * 1000);

      // Update junction states with accurate INDIVIDUAL route-distance calculations
      const updatedJunctions = junctions.map((j) => {
        const jncTargetIdx = j.targetIndex || 0;
        const jncProgressMeters = Math.round((cumulativeDistances[jncTargetIdx] || 0) * 1000);
        const routeDistToJunctionMeters = Math.max(0, Math.round(jncProgressMeters - ambProgressMeters));

        const isPassed = currentIndex > jncTargetIdx + 1 && ambProgressMeters > jncProgressMeters + 15;
        const passDistanceMeters = ambProgressMeters - jncProgressMeters;

        let signalState = 'NORMAL';
        let statusText = 'Normal operation';

        if (isPassed) {
          if (passDistanceMeters > 100) {
            // Ambulance has passed beyond 100m clearance zone -> Signals return 100% to NORMAL operation!
            signalState = 'NORMAL';
            statusText = 'Normal operation restored';
          } else {
            // Brief clearance state (15m to 100m after junction)
            signalState = 'CLEARED';
            statusText = 'Emergency vehicle cleared — Returning to normal operation';
          }
        } else if (routeDistToJunctionMeters <= 100) {
          signalState = 'EMERGENCY_PRIORITY';
          statusText = 'EMERGENCY PRIORITY ACTIVE — Northbound GREEN, 3 conflicting RED';
        } else if (routeDistToJunctionMeters <= 300) {
          signalState = 'TRANSITION';
          statusText = 'Signal transition in progress — All conflicting movements stopping';
        } else if (routeDistToJunctionMeters <= 500) {
          signalState = 'PREPARING_PRIORITY';
          statusText = 'Preparing intersection priority — Clearance sequence queued';
        } else if (routeDistToJunctionMeters <= 1000) {
          signalState = 'AMBULANCE_APPROACHING';
          statusText = 'Ambulance approaching (1 km zone) — Police officer alerted';
        }

        const ambulanceDirection = 'NORTHBOUND';

        const signals = (j.signals || [
          { id: `sig-${j.id}-northbound`, junctionId: j.id, signalCode: 'SIG-A-N', direction: 'NORTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: true },
          { id: `sig-${j.id}-southbound`, junctionId: j.id, signalCode: 'SIG-A-S', direction: 'SOUTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
          { id: `sig-${j.id}-eastbound`, junctionId: j.id, signalCode: 'SIG-A-E', direction: 'GREEN', normalState: 'GREEN', isEmergencyRouteSignal: false },
          { id: `sig-${j.id}-westbound`, junctionId: j.id, signalCode: 'SIG-A-W', direction: 'WESTBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
        ]).map((sig) => {
          let state = sig.normalState || 'RED';
          if (signalState === 'EMERGENCY_PRIORITY') {
            state = sig.direction === ambulanceDirection ? 'GREEN' : 'RED';
          } else if (signalState === 'TRANSITION') {
            state = sig.direction === ambulanceDirection ? 'AMBER' : 'RED';
          } else if (signalState === 'PREPARING_PRIORITY' || signalState === 'AMBULANCE_APPROACHING') {
            state = sig.direction === ambulanceDirection ? 'AMBER' : 'RED';
          } else if (signalState === 'CLEARED') {
            state = 'RED'; // Brief ALL RED clearance
          } else {
            state = sig.normalState || (sig.direction === 'EASTBOUND' ? 'GREEN' : 'RED');
          }
          return {
            ...sig,
            state,
            distanceFromAmbulance: routeDistToJunctionMeters,
          };
        });

        return {
          ...j,
          distanceMeters: routeDistToJunctionMeters,
          signalState,
          statusText,
          isPassed,
          ambulanceDirection,
          signals,
        };
      });

      simState.junctions = updatedJunctions;

      // Trigger automatic police handoff when junction is passed
      updatedJunctions.forEach((j) => {
        if (j.isPassed && !simState.passedJunctions.has(j.id)) {
          simState.passedJunctions.add(j.id);
          try {
            const io = getIO();
            const passPayload = {
              tripId,
              junctionId: j.id,
              junctionCode: j.code,
              junctionName: j.name,
              ambulanceCode: 'AMB-1042',
              passedAt: new Date().toISOString(),
              thankYouMessage: 'Thank you for your cooperation.',
              statusMessage: `${j.name} Cleared`,
              detailText: 'AMB-1042 has cleared City General Emergency Intersection. Signal operation is returning to normal.',
              trackingTerminated: true,
            };
            io.to(`junction:${j.code}`).emit('junction:passed', passPayload);
            io.to('junctions').emit('junction:passed', passPayload);
            io.to(`trip:${tripId}`).emit('junction:passed', passPayload);
            io.emit('junction:passed', passPayload);
          } catch (e) {}
        }
      });

      // Sliced remaining route coordinates starting strictly from current ambulance position
      const remainingRouteCoordinates = [
        [currentLat, currentLng],
        ...coords.slice(currentIndex + 1),
      ];

      const remainingSteps = totalSteps - currentIndex;
      const actualRemainingKm = Number(((remainingSteps * 14) / 1000).toFixed(2));
      const actualRemainingSeconds = Math.round((remainingSteps * 0.65) / currentSpeedMultiplier);
      const calculatedSpeedKmH = Math.round(78 * currentSpeedMultiplier);

      simState.lastLat = currentLat;
      simState.lastLng = currentLng;
      simState.lastTime = Date.now();

      const locationPayload = {
        tripId,
        ambulanceId: trip.ambulance_id,
        ambulanceCode: 'AMB-1042',
        vehicleNumber: 'AMB-1042',
        hospitalId: trip.hospital_id,
        emergencyType: trip.emergency_type || 'CARDIAC',
        latitude: currentLat,
        longitude: currentLng,
        bearing,
        routeProgress: Number(progressRatio.toFixed(3)),
        remainingDistanceKm: actualRemainingKm,
        remainingSeconds: actualRemainingSeconds,
        remainingDurationMinutes: Math.ceil(actualRemainingSeconds / 60),
        speedKmH: calculatedSpeedKmH,
        status: 'ACTIVE',
        junctions: updatedJunctions,
        routeCoordinates: remainingRouteCoordinates,
        timestamp: new Date().toISOString(),
      };

      simState.currentLatitude = currentLat;
      simState.currentLongitude = currentLng;
      simState.bearing = bearing;
      simState.remainingDistanceKm = remainingDistanceKm;
      simState.remainingDurationMinutes = Math.ceil(remainingSeconds / 60);
      simState.currentIndex = currentIndex;

      // Broadcast authoritative location payload to all channels
      try {
        const io = getIO();
        io.emit('trip:location', locationPayload);
        io.to(`trip:${tripId}`).emit('trip:location', locationPayload);
        io.to(`hospital:${trip.hospital_id}`).emit('trip:location', locationPayload);
        io.to('hospitals').emit('trip:location', locationPayload);
        io.to(`ambulance:${trip.ambulance_id}`).emit('trip:location', locationPayload);
        io.to('junctions').emit('trip:location', locationPayload);
        io.to('police').emit('trip:location', locationPayload);
      } catch (ioErr) {}

      const distToDestMeters = getDistanceMeters(currentLat, currentLng, destinationLat, destinationLng);

      if (!arrivingEmitted && (distToDestMeters <= 400 || progressRatio >= 0.90)) {
        arrivingEmitted = true;
        try {
          const io = getIO();
          const arrivingPayload = { ...locationPayload, status: 'APPROACHING', message: 'Ambulance approaching emergency intake.' };
          io.to(`trip:${tripId}`).emit('trip:arriving', arrivingPayload);
          io.to(`hospital:${trip.hospital_id}`).emit('trip:arriving', arrivingPayload);
          io.to('hospitals').emit('trip:arriving', arrivingPayload);
          io.to(`ambulance:${trip.ambulance_id}`).emit('trip:arriving', arrivingPayload);
          io.emit('trip:arriving', arrivingPayload);
        } catch (ioErr) {}
      }

      if (currentIndex === totalSteps - 1 || distToDestMeters <= 30) {
        await completeTrip(simState, [destinationLat, destinationLng]);
        return;
      }

      dbSaveCounter++;
      if (dbSaveCounter % 5 === 0) {
        await supabase
          .from('emergency_trips')
          .update({
            current_latitude: currentLat,
            current_longitude: currentLng,
            route_index: currentIndex,
            remaining_distance_km: remainingDistanceKm,
            remaining_duration_minutes: Math.ceil(remainingSeconds / 60),
            last_location_update: new Date().toISOString(),
          })
          .eq('id', tripId);
      }

      currentIndex++;
    } catch (err) {
      console.error(`[TripSimulation] Tick error for trip ${tripId}:`, err.message);
    }
  };

  simState.tick = tick;
  setTimeout(tick, 50);
  simState.timer = setInterval(tick, Math.round(380 / currentSpeedMultiplier));
  activeSimulations.set(tripId, simState);

  console.log(`[TripSimulation] Started authoritative simulation for trip ${tripId} (${totalSteps} road points, ${totalDistanceKm} km).`);

  return simState;
}

/**
 * Complete trip automatically upon reaching destination
 */
async function completeTrip(simState, finalCoords) {
  const { tripId, ambulanceId, hospitalId, timer } = simState;

  if (timer) clearInterval(timer);
  activeSimulations.delete(tripId);

  const now = new Date().toISOString();
  const [finalLat, finalLng] = finalCoords;

  try {
    await supabase
      .from('emergency_trips')
      .update({
        status: 'COMPLETED',
        completed_at: now,
        current_latitude: finalLat,
        current_longitude: finalLng,
        remaining_distance_km: 0,
        remaining_duration_minutes: 0,
        last_location_update: now,
      })
      .eq('id', tripId);

    await supabase
      .from('ambulances')
      .update({
        status: 'AVAILABLE',
        latitude: finalLat,
        longitude: finalLng,
      })
      .eq('id', ambulanceId);

    const completedPayload = {
      tripId,
      ambulanceId,
      hospitalId,
      status: 'COMPLETED',
      completedAt: now,
      finalLatitude: finalLat,
      finalLongitude: finalLng,
    };

    try {
      const io = getIO();
      io.to(`trip:${tripId}`).emit('trip:completed', completedPayload);
      io.to(`hospital:${hospitalId}`).emit('trip:completed', completedPayload);
      io.to('hospitals').emit('trip:completed', completedPayload);
      io.to(`ambulance:${ambulanceId}`).emit('trip:completed', completedPayload);
      io.to('junctions').emit('trip:completed', completedPayload);
      io.to('police').emit('trip:completed', completedPayload);
      io.emit('trip:completed', completedPayload);
    } catch (ioErr) {}

    console.log(`[TripSimulation] Trip ${tripId} COMPLETED successfully.`);
  } catch (err) {
    console.error(`[TripSimulation] Error completing trip ${tripId}:`, err.message);
  }
}

function stopSimulation(tripId) {
  if (activeSimulations.has(tripId)) {
    const sim = activeSimulations.get(tripId);
    if (sim.timer) clearInterval(sim.timer);
    activeSimulations.delete(tripId);
  }
}

/**
 * Atomic trip cancellation helper
 */
async function cancelTripSimulation(tripId, reason = 'Activated by mistake', userId = null) {
  const sim = activeSimulations.get(tripId);
  const now = new Date().toISOString();

  // 1. Stop simulation timer immediately so NO further trip:location updates are emitted
  if (sim && sim.timer) {
    clearInterval(sim.timer);
  }
  activeSimulations.delete(tripId);

  const ambulanceId = sim?.ambulanceId || 'amb-1';
  const hospitalId = sim?.hospitalId || 'hosp-1';

  // 2. Safely update signals: reset active priorities to NORMAL, keep passed junctions as PASSED
  if (sim && sim.junctions) {
    sim.junctions.forEach((j) => {
      if (!j.isPassed) {
        j.signalState = 'NORMAL';
        j.statusText = 'Normal operation (Cancelled)';
        j.isSkipped = true;
        if (j.signals) {
          j.signals.forEach((sig) => {
            sig.state = 'GREEN';
          });
        }
      }
    });

    try {
      const io = getIO();
      io.to('junctions').emit('junctions:update', { junctions: sim.junctions, activeTripId: null });
      io.emit('junctions:update', { junctions: sim.junctions, activeTripId: null });
    } catch (e) {}
  }

  // 3. Update database state: status = CANCELLED
  try {
    const updateData = {
      status: 'CANCELLED',
      completed_at: null,
    };
    // Supabase optional columns support
    try { updateData.cancelled_at = now; } catch (e) {}
    try { updateData.cancellation_reason = reason; } catch (e) {}
    if (userId) { try { updateData.cancelled_by = userId; } catch (e) {} }

    await supabase.from('emergency_trips').update(updateData).eq('id', tripId);
    await supabase.from('ambulances').update({ status: 'AVAILABLE' }).eq('id', ambulanceId);
  } catch (dbErr) {
    console.warn(`[TripSimulation] DB cancel update warning for trip ${tripId}:`, dbErr.message);
  }

  // 4. Broadcast trip:cancelled Socket event to all channels
  const cancelPayload = {
    tripId,
    ambulanceId,
    ambulanceCode: 'AMB-1042',
    vehicleNumber: 'AMB-1042',
    hospitalId,
    reason,
    cancelledAt: now,
    status: 'CANCELLED',
  };

  try {
    const io = getIO();
    io.to(`trip:${tripId}`).emit('trip:cancelled', cancelPayload);
    io.to(`hospital:${hospitalId}`).emit('trip:cancelled', cancelPayload);
    io.to('hospitals').emit('trip:cancelled', cancelPayload);
    io.to(`ambulance:${ambulanceId}`).emit('trip:cancelled', cancelPayload);
    io.to('junctions').emit('trip:cancelled', cancelPayload);
    io.to('police').emit('trip:cancelled', cancelPayload);
    io.emit('trip:cancelled', cancelPayload);
  } catch (ioErr) {
    console.warn(`[TripSimulation] Socket cancel emission warning for trip ${tripId}:`, ioErr.message);
  }

  console.log(`[TripSimulation] Trip ${tripId} CANCELLED cleanly. Reason: "${reason}".`);
  return cancelPayload;
}

async function resumeActiveSimulations() {
  try {
    const { data: activeTrips } = await supabase
      .from('emergency_trips')
      .select('*')
      .eq('status', 'ACTIVE');

    if (activeTrips && activeTrips.length > 0) {
      console.log(`[TripSimulation] Resuming ${activeTrips.length} active emergency trip simulations...`);
      for (const trip of activeTrips) {
        startTripSimulation(trip);
      }
    }
  } catch (err) {
    console.warn('[TripSimulation] Could not resume active trip simulations on startup:', err.message);
  }
}

/**
 * Inject controlled congestion disruption ahead of ambulance on current route for St. Martha scenario.
 */
function injectTripCongestion(tripId = null) {
  let targetTripId = tripId;
  if (!targetTripId && activeSimulations.size > 0) {
    targetTripId = activeSimulations.keys().next().value;
  }
  const sim = activeSimulations.get(targetTripId);
  if (!sim) return { success: false, message: 'No active simulation found for congestion injection.' };

  const { coords, currentIndex, totalSteps } = sim;
  const targetIndex = Math.min(totalSteps - 1, currentIndex + Math.floor((totalSteps - currentIndex) * 0.45));
  const congestionPoint = coords[targetIndex] || coords[currentIndex];

  const disruption = {
    id: `disruption-${Date.now()}`,
    tripId: targetTripId,
    type: 'HEAVY_CONGESTION',
    severity: 'HIGH',
    estimatedSpeedKmH: 8,
    estimatedDelayMinutes: 6,
    status: 'ACTIVE',
    latitude: congestionPoint[0],
    longitude: congestionPoint[1],
    description: 'Heavy traffic congestion on Hosur Rd / Richmond Rd corridor.',
    locationName: 'Richmond Road Corridor',
  };

  sim.disruption = disruption;

  try {
    const io = getIO();
    const payload = {
      tripId: targetTripId,
      disruption,
      message: 'Active emergency route affected by high congestion.',
    };
    io.emit('congestion:detected', payload);
    io.to(`trip:${targetTripId}`).emit('congestion:detected', payload);
  } catch (e) {}

  // Automatically trigger intelligent reroute evaluation!
  setTimeout(() => {
    evaluateAndRerouteTrip(targetTripId);
  }, 1200);

  return { success: true, disruption };
}

/**
 * Intelligent AI/Deterministic route reevaluation & reroute execution from CURRENT ambulance location.
 */
function evaluateAndRerouteTrip(tripId) {
  const sim = activeSimulations.get(tripId);
  if (!sim) return null;

  const { getRouteFromCurrentLocation } = require('./routeService');
  const { computeCumulativeDistances } = require('../utils/routeUtils');
  const [currentLat, currentLng] = sim.coords[Math.min(sim.coords.length - 1, sim.currentIndex)];

  // Generate new route geometry starting strictly from CURRENT location (NO TELEPORTING)
  const newCoords = getRouteFromCurrentLocation({ latitude: currentLat, longitude: currentLng }, { latitude: 12.9642, longitude: 77.5960 });
  const newCumulativeDistances = computeCumulativeDistances(newCoords);
  const newTotalDistKm = newCumulativeDistances[newCoords.length - 1] || 4.2;

  sim.coords = newCoords;
  sim.cumulativeDistances = newCumulativeDistances;
  sim.totalSteps = newCoords.length;
  sim.currentIndex = 0; // Starts at index 0 of the NEW path beginning at currentLat, currentLng!
  sim.isRerouted = true;
  sim.activeRouteId = 'route-b';

  const reroutePayload = {
    tripId,
    previousETA: 15,
    updatedETA: 9,
    estimatedSavingMinutes: 6,
    reason: 'Avoids heavy congestion (+6 min delay) on Richmond Road Corridor.',
    activeRouteId: 'route-b',
    activeRouteName: 'Route B (via MG Road)',
    routeCoordinates: newCoords,
    currentLatitude: currentLat,
    currentLongitude: currentLng,
    remainingKm: newTotalDistKm,
    remainingMinutes: 9,
    statusText: 'ROUTE UPDATED — Faster emergency route selected.',
    whyThisRoute: [
      'Avoids heavy congestion on Hosur Rd / Richmond Rd corridor',
      'Saves estimated 6 minutes',
      'Clear arterial corridor along MG Road',
    ],
  };

  try {
    const io = getIO();
    io.emit('trip:rerouted', reroutePayload);
    io.to(`trip:${tripId}`).emit('trip:rerouted', reroutePayload);
    io.to(`hospital:${sim.hospitalId}`).emit('trip:rerouted', reroutePayload);
    io.to('hospitals').emit('trip:rerouted', reroutePayload);
    io.to('police').emit('trip:rerouted', reroutePayload);
  } catch (e) {}

  console.log(`[TripSimulation] Trip ${tripId} REROUTED smoothly from [${currentLat}, ${currentLng}]. Updated ETA: 9 min (Saved 6 min).`);
  return reroutePayload;
}

/**
 * Clear congestion disruption state
 */
function clearTripDisruption(tripId = null) {
  let targetTripId = tripId;
  if (!targetTripId && activeSimulations.size > 0) {
    targetTripId = activeSimulations.keys().next().value;
  }
  const sim = activeSimulations.get(targetTripId);
  if (sim) {
    sim.disruption = null;
  }

  try {
    const io = getIO();
    io.emit('congestion:cleared', { tripId: targetTripId });
  } catch (e) {}

  return { success: true };
}

module.exports = {
  startTripSimulation,
  stopSimulation,
  cancelTripSimulation,
  resumeActiveSimulations,
  activeSimulations,
  setSimulationSpeed,
  getSimulationSpeed,
  injectTripCongestion,
  evaluateAndRerouteTrip,
  clearTripDisruption,
};

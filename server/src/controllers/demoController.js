const { activeSimulations, stopSimulation, setSimulationSpeed, getSimulationSpeed, injectTripCongestion, clearTripDisruption } = require('../services/tripSimulationService');
const { analyzeEmergencyRoutes } = require('../services/mobilityIntelligenceService');
const { getIO } = require('../sockets/socketHandler');
const supabase = require('../config/supabase');

/**
 * POST /api/demo/trips/:tripId/congestion
 * Simulates traffic congestion on an active trip's corridor & triggers AI rerouting
 */
const triggerCongestionDemo = async (req, res) => {
  try {
    const { tripId } = req.params;
    const sim = activeSimulations.get(tripId);

    if (!sim) {
      return res.status(404).json({
        success: false,
        message: 'No active simulation found for this trip ID.',
      });
    }

    const [currentLat, currentLng] = sim.junctions[0]
      ? [sim.junctions[0].latitude, sim.junctions[0].longitude]
      : [12.9412, 77.6295];

    // Emit mobility:disruption event
    try {
      const io = getIO();
      io.to(`trip:${tripId}`).emit('mobility:disruption', {
        tripId,
        message: 'Severe congestion detected ahead (+4 min delay). Re-evaluating optimal emergency route...',
        delayMinutes: 4,
      });
      io.to('hospitals').emit('mobility:disruption', {
        tripId,
        message: 'Corridor disruption detected. Rerouting ambulance...',
      });
    } catch (e) {}

    // Perform AI Re-evaluation from CURRENT location
    const destLat = 12.9592;
    const destLng = 77.6445;

    const intelligenceResult = await analyzeEmergencyRoutes({
      start: { latitude: currentLat, longitude: currentLng },
      destination: { latitude: destLat, longitude: destLng },
      hospitalName: 'City General Hospital',
      emergencyType: 'CARDIAC',
    });

    const newRoute = intelligenceResult.recommendedRoute;
    const newCoords = newRoute.coordinates || [];

    const updatedJunctions = (intelligenceResult.alternatives[1]?.coordinates ? newRoute.coordinates : sim.junctions).map((j, idx) => {
      if (idx === 0) return { ...j, signalState: 'CLEARED', statusText: 'Vehicle passed — Corridor cleared' };
      return { ...j, signalState: 'EMERGENCY_PRIORITY', statusText: 'Rerouted emergency corridor ACTIVE' };
    });

    sim.junctions = updatedJunctions;

    // Save decision audit
    try {
      await supabase.from('route_decisions').insert({
        trip_id: tripId.startsWith('trip-') ? null : tripId,
        decision_type: 'REROUTE',
        recommended_route_id: newRoute.routeId,
        previous_route_id: 'route-a',
        reason: intelligenceResult.decision.reason || 'Congestion detected ahead. Rerouted to faster arterial bypass.',
        decision_source: intelligenceResult.decision.decisionSource || 'GEMINI_ASSISTED',
        estimated_minutes_saved: intelligenceResult.comparison.estimatedMinutesSaved || 3,
        metadata: {
          previousEtaMinutes: 13,
          newEtaMinutes: 8,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {}

    // Emit Socket events
    try {
      const io = getIO();
      const reroutePayload = {
        tripId,
        previousEtaMinutes: 13,
        newEtaMinutes: 8,
        minutesSaved: intelligenceResult.comparison.estimatedMinutesSaved || 3,
        reason: 'Congestion detected ahead. Faster arterial bypass selected.',
        newRouteCoordinates: newCoords,
        junctions: updatedJunctions,
      };

      io.to(`trip:${tripId}`).emit('mobility:rerouted', reroutePayload);
      io.to('hospitals').emit('mobility:rerouted', reroutePayload);
      io.to('junctions').emit('corridor:recalculated', { tripId, junctions: updatedJunctions });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Congestion disruption triggered and AI reroute executed.',
      reroute: {
        previousEtaMinutes: 13,
        newEtaMinutes: 8,
        minutesSaved: intelligenceResult.comparison.estimatedMinutesSaved || 3,
        recommendedRoute: newRoute,
        decisionSource: intelligenceResult.decision.decisionSource,
      },
    });
  } catch (err) {
    console.error('triggerCongestionDemo error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger congestion simulation',
    });
  }
};

/**
 * POST /api/demo/speed
 */
const setSpeedHandler = async (req, res) => {
  try {
    const { speed } = req.body;
    const newSpeed = setSimulationSpeed(speed);
    res.status(200).json({
      success: true,
      speed: newSpeed,
      message: `Simulation speed set to ${newSpeed}x`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to set simulation speed' });
  }
};

/**
 * POST /api/demo/reset
 */
const resetDemoHandler = async (req, res) => {
  try {
    for (const [tripId] of activeSimulations.entries()) {
      stopSimulation(tripId);
    }

    try {
      await supabase.from('emergency_trips').update({ status: 'CANCELLED' }).eq('status', 'ACTIVE');
      await supabase.from('ambulances').update({ status: 'AVAILABLE', latitude: 12.9352, longitude: 77.6245 });
      await supabase.from('junctions').update({ signal_state: 'NORMAL' });
    } catch (e) {}

    try {
      const io = getIO();
      io.emit('demo:reset', { message: 'Demo environment reset successfully.' });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Demo environment reset successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset demo' });
  }
};

const injectCongestionHandler = async (req, res) => {
  try {
    const { tripId } = req.body || req.params;
    const result = injectTripCongestion(tripId);
    res.status(200).json(result);
  } catch (err) {
    console.error('injectCongestionHandler error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const clearDisruptionHandler = async (req, res) => {
  try {
    const { tripId } = req.body || req.params;
    const result = clearTripDisruption(tripId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear disruption' });
  }
};

module.exports = {
  triggerCongestionDemo,
  injectCongestionHandler,
  clearDisruptionHandler,
  setSpeedHandler,
  resetDemoHandler,
};

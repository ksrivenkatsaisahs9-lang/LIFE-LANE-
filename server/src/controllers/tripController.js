const { z } = require('zod');
const supabase = require('../config/supabase');
const { getRoutePreview } = require('../services/routeService');
const { startTripSimulation, stopSimulation, cancelTripSimulation, activeSimulations } = require('../services/tripSimulationService');
const { getIO } = require('../sockets/socketHandler');

const EMERGENCY_TYPES = ['CARDIAC', 'TRAUMA', 'RESPIRATORY', 'NEUROLOGICAL', 'GENERAL'];

const FALLBACK_HOSPITALS = [
  { id: 'hosp-1', name: 'City General Hospital', address: 'Indiranagar, Bengaluru', latitude: 12.9592, longitude: 77.6445, is_active: true },
  { id: 'hosp-2', name: 'St. Martha Emergency Centre', address: 'Nrupatunga Road, Bengaluru', latitude: 12.9642, longitude: 77.5960, is_active: true },
  { id: 'hosp-3', name: 'Central Medical Centre', address: 'MG Road, Bengaluru', latitude: 12.9716, longitude: 77.5946, is_active: true },
];

const createTripSchema = z.object({
  hospitalId: z.string({ required_error: 'Hospital ID is required' }),
  emergencyType: z.string({ required_error: 'Emergency type is required' }),
  start: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

function normalizeEmergencyType(typeStr) {
  if (!typeStr) return 'GENERAL';
  const upper = typeStr.toUpperCase().trim();
  if (upper.includes('CARDIAC')) return 'CARDIAC';
  if (upper.includes('TRAUMA') || upper.includes('ACCIDENT')) return 'TRAUMA';
  if (upper.includes('RESPIRATORY') || upper.includes('DISTRESS')) return 'RESPIRATORY';
  if (upper.includes('NEURO') || upper.includes('STROKE')) return 'NEUROLOGICAL';
  return 'GENERAL';
}

function sanitizeTrip(t) {
  return {
    id: t.id,
    ambulanceId: t.ambulance_id,
    hospitalId: t.hospital_id,
    emergencyType: t.emergency_type,
    startLatitude: t.start_latitude,
    startLongitude: t.start_longitude,
    currentLatitude: t.current_latitude,
    currentLongitude: t.current_longitude,
    destinationLatitude: t.destination_latitude,
    destinationLongitude: t.destination_longitude,
    status: t.status,
    estimatedDistanceKm: t.estimated_distance_km,
    estimatedDurationMinutes: t.estimated_duration_minutes,
    remainingDistanceKm: t.remaining_distance_km,
    remainingDurationMinutes: t.remaining_duration_minutes,
    routeCoordinates: t.route_coordinates,
    routeIndex: t.route_index,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    createdAt: t.created_at,
  };
}

/**
 * POST /api/trips
 * AMBULANCE role only. Creates and starts an active emergency journey.
 */
const createTrip = async (req, res) => {
  try {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency trip payload',
        errors: parsed.error.errors.map((e) => e.message),
      });
    }

    const { hospitalId, emergencyType: rawType, start } = parsed.data;
    const emergencyType = normalizeEmergencyType(rawType);

    // 1. Get authenticated user's ambulance (with fallback if DB table not yet created)
    let ambulance = null;
    if (!supabase.isOffline) {
      try {
        const { data: ambData } = await supabase
          .from('ambulances')
          .select('*')
          .eq('user_id', req.user.id)
          .maybeSingle();
        ambulance = ambData;
      } catch (e) {}
    }

    if (!ambulance) {
      ambulance = {
        id: 'amb-demo-1042',
        user_id: req.user.id,
        ambulance_code: 'AMB-1042',
        vehicle_number: 'AMB-1042',
        latitude: start.latitude,
        longitude: start.longitude,
        status: 'AVAILABLE',
        is_verified: true,
      };
    }

    // 2. Get destination hospital (with fallback if DB table not yet created)
    let hospital = null;
    if (!supabase.isOffline) {
      try {
        const { data: hospData } = await supabase
          .from('hospitals')
          .select('*')
          .eq('id', hospitalId)
          .maybeSingle();
        hospital = hospData;
      } catch (e) {}
    }

    if (!hospital) {
      hospital = FALLBACK_HOSPITALS.find((h) => h.id === hospitalId) || FALLBACK_HOSPITALS[0];
    }

    // 3. Calculate route preview
    const route = await getRoutePreview(
      start,
      { latitude: hospital.latitude, longitude: hospital.longitude },
      hospital.id
    );

    const now = new Date().toISOString();
    const tripId = `trip-${Date.now()}`;

    let trip = {
      id: tripId,
      ambulance_id: ambulance.id,
      hospital_id: hospital.id,
      emergency_type: emergencyType,
      start_latitude: start.latitude,
      start_longitude: start.longitude,
      current_latitude: start.latitude,
      current_longitude: start.longitude,
      destination_latitude: hospital.latitude,
      destination_longitude: hospital.longitude,
      status: 'ACTIVE',
      estimated_distance_km: route.distanceKm,
      estimated_duration_minutes: route.estimatedMinutes,
      remaining_distance_km: route.distanceKm,
      remaining_duration_minutes: route.estimatedMinutes,
      route_coordinates: route.coordinates,
      route_index: 0,
      started_at: now,
      created_at: now,
    };

    // Attempt DB insert if table exists
    if (!supabase.isOffline) {
      try {
        const { data: insertedTrip } = await supabase
          .from('emergency_trips')
          .insert({
            ambulance_id: ambulance.id,
            hospital_id: hospital.id,
            emergency_type: emergencyType,
            start_latitude: start.latitude,
            start_longitude: start.longitude,
            current_latitude: start.latitude,
            current_longitude: start.longitude,
            destination_latitude: hospital.latitude,
            destination_longitude: hospital.longitude,
            status: 'ACTIVE',
            estimated_distance_km: route.distanceKm,
            estimated_duration_minutes: route.estimatedMinutes,
            remaining_distance_km: route.distanceKm,
            remaining_duration_minutes: route.estimatedMinutes,
            route_coordinates: route.coordinates,
            route_index: 0,
            started_at: now,
          })
          .select()
          .single();

        if (insertedTrip) {
          trip = insertedTrip;
        }
      } catch (e) {}

      // Update ambulance status
      try {
        await supabase
          .from('ambulances')
          .update({ status: 'EN_ROUTE', latitude: start.latitude, longitude: start.longitude })
          .eq('id', ambulance.id);
      } catch (e) {}
    }

    // 4. Start backend simulation in memory & Socket streaming
    const sim = startTripSimulation(trip);

    // 5. Emit Socket events
    try {
      const io = getIO();
      const payload = {
        trip: sanitizeTrip(trip),
        ambulanceCode: ambulance.ambulance_code,
        vehicleNumber: ambulance.vehicle_number,
        hospitalName: hospital.name,
      };
      io.to(`hospital:${hospital.id}`).emit('hospital:incoming', payload);
      io.to('hospitals').emit('hospital:incoming', payload);
      io.to(`trip:${trip.id}`).emit('trip:started', payload);
    } catch (ioErr) {}

    res.status(201).json({
      success: true,
      trip: sanitizeTrip(trip),
      junctions: sim?.junctions || [],
      hospital: {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
      },
    });
  } catch (err) {
    console.error('createTrip error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to start emergency journey',
    });
  }
};

/**
 * GET /api/trips/active
 */
const getActiveTrip = async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'AMBULANCE') {
      if (!supabase.isOffline) {
        try {
          const { data: amb } = await supabase
            .from('ambulances')
            .select('id, ambulance_code, vehicle_number')
            .eq('user_id', req.user.id)
            .maybeSingle();

          if (amb) {
            const { data: trip } = await supabase
              .from('emergency_trips')
              .select('*')
              .eq('ambulance_id', amb.id)
              .eq('status', 'ACTIVE')
              .maybeSingle();

            if (trip) {
              const sim = startTripSimulation(trip);
              const sanitized = sanitizeTrip(trip);
              if (sim) {
                const remSteps = Math.max(0, sim.totalSteps - sim.currentIndex);
                const remSec = Math.round((remSteps * 0.65));
                const remKm = Number(((remSteps * 14) / 1000).toFixed(2));
                sanitized.remainingDistanceKm = remKm;
                sanitized.remainingSeconds = remSec;
                sanitized.remainingDurationMinutes = Math.ceil(remSec / 60);
                sanitized.speedKmH = 78;
                if (sim.currentLatitude) sanitized.currentLatitude = sim.currentLatitude;
                if (sim.currentLongitude) sanitized.currentLongitude = sim.currentLongitude;
              }
              return res.status(200).json({
                success: true,
                activeTrip: sanitized,
                ambulance: amb,
              });
            }
          }
        } catch (e) {}
      }

      // Check in-memory active simulations fallback
      for (const [tripId, sim] of activeSimulations.entries()) {
        if (sim.status !== 'COMPLETED') {
          const remSteps = Math.max(0, sim.totalSteps - sim.currentIndex);
          const remSec = Math.round((remSteps * 0.65));
          const remKm = Number(((remSteps * 14) / 1000).toFixed(2));
          return res.status(200).json({
            success: true,
            activeTrip: {
              id: tripId,
              ambulanceId: sim.ambulanceId,
              hospitalId: sim.hospitalId,
              status: 'ACTIVE',
              currentLatitude: sim.currentLatitude || 12.9352,
              currentLongitude: sim.currentLongitude || 77.6245,
              remainingDistanceKm: remKm,
              remainingSeconds: remSec,
              remainingDurationMinutes: Math.ceil(remSec / 60),
              speedKmH: 78,
              junctions: sim.junctions || [],
            },
          });
        }
      }

      return res.status(200).json({ success: true, activeTrip: null });
    }

    if (role === 'HOSPITAL' || role === 'POLICE') {
      try {
        const { data: trip } = await supabase
          .from('emergency_trips')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (trip) {
          const sim = startTripSimulation(trip);
          const sanitized = sanitizeTrip(trip);
          if (sim) {
            const remSteps = Math.max(0, sim.totalSteps - sim.currentIndex);
            const remSec = Math.round((remSteps * 0.65));
            const remKm = Number(((remSteps * 14) / 1000).toFixed(2));
            sanitized.remainingDistanceKm = remKm;
            sanitized.remainingSeconds = remSec;
            sanitized.remainingDurationMinutes = Math.ceil(remSec / 60);
            sanitized.speedKmH = 78;
            if (sim.currentLatitude) sanitized.currentLatitude = sim.currentLatitude;
            if (sim.currentLongitude) sanitized.currentLongitude = sim.currentLongitude;
          }
          return res.status(200).json({
            success: true,
            activeTrip: sanitized,
          });
        }
      } catch (e) {}

      // Fallback check in-memory active simulations
      for (const [tripId, sim] of activeSimulations.entries()) {
        if (sim.status !== 'COMPLETED') {
          return res.status(200).json({
            success: true,
            activeTrip: {
              id: tripId,
              ambulanceId: sim.ambulanceId,
              hospitalId: sim.hospitalId,
              status: 'ACTIVE',
              currentLatitude: sim.currentLatitude || 12.9352,
              currentLongitude: sim.currentLongitude || 77.6245,
              remainingDistanceKm: sim.remainingDistanceKm || 3.8,
              remainingDurationMinutes: sim.remainingDurationMinutes || 6,
              remainingSeconds: Math.round(((sim.totalSteps - sim.currentIndex) * 0.65)),
              speedKmH: sim.remainingDistanceKm && sim.remainingDurationMinutes ? Math.round(sim.remainingDistanceKm / (sim.remainingDurationMinutes / 60)) : 78,
              junctions: sim.junctions || [],
            },
          });
        }
      }

      return res.status(200).json({ success: true, activeTrip: null });
    }

    res.status(200).json({ success: true, activeTrip: null });
  } catch (err) {
    res.status(200).json({ success: true, activeTrip: null });
  }
};

/**
 * GET /api/trips/:id
 */
const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: trip } = await supabase
      .from('emergency_trips')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    res.status(200).json({
      success: true,
      trip: sanitizeTrip(trip),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve trip' });
  }
};

/**
 * POST /api/trips/:id/complete
 */
const completeTripHandler = async (req, res) => {
  try {
    const { id } = req.params;
    stopSimulation(id);

    try {
      const now = new Date().toISOString();
      await supabase
        .from('emergency_trips')
        .update({ status: 'COMPLETED', completed_at: now, remaining_distance_km: 0 })
        .eq('id', id);
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Trip completed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
  }
};

/**
 * POST /api/demo/reset
 */
const resetDemo = async (req, res) => {
  try {
    for (const [tripId] of activeSimulations.entries()) {
      stopSimulation(tripId);
    }

    try {
      await supabase.from('emergency_trips').update({ status: 'CANCELLED' }).eq('status', 'ACTIVE');
      await supabase.from('ambulances').update({ status: 'AVAILABLE', latitude: 12.9352, longitude: 77.6245 });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Demo environment reset successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset demo environment' });
  }
};

/**
 * POST /api/trips/:id/cancel
 */
const cancelTripHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, customReason } = req.body || {};

    // 1. Map human-readable reason
    let reasonText = 'Activated by mistake';
    if (reason === 'EMERGENCY_NO_LONGER_REQUIRED' || reason === 'Emergency no longer requires transport') {
      reasonText = 'Emergency no longer requires transport';
    } else if (reason === 'DESTINATION_CHANGED' || reason === 'Destination changed') {
      reasonText = 'Destination changed';
    } else if (reason === 'VEHICLE_ISSUE' || reason === 'Vehicle issue') {
      reasonText = 'Vehicle issue';
    } else if (reason === 'OTHER' || reason === 'Other') {
      reasonText = customReason?.trim() || 'Other';
    } else if (typeof reason === 'string' && reason.trim()) {
      reasonText = reason.trim();
    }

    // 2. Execute atomic cancellation
    const cancelPayload = await cancelTripSimulation(id, reasonText, req.user?.id);

    return res.status(200).json({
      success: true,
      message: 'Emergency journey cancelled successfully.',
      tripId: id,
      cancelledAt: cancelPayload?.cancelledAt || new Date().toISOString(),
      reason: reasonText,
    });
  } catch (err) {
    console.error(`Error in cancelTripHandler for ${req.params.id}:`, err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to cancel the emergency journey. Please try again.',
    });
  }
};

module.exports = {
  createTrip,
  getActiveTrip,
  getTripById,
  completeTripHandler,
  cancelTripHandler,
  resetDemo,
};

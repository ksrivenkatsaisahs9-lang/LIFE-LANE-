const { z } = require('zod');
const { getRoutePreview } = require('../services/routeService');

const routePreviewSchema = z.object({
  start: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

/**
 * POST /api/routes/preview
 * AMBULANCE role only
 */
const previewRoute = async (req, res) => {
  try {
    const parsed = routePreviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start or destination coordinates',
      });
    }

    const { start, destination } = parsed.data;
    const route = await getRoutePreview(start, destination);

    res.status(200).json({
      success: true,
      route,
    });
  } catch (err) {
    console.error('previewRoute error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Route preview is currently unavailable.',
    });
  }
};

/**
 * GET /api/v1/events/early-warning
 * Public Emergency Event API for third-party navigation providers (Google Maps, Waze, OEM head units)
 */
const getEarlyWarningEvents = async (req, res) => {
  try {
    const { activeSimulations } = require('../services/tripSimulationService');

    const activeTrip = Array.from(activeSimulations.values())[0];

    if (!activeTrip) {
      return res.status(200).json({
        success: true,
        apiVersion: '1.0.0',
        providerIntegration: 'LifeLane Emergency Event API',
        activeEvents: [],
      });
    }

    res.status(200).json({
      success: true,
      apiVersion: '1.0.0',
      providerIntegration: 'LifeLane Emergency Event API',
      activeEvents: [
        {
          eventId: `evt-${activeTrip.tripId}`,
          emergencyVehicleCode: 'AMB-1042',
          emergencyType: activeTrip.emergencyType || 'CARDIAC',
          currentLatitude: activeTrip.currentLatitude,
          currentLongitude: activeTrip.currentLongitude,
        },
      ],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to query early warning API' });
  }
};

module.exports = { previewRoute, getEarlyWarningEvents };

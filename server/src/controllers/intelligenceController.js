const { z } = require('zod');
const supabase = require('../config/supabase');
const { analyzeEmergencyRoutes } = require('../services/mobilityIntelligenceService');

const FALLBACK_HOSPITALS = [
  { id: 'hosp-1', name: 'City General Hospital', address: 'Indiranagar, Bengaluru', latitude: 12.9592, longitude: 77.6445 },
  { id: 'hosp-2', name: 'St. Martha Emergency Centre', address: 'Nrupatunga Road, Bengaluru', latitude: 12.9642, longitude: 77.5960 },
  { id: 'hosp-3', name: 'Central Medical Centre', address: 'MG Road, Bengaluru', latitude: 12.9716, longitude: 77.5946 },
];

const routeAnalyzeSchema = z.object({
  hospitalId: z.string({ required_error: 'Hospital ID is required' }),
  emergencyType: z.string().optional(),
  start: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

/**
 * POST /api/intelligence/routes
 * Analyzes route alternatives using Mobility Intelligence & Gemini API with fallback
 */
const analyzeRoutesHandler = async (req, res) => {
  try {
    const parsed = routeAnalyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid route analysis payload',
        errors: parsed.error.errors.map((e) => e.message),
      });
    }

    const { hospitalId, emergencyType, start } = parsed.data;

    // Lookup target hospital details
    let hospital = null;
    try {
      const { data } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .maybeSingle();
      hospital = data;
    } catch (e) {}

    if (!hospital) {
      hospital = FALLBACK_HOSPITALS.find((h) => h.id === hospitalId) || FALLBACK_HOSPITALS[0];
    }

    // Call Mobility Intelligence Service
    const intelligenceResult = await analyzeEmergencyRoutes({
      start,
      destination: { latitude: hospital.latitude, longitude: hospital.longitude },
      hospitalName: hospital.name,
      emergencyType: emergencyType || 'CARDIAC',
    });

    res.status(200).json({
      success: true,
      hospital: {
        id: hospital.id,
        name: hospital.name,
      },
      ...intelligenceResult,
    });
  } catch (err) {
    console.error('analyzeRoutesHandler error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze emergency routes',
    });
  }
};

module.exports = { analyzeRoutesHandler };

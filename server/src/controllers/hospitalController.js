const supabase = require('../config/supabase');
const { getAllDemoHospitals, getScenarioByHospitalId } = require('../services/demoScenarioService');

const FALLBACK_HOSPITALS = getAllDemoHospitals();

/**
 * GET /api/hospitals
 * Get all active emergency hospitals with scenario configuration
 */
const getHospitals = async (req, res) => {
  try {
    if (supabase.isOffline) {
      return res.status(200).json({
        success: true,
        hospitals: FALLBACK_HOSPITALS,
      });
    }

    const { data: dbHospitals, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !dbHospitals || dbHospitals.length === 0) {
      return res.status(200).json({
        success: true,
        hospitals: FALLBACK_HOSPITALS,
      });
    }

    const hospitals = dbHospitals.map((h) => {
      const scenario = getScenarioByHospitalId(h.id) || getScenarioByHospitalId(h.name);
      return {
        id: h.id,
        name: h.name,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        emergencyAvailable: h.emergency_available ?? true,
        isActive: h.is_active ?? true,
        scenarioCode: h.scenario_code || scenario?.scenarioCode || 'INTERSECTION_CORRIDOR',
        scenarioTitle: h.scenario_title || scenario?.scenarioTitle || 'Intersection Corridor',
        scenarioDescription: h.scenario_description || scenario?.scenarioDescription || 'Multiple signalized intersections require coordinated emergency passage.',
      };
    });

    res.status(200).json({
      success: true,
      hospitals,
    });
  } catch (err) {
    res.status(200).json({
      success: true,
      hospitals: FALLBACK_HOSPITALS,
    });
  }
};

/**
 * GET /api/hospitals/:id
 * Get single hospital by ID with scenario details
 */
const getHospitalById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: hospital, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !hospital) {
      const fallback = FALLBACK_HOSPITALS.find((h) => String(h.id) === String(id)) || FALLBACK_HOSPITALS[0];
      return res.status(200).json({ success: true, hospital: fallback });
    }

    const scenario = getScenarioByHospitalId(hospital.id);
    res.status(200).json({
      success: true,
      hospital: {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        emergencyAvailable: hospital.emergency_available,
        isActive: hospital.is_active,
        scenarioCode: hospital.scenario_code || scenario?.scenarioCode || 'INTERSECTION_CORRIDOR',
        scenarioTitle: hospital.scenario_title || scenario?.scenarioTitle || 'Intersection Corridor',
        scenarioDescription: hospital.scenario_description || scenario?.scenarioDescription || 'Multiple signalized intersections require coordinated emergency passage.',
      },
    });
  } catch (err) {
    const fallback = FALLBACK_HOSPITALS.find((h) => String(h.id) === String(req.params.id)) || FALLBACK_HOSPITALS[0];
    res.status(200).json({ success: true, hospital: fallback });
  }
};

module.exports = { getHospitals, getHospitalById };

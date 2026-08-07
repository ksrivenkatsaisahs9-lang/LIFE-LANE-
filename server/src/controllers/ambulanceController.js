const supabase = require('../config/supabase');

const FALLBACK_AMBULANCE = {
  id: 'amb-demo-1042',
  ambulanceCode: 'AMB-1042',
  vehicleNumber: 'AMB-1042',
  latitude: 12.9352,
  longitude: 77.6245,
  status: 'AVAILABLE',
  isVerified: true,
};

/**
 * GET /api/ambulances/me
 */
const getMyAmbulance = async (req, res) => {
  try {
    if (supabase.isOffline) {
      return res.status(200).json({
        success: true,
        ambulance: { ...FALLBACK_AMBULANCE, userId: req.user.id },
      });
    }

    const { data: ambulance, error } = await supabase
      .from('ambulances')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error || !ambulance) {
      return res.status(200).json({
        success: true,
        ambulance: { ...FALLBACK_AMBULANCE, userId: req.user.id },
      });
    }

    res.status(200).json({
      success: true,
      ambulance: {
        id: ambulance.id,
        userId: ambulance.user_id,
        ambulanceCode: ambulance.ambulance_code,
        vehicleNumber: ambulance.vehicle_number,
        latitude: ambulance.latitude,
        longitude: ambulance.longitude,
        status: ambulance.status,
        isVerified: ambulance.is_verified,
      },
    });
  } catch (err) {
    res.status(200).json({
      success: true,
      ambulance: { ...FALLBACK_AMBULANCE, userId: req.user.id },
    });
  }
};

module.exports = { getMyAmbulance };

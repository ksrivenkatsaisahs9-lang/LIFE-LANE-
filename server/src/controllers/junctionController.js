const supabase = require('../config/supabase');

const FALLBACK_JUNCTIONS = [
  { id: 'jnc-1', name: 'Junction 01 (Sony World Intersection)', code: 'JNC-A', latitude: 12.9412, longitude: 77.6295, signalState: 'NORMAL', statusText: 'Normal operation', isActive: true },
  { id: 'jnc-2', name: 'Junction 02 (Dairy Circle Intersection)', code: 'JNC-B', latitude: 12.9472, longitude: 77.6345, signalState: 'NORMAL', statusText: 'Normal operation', isActive: true },
  { id: 'jnc-3', name: 'Junction 03 (Richmond Circle Intersection)', code: 'JNC-C', latitude: 12.9532, longitude: 77.6395, signalState: 'NORMAL', statusText: 'Normal operation', isActive: true },
];

/**
 * GET /api/junctions
 */
const getJunctions = async (req, res) => {
  try {
    if (supabase.isOffline) {
      return res.status(200).json({ success: true, junctions: FALLBACK_JUNCTIONS });
    }

    const { data: junctions, error } = await supabase
      .from('junctions')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error || !junctions || junctions.length === 0) {
      return res.status(200).json({
        success: true,
        junctions: FALLBACK_JUNCTIONS,
      });
    }

    res.status(200).json({
      success: true,
      junctions: junctions.map(j => ({
        id: j.id,
        name: j.name,
        code: j.code,
        latitude: j.latitude,
        longitude: j.longitude,
        assignedPoliceUserId: j.assigned_police_user_id,
        signalState: j.signal_state || 'NORMAL',
        isActive: j.is_active,
      })),
    });
  } catch (err) {
    res.status(200).json({ success: true, junctions: FALLBACK_JUNCTIONS });
  }
};

/**
 * GET /api/junctions/me
 */
const getMyJunctions = async (req, res) => {
  try {
    const { data: junctions, error } = await supabase
      .from('junctions')
      .select('*')
      .eq('assigned_police_user_id', req.user.id)
      .eq('is_active', true);

    if (error || !junctions || junctions.length === 0) {
      return res.status(200).json({
        success: true,
        junctions: [FALLBACK_JUNCTIONS[1]], // JNC-B Junction 02
      });
    }

    res.status(200).json({
      success: true,
      junctions: junctions.map(j => ({
        id: j.id,
        name: j.name,
        code: j.code,
        latitude: j.latitude,
        longitude: j.longitude,
        assignedPoliceUserId: j.assigned_police_user_id,
        signalState: j.signal_state || 'NORMAL',
        isActive: j.is_active,
      })),
    });
  } catch (err) {
    res.status(200).json({ success: true, junctions: [FALLBACK_JUNCTIONS[1]] });
  }
};

/**
 * POST /api/junctions/:id/priority
 */
const updateJunctionPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { state } = req.body;

    const newState = state || 'EMERGENCY_PRIORITY';

    try {
      const { getIO } = require('../sockets/socketHandler');
      const io = getIO();
      io.to('junctions').emit('junction:updated', { junctionId: id, signalState: newState });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Junction ${id} priority set to ${newState}`,
      junctionId: id,
      signalState: newState,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getJunctions, getMyJunctions, updateJunctionPriority };

const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { MOCK_USERS } = require('../utils/mockUsers');

/**
 * Authenticate requests via Bearer token.
 * Attaches user (without password_hash) to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    let user = Object.values(MOCK_USERS).find((u) => u.id === decoded.userId) || null;

    if (!user) {
      // Try Supabase with short timeout if not a mock user
      try {
        const supabasePromise = supabase
          .from('users')
          .select('id, name, email, role, phone, organization, badge_id, vehicle_number, hospital_name, hospital_id, is_verified, is_active')
          .eq('id', decoded.userId)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase timeout')), 300)
        );

        const dbRes = await Promise.race([supabasePromise, timeoutPromise]);
        user = dbRes ? dbRes.data : null;
      } catch (e) {
        // DB unavailable or timed out
      }
    }

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Authorize by role(s).
 * Usage: authorizeRoles('POLICE', 'HOSPITAL')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toUpperCase();
    const allowedRoles = roles.map((r) => r.toUpperCase());
    if (!req.user || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions',
      });
    }
    next();
  };
};

module.exports = { authenticate, authorizeRoles };

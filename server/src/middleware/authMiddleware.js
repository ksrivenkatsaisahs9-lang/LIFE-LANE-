const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

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

    // Try query with hospital_id first; if column missing, fallback to standard fields
    let { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, organization, badge_id, vehicle_number, hospital_name, hospital_id, is_verified, is_active')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (error && error.code === '42703') {
      // Column hospital_id does not exist yet -> fallback select
      const fallback = await supabase
        .from('users')
        .select('id, name, email, role, phone, organization, badge_id, vehicle_number, hospital_name, is_verified, is_active')
        .eq('id', decoded.userId)
        .maybeSingle();
      user = fallback.data;
      error = fallback.error;
    }

    if (error || !user || !user.is_active) {
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

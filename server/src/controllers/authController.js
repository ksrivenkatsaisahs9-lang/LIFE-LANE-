const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const { registerSchema, loginSchema } = require('../utils/validators');
const { MOCK_USERS } = require('../utils/mockUsers');

/**
 * Format a user row for API responses — never return password_hash.
 */
function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    organization: row.organization,
    badgeId: row.badge_id,
    vehicleNumber: row.vehicle_number,
    hospitalName: row.hospital_name,
    hospitalId: row.hospital_id,
    isVerified: row.is_verified,
    isActive: row.is_active,
  };
}

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const { name, email, password, role, phone, organization, badgeId, vehicleNumber, hospitalName } = parsed.data;

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        role,
        phone: phone || null,
        organization: organization || null,
        badge_id: badgeId || null,
        vehicle_number: vehicleNumber || null,
        hospital_name: hospitalName || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Register insert error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const { email, password } = parsed.data;

    // Fast path for demo accounts
    const mockUser = MOCK_USERS[email.toLowerCase()];
    if (mockUser) {
      const token = jwt.sign(
        { userId: mockUser.id, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      return res.status(200).json({
        success: true,
        token,
        user: sanitizeUser(mockUser),
      });
    }

    let user = null;
    let fetchError = null;

    try {
      const dbRes = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      user = dbRes.data;
      fetchError = dbRes.error;
    } catch (e) {
      fetchError = e;
    }

    if (fetchError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    let user = null;
    try {
      const dbRes = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();
      user = dbRes.data;
    } catch (e) {
      // ignore
    }

    if (!user) {
      user = req.user || Object.values(MOCK_USERS).find((u) => u.id === req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
    });
  }
};

module.exports = { register, login, getMe };


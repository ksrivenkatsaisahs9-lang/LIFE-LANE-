const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const { registerSchema, loginSchema } = require('../utils/validators');
const { MOCK_USERS } = require('../utils/mockUsers');

/**
 * Format a user row for API responses — never return password_hash.
 */
function sanitizeUser(row) {
  const defaultArea = row.role === 'AMBULANCE'
    ? 'Koramangala, Bengaluru'
    : row.role === 'POLICE'
    ? 'Richmond Circle, Bengaluru'
    : 'Indiranagar, Bengaluru';

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    area: row.area || row.organization || defaultArea,
    phone: row.phone,
    organization: row.organization,
    badgeId: row.badge_id || row.badgeId,
    vehicleNumber: row.vehicle_number || row.vehicleNumber,
    hospitalName: row.hospital_name || row.hospitalName,
    hospitalId: row.hospital_id || row.hospitalId,
    isVerified: row.is_verified ?? true,
    isActive: row.is_active ?? true,
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

    const { name, email, password, role, area, phone, organization, badgeId, vehicleNumber, hospitalName } = parsed.data;

    // Check if user already exists in DB
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

    // Insert user into Database
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        role,
        area: area || organization || null,
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
        message: 'Registration failed: ' + error.message,
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

    let user = null;
    let fetchError = null;

    // 1. Query Supabase database for the user
    try {
      const dbRes = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      user = dbRes.data;
      fetchError = dbRes.error;
    } catch (e) {
      fetchError = e;
    }

    // 2. If user is not yet in Supabase DB, check initialized system accounts
    if (!user) {
      const systemUser = MOCK_USERS[email.toLowerCase()];
      if (systemUser) {
        user = systemUser;
        // Auto-seed system user into DB if possible
        try {
          await supabase.from('users').insert({
            id: systemUser.id,
            name: systemUser.name,
            email: systemUser.email,
            password_hash: systemUser.password_hash,
            role: systemUser.role,
            area: systemUser.area,
            phone: systemUser.phone,
            vehicle_number: systemUser.vehicle_number || null,
            badge_id: systemUser.badge_id || null,
            hospital_name: systemUser.hospital_name || null,
            hospital_id: systemUser.hospital_id || null,
            is_verified: true,
            is_active: true,
          });
        } catch (seedErr) {
          // Ignore RLS or DB duplicate errors
        }
      } else {
        // 3. For any new custom email (e.g. user@gmail.com), auto-create DB account
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const emailLower = email.toLowerCase();
        
        let role = 'AMBULANCE';
        let area = 'Koramangala, Bengaluru';
        if (emailLower.includes('police')) {
          role = 'POLICE';
          area = 'Richmond Circle, Bengaluru';
        } else if (emailLower.includes('hospital') || emailLower.includes('desk') || emailLower.includes('doctor')) {
          role = 'HOSPITAL';
          area = 'Indiranagar, Bengaluru';
        }

        const newUserPayload = {
          name: email.split('@')[0],
          email: emailLower,
          password_hash: passwordHash,
          role,
          area,
          is_verified: true,
          is_active: true,
        };

        try {
          const { data: createdUser } = await supabase
            .from('users')
            .insert(newUserPayload)
            .select()
            .single();

          user = createdUser || {
            id: require('crypto').randomUUID(),
            ...newUserPayload,
          };
        } catch (e) {
          user = {
            id: require('crypto').randomUUID(),
            ...newUserPayload,
          };
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // 3. Verify password hash using bcrypt
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


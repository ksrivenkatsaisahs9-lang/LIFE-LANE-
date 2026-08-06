const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(['AMBULANCE', 'POLICE', 'HOSPITAL'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be AMBULANCE, POLICE, or HOSPITAL',
  }),
  phone: z.string().optional(),
  organization: z.string().optional(),
  badgeId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  hospitalName: z.string().optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'dummy_key';

const isOffline = !process.env.SUPABASE_URL || (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY);

if (isOffline) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SECRET_KEY missing in .env - running in instant offline mode.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
supabase.isOffline = isOffline;

module.exports = supabase;


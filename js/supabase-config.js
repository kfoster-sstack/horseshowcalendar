/* ===================================================================
   HorseShowCalendar — Supabase Configuration
   ----------------------------------------------------------------------
   Steps to wire up:
   1. Create a new project at https://supabase.com (free tier is fine)
   2. Settings > API > copy "Project URL" and "anon public" key
   3. Paste below
   4. Open Supabase SQL Editor and run sql/migration.sql
   5. Optionally seed sample data with sql/seed.sql
   ================================================================== */

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Optional Stripe publishable key (pk_test_... / pk_live_...). Leave empty
// to use the on-site/check payment flows only.
const STRIPE_PUBLISHABLE_KEY = '';

// Initialize Supabase client (loaded from CDN in HTML)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

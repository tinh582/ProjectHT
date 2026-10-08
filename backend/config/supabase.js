import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function createClients(env = process.env) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = env;
  if (!url || !anonKey || !serviceKey) {
    throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in backend/.env. See README.md.');
  }
  return {
    db: createClient(url, serviceKey, options),
    // A client that signs in must never be shared between requests.
    createAuthClient: () => createClient(url, anonKey, options),
  };
}

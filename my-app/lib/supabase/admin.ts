import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { assertServiceRoleEnv, supabaseServiceRoleKey, supabaseUrl } from './env';

export function createAdminClient() {
  assertServiceRoleEnv();

  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

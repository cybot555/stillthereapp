'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from './env';

let browserClient: SupabaseClient<Database> | null = null;

export function createClient() {
  assertSupabaseEnv();

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
  }

  return browserClient;
}

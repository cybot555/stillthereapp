import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/database';
import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from './env';

export function createClient() {
  assertSupabaseEnv();

  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // cookies can only be set in Route Handlers and Server Actions
        }
      }
    }
  });
}

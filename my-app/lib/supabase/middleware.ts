import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/lib/types/database';
import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from './env';

export async function updateSession(request: NextRequest) {
  assertSupabaseEnv();

  let supabaseResponse = NextResponse.next({
    request
  });

  const supabase = createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));

        supabaseResponse = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const authOnlyPaths = ['/dashboard', '/history', '/attended', '/profile'];

  if (authOnlyPaths.some((path) => pathname.startsWith(path)) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname.startsWith('/login') || pathname.startsWith('/signup')) && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

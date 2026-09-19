import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Guard for /api/admin/* routes. Returns null when the request comes from the signed-in
// admin, otherwise a ready-made error response for the route to return immediately:
//   const denied = await requireAdmin();
//   if (denied) return denied;
//
// The browser client keeps the Supabase session in cookies, so same-origin fetches from the
// admin pages carry it automatically. getUser() re-validates the token with Supabase (unlike
// getSession(), which only decodes the cookie). "Admin" = the email in NEXT_PUBLIC_ADMIN_EMAIL,
// the same rule the /admin layout uses. Anything unexpected fails closed.
export async function requireAdmin() {
  try {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Unauthorized — please sign in again.' }, { status: 401 });
    }
    if (!adminEmail || data.user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

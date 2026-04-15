import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — IMPORTANT: do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protect all /dashboard/* routes ──────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    // Fetch user role for all dashboard requests
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'student'

    // Root /dashboard → redirect to role-specific dashboard
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const dest = request.nextUrl.clone()
      dest.pathname = `/dashboard/${role}`
      return NextResponse.redirect(dest)
    }

    // Protect admin routes from non-admins
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      const dest = request.nextUrl.clone()
      dest.pathname = `/dashboard/${role}`
      return NextResponse.redirect(dest)
    }

    // Protect staff routes from non-staff
    if (pathname.startsWith('/dashboard/staff') && role !== 'staff') {
      const dest = request.nextUrl.clone()
      dest.pathname = `/dashboard/${role}`
      return NextResponse.redirect(dest)
    }

    // Protect student routes from non-students
    if (pathname.startsWith('/dashboard/student') && role !== 'student') {
      const dest = request.nextUrl.clone()
      dest.pathname = `/dashboard/${role}`
      return NextResponse.redirect(dest)
    }

    return supabaseResponse
  }

  // ── Redirect already-authenticated users away from auth pages ────────────
  if ((pathname === '/login' || pathname === '/register') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role ?? 'student'
    const dest = request.nextUrl.clone()
    dest.pathname = `/dashboard/${role}`
    return NextResponse.redirect(dest)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

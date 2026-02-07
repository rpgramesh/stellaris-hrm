import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') || 
     request.nextUrl.pathname.startsWith('/self-service') ||
     request.nextUrl.pathname.startsWith('/change-password'))
  ) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect logged-in users away from login page
  if (user && request.nextUrl.pathname === '/') {
    // We could redirect to dashboard, but we need to know role.
    // Since we don't have role here easily without DB query (which we should avoid in middleware if possible, or use metadata),
    // we will let the page handle it or just allow access to login page but maybe redirect if they try to login again?
    // For now, let's NOT redirect from / automatically, as the user might want to switch tabs (Admin/Employee).
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/self-service/:path*',
    '/change-password/:path*',
    '/', // Match root to refresh session if needed, though mostly for protected routes
  ],
}

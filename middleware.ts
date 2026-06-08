import { NextRequest, NextResponse } from 'next/server'

const SECRET_KEY = 'zeika2024'
const COOKIE     = 'zeika_access'

export function middleware(req: NextRequest) {
  const { pathname, searchParams, origin } = req.nextUrl

  // Skip middleware entirely in development
  if (process.env.NODE_ENV === 'development') return NextResponse.next()

  // Always allow static files, API routes, auth pages and Supabase callback
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/fotos') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/stickers') ||
    pathname.startsWith('/fondos') ||
    pathname.startsWith('/texturas') ||
    pathname.startsWith('/ilus') ||
    pathname.startsWith('/js') ||
    pathname === '/coming-soon' ||
    pathname === '/login' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/nuevo') ||
    pathname.startsWith('/mis-proyectos') ||
    pathname.startsWith('/orden') ||
    pathname.startsWith('/preview') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|mp4|webp|gif)$/)
  ) {
    return NextResponse.next()
  }

  // If URL has the key, set cookie and redirect (removes key from URL)
  if (searchParams.get('k') === SECRET_KEY) {
    const url = req.nextUrl.clone()
    url.searchParams.delete('k')
    const res = NextResponse.redirect(url)
    res.cookies.set(COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 30, // 30 días
      path:     '/',
    })
    return res
  }

  // If cookie is set, allow through
  if (req.cookies.get(COOKIE)?.value === '1') {
    return NextResponse.next()
  }

  // Otherwise redirect to coming soon
  return NextResponse.redirect(`${origin}/coming-soon`)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

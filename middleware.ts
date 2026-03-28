import { type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create the base i18n middleware
const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  // First, apply i18n routing
  const intlResponse = intlMiddleware(request)
  
  // Check if the request is for a protected route (authenticated routes)
  const pathname = request.nextUrl.pathname
  
  // Extract locale from pathname
  const locale = routing.locales.find(l => pathname.startsWith(`/${l}`)) || routing.defaultLocale
  const pathWithoutLocale = pathname.replace(`/${locale}`, '')
  
  // Define protected route prefixes
  const protectedRoutes = ['/dashboard', '/settings', '/silos', '/sensors', '/analytics']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathWithoutLocale.startsWith(route)
  )
  
  // If not a protected route, return the i18n middleware response
  if (!isProtectedRoute) {
    return intlResponse
  }

  // For protected routes, verify Supabase session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return intlResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          let response = intlResponse
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          return response
        },
      },
    }
  )

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not authenticated, redirect to login
  if (!user) {
    const redirectUrl = new URL(`/${locale}/auth/login`, request.url)
    redirectUrl.searchParams.set('redirect_to', pathname)
    return intlResponse.redirect(redirectUrl)
  }

  return intlResponse
}

export const config = { 
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};


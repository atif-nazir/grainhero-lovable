import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First, handle localization (redirects/locale detection)
  const response = await intlMiddleware(request);

  // Then, handle Supabase session updating while passing the existing response
  return await updateSession(request, response);
}

export const config = {
  matcher: [
    // Ignore internal paths and static files
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

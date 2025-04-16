// Path: src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import log from '@/lib/logs/logger';

// Tipos locais para o payload esperado do JWT
interface CustomJWTPayload {
  userId: string;
  email: string;
  role: string; // Manter como string aqui, pois a validação de enum é feita no backend
  profileCompleted?: boolean; // Flag to check if profile is completed
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

// Funções auxiliares
async function verifyToken(token: string): Promise<CustomJWTPayload | null> {
  if (!JWT_SECRET) {
    log.error('JWT_SECRET environment variable is not set in middleware');
    return null;
  }
  
  log.debug('Verifying token in middleware', { 
    tokenLength: token.length, 
    secretLength: JWT_SECRET.length,
    secretPrefix: JWT_SECRET.substring(0, 4) + '...' 
  });
  
  try {
    const { payload } = await jwtVerify<CustomJWTPayload>(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    
    log.debug('Token verification successful', { 
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      profileCompleted: payload.profileCompleted
    });
    
    return payload;
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.warn('JWT verification failed in middleware', { error: error.message });
    } else {
      log.warn('JWT verification failed in middleware', { error: String(error) });
    }
    return null;
  }
}

function isProtectedRoute(pathname: string, protectedPaths: string[]): boolean {
  return protectedPaths.some((path) => pathname.startsWith(path));
}

// Verificar se o usuário tem permissão para acessar a rota com base no papel
function hasRoleAccess(role: string, pathname: string): boolean {
  if (!role) return false;
  
  // Rotas de admin
  if (pathname.startsWith('/admin/')) {
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ADMIN_STAFF';
  }
  
  // Rotas de cliente
  if (pathname.startsWith('/cliente/')) {
    return role === 'CUSTOMER';
  }
  
  // Rotas de locador
  if (pathname.startsWith('/locador/')) {
    return role === 'ENERGY_RENTER';
  }
  
  // Para rotas genéricas, como /dashboard que é apenas redirecionamento
  return true;
}

// Check if path should bypass profile completion check
function isProfileCompletionExempt(pathname: string): boolean {
  // List of paths that can be accessed even without completed profile
  const exemptPaths = [
    '/api/auth/fill-profile',
    '/api/auth/logout',
    '/api/auth/settings', // Allow settings access
    '/admin/dashboard', // Admin dashboard is exempt
    '/admin', // All admin routes are exempt
    '/unauthorized',
    '/404',
    '/500'
  ];
  
  const isExempt = exemptPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  // Log para depuração da isenção de verificação de perfil
  if (isExempt) {
    log.debug('Path is exempt from profile completion check', { pathname });
  }
  
  return isExempt;
}

// Middleware principal
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  log.debug('Middleware processing request', { 
    pathname,
    method: request.method,
    isApiRoute: pathname.startsWith('/api/')
  });
  
  // Debug: Verificar o token na requisição (remover em produção)
  const tokenCookie = request.cookies.get('auth_token')?.value;
  const authHeader = request.headers.get('authorization');
  
  // Get token from either cookie or authorization header
  let token = tokenCookie;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    log.debug('Using token from Authorization header instead of cookie', { 
      tokenLength: token.length,
      pathname
    });
  }
  
  if (token) {
    log.debug('Auth token found', { 
      source: tokenCookie ? 'cookie' : 'header',
      tokenLength: token.length,
      pathname
    });
  } else {
    log.debug('No auth token found in cookies or headers', { pathname });
  }
  

  // Rotas protegidas do App Router
  const protectedAppPaths = [
    '/dashboard', 
    '/invite',
    '/admin',
    '/cliente',
    '/locador'
  ]; 
  
  // API Routes a proteger
  const protectedApiPaths = [
    '/api/invite', 
    '/api/distributors', 
    '/api/installations', 
    '/api/installations/*',
    '/api/help', 
    '/api/notifications',
    '/api/auth/settings',
    '/api/invoices',
    '/api/invoices/stats',
    '/api/invoices/generate',
    '/api/invoices/*'
  ];

  // Rotas de autenticação (redirecionar usuários já logados)
  const authPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/esqueci-senha',
    '/esqueci-senha/:path*'
  ];

  const isAppRoute = !pathname.startsWith('/api/');
  const needsProtection = isProtectedRoute(pathname, isAppRoute ? protectedAppPaths : protectedApiPaths);
  const isAuthPath = authPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));

  // Mais logs para depuração
  log.debug('Route protection analysis', {
    pathname,
    isAppRoute,
    needsProtection,
    isAuthPath
  });

  let userPayload: CustomJWTPayload | null = null;
  if (token) {
    userPayload = await verifyToken(token);
  }

  // ******** FIRST CHECK: Profile completion needed ********
  // Do this check before any redirects to dashboard - redirect to profile completion page if needed
  if (userPayload && userPayload.profileCompleted === false && !isProfileCompletionExempt(pathname)) {
    const isAdminUser = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_STAFF'].includes(userPayload.role);
    
    // Skip profile completion redirect for admin users
    if (isAdminUser) {
      log.info('Admin user detected - bypassing profile completion requirement', { 
        userId: userPayload.userId,
        role: userPayload.role,
        currentPath: pathname
      });
    }
    else if (pathname !== '/completar-perfil') {
      log.info('User profile not completed, redirecting to profile completion page', { 
        userId: userPayload.userId,
        currentPath: pathname,
        profileCompletedValue: userPayload.profileCompleted
      });
      
      const profileUrl = new URL('/completar-perfil', request.url);
      
      // Log adicional para depuração do redirecionamento
      log.debug('Redirecting to profile completion page', {
        from: pathname,
        to: profileUrl.toString(),
        isApiRoute: pathname.startsWith('/api/'),
        method: request.method
      });
      
      // Se for uma rota de API, retornar um erro JSON em vez de redirecionar
      if (pathname.startsWith('/api/')) {
        log.debug('API route accessed without completed profile, returning 403 error');
        return NextResponse.json({
          error: 'Profile not completed',
          message: 'Please complete your profile before accessing this resource',
          redirectTo: '/completar-perfil'
        }, { status: 403 });
      }
      
      return NextResponse.redirect(profileUrl);
    }
  }

  // Redirecionar usuários autenticados para fora das páginas de auth
  if (isAuthPath && userPayload) {
    log.info('Already authenticated user trying to access auth page, redirecting to dashboard', { 
      userId: userPayload.userId,
      path: pathname
    });
    
    // Redirecionar com base no papel do usuário
    let redirectUrl;
    if (userPayload.role === 'SUPER_ADMIN' || userPayload.role === 'ADMIN' || userPayload.role === 'ADMIN_STAFF') {
      redirectUrl = new URL('/admin/dashboard', request.url);
    } else if (userPayload.role === 'CUSTOMER') {
      redirectUrl = new URL('/cliente/dashboard', request.url);
    } else if (userPayload.role === 'ENERGY_RENTER') {
      redirectUrl = new URL('/locador/dashboard', request.url);
    } else {
      redirectUrl = new URL('/dashboard', request.url);
    }
    
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Lógica de Proteção de Rotas
  if (needsProtection) {
    // Verificar se o usuário tem token válido
    if (!userPayload) {
      log.warn('Access denied to protected route (no valid token)', { pathname });
      
      // Se for uma rota de API, retornar 401 em vez de redirecionar
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({
          error: 'Unauthorized',
          message: 'Authentication required to access this resource'
        }, { status: 401 });
      }
      
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verificar se o usuário tem o papel correto para acessar a rota
    if (!hasRoleAccess(userPayload.role, pathname)) {
      log.warn('Access denied to protected route (insufficient permissions)', { 
        pathname, 
        userRole: userPayload.role 
      });
      
      // Se for uma rota de API, retornar 403 em vez de redirecionar
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        }, { status: 403 });
      }
      
      // Redirecionar para a página de não autorizado com informação sobre a URL original
      const unauthorizedUrl = new URL('/unauthorized', request.url);
      // Adicionar a URL original como query parameter para permitir o botão "voltar"
      unauthorizedUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 2. Adicionar Headers de Usuário às Requests de API
  const requestHeaders = new Headers(request.headers);
  if (pathname.startsWith('/api/') && userPayload) {
    log.debug('Setting user headers for API request', { 
      userId: userPayload.userId,
      userEmail: userPayload.email,
      userRole: userPayload.role,
      pathname
    });
    
    requestHeaders.set('x-user-id', userPayload.userId);
    requestHeaders.set('x-user-email', userPayload.email);
    requestHeaders.set('x-user-role', userPayload.role);
    
    // Use the token from wherever we found it (cookie or header)
    requestHeaders.set('Authorization', `Bearer ${token}`);
    
    log.debug('User headers set for API request', { 
      headers: {
        'x-user-id': userPayload.userId,
        'x-user-email': userPayload.email,
        'x-user-role': userPayload.role
      }
    });
  }

  // Log final de saída do middleware
  log.debug('Middleware processing complete', { 
    pathname,
    allowed: true
  });

  // Permitir a requisição prosseguir com os headers (modificados ou não)
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configuração do Matcher para o Middleware
export const config = {
  matcher: [
    // Aplicar a todas as rotas exceto arquivos estáticos, _next, e favicon
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Incluir explicitamente as rotas de API que precisam de proteção ou headers
    '/api/invite/:path*', 
    '/api/distributors/:path*',
    '/api/installations/:path*',
    '/api/help/:path*', // Proteger todas as sub-rotas de /api/help
    '/api/notifications/:path*', // Proteger todas as sub-rotas de /api/notifications
    '/api/auth/settings/:path*', // Proteger as configurações de autenticação
    '/api/invoices/:path*',
    '/api/invoices/stats/:path*',
    '/api/invoices/generate/:path*',
  ],
}; 
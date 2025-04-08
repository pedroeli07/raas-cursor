// Path: src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import log from '@/lib/logs/logger';

// Tipos locais para o payload esperado do JWT
interface CustomJWTPayload {
  userId: string;
  email: string;
  role: string; // Manter como string aqui, pois a validação de enum é feita no backend
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
  try {
    const { payload } = await jwtVerify<CustomJWTPayload>(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
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

// Middleware principal
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Debug: Verificar o token na requisição (remover em produção)
  const tokenCookie = request.cookies.get('auth_token')?.value;
  if (tokenCookie) {
    log.debug('Auth token found in cookie', { 
      tokenLength: tokenCookie.length,
      pathname
    });
  } else {
    log.debug('No auth token in cookies', { pathname });
  }
  
  const token = tokenCookie;

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
    '/api/help', 
    '/api/notifications',
    '/api/auth/settings'
  ];

  // Rotas de autenticação (redirecionar usuários já logados)
  const authPaths = [
    '/login',
    '/register',
    '/forgot-password'
  ];

  const isAppRoute = !pathname.startsWith('/api/');
  const needsProtection = isProtectedRoute(pathname, isAppRoute ? protectedAppPaths : protectedApiPaths);
  const isAuthPath = authPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));

  let userPayload: CustomJWTPayload | null = null;
  if (token) {
    userPayload = await verifyToken(token);
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
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verificar se o usuário tem o papel correto para acessar a rota
    if (!hasRoleAccess(userPayload.role, pathname)) {
      log.warn('Access denied to protected route (insufficient permissions)', { 
        pathname, 
        userRole: userPayload.role 
      });
      
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
    requestHeaders.set('x-user-id', userPayload.userId);
    requestHeaders.set('x-user-email', userPayload.email);
    requestHeaders.set('x-user-role', userPayload.role);
    requestHeaders.set('Authorization', `Bearer ${token}`); // Garantir que o header Authorization esteja presente
  }

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
  ],
}; 
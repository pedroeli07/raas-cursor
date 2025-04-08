import { NextResponse } from 'next/server';
import log from '@/lib/logs/logger';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

export async function POST() {
  try {
    // Criar uma resposta
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logout realizado com sucesso'
    });
    
    // Limpar o cookie de autenticação
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: '',
      expires: new Date(0), // Data no passado para expirar imediatamente
      path: '/',
    });
    
    log.info('User logged out successfully');
    
    return response;
  } catch (error) {
    log.error('Error during logout', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao realizar logout' 
      },
      { status: 500 }
    );
  }
} 
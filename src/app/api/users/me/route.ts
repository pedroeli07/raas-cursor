import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/db';
import logger from '@/lib/logger';

const userLogger = logger.child({ module: 'api:users:me' });
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function GET() {
  userLogger.info('Processando requisição GET para /api/users/me');
  
  // Obter headers
  const headersList = await headers();
  const authorization = headersList.get('authorization');
  
  if (!authorization) {
    userLogger.warn('Token não fornecido no header authorization');
    return NextResponse.json(
      { error: 'Não autorizado. Token JWT não fornecido.' },
      { status: 401 }
    );
  }

  // Extrair o token (formato: "Bearer TOKEN")
  const token = authorization.split(' ')[1];
  if (!token) {
    userLogger.warn('Token não encontrado no formato Bearer');
    return NextResponse.json(
      { error: 'Não autorizado. Formato do token inválido.' },
      { status: 401 }
    );
  }

  try {
    // Verificar e decodificar o token
    userLogger.debug('Decodificando token JWT');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    if (!decoded.id) {
      userLogger.warn('ID do usuário não encontrado no token decodificado');
      return NextResponse.json(
        { error: 'Token inválido. ID do usuário não encontrado.' },
        { status: 401 }
      );
    }

    // Buscar usuário pelo ID
    userLogger.debug(`Buscando usuário com ID: ${decoded.id}`);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      userLogger.warn(`Usuário com ID ${decoded.id} não encontrado no banco de dados`);
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      );
    }

    // Retornar dados do usuário
    userLogger.info(`Usuário encontrado: ${user.id}`);
    return NextResponse.json({ user });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      userLogger.error('Erro ao verificar token JWT', { error: error.message });
      return NextResponse.json(
        { error: 'Token inválido ou expirado.' },
        { status: 401 }
      );
    }
    
    userLogger.error('Erro interno ao processar requisição', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
} 
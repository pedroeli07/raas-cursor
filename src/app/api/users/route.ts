import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role } from '@prisma/client';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roles = searchParams.get('roles');
    
    // Filtro de roles se especificado
    const rolesFilter = roles ? roles.split(',') : undefined;
    
    // Obter usuários filtrados por papel
    const users = await prisma.user.findMany({
      where: {
        role: rolesFilter ? { in: rolesFilter as Role[] } : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    log.info('Usuários listados com sucesso', { count: users.length });
    
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    log.error('Erro ao listar usuários', { error });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao listar usuários',
      },
      { status: 500 }
    );
  }
} 
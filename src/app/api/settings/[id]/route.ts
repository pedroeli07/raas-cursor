import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

// Importar funções de permissão do endpoint principal de configurações
import { getPermissionLevel, hasPermission } from '../permissions';

// GET - Buscar configuração específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // Verificar autenticação
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
  
  try {
    const id = params.id;
    
    // Buscar configuração no banco de dados
    const setting = await db.appSettings.findUnique({
      where: { id },
    });
    
    if (!setting) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar permissão para visualizar esta configuração
    const userRole = session.user.role as Role;
    const permLevel = getPermissionLevel(setting.key);
    
    if (!hasPermission(userRole, permLevel)) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta configuração' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(setting);
    
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configuração específica
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // Verificar autenticação
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
  
  try {
    const id = params.id;
    const data = await req.json();
    const { value } = data;
    
    if (value === undefined) {
      return NextResponse.json(
        { error: 'O valor da configuração é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar configuração existente
    const existingSetting = await db.appSettings.findUnique({
      where: { id },
    });
    
    if (!existingSetting) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar permissão para modificar esta configuração
    const userRole = session.user.role as Role;
    const permLevel = getPermissionLevel(existingSetting.key);
    
    if (!hasPermission(userRole, permLevel)) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar esta configuração' },
        { status: 403 }
      );
    }
    
    // Atualizar configuração
    const updatedSetting = await db.appSettings.update({
      where: { id },
      data: {
        value: String(value), // Converter para string já que todos os valores são armazenados como string
        lastUpdatedById: session.user.id,
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json(updatedSetting);
    
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração' },
      { status: 500 }
    );
  }
}

// DELETE - Remover configuração (apenas SUPER_ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // Verificar autenticação e permissão
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
  
  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Apenas super administradores podem excluir configurações' },
      { status: 403 }
    );
  }
  
  try {
    const id = params.id;
    
    // Verificar se a configuração existe
    const setting = await db.appSettings.findUnique({
      where: { id },
    });
    
    if (!setting) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      );
    }
    
    // Algumas configurações críticas não podem ser excluídas
    const criticalSettings = [
      'PRIMARY_ADMIN_EMAIL',
      'DEFAULT_DISCOUNT_RATE',
      'CREDIT_EXPIRATION_MONTHS',
      'PLATFORM_FEE_PERCENTAGE'
    ];
    
    if (criticalSettings.includes(setting.key)) {
      return NextResponse.json(
        { error: 'Esta configuração não pode ser excluída pois é crucial para o funcionamento do sistema' },
        { status: 403 }
      );
    }
    
    // Excluir configuração
    await db.appSettings.delete({
      where: { id },
    });
    
    return NextResponse.json(
      { message: 'Configuração excluída com sucesso' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Erro ao excluir configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir configuração' },
      { status: 500 }
    );
  }
} 
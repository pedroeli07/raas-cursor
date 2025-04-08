import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsManager from '@/components/admin/SettingsManager';

export const metadata: Metadata = {
  title: 'Configurações do Sistema - RaaS Solar',
  description: 'Gerenciar configurações globais do sistema',
};

export default async function SettingsPage() {
  // Verificar autenticação e permissão no servidor
  const session = await getServerSession(authOptions);
  
  // Se não estiver autenticado, redirecionar para login
  if (!session || !session.user) {
    redirect('/login?callbackUrl=/admin/settings');
  }
  
  // Apenas administradores podem acessar esta página
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_STAFF'];
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações globais da plataforma RaaS Solar
        </p>
      </div>
      
      <SettingsManager />
    </div>
  );
} 
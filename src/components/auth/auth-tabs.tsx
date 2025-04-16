'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import { ForgotPasswordForm } from './forgot-password-form';

type AuthTab = 'login' | 'register' | 'forgot-password';

type AuthTabsProps = {
  defaultTab?: AuthTab;
  showAllTabs?: boolean;
};

/**
 * Tabbed authentication component that handles login, register and forgot password forms
 */
export function AuthTabs({ defaultTab = 'login', showAllTabs = true }: AuthTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  // Use provided default tab or override if query param exists
  const initialTab = searchParams.get('tab') as AuthTab || defaultTab;
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as AuthTab);
    
    // Update URL without full page refresh to reflect current tab
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    
    // Keep invitation token if present
    if (token) {
      params.set('token', token);
    } else {
      params.delete('token');
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md space-y-6 p-6 sm:p-8"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {activeTab === 'login' && 'Bem-vindo(a) de volta'}
          {activeTab === 'register' && 'Crie sua conta'}
          {activeTab === 'forgot-password' && 'Recupere sua senha'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeTab === 'login' && 'Faça login para acessar sua conta'}
          {activeTab === 'register' && 'Preencha os dados para criar sua conta'}
          {activeTab === 'forgot-password' && 'Enviaremos instruções para seu email'}
        </p>
      </div>

      <Tabs
        defaultValue={initialTab}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        {showAllTabs && (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Cadastro</TabsTrigger>
            <TabsTrigger value="forgot-password">Recuperar</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="login" className="mt-4">
          <LoginForm />
          
          {!showAllTabs && (
            <div className="mt-4 text-center text-sm">
              <p className="text-muted-foreground">
                Esqueceu sua senha?{' '}
                <Button
                  variant="link"
                  className="p-0 text-primary"
                  onClick={() => handleTabChange('forgot-password')}
                >
                  Recuperar
                </Button>
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <RegisterForm invitationToken={token} />
          
          {!showAllTabs && (
            <div className="mt-4 text-center text-sm">
              <p className="text-muted-foreground">
                Já possui uma conta?{' '}
                <Button
                  variant="link"
                  className="p-0 text-primary"
                  onClick={() => handleTabChange('login')}
                >
                  Fazer login
                </Button>
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forgot-password" className="mt-4">
          <ForgotPasswordForm />
          
          {!showAllTabs && (
            <div className="mt-4 text-center text-sm">
              <p className="text-muted-foreground">
                Lembrou sua senha?{' '}
                <Button
                  variant="link"
                  className="p-0 text-primary"
                  onClick={() => handleTabChange('login')}
                >
                  Voltar ao login
                </Button>
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="text-center text-xs text-muted-foreground">
        <p>
          Ao continuar, você concorda com nossos{' '}
          <a href="/termos" className="underline hover:text-primary">
            Termos de Serviço
          </a>{' '}
          e{' '}
          <a href="/privacidade" className="underline hover:text-primary">
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </motion.div>
  );
} 
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { frontendLog as log } from '@/lib/logs/logger';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthForm } from '@/app/(main)/(auth)/auth-form';
import { HeroColumn } from '@/components/auth/hero-components';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  log.info('Reset password page rendered', { 
    hasToken: !!token,
    hasEmail: !!email
  });

  // If we have a token, we'll implement the actual reset password UI later
  // For now, show a message saying to check email for a reset link
  return (
    <div className="flex min-h-[calc(100vh-15rem)] flex-col md:flex-row">
      {/* Form Column */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex w-full flex-col bg-white/90 p-4 backdrop-blur-sm dark:bg-gray-900/90 md:w-1/2 md:px-8"
      >
        <div className="mx-auto flex w-full max-w-md flex-grow flex-col justify-center">
          {token ? (
            <Card className="border-none bg-transparent shadow-none">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-center text-2xl font-bold">Redefinir Senha</CardTitle>
                <CardDescription className="text-center">
                  Defina uma nova senha para sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Esta funcionalidade está em desenvolvimento. Por favor, use a opção "Esqueci Senha" na página de login.
                  </AlertDescription>
                </Alert>
                <div className="mt-6 text-center">
                  <Button asChild className="w-full">
                    <Link href="/login">Voltar para Login</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-none bg-transparent shadow-none">
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-center text-2xl font-bold">Link Enviado</CardTitle>
                  <CardDescription className="text-center">
                    Verifique seu email para redefinir sua senha
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Enviamos um link de redefinição de senha para o seu email. Por favor, verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                    </AlertDescription>
                  </Alert>
                  <div className="mt-6 text-center">
                    <Button asChild className="w-full">
                      <Link href="/login">Voltar para Login</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Precisa de ajuda? <Link href="/contato" className="text-primary hover:underline">Entre em contato</Link>
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Hero Column - Hidden on mobile */}
      <HeroColumn />
    </div>
  );
} 
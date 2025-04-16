'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { frontendLog as log } from '@/lib/logs/logger';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { HeroColumn } from '@/components/auth/hero-components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verificando seu email...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        log.warn('Email verification attempted without token');
        setStatus('error');
        setMessage('Token de verificação não encontrado.');
        return;
      }

      try {
        log.info('Verifying email with token');
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          log.warn('Email verification failed', { status: response.status });
          setStatus('error');
          setMessage(data.message || 'Falha na verificação do email.');
          return;
        }

        log.info('Email verified successfully');
        setStatus('success');
        setMessage('Email verificado com sucesso!');
        
        // Redirect to login after successful verification
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (err) {
        log.error('Error during email verification', { 
          error: err instanceof Error ? err.message : String(err)
        });
        setStatus('error');
        setMessage('Erro ao verificar email. Tente novamente mais tarde.');
      }
    }

    verifyEmail();
  }, [token, router]);

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
          <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-center text-2xl font-bold">Verificação de Email</CardTitle>
              <CardDescription className="text-center">
                {status === 'verifying' 
                  ? 'Verificando seu endereço de email...' 
                  : status === 'success' 
                    ? 'Email verificado com sucesso!' 
                    : 'Falha na verificação'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status === 'verifying' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    Verificando seu endereço de email...
                  </p>
                </div>
              )}
              
              {status === 'success' && (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {message} Você será redirecionado para a página de login em breve.
                  </AlertDescription>
                </Alert>
              )}
              
              {status === 'error' && (
                <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {message}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-6 text-center">
                <Button asChild className="w-full">
                  <Link href="/login">Ir para Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
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
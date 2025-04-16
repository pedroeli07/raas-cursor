'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { frontendLog as log } from '@/lib/logs/logger';
import { jwtDecode } from "jwt-decode";
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

// Interface para o token decodificado
interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const VerifyTwoFactorPage = () => {
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Get userId from URL
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
      log.debug('Got userId from URL', { userId: userIdFromUrl });
    } else {
      setError('Não foi possível identificar seu usuário. Por favor, tente fazer login novamente.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('ID do usuário não encontrado. Por favor, retorne à página de login.');
      return;
    }
    
    if (!code || code.length < 6) {
      setError('Por favor, insira o código de verificação completo.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      log.debug('Submitting 2FA verification code', { 
        userId, 
        code: process.env.NODE_ENV === 'development' ? code : '******' 
      });
      
      const response = await fetch('/api/auth/verify-two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao verificar o código.');
      }
      
      setVerified(true);
      setMessage('Autenticação bem-sucedida! Você será redirecionado.');
      
      // Save the token to localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        // Também definir o cookie para o middleware
        document.cookie = `auth_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;
        log.info('Two-factor verification successful, token saved');
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
          // Try to get role from token
          try {
            const token = data.token;
            const decoded = jwtDecode(token) as DecodedToken;
            const role = decoded.role;
            
            // Redirect based on role
            if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ADMIN_STAFF') {
              router.push('/admin/dashboard');
            } else if (role === 'CUSTOMER') {
              router.push('/cliente/dashboard');
            } else if (role === 'ENERGY_RENTER') {
              router.push('/locador/dashboard');
            } else {
              router.push('/dashboard');
            }
          } catch (error) {
            // If role can't be determined, go to default dashboard
            router.push('/dashboard');
          }
        }, 2000);
      } else {
        // If no token is returned, go to login page
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      log.error('Error during two-factor verification', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!userId) {
      setError('ID do usuário não encontrado. Por favor, retorne à página de login.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage('Enviando novo código...');
    
    try {
      log.debug('Requesting new 2FA code', { userId });
      
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, type: 'LOGIN' }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao reenviar o código.');
      }
      
      setMessage('Um novo código de verificação foi enviado para seu email.');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      log.error('Error resending 2FA code', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-md"
      >
        <Card className="border-border/40 bg-white/90 shadow-lg backdrop-blur-sm dark:bg-gray-900/90">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl font-bold">Verificação de Dois Fatores</CardTitle>
            <CardDescription className="text-center text-red-500 dark:text-red-400">
              Não foi possível identificar seu usuário. Por favor, retorne à página de login.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild variant="default">
              <Link href="/login">Voltar para o Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-md"
    >
      <Card className="border-border/40 bg-white/90 shadow-lg backdrop-blur-sm dark:bg-gray-900/90">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-2 rounded-full bg-primary/10 p-2 text-primary"
            >
              <ShieldCheck className="h-6 w-6" />
            </motion.div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Verificação de Dois Fatores</CardTitle>
          <CardDescription className="text-center">
            Enviamos um código de verificação para seu email. 
            Por favor, insira o código abaixo para continuar o login.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!verified ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Insira o código de 6 dígitos"
                  className="bg-white text-center text-lg tracking-widest dark:bg-gray-950"
                  disabled={loading || verified}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {message && (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  disabled={loading || verified || code.length < 6}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando...
                    </span>
                  ) : (
                    'Verificar'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={loading || verified}
                  className="w-full"
                >
                  Reenviar Código
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
              >
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Autenticação bem-sucedida!
              </h3>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Você será redirecionado para o dashboard em instantes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VerifyTwoFactorPage; 
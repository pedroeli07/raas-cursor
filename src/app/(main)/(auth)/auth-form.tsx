'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { jwtDecode } from "jwt-decode";
import { frontendLog as log } from '@/lib/logs/logger';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter as useWouterRouter } from 'next/navigation';

// Interface para o token decodificado
interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Schema de validação para o formulário de login
const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  remember: z.boolean().optional(),
});

// Schema de validação para o formulário de registro
const registerSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
}).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema de validação para o formulário de recuperação de senha
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

// Tipos derivados dos schemas
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

// Tipo das props do componente
interface AuthFormProps {
  defaultTab?: "login" | "register" | "esqueci-senha";
  returnTo?: string | null;
  inviteToken?: string | null;
  inviteEmail?: string | null;
}

export function AuthForm({ defaultTab = "login", returnTo, inviteToken, inviteEmail }: AuthFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulário de login
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  // Formulário de registro
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: inviteEmail || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Formulário de recuperação de senha
  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Se o email do convite for fornecido, preencha-o no formulário
  useEffect(() => {
    if (inviteEmail) {
      registerForm.setValue("email", inviteEmail);
    }
  }, [inviteEmail, registerForm]);

  // Lida com a submissão do formulário de login
  const handleLoginSubmit = async (values: LoginValues) => {
    setError(null);
    setLoading(true);

    try {
      log.debug('Submitting login form', { email: values.email });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      log.debug('Login response received', { 
        status: response.status,
        requiresEmailVerification: !!data.requiresEmailVerification,
        requiresTwoFactor: !!data.requiresTwoFactor,
        hasToken: !!data.token,
        message: data.message,
        userId: data.userId
      });

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check if we need to verify email first
      if (data.requiresEmailVerification) {
        log.info('Email verification required', { userId: data.userId });
        // Save userId temporarily for email verification
        if (data.userId) {
          // Redirect to email verification page
          router.push(`/verify-email?userId=${data.userId}`);
          return;
        }
      }

      // Check if we need 2FA
      if (data.requiresTwoFactor) {
        log.info('Two-factor authentication required', { userId: data.userId });
        // Save userId temporarily for 2FA verification
        if (data.userId) {
          // Redirect to 2FA verification page
          router.push(`/verify-two-factor?userId=${data.userId}`);
          return;
        }
      }

      // Se chegamos aqui, é um login normal sem 2FA
      // Save the token to localStorage and cookies
      if (data.token) {
        // Armazenar o token no localStorage
        localStorage.setItem('auth_token', data.token);
        
        // Armazenar o token em um cookie para o middleware
        document.cookie = `auth_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;
        
        log.info('Login successful, token saved', { email: values.email });

        // Decode token to get user role
        try {
          const decoded = jwtDecode<DecodedToken>(data.token);
          const userRole = decoded.role;

          log.info('User authenticated', { 
            userId: decoded.userId,
            role: userRole
          });

          // Redirect based on role and returnTo
          if (returnTo) {
            router.push(returnTo);
          } else if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ADMIN_STAFF') {
            router.push('/admin/dashboard');
          } else if (userRole === 'CUSTOMER') {
            router.push('/cliente/dashboard');
          } else if (userRole === 'ENERGY_RENTER') {
            router.push('/locador/dashboard');
          } else {
            // Fallback para o caso de um papel desconhecido
            router.push('/dashboard');
          }
        } catch (decodeError) {
          log.error('Failed to decode token', { error: decodeError });
          setError("Login successful, but failed to process user role.");
          // Fallback - mantenha na página de login
          router.push('/login');
        }
      } else {
        throw new Error("Token not received from server");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      log.error('Login error', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Lida com a submissão do formulário de registro
  const handleRegisterSubmit = async (values: RegisterValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      log.debug('Submitting registration form', { 
        name: values.name, 
        email: values.email, 
        passwordLength: values.password.length,
        hasInviteToken: !!inviteToken,
        inviteTokenLength: inviteToken?.length,
        inviteTokenPreview: inviteToken ? `${inviteToken.substring(0, 10)}...` : undefined
      });

      // Add invite token if available
      const requestBody = {
        name: values.name,
        email: values.email,
        password: values.password,
        ...(inviteToken && { token: inviteToken }),
      };

      log.debug('Registration request body prepared', {
        keys: Object.keys(requestBody),
        hasToken: 'token' in requestBody,
        tokenLength: requestBody.token?.length,
        tokenPreview: requestBody.token ? `${requestBody.token.substring(0, 10)}...` : undefined
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      log.debug('Registration response received', { 
        status: response.status,
        data: process.env.NODE_ENV === 'development' ? data : undefined,
        requiresVerification: !!data.requiresVerification
      });

      if (!response.ok) {
        if (data.status === 'pending_approval') {
          setSuccess(data.message || 'Solicitação recebida com sucesso.');
          registerForm.reset();
          return;
        }
        throw new Error(data.message || 'Falha no registro.');
      }

      // Registro bem-sucedido, mas requer verificação
      setSuccess('Registro quase concluído! Enviamos um email para você verificar sua conta.');
      
      // Limpar o formulário
      registerForm.reset();
      
      // Se a resposta indica que precisa de verificação e tem ID
      if (data.requiresVerification && data.id) {
        log.info('Redirecting to email verification page', { userId: data.id });
        
        setTimeout(() => {
          router.push(`/verify-email?userId=${data.id}`);
        }, 2000); // Delay para mostrar a mensagem
      } else if (data.token) {
        // Se temos um token, podemos logar diretamente
        localStorage.setItem('auth_token', data.token);
        document.cookie = `auth_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;
        
        setTimeout(() => {
          // Redirect based on user role
          if (data.role === 'SUPER_ADMIN' || data.role === 'ADMIN' || data.role === 'ADMIN_STAFF') {
            router.push('/admin/dashboard');
          } else if (data.role === 'CUSTOMER') {
            router.push('/cliente/dashboard');
          } else if (data.role === 'ENERGY_RENTER') {
            router.push('/locador/dashboard');
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      } else if (data.id && data.role) {
        // Registro bem-sucedido mas sem token - mostramos mensagem de sucesso e redirecionamos para login
        log.info('Registration successful but no auto-login token provided', { 
          userId: data.id, 
          role: data.role 
        });
        
        setSuccess('Registro bem-sucedido! Faça login com suas credenciais.');
        
        // For admins, provide a more specific message
        if (data.role === 'SUPER_ADMIN' || data.role === 'ADMIN' || data.role === 'ADMIN_STAFF') {
          setSuccess('Registro de administrador bem-sucedido! Por favor, faça login para acessar o painel administrativo.');
        }
        
        setTimeout(() => {
          setActiveTab("login");
          router.push('/login', { scroll: false });
        }, 2000);
      } else {
        // Fallback - Algo deu errado, redirecionar para login
        log.warn('Registration successful but missing essential data', { data });
        setError('Ocorreu um problema. Tente fazer login.');
        setTimeout(() => {
          setActiveTab("login");
          router.push('/login', { scroll: false });
        }, 3000);
      }
    } catch (err) {
      log.error('Registration error', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  // Lida com a submissão do formulário de recuperação de senha
  const handleForgotPasswordSubmit = async (values: ForgotPasswordValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      log.debug('Submitting forgot password request', { email: values.email });

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error('Forgot password request failed', {
          status: response.status,
          message: data.message,
        });
        throw new Error(data.message || 'Falha ao solicitar redefinição de senha.');
      }

      log.info('Forgot password request submitted successfully', {
        status: response.status,
      });
      
      setSuccess(
        data.message ||
          'Se um email associado a esta conta existir, um link de redefinição de senha foi enviado.'
      );
      
      forgotPasswordForm.reset();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      log.error('Error during forgot password request', {
        error: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none bg-transparent shadow-none">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <Image
          src="/images/raas-logo.svg"
          alt="RaaS Solar Logo"
          width={180}
          height={60}
          className="h-auto w-auto"
          priority
        />
      </div>
      
      <CardHeader className="space-y-1 pb-2">
        <div className="w-full">
          <div className="grid w-full grid-cols-3">
            <Link 
              href="/login" 
              className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === "login" 
                  ? "bg-emerald-600 text-white" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              } rounded-tl-md rounded-bl-md`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("login");
                router.push('/login', { scroll: false });
              }}
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === "register" 
                  ? "bg-emerald-600 text-white" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("register");
                router.push('/register', { scroll: false });
              }}
            >
              Registrar
            </Link>
            <Link 
              href="/esqueci-senha" 
              className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === "esqueci-senha" 
                  ? "bg-emerald-600 text-white" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              } rounded-tr-md rounded-br-md`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("esqueci-senha");
                router.push('/esqueci-senha', { scroll: false });
              }}
            >
              Esqueci Senha
            </Link>
          </div>

          {activeTab === "login" && (
            <div className="pt-8">
              <CardTitle className="text-center text-2xl font-bold">Bem-vindo(a) de volta</CardTitle>
              <CardDescription className="text-center">
                Entre com suas credenciais para acessar a plataforma
              </CardDescription>
            </div>
          )}

          {activeTab === "register" && (
            <div className="pt-8">
              <CardTitle className="text-center text-2xl font-bold">Criar Conta</CardTitle>
              <CardDescription className="text-center">
                Preencha os dados abaixo para criar sua conta
              </CardDescription>
            </div>
          )}

          {activeTab === "esqueci-senha" && (
            <div className="pt-8">
              <CardTitle className="text-center text-2xl font-bold">Recuperar Senha</CardTitle>
              <CardDescription className="text-center">
                Digite seu email e enviaremos um link para recuperação
              </CardDescription>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-8">
        {/* Login Form */}
        {activeTab === "login" && (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
    <FormField
                control={loginForm.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
                        placeholder="seu@email.com"
              type="email"
              autoComplete="email"
                        className="bg-white dark:bg-gray-950"
                        {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

     <FormField
                control={loginForm.control}
                name="password"
      render={({ field }) => (
        <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveTab("esqueci-senha");
                          router.push('/esqueci-senha');
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
          <FormControl>
                      <Input
              placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        className="bg-white dark:bg-gray-950"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* Register Form */}
        {activeTab === "register" && (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
    <FormField
                control={registerForm.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nome Completo</FormLabel>
          <FormControl>
            <Input
              placeholder="Seu nome completo"
                        className="bg-white dark:bg-gray-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="seu@email.com"
                        type="email"
                        autoComplete="email"
                        className="bg-white dark:bg-gray-950"
                        disabled={!!inviteEmail}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

     <FormField
                control={registerForm.control}
                name="password"
        render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="new-password"
                        className="bg-white dark:bg-gray-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="new-password"
                        className="bg-white dark:bg-gray-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
        <Button
          type="submit"
          className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </span>
                ) : (
                  'Registrar'
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* Forgot Password Form */}
        {activeTab === "esqueci-senha" && (
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="seu@email.com"
                        type="email"
                        autoComplete="email"
                        className="bg-white dark:bg-gray-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>
      </form>
    </Form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pb-0">
        <p className="text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos{' '}
          <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
            Termos de Serviço
          </Link>{' '}
          e{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Política de Privacidade
          </Link>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
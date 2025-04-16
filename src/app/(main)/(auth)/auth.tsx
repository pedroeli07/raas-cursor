'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { frontendLog as log } from '@/lib/logs/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AuthForm } from "@/app/(main)/(auth)/auth-form";
//import { HeroColumn } from "@/components/auth/hero-components";
import { useAuthStore } from "@/store/authStore";

// --- Type Definitions ---
type AuthToken = string;
type UserEmail = string;
type ErrorMessage = string;
// Defines the possible states for the authentication form
type AuthMode = "login" | "register" | "esqueci-senha" | "invite" | "reset";

// --- UI Helper Components ---

// Component to display error messages
function ErrorDisplay({
  message,
  redirectPath,
  buttonText,
}: {
  message: ErrorMessage;
  redirectPath: string;
  buttonText: string;
}) {
  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <div className="flex">
        <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" />
        <div>
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            Erro ao processar solicitação
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {message}
          </p>
          <div className="mt-4">
            <Link href={redirectPath}>
              <Button variant="outline" size="sm">
                {buttonText}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for the header section of forms
function FormHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {subtitle}
      </p>
    </div>
  );
}

// --- Main Auth Page Component ---
export default function AuthPage() {
  // --- State and Hooks ---
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<AuthMode>("login");
  const [token, setToken] = useState<AuthToken>("");
  const [email, setEmail] = useState<UserEmail>("");
  const [error, setError] = useState<ErrorMessage>("");
  const returnTo = searchParams.get('returnTo');

  // --- Side Effects ---

  // Effect to determine the initial authentication mode based on URL
  useEffect(() => {
    determineAuthMode();
  }, [pathname, searchParams]);

  // Effect to redirect already logged-in users
  useEffect(() => {
    if (user) {
      redirectLoggedInUser();
    }
  }, [user, returnTo]);

  // --- Helper Functions ---

  // Determines the auth mode based on URL path and query parameters
  function determineAuthMode() {
    log.info('Determining auth mode', { pathname });
    
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (pathname?.includes("aceitar-convite")) {
      log.info('Handling invite mode', { hasToken: !!tokenParam });
      handleInviteMode(tokenParam, emailParam);
    } else if (pathname?.includes("redefinir-senha")) {
      log.info('Handling reset mode', { hasToken: !!tokenParam });
      handleResetMode(tokenParam);
    } else if (pathname?.includes("registro")) {
      setActiveTab("register");
    } else if (pathname?.includes("esqueci-senha")) {
      setActiveTab("esqueci-senha");
    } else {
      setActiveTab("login");
    }
  }

  // Handles logic for invite links
  function handleInviteMode(tokenParam: string | null, emailParam: string | null) {
    if (!tokenParam) {
      setError(
        "Token de convite inválido ou ausente. Verifique o link ou solicite um novo."
      );
      setActiveTab("login"); // Fallback to login view on error
      return;
    }

    setToken(tokenParam);
    if (emailParam) {
      setEmail(emailParam);
    }
    setActiveTab("invite"); // Set mode specifically to invite
    setError(""); // Clear previous errors
  }

  // Handles logic for password reset links
  function handleResetMode(tokenParam: string | null) {
    if (!tokenParam) {
      setError(
        "Token de redefinição inválido ou ausente. Verifique o link ou solicite um novo."
      );
      setActiveTab("login"); // Fallback to login view on error
      return;
    }

    setToken(tokenParam);
    setActiveTab("reset"); // Set mode specifically to reset
    setError(""); // Clear previous errors
  }

  // Redirects logged-in users to their respective dashboards
  function redirectLoggedInUser() {
    if (!user) return;
    
    // Determine redirect path based on user role
    const isAdmin = ["super_admin", "admin", "admin_staff"].includes(
      user.role,
    );
    const redirectPath = returnTo || (isAdmin ? "/admin" : "/dashboard");

    router.push(redirectPath);
  }

  // --- Sub-Components for Layout ---

  // Component for the form column (left side on desktop)
  function FormColumn({ children }: { children: React.ReactNode }) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full flex-col bg-white/90 px-4 py-8 backdrop-blur-sm dark:bg-gray-900/90 md:w-1/2 md:px-8"
      >
        {/* Centers the form content vertically and horizontally */}
        <div className="mx-auto flex w-full max-w-md flex-grow flex-col justify-center">
          {children}
        </div>
      </motion.div>
    );
  }

  // --- Rendering Logic ---

  // Main function to decide which form view to render
  function renderAuthForm() {
    // Prioritize special modes derived directly from path
    if (activeTab === "invite") {
      return renderInviteForm();
    }
    if (activeTab === "reset") {
      return renderResetForm();
    }
    // Otherwise, render the standard tabbed interface
    return renderTabForm();
  }

  // Renders the form for accepting an invitation
  function renderInviteForm() {
    if (error) {
      return (
        <ErrorDisplay
          message={error}
          redirectPath="/contato" // Or appropriate support path
          buttonText="Contatar Suporte"
        />
      );
    }

    return (
      <div>

        {/* Pass token and email to AuthForm in register mode */}
        <AuthForm 
          defaultTab="register" 
          inviteToken={token} 
          inviteEmail={email}
        />
      </div>
    );
  }

  // Renders the form for confirming password reset
  function renderResetForm() {
    if (error) {
      return (
        <ErrorDisplay
          message={error}
          redirectPath="/esqueci-senha" // Link back to request a new token
          buttonText="Solicitar Novo Link"
        />
      );
    }

    return (
      <div>
        <FormHeader
          title="Redefinir Senha"
          subtitle="Crie uma nova senha segura para sua conta"
        />
        {/* Pass token to AuthForm */}
        <AuthForm defaultTab="esqueci-senha" inviteToken={token} />
      </div>
    );
  }

  // Renders the main tabbed form (Login, Register, Forgot Password)
  function renderTabForm() {
    // --- Tab Styling ---
    // Base classes shared by all triggers
    const baseTriggerClasses =
      "group relative flex-1 rounded-lg border-2 border-primary px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    // Classes for the inactive state (default)
    const inactiveClasses =
      "dark:bg-transparent dark:text-primary shadow-md shadow-primary/30 hover:bg-primary/10 hover:shadow-primary/50 dark:shadow-primary/20 dark:hover:shadow-primary/40";

    // Classes specifically for the active state (using data attribute selector)
    const activeClasses =
      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/50 data-[state=active]:scale-[1.03]";

    // Map the AuthMode to the AuthForm defaultTab
    const mapTabToAuthForm = (tab: AuthMode) => {
      switch (tab) {
        case "login": return "login";
        case "register": return "register";
        case "esqueci-senha": return "esqueci-senha";
        default: return "login";
      }
    };

    return (
      <Tabs
        defaultValue="login"
        value={activeTab}
        onValueChange={(value) => {
          log.info('Tab changed to:', { tab: value });
          setActiveTab(value as AuthMode);
          setError(""); // Clear errors when user manually changes tab
          
          // Map tab value to URL path correctly
          let newPath = "/login";
          if (value === "register") {
            newPath = "/auth/register";
          } else if (value === "esqueci-senha") {
            newPath = "/esqueci-senha";
          }
          
          // Update the URL without causing a full page navigation
          router.push(newPath, { scroll: false });
        }}
        className="w-full"
      >
        {/* Tab List styling */}
        <TabsList className="mb-8 grid w-full grid-cols-3 gap-2 rounded-lg bg-transparent p-1 md:gap-3">
          {/* Login Tab Trigger */}
          <TabsTrigger
            value="login"
            className={`${baseTriggerClasses} ${inactiveClasses} ${activeClasses}`}
          >
            Entrar
          </TabsTrigger>

          {/* Register Tab Trigger */}
          <TabsTrigger
            value="register"
            className={`${baseTriggerClasses} ${inactiveClasses} ${activeClasses}`}
          >
            Registrar
          </TabsTrigger>

          {/* Forgot Password Tab Trigger */}
          <TabsTrigger
            value="esqueci-senha"
            className={`${baseTriggerClasses} ${inactiveClasses} ${activeClasses}`}
          >
            Esqueci a Senha
          </TabsTrigger>
        </TabsList>

        {/* --- Tab Content Panes --- */}
        {/* Login Content */}
        <TabsContent value="login" className="space-y-4 outline-none">
          <FormHeader
            title="Bem-vindo(a) de volta"
            subtitle="Entre com suas credenciais para acessar a plataforma"
          />
          <AuthForm defaultTab="login" returnTo={returnTo} />
        </TabsContent>

        {/* Register Content */}
        <TabsContent value="register" className="space-y-4 outline-none">
          <FormHeader
            title="Criar uma conta"
            subtitle="Registre-se para começar a economizar com energia solar"
          />
          <AuthForm defaultTab="register" />
        </TabsContent>

        {/* Forgot Password Content */}
        <TabsContent value="esqueci-senha" className="space-y-4 outline-none">
          <FormHeader
            title="Esqueceu sua senha?"
            subtitle="Informe seu e-mail para receber instruções de redefinição"
          />
          <AuthForm defaultTab="esqueci-senha" />
        </TabsContent>
      </Tabs>
    );
  }

// --- Hero Column Components (Right side on desktop) ---
// Container for the hero section
function HeroColumn() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative hidden overflow-hidden md:flex md:w-1/2" // Hidden on mobile
    >
      {/* Overlay with gradient and blur */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-600/20 to-indigo-600/30 backdrop-blur-sm dark:from-blue-600/40 dark:to-indigo-600/50"></div>

      <BackgroundEffects />
      <HeroContent />
    </motion.div>
  );
}

// Component for animated background elements
function BackgroundEffects() {
  return (
    <div className="absolute inset-0 z-0">
      {/* Base background color */}
      <div className="absolute inset-0 bg-blue-400/80 dark:bg-emerald-600/70"></div>
      {/* Pattern overlay */}
      <div className="absolute inset-0 h-full w-full bg-[url('/images/solar-pattern.svg')] bg-repeat opacity-10 animate-pulse dark:opacity-20"></div>

      {/* Static blurred shapes */}
      <div className="absolute right-10 top-10 h-24 w-24 animate-pulse rounded-full bg-yellow-400 opacity-30 blur-2xl dark:opacity-40"></div>
      <div className="absolute bottom-20 left-20 h-32 w-32 animate-pulse rounded-full bg-blue-500 opacity-20 blur-3xl dark:opacity-30"></div>

      {/* Animated blurred shapes using framer-motion */}
      <motion.div
        className="absolute -right-4 -top-4 h-40 w-40 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-2xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.div
        className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1,
        }}
      />
    </div>
  );
}

// Component for the main text content in the hero section
function HeroContent() {
  return (
    <div className="relative z-20 flex w-full flex-col justify-center p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="max-w-lg" // Limit width of text content
      >
        <h2 className="mb-6 font-heading text-3xl font-bold text-white drop-shadow-lg">
          Energia Solar Acessível para Todos
        </h2>
        <p className="mb-8 text-lg text-white/80 drop-shadow">
          Conectamos consumidores que querem economizar a usinas solares com
          capacidade disponível. Economize até 20% na sua conta de luz sem
          instalar painéis solares.
        </p>

        <BenefitsCard />
      </motion.div>
    </div>
  );
}

// Component for the card displaying benefits
function BenefitsCard() {
  return (
    <motion.div
      className="rounded-lg border border-white/20 bg-gradient-to-br from-emerald-900/80 via-emerald-900/70 to-emerald-900/0 p-6 shadow-xl backdrop-blur-md"
      whileHover={{ scale: 1.02 }} // Subtle scale effect on hover
      transition={{ type: "spring", stiffness: 400, damping: 17 }} // Spring animation
    >
      <div className="space-y-4 text-white">
        <BenefitItem text="Economia garantida na conta de luz" />
        <BenefitItem text="Sem instalação, sem obras, sem complicação" />
        <BenefitItem text="Contribua para um futuro mais sustentável" /> {/* Updated text */}
      </div>
    </motion.div>
  );
}

// Component for a single benefit item with an icon
function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start">
      {/* Checkmark icon container */}
      <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500/30">
        <svg
          className="h-4 w-4 text-green-300" // Adjusted size and color
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3} // Make checkmark thicker
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <p className="text-sm">{text}</p> {/* Slightly smaller text */}
    </div>
  );
}


  // --- Main Component Render ---

  // If user is already logged in, don't render the auth page (redirect handled by useEffect)
  if (user) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  }



  // Render the main layout with Form and Hero columns
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 md:flex-row">
      <FormColumn>{renderAuthForm()}</FormColumn>
      <HeroColumn /> 
    </div>
  );
}



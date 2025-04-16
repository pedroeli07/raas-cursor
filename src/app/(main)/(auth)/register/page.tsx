// Path: src/app/(main)/(auth)/register/page.tsx

'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { frontendLog as log } from '@/lib/logs/logger';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthForm } from '@/app/(main)/(auth)/auth-form';
import { HeroColumn } from '@/components/auth/hero-components';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const inviteToken = searchParams.get('token');
  const inviteEmail = searchParams.get('email');

  log.info('Register page rendered', { 
    hasReturnTo: !!returnTo,
    hasInviteToken: !!inviteToken,
    inviteTokenLength: inviteToken?.length,
    inviteTokenPreview: inviteToken ? `${inviteToken.substring(0, 10)}...` : undefined,
    hasInviteEmail: !!inviteEmail,
    inviteEmail
  });

  return (
    <div className="flex min-h-full w-full flex-col md:flex-row">
      {/* Form Column */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex w-full flex-col bg-white/90 p-4 backdrop-blur-sm dark:bg-gray-900/90 md:w-1/2 md:px-8"
      >
        <div className="mx-auto flex w-full max-w-md flex-grow flex-col justify-center">
          <AuthForm 
            defaultTab="register" 
            returnTo={returnTo} 
            inviteToken={inviteToken} 
            inviteEmail={inviteEmail} 
          />
          
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Precisa de ajuda? <Link href="/central-de-ajuda" className="text-primary hover:underline">Entre em contato</Link>
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Hero Column - Hidden on mobile */}
      <HeroColumn />
    </div>
  );
}
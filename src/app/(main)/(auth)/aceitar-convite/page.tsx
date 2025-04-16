'use client';

import React from 'react';
import { frontendLog as log } from '@/lib/logs/logger';
import AuthPage from '../auth';

export default function AcceptInvitePage() {
  log.info('Accept invitation page rendered');
  
  // The shared AuthPage component will handle determining modes,
  // processing tokens, and routing based on the URL parameters
  return <AuthPage />;
} 
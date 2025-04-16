'use client';

import { useEffect } from 'react';
import { setupConsoleFilters } from '@/utils/consoleFilter';

/**
 * Client component that initializes the console filter
 * This component is meant to be loaded early in the app
 * to filter out unwanted console logs
 */
export default function ConsoleFilterInit() {
  useEffect(() => {
    // Set up console filters with default patterns
    // You can add additional patterns here
    setupConsoleFilters([
      // Add more patterns to filter as needed
      'hot-reloader-client', // Matches all hot reloader messages
      '[HMR]',               // Matches Hot Module Replacement messages
      /Layout detectou/,     // Filter using RegExp
      /Recebido userRole/,   // Filter using RegExp
      /Criando menus/,       // Filter using RegExp
      /Sidebar rendering/    // Filter using RegExp
    ]);
  }, []);

  // This component doesn't render anything
  return null;
} 
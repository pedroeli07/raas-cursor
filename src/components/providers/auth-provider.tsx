"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // Pass explicit options to ensure proper configuration
  return (
    <SessionProvider
      basePath="/api/auth" // Ensure this matches your API route path
      refetchInterval={0} // Disable background refetching
      refetchOnWindowFocus={false} // Don't refetch on window focus
    >
      {children}
    </SessionProvider>
  );
} 
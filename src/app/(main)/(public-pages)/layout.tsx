// path: src/app/(main)/(public-pages)/layout.tsx
'use client';

import React from 'react';
export default function PublicPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      <div className="container mx-auto p-6 max-w-full">
        {children}
      </div>
    </div>
  );
} 
'use client';

import React from 'react';
import { cn } from '@/lib/utils/utils';

/* 
  This component provides a visually appealing background for the sidebar
  using CSS animations instead of ThreeJS to avoid TypeScript errors
*/

interface SphereBackgroundProps {
  className?: string;
}

export function SphereBackground({ className = '' }: SphereBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-gradient-to-br from-background to-background/80", className)}>
      <div className="absolute inset-0 bg-primary/5" />
      <div className="absolute inset-0">
        <div className="absolute top-20 right-8 w-24 h-12 rounded-full bg-primary/10" />
        <div className="absolute bottom-32 left-4 w-32 h-16 rounded-full bg-primary/10" />
      </div>
    </div>
  );
}

export default SphereBackground; 
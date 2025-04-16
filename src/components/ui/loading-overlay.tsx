import React from 'react';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';

interface LoadingOverlayProps {
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Processando..." }) => (
  <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg">
    {/* Use um path relativo ou absoluto correto para seu logo */}
    <Image src="/dmz-logo.png" alt="Logo DMZ" width={80} height={80} className="mb-4 opacity-80 animate-pulse" />
    <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
    <p className="text-muted-foreground text-lg font-medium">{message}</p>
  </div>
); 
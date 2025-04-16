// We'll enhance the existing toast hook with more customization options
import { useToast as useToastBase } from "@/hooks/use-toast";
import React from "react";

interface EnhancedToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Enhanced toast hook with more styling options and simplified API
 */
export function useStyledToast() {
  const { toast: baseToast, ...rest } = useToastBase();
  
  const enhancedToast = {
    // Success toast with green styling
    success: (options: EnhancedToastOptions | string) => {
      if (typeof options === 'string') {
        return baseToast.success({
          title: options,
          duration: 3000,
        });
      }
      
      const { title, description, duration = 3000, action, className } = options;
      return baseToast.success({
        title,
        description,
        duration,
        action,
      });
    },
    
    // Error toast with red styling
    error: (options: EnhancedToastOptions | string) => {
      if (typeof options === 'string') {
        return baseToast.error({
          title: options,
          duration: 5000,
        });
      }
      
      const { title, description, duration = 5000, action, className } = options;
      return baseToast.error({
        title,
        description,
        duration,
        action,
      });
    },
    
    // Warning toast with amber styling
    warning: (options: EnhancedToastOptions | string) => {
      if (typeof options === 'string') {
        return baseToast.warning({
          title: options,
          duration: 4000,
        });
      }
      
      const { title, description, duration = 4000, action, className } = options;
      return baseToast.warning({
        title,
        description,
        duration,
        action,
      });
    },
    
    // Info toast with blue styling
    info: (options: EnhancedToastOptions | string) => {
      if (typeof options === 'string') {
        return baseToast.info({
          title: options,
          duration: 3000,
        });
      }
      
      const { title, description, duration = 3000, action, className } = options;
      return baseToast.info({
        title,
        description,
        duration,
        action,
      });
    },
    
    // Default toast with custom options
    default: (options: EnhancedToastOptions) => {
      const { title, description, duration = 3000, action, className } = options;
      return baseToast({
        title,
        description,
        duration,
        action,
      });
    },
    
    // Direct access to the base toast for advanced usage
    raw: baseToast,
  };
  
  return {
    ...rest,
    toast: enhancedToast,
  };
} 
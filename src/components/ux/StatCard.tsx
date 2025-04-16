import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/utils';

interface StatCardProps {
  title: string;
  value: string;
  description?: string; 
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className
}) => {
  return (
    <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            
            {trend && (
              <div className="flex items-center mt-2">
                <span className={cn(
                  "text-xs font-medium inline-flex items-center",
                  trend.isPositive ? "text-green-500" : "text-red-500"
                )}>
                  <span className={cn(
                    "mr-1",
                    trend.isPositive ? "i-lucide-trending-up" : "i-lucide-trending-down"
                  )}>
                    {trend.isPositive ? '↑' : '↓'}
                  </span>
                  {trend.value}% {trend.label}
                </span>
              </div>
            )}
          </div>
          
          {icon && (
            <div className="text-primary/80">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 
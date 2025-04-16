'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, Trash2Icon, Zap, Home, Calendar, ArrowRight, User, Percent } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { formatPercentage } from '@/lib/utils/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Allocation } from '@/app/(main)/(private-pages)/admin/alocacoes/page';

interface AllocationCardProps {
  allocation: Allocation;
  index: number;
  onEdit: (allocation: Allocation) => void;
  onDelete: (allocation: Allocation) => void;
}

// Animation variants
const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  },
  hover: { 
    y: -5,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    transition: { 
      duration: 0.2 
    }
  }
};

export function AllocationCard({ allocation, index, onEdit, onDelete }: AllocationCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{ delay: index * 0.05 }}
      layout
    >
      <Card className="h-full overflow-hidden border border-primary/20 dark:border-primary/30 hover:border-primary/60 transition-colors">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-primary/10 font-mono">
              <Percent className="h-3.5 w-3.5 mr-1.5" />
              {formatPercentage(allocation.quota)}
            </Badge>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(allocation)}
            >
              <PencilIcon className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(allocation)}
            >
              <Trash2Icon className="h-4 w-4" />
              <span className="sr-only">Excluir</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Instalação Geradora</div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-success flex-shrink-0" />
              <p className="text-sm font-medium">
                {allocation.generator?.installationNumber || 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {allocation.generator?.owner?.name || allocation.generator?.owner?.email || 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-center my-1">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Instalação Consumidora</div>
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-info flex-shrink-0" />
              <p className="text-sm font-medium">
                {allocation.consumer?.installationNumber || 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {allocation.consumer?.owner?.name || allocation.consumer?.owner?.email || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            <span>{formatDate(allocation.createdAt)}</span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
} 
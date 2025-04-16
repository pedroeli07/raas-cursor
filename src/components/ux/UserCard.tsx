"use client";

import { Invitation, User } from "@/store/userManagementStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useUserManagementStore } from "@/store/userManagementStore";
import { Copy, RefreshCw, Mail, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export interface UserCardProps {
  user: User;
  index?: number;
  formatDate?: (date: string | number | Date) => string;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  getStatusBadgeVariant?: (status: string) => string;
  getStatusLabel?: (status: string) => string;
  getStatusIcon?: (status: string) => React.ReactNode;
  roleOptions?: Array<{ value: string; label: string }>;
  onResend?: (invitation: Invitation) => Promise<void>;
}

export function UserCard({ 
  user, 
  index,
  formatDate: propFormatDate,
  getStatusBadgeVariant: propGetStatusVariant,
  getStatusLabel: propGetStatusLabel,
  getStatusIcon,
  onEdit,
  onDelete,
  roleOptions
}: UserCardProps) {
  const { getRoleBadgeVariant, getRoleLabel, formatDate: storeFormatDate } = useUserManagementStore();
  const [resending, setResending] = useState(false);

  // Get role badge variant
  const getCustomRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-gradient-to-r from-gray-900 to-emerald-900 text-white border-emerald-950 shadow-lg shadow-emerald-900/20";
      case "ADMIN":
        return "bg-gradient-to-r from-gray-800 to-emerald-800 text-white border-emerald-900 shadow-lg shadow-emerald-800/20";
      case "ADMIN_STAFF":
        return "bg-gradient-to-r from-gray-700 to-emerald-700 text-white border-emerald-800 shadow-lg shadow-emerald-700/20";
      case "CUSTOMER":
        return "bg-gradient-to-r from-gray-800 to-blue-800 text-white border-blue-900 shadow-lg shadow-blue-800/20";
      case "ENERGY_RENTER":
        return "bg-gradient-to-r from-gray-800 to-blue-700 text-white border-blue-800 shadow-lg shadow-blue-700/20";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string): "warning" | "success" | "destructive" | "outline" | "secondary" | "default" => {
    switch (status) {
      case 'PENDING': return "warning";
      case 'ACCEPTED': return "success";
      case 'REVOKED': return "destructive";
      case 'EXPIRED': return "outline";
      default: return "secondary";
    }
  };
  
  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'ACCEPTED': return 'Aceito';
      case 'REVOKED': return 'Revogado';
      case 'EXPIRED': return 'Expirado';
      default: return status;
    }
  };

  // Use provided functions or fallback to store functions
  const actualFormatDate = propFormatDate || storeFormatDate;
  const actualGetStatusVariant = propGetStatusVariant || getStatusVariant;
  const actualGetStatusLabel = propGetStatusLabel || getStatusLabel;

  // Copy email to clipboard
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success("Email copiado", {
      description: "Email copiado para área de transferência",
      duration: 3000,
      dismissible: true,
    });
  };

  

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="h-full"
    >
      <Card className={cn(
        "h-full flex flex-col",
        "bg-gradient-to-br from-emerald-500/10 to-white/90 dark:from-gray-900/80 dark:to-gray-950/90",
        "hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10",
        "border border-primary/10 dark:border-primary/20",
        "transition-all duration-300"
      )}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <h3 className="font-medium truncate text-foreground">{user.email}</h3>
              {user.name && (
                <p className="text-sm text-muted-foreground">{user.name}</p>
              )}
            </div>
            <Badge 
              variant="outline"
              className={cn(
                "shadow-sm font-medium transition-all duration-300 hover:shadow-md",
                getCustomRoleBadgeVariant(user.role)
              )}
            >
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="py-2 flex-grow bg-gradient-to-br from-transparent to-primary/[0.02] dark:from-transparent dark:to-primary/[0.03] rounded-md">
        
        </CardContent>
        
        <CardFooter className="grid grid-cols-4 gap-2 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyEmail}
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300"
                >
                  <Copy className="h-3.5 w-3.5 text-primary dark:text-primary/90" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
        

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit && onEdit(user)}
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/10 dark:hover:bg-primary/20"
                >
                  <Pencil className="h-3.5 w-3.5 text-primary dark:text-primary/90" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar usuário</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDelete && onDelete(user)}
                  className="border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 dark:hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Excluir usuário</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </motion.div>
  );
} 
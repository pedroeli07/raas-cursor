"use client";

import { User } from "@/store/userManagementStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserManagementStore } from "@/store/userManagementStore";
import { Mail, Phone, MapPin, Calendar, ShieldCheck, ShieldAlert, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";

export interface UserProfileCardProps {
  user: User & {
    phone?: string;
    address?: string;
  };
  onClose?: () => void;
  showActions?: boolean;
}

export function UserProfileCard({ user, onClose, showActions = true }: UserProfileCardProps) {
  const { getRoleBadgeVariant, getRoleLabel, formatDate } = useUserManagementStore();

  // Handle WhatsApp action
  const handleWhatsAppClick = () => {
    if (!user.phone) return;
    const phoneNumber = user.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  // Get initials for avatar
  const getInitials = (name: string = "", email: string) => {
    if (name && name.trim()) {
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-primary/20 dark:border-primary/30 shadow-md dark:shadow-primary/10">
        <div className="h-28 bg-gradient-to-r from-teal-500/30 via-primary/20 to-emerald-500/20 dark:from-teal-600/20 dark:via-primary/15 dark:to-emerald-600/10" />
        <CardHeader className="mt-[-48px] flex flex-col items-center pb-4">
          <div className="p-1 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 shadow-xl">
            <Avatar className="h-[88px] w-[88px] border-4 border-background shadow-lg">
              <AvatarImage src={user.image || ""} alt={user.name || user.email} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-primary/70 to-accent/70 text-white">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex flex-col items-center text-center mt-3">
            <CardTitle className="text-xl">{user.name || "Sem nome"}</CardTitle>
            <Badge 
              variant={getRoleBadgeVariant(user.role)} 
              className="mt-2 shadow-sm font-medium px-3 py-1"
            >
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 pb-4 pt-0 flex flex-col gap-3 bg-gradient-to-br from-transparent to-primary/[0.03] dark:from-transparent dark:to-primary/[0.05] rounded-lg mx-3">
          <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 dark:bg-primary/20">
              <Mail className="h-3.5 w-3.5 text-primary dark:text-primary/90" />
            </div>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          
          {user.phone && (
            <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 dark:bg-primary/20">
                <Phone className="h-3.5 w-3.5 text-primary dark:text-primary/90" />
              </div>
              <p className="text-sm font-medium">{user.phone}</p>
            </div>
          )}
          
          {user.address && (
            <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 dark:bg-primary/20">
                <MapPin className="h-3.5 w-3.5 text-primary dark:text-primary/90" />
              </div>
              <p className="text-sm font-medium">{user.address}</p>
            </div>
          )}
          
          <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 dark:bg-primary/20">
              <Calendar className="h-3.5 w-3.5 text-primary dark:text-primary/90" />
            </div>
            <p className="text-sm font-medium">Cadastrado em {formatDate(user.createdAt)}</p>
          </div>
          
          <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
            {user.emailVerified ? (
              <>
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Email verificado</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/10 dark:bg-amber-500/20">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Email não verificado</p>
              </>
            )}
          </div>
        </CardContent>
        
        {showActions && (
          <CardFooter className="flex justify-between gap-3 px-6 pt-2 pb-6">
            <Button 
              variant="outline" 
              className="w-full border-primary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
              onClick={onClose}
            >
              Fechar
            </Button>
            
            <Button 
              variant="default" 
              className={cn(
                "w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                "shadow-sm hover:shadow transition-all duration-300",
                !user.phone && "opacity-50 cursor-not-allowed hover:shadow-none"
              )}
              disabled={!user.phone}
              onClick={handleWhatsAppClick}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
} 
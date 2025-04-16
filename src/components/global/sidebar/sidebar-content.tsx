'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils/utils';
import { MenuSection } from './menu-config';
import { subMenuVariants } from './animation-variants';

type SidebarContentProps = {
  menuSections: MenuSection[];
  isCollapsed: boolean;
  pathname: string | null;
  expandedItems: Record<string, boolean>;
  toggleSubMenu: (path: string) => void;
};

// Memoize individual menu item to prevent unnecessary re-renders
const MenuItem = React.memo(({ 
  item, 
  isCollapsed, 
  isActive, 
  hasSubMenu, 
  isExpanded, 
  toggleSubMenu,
  pathname
}: { 
  item: MenuSection['items'][0],
  isCollapsed: boolean,
  isActive: boolean,
  hasSubMenu: boolean,
  isExpanded: boolean | undefined,
  toggleSubMenu: (path: string) => void,
  pathname: string | null
}) => {
  return (
    <div className="relative w-full">
      {hasSubMenu ? (
        <button
          onClick={() => toggleSubMenu(item.path)}
          className={cn(
            "flex items-center w-full rounded-lg transition-colors duration-150 ease-in-out",
            isCollapsed ? "justify-center p-2 mx-auto" : "justify-between p-2.5 px-3",
            isActive
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50 text-foreground hover:text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0">{item.icon}</span>
            
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span 
                  key="item-name"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium truncate"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          {!isCollapsed && (
            <motion.div
              animate={{ rotate: !!isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          )}
          
          {item.badge && (
            <Badge 
              variant={isActive ? "secondary" : "default"} 
              className={cn(
                "flex justify-center min-w-[20px] h-5",
                isCollapsed ? "absolute -top-1 -right-1 min-w-[16px] h-4 p-0.5 text-[10px]" : "ml-auto"
              )}
            >
              {item.badge}
            </Badge>
          )}
        </button>
      ) : (
        <Link
          href={item.path}
          className={cn(
            "flex items-center rounded-lg transition-colors duration-150 ease-in-out",
            isCollapsed ? "justify-center p-2 mx-auto" : "justify-between p-2.5 px-3",
            isActive
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50 text-foreground hover:text-accent-foreground"
          )}
          aria-current={isActive ? "page" : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0">{item.icon}</span>
            
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span 
                  key="item-name"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium truncate"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          {item.badge && (
            <Badge 
              variant={isActive ? "secondary" : "default"} 
              className={cn(
                "flex justify-center min-w-[20px] h-5",
                isCollapsed ? "absolute -top-1 -right-1 min-w-[16px] h-4 p-0.5 text-[10px]" : "ml-auto"
              )}
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      )}
      
      {/* SubMenu Items */}
      {!isCollapsed && hasSubMenu && !!isExpanded && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={subMenuVariants}
          className="pl-6 mt-1 mb-1 overflow-hidden"
        >
          {item.subItems?.map((subItem) => {
            const isSubActive = pathname === subItem.path;
            return (
              <Link
                key={subItem.path}
                href={subItem.path}
                className={cn(
                  "flex items-center justify-between rounded-md py-2 px-3 text-sm transition-colors",
                  isSubActive
                    ? "bg-accent/60 text-accent-foreground font-medium"
                    : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  {subItem.icon}
                  <span>{subItem.name}</span>
                </div>
                {subItem.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {subItem.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </motion.div>
      )}
    </div>
  );
});

MenuItem.displayName = 'MenuItem';

export const SidebarContent = React.memo(function SidebarContent({
  menuSections,
  isCollapsed,
  pathname,
  expandedItems,
  toggleSubMenu
}: SidebarContentProps) {
  return (
    <nav className="relative z-10 flex-1 overflow-y-auto py-4 px-2 space-y-6 mt-8">
      {menuSections.map((section, index) => (
        <div key={`section-${index}`} className="space-y-1">
          {!isCollapsed && (
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mt-2"
            >
              {section.title}
            </motion.h3>
          )}
          
          {section.items.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
            const hasSubMenu = !!item.subItems?.length;
            const isExpanded = expandedItems[item.path];
            
            return (
              <div key={item.path} className="w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MenuItem 
                      item={item}
                      isCollapsed={isCollapsed}
                      isActive={isActive ?? false}
                      hasSubMenu={hasSubMenu}
                      isExpanded={isExpanded}
                      toggleSubMenu={toggleSubMenu}
                      pathname={pathname}
                    />
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" sideOffset={5}>
                      {item.name}
                      {item.badge && ` (${item.badge})`}
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            );
          })}
          
          {!isCollapsed && index < menuSections.length - 1 && (
            <Separator className="my-2 opacity-50" />
          )}
        </div>
      ))}
    </nav>
  );
}); 
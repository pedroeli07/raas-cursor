"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGridIcon, TableIcon } from "lucide-react";
import { motion } from "framer-motion";

export type ViewMode = "card" | "table";

interface ViewToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ mode, onToggle, className = "" }: ViewToggleProps) {
  return (
    <div className={`flex items-center justify-end space-x-1 rounded-lg bg-muted p-1 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle("table")}
        className={`relative px-3 ${
          mode === "table"
            ? "text-primary-foreground"
            : "hover:bg-muted/70 dark:hover:bg-muted/30"
        }`}
      >
        {mode === "table" && (
          <motion.div
            layoutId="viewToggleBg"
            className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-600 shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
        <TableIcon className="h-4 w-4 mr-2 relative z-10" />
        <span className="relative z-10">Tabela</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle("card")}
        className={`relative px-3 ${
          mode === "card"
            ? "text-primary-foreground"
            : "hover:bg-muted/70 dark:hover:bg-muted/30"
        }`}
      >
        {mode === "card" && (
          <motion.div
            layoutId="viewToggleBg"
            className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-600 shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
        <LayoutGridIcon className="h-4 w-4 mr-2 relative z-10" />
        <span className="relative z-10">Cartões</span>
      </Button>
    </div>
  );
} 
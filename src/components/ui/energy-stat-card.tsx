"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, useMotionValue, useTransform, animate, MotionValue } from "framer-motion"
import { useEffect, useState } from "react"

type EnergyStatCardProps = {
  title: string
  value: number
  unit: string
  description?: string
  icon?: React.ReactNode
  increasedBy?: number
  color?: "primary" | "success" | "warning" | "danger" | "info"
  isAnimated?: boolean
}

const colorVariants = {
  primary: "bg-gradient-to-br from-blue-500/10 to-teal-500/10 border-teal-500/20",
  success: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-emerald-500/20",
  warning: "bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-yellow-500/20",
  danger: "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-rose-500/20",
  info: "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-indigo-500/20"
}

const iconColorVariants = {
  primary: "text-teal-500",
  success: "text-emerald-500",
  warning: "text-yellow-500",
  danger: "text-rose-500",
  info: "text-indigo-500"
}

function Counter({ from = 0, to = 100, duration = 1.5 }: { from?: number, to: number, duration?: number }) {
  const count = useMotionValue(from)
  const rounded = useTransform(count, Math.round)
  const [displayValue, setDisplayValue] = useState(from)

  useEffect(() => {
    const controls = animate(count, to, { duration })
    
    const unsubscribe = rounded.onChange(v => {
      setDisplayValue(v)
    })
    
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [count, rounded, to, duration])

  return <>{displayValue}</>
}

export function EnergyStatCard({
  title,
  value,
  unit,
  description,
  icon,
  increasedBy,
  color = "primary",
  isAnimated = true
}: EnergyStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`border ${colorVariants[color]} overflow-hidden`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {icon && <div className={`${iconColorVariants[color]}`}>{icon}</div>}
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {isAnimated ? <Counter to={value} /> : value}{" "}
            <span className="text-lg font-normal text-muted-foreground">{unit}</span>
          </div>
        </CardContent>
        {increasedBy !== undefined && (
          <CardFooter className="pt-0">
            <div className="flex items-center gap-1 text-sm">
              <div className={increasedBy >= 0 ? "text-emerald-500" : "text-rose-500"}>
                {increasedBy >= 0 ? "+" : ""}{increasedBy}%
              </div>
              <div className="text-muted-foreground">desde o último mês</div>
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  )
} 
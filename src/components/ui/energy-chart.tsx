"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from "recharts"

type ChartData = {
  name: string
  geração?: number
  consumo?: number
  transferência?: number
  recebimento?: number
  saldo?: number
  compensação?: number
  [key: string]: any
}

type EnergyChartProps = {
  title: string
  data: ChartData[]
  description?: string
  type?: "area" | "bar" | "line"
  showGrid?: boolean
  height?: number
}

const chartVariants = {
  area: {
    component: AreaChart,
    series: [
      { dataKey: "geração", stroke: "#14b8a6", fill: "#14b8a6", fillOpacity: 0.3 },
      { dataKey: "consumo", stroke: "#f43f5e", fill: "#f43f5e", fillOpacity: 0.3 },
      { dataKey: "saldo", stroke: "#8b5cf6", fill: "#8b5cf6", fillOpacity: 0.3 }
    ]
  },
  bar: {
    component: BarChart,
    series: [
      { dataKey: "geração", fill: "#14b8a6" },
      { dataKey: "consumo", fill: "#f43f5e" },
      { dataKey: "transferência", fill: "#eab308" },
      { dataKey: "recebimento", fill: "#8b5cf6" }
    ]
  },
  line: {
    component: LineChart,
    series: [
      { dataKey: "geração", stroke: "#14b8a6", strokeWidth: 2 },
      { dataKey: "consumo", stroke: "#f43f5e", strokeWidth: 2 },
      { dataKey: "compensação", stroke: "#eab308", strokeWidth: 2 },
      { dataKey: "saldo", stroke: "#8b5cf6", strokeWidth: 2 }
    ]
  }
}

const DataGraph = ({ type = "area", data, showGrid = true }: {
  type: "area" | "bar" | "line"
  data: ChartData[]
  showGrid?: boolean
}) => {
  const ChartComponent = type === "area" 
    ? AreaChart 
    : type === "bar" 
      ? BarChart 
      : LineChart

  const seriesConfig = chartVariants[type].series

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />}
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }} 
          tickLine={false}
          axisLine={{ stroke: '#374151', opacity: 0.2 }}
        />
        <YAxis 
          tick={{ fontSize: 12 }} 
          tickLine={false}
          axisLine={{ stroke: '#374151', opacity: 0.2 }}
          tickFormatter={(value) => `${value} kWh`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.8)', 
            border: 'none', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
        />
        <Legend />
        
        {type === "area" && seriesConfig.map((config, index) => (
          <Area
            key={index}
            type="monotone"
            dataKey={config.dataKey}
            stroke={config.stroke}
            fill={config.fill}
            fillOpacity={config.fillOpacity}
            activeDot={{ r: 8 }}
          />
        ))}
        
        {type === "bar" && seriesConfig.map((config, index) => (
          <Bar
            key={index}
            dataKey={config.dataKey}
            fill={config.fill}
            radius={[4, 4, 0, 0]}
          />
        ))}
        
        {type === "line" && seriesConfig.map((config, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={config.dataKey}
            stroke={config.stroke}
            strokeWidth={config.strokeWidth}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  )
}

export function EnergyChart({
  title,
  data,
  description,
  type = "area",
  showGrid = true,
  height = 300
}: EnergyChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar" | "line">(type)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border border-slate-800/20 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setChartType("area")}
                className={`p-1 rounded ${chartType === "area" ? "bg-slate-800/20" : ""}`}
                title="Gráfico de Área"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m7 12 3-3 2 2 3-3 2 2" />
                </svg>
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`p-1 rounded ${chartType === "bar" ? "bg-slate-800/20" : ""}`}
                title="Gráfico de Barras"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="12" width="3" height="9" />
                  <rect x="9" y="8" width="3" height="13" />
                  <rect x="15" y="4" width="3" height="17" />
                  <rect x="21" y="2" width="3" height="19" />
                </svg>
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`p-1 rounded ${chartType === "line" ? "bg-slate-800/20" : ""}`}
                title="Gráfico de Linha"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m3 15 5-6 4 6 5-6" />
                </svg>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: `${height}px` }}>
            <DataGraph type={chartType} data={data} showGrid={showGrid} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
} 
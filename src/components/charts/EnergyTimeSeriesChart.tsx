'use client';

import React from 'react';
import { CemigEnergyBillData } from '@prisma/client';
import { 
  ResponsiveContainer, 
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Line 
} from 'recharts';
import { formatEnergy } from '@/lib/utils/utils'; // Assuming this formats numbers nicely

interface EnergyTimeSeriesChartProps {
  data: CemigEnergyBillData[];
  metrics: ('consumption' | 'generation' | 'received' | 'compensation' | 'transferred')[];
  height?: number;
}

// Define colors for each metric
const metricColors: Record<string, string> = {
  consumption: '#ef4444', // red-500
  generation: '#22c55e', // green-500
  received: '#3b82f6', // blue-500
  compensation: '#f97316', // orange-500
  transferred: '#a855f7', // purple-500
};

// Define labels for each metric
const metricLabels: Record<string, string> = {
  consumption: 'Consumo (kWh)',
  generation: 'Geração (kWh)',
  received: 'Recebido (kWh)',
  compensation: 'Compensado (kWh)',
  transferred: 'Transferido (kWh)',
};

export const EnergyTimeSeriesChart: React.FC<EnergyTimeSeriesChartProps> = ({ 
  data,
  metrics,
  height = 300 
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: `${height}px` }} className="flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md border border-dashed">
        Nenhum dado disponível para exibir o gráfico.
      </div>
    );
  }

  // Format data for the chart (optional, depending on needs)
  const formattedData = data.map(item => ({
    ...item,
    // Example: Ensure period is just MM/YYYY if needed, or keep as is
    periodLabel: item.period, // Assuming period is already MM/YYYY
    // Ensure numeric values are numbers, handle null/undefined
    consumption: item.consumption ?? 0,
    generation: item.generation ?? 0,
    received: item.received ?? 0,
    compensation: item.compensation ?? 0,
    transferred: item.transferred ?? 0,
  })).sort((a, b) => {
    // Sort by period if necessary (assuming format allows direct comparison or needs parsing)
    // Example parsing MM/YYYY:
    const [aMonth, aYear] = a.periodLabel.split('/').map(Number);
    const [bMonth, bYear] = b.periodLabel.split('/').map(Number);
    if (aYear !== bYear) return aYear - bYear;
    return aMonth - bMonth;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart 
        data={formattedData}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="periodLabel" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value} kWh`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            borderColor: 'hsl(var(--border))' 
          }}
          formatter={(value: number, name: string) => [formatEnergy(value), metricLabels[name] || name]}
        />
        <Legend />
        {metrics.map((metric) => (
          <Line 
            key={metric}
            type="monotone"
            dataKey={metric}
            name={metricLabels[metric] || metric} // Use defined label
            stroke={metricColors[metric] || '#8884d8'} // Use defined color
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}; 
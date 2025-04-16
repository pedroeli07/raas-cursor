'use client';

import React from 'react';
import { CemigEnergyBillData } from '@prisma/client';
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Bar 
} from 'recharts';
import { formatEnergy } from '@/lib/utils/utils';

interface ExpiringCreditsChartProps {
  data: CemigEnergyBillData[];
  height?: number;
}

export const ExpiringCreditsChart: React.FC<ExpiringCreditsChartProps> = ({ 
  data,
  height = 300 
}) => {
  
  // Filter data to include only entries with expiring balance and period
  const expiringData = data
    .filter(item => 
      item.expiringBalanceAmount !== null && 
      item.expiringBalanceAmount > 0 && 
      item.expiringBalancePeriod
    )
    .map(item => ({
      periodLabel: item.expiringBalancePeriod, // Use the expiration period as the label
      amount: item.expiringBalanceAmount ?? 0,
    }))
    // Aggregate amounts for the same expiration period (if multiple entries exist)
    .reduce((acc, current) => {
        const existing = acc.find(item => item.periodLabel === current.periodLabel);
        if (existing) {
            existing.amount += current.amount;
        } else {
            acc.push({ periodLabel: current.periodLabel, amount: current.amount });
        }
        return acc;
    }, [] as { periodLabel: string | null, amount: number }[])
    .sort((a, b) => { 
      // Sort by expiration period
      if (!a.periodLabel || !b.periodLabel) return 0;
      const [aMonth, aYear] = a.periodLabel.split('/').map(Number);
      const [bMonth, bYear] = b.periodLabel.split('/').map(Number);
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });

  if (!expiringData || expiringData.length === 0) {
    return (
      <div style={{ height: `${height}px` }} className="flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md border border-dashed">
        Nenhum crédito a expirar nos dados disponíveis.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={expiringData}
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
          formatter={(value: number) => [formatEnergy(value), 'Saldo a Expirar']}
        />
        <Legend />
        <Bar 
          dataKey="amount"
          name="Saldo a Expirar (kWh)"
          fill="#f43f5e" // rose-500
          radius={[4, 4, 0, 0]} // Rounded top corners
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

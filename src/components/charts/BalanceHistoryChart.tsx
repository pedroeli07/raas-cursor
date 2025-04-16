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
import { formatEnergy } from '@/lib/utils/utils';

interface BalanceHistoryChartProps {
  data: CemigEnergyBillData[];
  height?: number;
}

export const BalanceHistoryChart: React.FC<BalanceHistoryChartProps> = ({ 
  data,
  height = 300 
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: `${height}px` }} className="flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md border border-dashed">
        Nenhum dado de saldo disponível.
      </div>
    );
  }

  // Format data, ensuring balances are numbers and sorting by period
  const formattedData = data.map(item => ({
    periodLabel: item.period,
    previousBalance: item.previousBalance ?? 0,
    currentBalance: item.currentBalance ?? 0,
  })).sort((a, b) => {
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
          formatter={(value: number, name: string) => {
            const label = name === 'previousBalance' ? 'Saldo Anterior' : 'Saldo Atual';
            return [formatEnergy(value), label];
          }}
        />
        <Legend />
        <Line 
          key="previousBalance"
          type="monotone"
          dataKey="previousBalance"
          name="Saldo Anterior"
          stroke="#f59e0b" // amber-500
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
         <Line 
          key="currentBalance"
          type="monotone"
          dataKey="currentBalance"
          name="Saldo Atual"
          stroke="#10b981" // emerald-500
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}; 
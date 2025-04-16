// src/lib/utils/mockData.ts

// --- Interfaces --- a
export interface EnergyRecord {
  modalidade: string; // "Auto Consumo-Geradora" or "Auto Consumo-Recebedora"
  instalacao: string;
  periodo: string; // MM/YYYY
  quota: string; // "55,00000%" or "0,00000%"
  postoHorario: string; // "Fora Ponta/Geral"
  saldoAnterior: number; // kWh
  saldoExpirado: number; // kWh
  consumo: number; // kWh
  geracao: number; // kWh
  compensacao: number; // kWh
  transferido: number; // kWh
  recebimento: number; // kWh
  saldoAtual: number; // kWh
  quantidadeSaldoAExpirar: number; // kWh
  periodoSaldoAExpirar: string; // MM/YYYY or ""
}

interface Installation {
  id: string;
  type: 'Geradora' | 'Recebedora';
  quota?: number; // Percentage as a decimal (e.g., 0.55 for 55%)
  associatedGenerator?: string;
}

// --- Helper Functions --- a
function getRandomNumber(min: number, max: number, decimals: number = 2): number {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

function formatDateMMYYYY(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
}

function formatQuota(quota?: number): string {
  if (quota === undefined) return '0,00000%';
  return (quota * 100).toFixed(5).replace('.', ',') + '%';
}

function formatExpiryDate(date: Date): string {
  const expiryDate = new Date(date);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  return formatDateMMYYYY(expiryDate);
}

// --- Data Definitions --- a
const installations: Installation[] = [
  // Geradoras
  { id: "3015031311", type: 'Geradora' },
  { id: "3015031312", type: 'Geradora' },
  { id: "3015031313", type: 'Geradora' },
  // Recebedoras for 3015031311
  { id: "3004402254", type: 'Recebedora', quota: 0.55, associatedGenerator: "3015031311" },
  { id: "3011883117", type: 'Recebedora', quota: 0.20, associatedGenerator: "3015031311" },
  // Recebedoras for 3015031312
  { id: "3004402255", type: 'Recebedora', quota: 0.60, associatedGenerator: "3015031312" },
  { id: "3011883118", type: 'Recebedora', quota: 0.30, associatedGenerator: "3015031312" },
  // Recebedoras for 3015031313
  { id: "3004402256", type: 'Recebedora', quota: 0.50, associatedGenerator: "3015031313" },
  { id: "3011883119", type: 'Recebedora', quota: 0.35, associatedGenerator: "3015031313" },
];

const startDate = new Date(2023, 0, 1); // Janeiro de 2023
const numberOfMonths = 12; // Gerar dados para 1 ano

// --- Data Generation Logic --- a
const mockEnergyData: EnergyRecord[] = [];
const saldosAtuais: { [instalacaoId: string]: number } = {}; // Track current balance for recebedoras

for (let i = 0; i < numberOfMonths; i++) {
  const currentDate = new Date(startDate);
  currentDate.setMonth(startDate.getMonth() + i);
  const periodo = formatDateMMYYYY(currentDate);

  const monthlyTransfers: { [generatorId: string]: number } = {};

  // 1. Process Geradoras for the current month
  installations.filter(inst => inst.type === 'Geradora').forEach(inst => {
    const consumo = getRandomNumber(50, 200);
    const geracao = getRandomNumber(1000, 15000);
    const transferido = Math.max(0, geracao - consumo);
    monthlyTransfers[inst.id] = transferido;

    mockEnergyData.push({
      modalidade: "Auto Consumo-Geradora",
      instalacao: inst.id,
      periodo: periodo,
      quota: formatQuota(inst.quota),
      postoHorario: "Fora Ponta/Geral",
      saldoAnterior: 0,
      saldoExpirado: 0,
      consumo: consumo,
      geracao: geracao,
      compensacao: 0,
      transferido: transferido,
      recebimento: 0,
      saldoAtual: 0,
      quantidadeSaldoAExpirar: 0,
      periodoSaldoAExpirar: "",
    });
  });

  // 2. Process Recebedoras for the current month
  installations.filter(inst => inst.type === 'Recebedora').forEach(inst => {
    const saldoAnterior = saldosAtuais[inst.id] || 0;
    const consumo = getRandomNumber(1000, 10000);
    const associatedGeneratorTransfer = monthlyTransfers[inst.associatedGenerator!] || 0;
    const recebimento = associatedGeneratorTransfer * (inst.quota || 0);

    const energiaDisponivel = saldoAnterior + recebimento;
    const compensacao = Math.min(consumo, energiaDisponivel);
    const saldoAtual = Math.max(0, energiaDisponivel - compensacao); // Ensure non-negative balance
    const saldoExpirado = 0; // Simplified: No expiration within the first year

    const quantidadeSaldoAExpirar = saldoAtual > 0 ? saldoAtual : 0;
    const periodoSaldoExpirar = saldoAtual > 0 ? formatExpiryDate(currentDate) : "";

    saldosAtuais[inst.id] = saldoAtual; // Update balance for next month

    mockEnergyData.push({
      modalidade: "Auto Consumo-Recebedora",
      instalacao: inst.id,
      periodo: periodo,
      quota: formatQuota(inst.quota),
      postoHorario: "Fora Ponta/Geral",
      saldoAnterior: saldoAnterior,
      saldoExpirado: saldoExpirado,
      consumo: consumo,
      geracao: 0,
      compensacao: compensacao,
      transferido: 0,
      recebimento: recebimento,
      saldoAtual: saldoAtual,
      quantidadeSaldoAExpirar: quantidadeSaldoAExpirar,
      periodoSaldoAExpirar: periodoSaldoExpirar,
    });
  });
}

// Sort data for better readability (optional)
mockEnergyData.sort((a, b) => {
    if (a.periodo !== b.periodo) {
        const [aMonth, aYear] = a.periodo.split('/').map(Number);
        const [bMonth, bYear] = b.periodo.split('/').map(Number);
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
    }
    if (a.instalacao !== b.instalacao) {
        return a.instalacao.localeCompare(b.instalacao);
    }
    return 0;
});

// Exporta os dados mockados
export default mockEnergyData;

// --- Example Fetch Function (Keep for later use) ---
export const fetchEnergyData = async (): Promise<EnergyRecord[]> => {
  // Simula um atraso de rede (0.5 segundos)
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("Fetching mock energy data...");
  return mockEnergyData;
};

// --- Example React Component (Keep for later use) ---
/*
import React, { useEffect, useState } from 'react';
// Adjust the import path based on your project structure
import mockEnergyData, { fetchEnergyData, EnergyRecord } from '@/lib/utils/mockData';

const EnergyDataComponent: React.FC = () => {
  const [data, setData] = useState<EnergyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Calling fetchEnergyData');
        const energyData = await fetchEnergyData();
        console.log('Data received:', energyData.length);
        setData(energyData);
      } catch (err) {
        console.error("Erro ao carregar os dados:", err);
        setError("Falha ao carregar dados de energia.");
      } finally {
        setLoading(false);
        console.log('Loading finished');
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div>Carregando dados de energia...</div>; // Display loading text
  }

  if (error) {
    return <div>Erro: {error}</div>; // Display error message
  }

  if (data.length === 0) {
    return <div>Nenhum dado de energia encontrado.</div>; // Handle empty data case
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dados de Energia (Mock)</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Instalação</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Período</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Modalidade</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Consumo (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Geração (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Transferido (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Recebimento (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Compensação (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Saldo Ant. (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Saldo Atual (kWh)</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Expira (kWh)</th>
               <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período Exp.</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((record, index) => (
              <tr key={`${record.instalacao}-${record.periodo}-${index}`} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 border-r">{record.instalacao}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 border-r">{record.periodo}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-r">{record.modalidade}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-r">{record.consumo.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-r">{record.geracao.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-r">{record.transferido.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-r">{record.recebimento.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-r">{record.compensacao.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-r">{record.saldoAnterior.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right border-r">{record.saldoAtual.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{record.quantidadeSaldoAExpirar.toFixed(2)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-left">{record.periodoSaldoAExpirar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnergyDataComponent;
*/
// Caminho: ./src/components/global/SimulateSection.tsx
// Este componente exibe uma seção de simulação para calcular resultados baseados na entrada do usuário.
// Ele pode ser utilizado para simulações de telhado ou consumo, calculando diferentes resultados dependendo do tipo de simulação.

// Componente responsável por exibir uma seção de simulação com um formulário, que calcula e exibe resultados baseados na entrada do usuário.

'use client';  // Indica que este componente será executado no lado do cliente (Client Component).

import React, { useState } from 'react';  // Importa o React e o hook `useState`.
import { Button } from '@/components/ui/button';  // Importa o componente de botão customizado.
import WaveSeparator from './WaveSeparator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaSolarPanel, FaMoneyBillWave, FaPiggyBank, FaQuestionCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import FadeIn from './FadeIn';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PiggyBank, LineChart, Lightbulb, ArrowRight } from 'lucide-react';

interface SimulateSectionProps {
  title?: string;
  description?: string;
}

const SimulateSection: React.FC<SimulateSectionProps> = ({
  title = "Simule agora sua economia ou retorno",
  description = "Descubra como a energia solar pode transformar sua vida, seja economizando em sua conta de luz ou gerando renda com seu telhado"
}) => {
  const [activeTab, setActiveTab] = useState('consumption');
  const [consumptionKWh, setConsumptionKWh] = useState('');
  const [consumptionBill, setConsumptionBill] = useState('');
  const [roofArea, setRoofArea] = useState('');
  const [roofOrientation, setRoofOrientation] = useState('');
  const [consumptionResult, setConsumptionResult] = useState<number | null>(null);
  const [roofResult, setRoofResult] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showConsumeResults, setShowConsumeResults] = useState(false);
  const [showRoofResults, setShowRoofResults] = useState(false);

  const handleConsumeSimulation = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      try {
        const kwh = parseFloat(consumptionKWh);
        const bill = parseFloat(consumptionBill);
        
        if (isNaN(kwh) || isNaN(bill)) {
          throw new Error("Valores inválidos");
        }
        
        const estimatedSavings = bill * 0.15;
        setConsumptionResult(estimatedSavings);
        setShowConsumeResults(true);
      } catch (error) {
        console.error("Erro ao calcular economia:", error);
        setConsumptionResult(null);
      } finally {
        setIsCalculating(false);
      }
    }, 1500);
  };

  const handleRoofSimulation = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      try {
        const area = parseFloat(roofArea);
        
        if (isNaN(area)) {
          throw new Error("Área inválida");
        }
        
        const estimatedReturn = area * 20;
        
        const orientationMultiplier = 
          roofOrientation === 'north' ? 1.2 : 
          roofOrientation === 'south' ? 0.8 : 
          roofOrientation === 'east' ? 1.0 : 
          roofOrientation === 'west' ? 1.0 : 1.0;
        
        setRoofResult(estimatedReturn * orientationMultiplier);
        setShowRoofResults(true);
      } catch (error) {
        console.error("Erro ao calcular retorno:", error);
        setRoofResult(null);
      } finally {
        setIsCalculating(false);
      }
    }, 1500);
  };

  const ConsumptionResult = () => (
    showConsumeResults && consumptionResult !== null ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6"
      >
        <Card className="bg-[#1a2942]/70 border-gray-800 shadow-lg backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <PiggyBank className="mr-2 h-5 w-5 text-[#34d399]" />
              Sua economia estimada
            </h3>
            <div className="bg-[#0A1628]/50 p-4 rounded-lg mb-4">
              <p className="text-gray-300 mb-2">Com base no seu consumo de {consumptionKWh} kWh e valor da conta de R$ {consumptionBill}, você pode economizar aproximadamente:</p>
              <div className="text-3xl font-bold text-[#34d399]">
                R$ {consumptionResult.toFixed(2)}/mês
              </div>
              <div className="text-xl font-semibold text-[#34d399] mt-2">
                R$ {(consumptionResult * 12).toFixed(2)}/ano
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-[#34d399] hover:bg-[#28a87c] text-white">
                Solicitar Proposta <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ) : null
  );

  const RoofResult = () => (
    showRoofResults && roofResult !== null ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6"
      >
        <Card className="bg-[#1a2942]/70 border-gray-800 shadow-lg backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <LineChart className="mr-2 h-5 w-5 text-[#34d399]" />
              Seu retorno estimado
            </h3>
            <div className="bg-[#0A1628]/50 p-4 rounded-lg mb-4">
              <p className="text-gray-300 mb-2">Com base na área do seu telhado de {roofArea} m², você pode ter um retorno aproximado de:</p>
              <div className="text-3xl font-bold text-[#34d399]">
                R$ {roofResult.toFixed(2)}/mês
              </div>
              <div className="text-xl font-semibold text-[#34d399] mt-2">
                R$ {(roofResult * 12).toFixed(2)}/ano
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-[#34d399] hover:bg-[#28a87c] text-white">
                Solicitar Visita <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ) : null
  );

  return (
    <section className="py-24 bg-gradient-to-b from-[#0A1628] to-[#1a2942] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="grid-lines absolute inset-0 opacity-10"></div>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 25 + 10}vw`,
              height: `${Math.random() * 25 + 10}vw`,
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 90}%`,
              background: i % 2 === 0 
                ? 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)' 
                : 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.01) 100%)',
            }}
            animate={{
              x: [0, 10, 0],
              y: [0, 15, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 8 + Math.random() * 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-block p-3 rounded-full bg-[#34d399]/10 mb-4">
              <Lightbulb className="h-6 w-6 text-[#34d399]" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
            <p className="text-gray-300">{description}</p>
          </div>
        </FadeIn>

        <div className="max-w-2xl mx-auto">
          <FadeIn delay={0.2}>
            <Card className="bg-[#1a2942]/70 border-gray-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <Tabs
                  defaultValue="consumption"
                  onValueChange={(value) => setActiveTab(value)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0A1628]/50">
                    <TabsTrigger 
                      value="consumption"
                      className="data-[state=active]:bg-[#34d399] data-[state=active]:text-white"
                    >
                      Economia na Conta
                    </TabsTrigger>
                    <TabsTrigger 
                      value="roof"
                      className="data-[state=active]:bg-[#34d399] data-[state=active]:text-white"
                    >
                      Telhado Solar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="consumption" className="space-y-4">
                    <div>
                      <label className="block text-white mb-1">Consumo mensal (kWh)</label>
                      <Input
                        type="number"
                        placeholder="Ex: 250"
                        value={consumptionKWh}
                        onChange={(e) => setConsumptionKWh(e.target.value)}
                        className="bg-[#0A1628]/50 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-1">Valor da conta (R$)</label>
                      <Input
                        type="number"
                        placeholder="Ex: 350"
                        value={consumptionBill}
                        onChange={(e) => setConsumptionBill(e.target.value)}
                        className="bg-[#0A1628]/50 border-gray-700 text-white"
                      />
                    </div>
                    <Button 
                      onClick={handleConsumeSimulation}
                      disabled={isCalculating}
                      className="w-full bg-[#34d399] hover:bg-[#28a87c] text-white mt-2"
                    >
                      {isCalculating && activeTab === 'consumption' ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Calculando...
                        </>
                      ) : "Calcular Economia"}
                    </Button>
                    
                    <ConsumptionResult />
                  </TabsContent>

                  <TabsContent value="roof" className="space-y-4">
                    <div>
                      <label className="block text-white mb-1">Área do telhado (m²)</label>
                      <Input
                        type="number"
                        placeholder="Ex: 50"
                        value={roofArea}
                        onChange={(e) => setRoofArea(e.target.value)}
                        className="bg-[#0A1628]/50 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-1">Orientação principal</label>
                      <select
                        value={roofOrientation}
                        onChange={(e) => setRoofOrientation(e.target.value)}
                        className="w-full h-10 px-3 py-2 rounded-md bg-[#0A1628]/50 border border-gray-700 text-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="north">Norte</option>
                        <option value="south">Sul</option>
                        <option value="east">Leste</option>
                        <option value="west">Oeste</option>
                      </select>
                    </div>
                    <Button 
                      onClick={handleRoofSimulation}
                      disabled={isCalculating}
                      className="w-full bg-[#34d399] hover:bg-[#28a87c] text-white mt-2"
                    >
                      {isCalculating && activeTab === 'roof' ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Calculando...
                        </>
                      ) : "Calcular Retorno"}
                    </Button>
                    
                    <RoofResult />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
      
      <div className="h-24 relative mt-16">
        <WaveSeparator color="#ffffff" />
      </div>
    </section>
  );
};

export default SimulateSection;
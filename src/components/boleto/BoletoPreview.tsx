import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BoletoData } from '@/hooks/useBoletoGenerator';
import QRCode from 'react-qr-code';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

interface BoletoPreviewProps {
  distribuidora: string;
  boletoData: BoletoData;
}

const BoletoPreview: React.FC<BoletoPreviewProps> = ({ 
  distribuidora, 
  boletoData 
}) => {
  const {
    clienteName,
    mesReferencia,
    vencimento,
    valorKwhCemig,
    desconto,
    valorKwhFaturado,
    compensado,
    valorAPagar,
    codigoBarras
  } = boletoData;

  // Formatar valores para display
  const valorFormatado = formatCurrency(parseFloat(valorAPagar) || 0);
  const valorCemigFormatado = formatCurrency(parseFloat(valorKwhCemig) || 0);
  const valorFaturadoFormatado = formatCurrency(parseFloat(valorKwhFaturado) || 0);
  
  // Calcular o desconto em valor 
  const descontoPercentual = parseFloat(desconto) || 0;
  const valorCemig = parseFloat(valorKwhCemig) || 0;
  const valorDescontoCalculado = (valorCemig * descontoPercentual) / 100;
  const descontoFormatado = formatCurrency(valorDescontoCalculado);

  // Determina se deve usar o template CEMIG
  const isCemigTemplate = distribuidora === 'CEMIG';

  if (isCemigTemplate) {
    return (
      <div id="boleto-preview" className="w-full max-w-4xl mx-auto bg-white shadow-lg print:shadow-none relative">
        {/* Background image for CEMIG */}
        <div className="w-full relative">
          <Image 
            src="/images/boleto_padrao04.png" 
            alt="Boleto CEMIG" 
            width={800}
            height={1200}
            className="w-full h-auto"
          />
          
          {/* Overlay content positioned on top of the image */}
          <div className="absolute top-[165px] left-[120px]">
            <div className="text-gray-800 font-medium">
              <div>Cliente: {clienteName || 'Nome não informado'}</div>
              <div>Mês de Referência: {mesReferencia || 'Não informado'}</div>
              <div>Vencimento: {vencimento || 'Não informado'}</div>
            </div>
          </div>
          
          {/* CEMIG value */}
          <div className="absolute top-[160px] left-[377px] w-32 text-center">
            <div className="text-xl font-bold">
              R$ {valorKwhCemig}
            </div>
          </div>
          
          {/* Discount percentage */}
          <div className="absolute top-[160px] left-[585px] w-20 text-center">
            <div className="text-xl font-bold">
              {desconto}%
            </div>
          </div>
          
          {/* Faturado value */}
          <div className="absolute top-[160px] left-[705px] w-32 text-center">
            <div className="text-xl font-bold">
              R$ {valorKwhFaturado}
            </div>
          </div>
          
          {/* Technical info */}
          <div className="absolute top-[275px] left-[105px] w-[650px] text-sm">
            <div>
              Compensação: {compensado} kWh<br />
              Código de Barras: {codigoBarras || '0000000000000000000000000000'}
            </div>
          </div>
          
          {/* Historical kWh indicator - Green box */}
          <div className="absolute top-[425px] left-[552px] w-20 text-center">
            <div className="text-xl font-bold text-green-700">
              {compensado || '0'} kWh
            </div>
          </div>
          
          {/* QR Code Payment */}
          <div className="absolute top-[640px] left-[682px] w-[120px] h-[120px] flex justify-center items-center">
            <div className="bg-white p-1 rounded">
              <QRCode 
                value={codigoBarras || 'https://dmz-solar.com.br/pagamento'} 
                size={100}
                className="mx-auto" 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Retorna o design padrão para outras distribuidoras
  return (
    <Card id="boleto-preview" className="p-6 w-full max-w-4xl mx-auto bg-white shadow-lg print:shadow-none">
      {/* Cabeçalho do Boleto */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-700">RaaS Solar</h1>
            <p className="text-gray-500 text-sm">Roof as a Service</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500">Distribuidora</p>
          <p className="font-semibold text-lg">{distribuidora}</p>
        </div>
      </div>

      <Separator className="my-4" />
      
      {/* Informações do Cliente e Fatura */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h2 className="text-lg font-medium mb-2 text-gray-700">Informações do Cliente</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Nome do Cliente</p>
              <p className="font-semibold">{clienteName || 'Nome não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mês de Referência</p>
              <p className="font-semibold">{mesReferencia || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Vencimento</p>
              <p className="font-semibold">{vencimento || 'Não informado'}</p>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-2 text-gray-700">Resumo da Fatura</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">Valor kWh {distribuidora}</p>
              <p className="font-semibold">{valorCemigFormatado}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">Desconto ({desconto}%)</p>
              <p className="font-semibold text-emerald-600">- {descontoFormatado}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">Valor kWh Faturado</p>
              <p className="font-semibold">{valorFaturadoFormatado}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">kWh Compensado</p>
              <p className="font-semibold">{compensado || '0'} kWh</p>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <p className="font-bold text-gray-700">Valor a Pagar</p>
              <p className="font-bold text-lg text-emerald-700">{valorFormatado}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Código de Barras e QR Code */}
      <div className="mt-8 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-700">Informações de Pagamento</h3>
          <p className="text-sm font-medium text-emerald-700">Vencimento: {vencimento || 'Não informado'}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-1">Código de Barras</p>
            <p className="font-mono text-xs tracking-wider bg-white p-2 border border-gray-200 rounded break-all">
              {codigoBarras || '00000000000000000000000000000000000000000000000'}
            </p>
            
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Linha Digitável</p>
              <p className="font-mono text-xs tracking-wider bg-white p-2 border border-gray-200 rounded">
                {codigoBarras ? 
                  `${codigoBarras.slice(0, 5)}.${codigoBarras.slice(5, 10)} ${codigoBarras.slice(10, 15)}.${codigoBarras.slice(15, 20)} ${codigoBarras.slice(20, 25)}.${codigoBarras.slice(25, 30)}` 
                  : '00000.00000 00000.000000 00000.000000 0 00000000000000'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 mb-2">QR Code de Pagamento</p>
            <div className="p-2 bg-white border border-gray-200 rounded">
              <QRCode 
                value={codigoBarras || 'https://raas-solar.com.br/pagamento'} 
                size={120}
                className="mx-auto" 
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Rodapé */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>RaaS Solar - Energia limpa e economia para todos</p>
        <p className="mt-1">Roof as a Service (RaaS) - CNPJ: 00.000.000/0001-00</p>
        <p className="mt-1">Em caso de dúvidas, entre em contato: contato@raas-solar.com.br</p>
      </div>
    </Card>
  );
};

export default BoletoPreview; 
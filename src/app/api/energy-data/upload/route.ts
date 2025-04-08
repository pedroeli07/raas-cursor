import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

/**
 * Processa o upload de arquivos de energia e associa os dados às instalações correspondentes
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição é multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Verificar tipo do arquivo (deve ser .xlsx ou .xls)
    const fileType = file.type;
    if (!fileType.includes('spreadsheet') && !fileType.includes('excel')) {
      return NextResponse.json(
        { success: false, message: 'Formato de arquivo inválido. Envie um arquivo Excel (.xlsx ou .xls)' },
        { status: 400 }
      );
    }

    // Ler o arquivo
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Arquivo vazio ou formato inválido' },
        { status: 400 }
      );
    }

    // Gerar ID do lote de upload
    const batchId = uuidv4();
    let processedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    
    // Processamento de cada linha do arquivo
    for (const row of data as Record<string, unknown>[]) {
      try {
        const installationNumber = String(row['Instalação'] || row['Instalacao'] || row['instalacao'] || row['instalação'] || '').trim();
        
        if (!installationNumber) {
          log.warn('Linha sem número de instalação', { row });
          errorCount++;
          continue;
        }
        
        // Buscar a instalação pelo número
        const installation = await db.installation.findFirst({
          where: { installationNumber },
        });
        
        if (!installation) {
          log.warn(`Instalação não encontrada: ${installationNumber}`);
          notFoundCount++;
          continue;
        }
        
        // Extrair período (MM/AAAA)
        const period = String(row['Período'] || row['Periodo'] || row['Data'] || '');
        if (!period) {
          log.warn('Linha sem período definido', { installationNumber });
          errorCount++;
          continue;
        }
        
        // Mapear os dados para o modelo EnergyBillData
        await db.energyBillData.create({
          data: {
            uploadBatchId: batchId,
            installationId: installation.id,
            period,
            modality: String(row['Modalidade'] || ''),
            quota: parseFloat(String(row['Quota'] || row['Quota (%)'] || 0)),
            tariffPost: String(row['Posto Horário'] || row['Posto Horario'] || ''),
            previousBalance: parseFloat(String(row['Saldo Anterior'] || 0)),
            expiredBalance: parseFloat(String(row['Saldo Expirado'] || 0)),
            consumption: parseFloat(String(row['Consumo'] || row['Consumo'] || 0)),
            generation: parseFloat(String(row['Geração'] || row['Geracao'] || 0)),
            compensation: parseFloat(String(row['Compensação'] || row['Compensacao'] || 0)),
            transferred: parseFloat(String(row['Transferido'] || row['Transferido'] || 0)),
            received: parseFloat(String(row['Recebimento'] || row['Recebido'] || 0)),
            currentBalance: parseFloat(String(row['Saldo Atual'] || 0)),
            expiringBalanceAmount: parseFloat(String(row['Quantidade Saldo a Expirar'] || 0)),
            expiringBalancePeriod: String(row['Período Saldo a Expirar'] || row['Periodo Saldo a Expirar'] || ''),
            dataSource: 'cemig_upload',
          },
        });
        
        processedCount++;
      } catch (rowError) {
        log.error('Erro ao processar linha do arquivo', { error: rowError, row });
        errorCount++;
      }
    }
    
    log.info('Processamento de arquivo concluído', { 
      batchId, 
      total: data.length,
      processed: processedCount,
      errors: errorCount,
      notFound: notFoundCount
    });
    
    return NextResponse.json({
      success: true,
      message: 'Arquivo processado com sucesso',
      stats: {
        batchId,
        total: data.length,
        processed: processedCount,
        errors: errorCount,
        notFound: notFoundCount
      }
    });
  } catch (error) {
    log.error('Erro ao processar arquivo de dados de energia', { error });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao processar arquivo de dados de energia',
      },
      { status: 500 }
    );
  }
} 
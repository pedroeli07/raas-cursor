import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { getUserFromRequest } from '@/lib/utils/utils';

// Interface to define common structure for processing strategies
interface FileProcessingStrategy {
  process(fileBuffer: ArrayBuffer, distributorId: string, fileName: string): Promise<ProcessingResult>;
}

// Result of processing a file
interface ProcessingResult {
  batchId: string;
  total: number;
  processed: number;
  errors: number;
  notFound: number;
  status: 'success' | 'processing' | 'failed';
}

// Define interface for upload batches
interface UploadBatch {
  id: string;
  fileName: string;
  distributorId: string;
  distributorName?: string;
  status: 'processing' | 'success' | 'failed';
  totalCount: number;
  processedCount: number;
  errorCount: number;
  notFoundCount: number;
  processingType: string;
  createdAt: Date;
  completedAt?: Date;
}

// Define structure for validation errors
interface ValidationError {
  type: 'missing_installation' | 'invalid_format' | 'other';
  installationNumber?: string;
  message: string;
}

/**
 * Strategy for processing CEMIG XLSX files
 */
class CemigXlsxProcessingStrategy implements FileProcessingStrategy {
  async process(fileBuffer: ArrayBuffer, distributorId: string, fileName: string): Promise<ProcessingResult> {
    try {
      // Create batch ID 
      const batchId = uuidv4();
      
      // Get distributor details for reference
      const distributor = await prisma.distributor.findUnique({
        where: { id: distributorId }
      });
      
      if (!distributor) {
        throw new Error(`Distributor with ID ${distributorId} not found`);
      }

      log.info(`Starting to process CEMIG file for distributor ${distributor.name}`, { batchId, fileName });

      // Parse the Excel file
      const workbook = XLSX.read(fileBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (!data || data.length === 0) {
        const validationError: ValidationError = {
          type: 'invalid_format',
          message: 'Arquivo vazio ou formato inválido'
        };
        log.error('Empty or invalid file format', { batchId, fileName, error: validationError });
        throw new Error(validationError.message);
      }

      log.info(`File parsed successfully with ${data.length} rows`, { batchId });

      // First identify all unique installation numbers
      const installationNumbers = new Set<string>();
      for (const row of data) {
        const installationNumber = String(row['Instalação'] || row['Instalacao'] || row['instalacao'] || row['instalação'] || '').trim();
        if (installationNumber) {
          installationNumbers.add(installationNumber);
        } else {
          log.warn('Row without installation number found in file', { row });
        }
      }
      
      log.info(`Found ${installationNumbers.size} unique installation numbers in file`, { batchId });
      
      // STRICT VALIDATION: Check if all installations exist before proceeding
      const existingInstallations = await prisma.installation.findMany({
        where: {
          installationNumber: { in: Array.from(installationNumbers) },
          distributorId
        },
        select: {
          id: true,
          installationNumber: true
        }
      });
      
      log.info(`Found ${existingInstallations.length} matching installations in database`, { 
        batchId,
        sampleInstallations: existingInstallations.slice(0, 5).map(i => i.installationNumber)
      });

      // Create map for quick lookups
      const existingInstallationMap = new Map<string, string>();
      for (const installation of existingInstallations) {
        existingInstallationMap.set(installation.installationNumber, installation.id);
      }
      
      // Find missing installations
      const missingInstallations = Array.from(installationNumbers).filter(
        number => !existingInstallationMap.has(number)
      );
      
      // STRICT VALIDATION: If any installations are missing, fail the upload
      if (missingInstallations.length > 0) {
        const validationErrors: ValidationError[] = missingInstallations.map(installationNumber => ({
          type: 'missing_installation',
          installationNumber,
          message: `Instalação ${installationNumber} não encontrada`
        }));
        
        log.error(`Upload validation failed: ${missingInstallations.length} installations not found in database`, { 
          batchId,
          missingInstallations: missingInstallations.slice(0, 20), // Log first 20 only to avoid huge logs
          totalMissing: missingInstallations.length,
          validationErrors: validationErrors.slice(0, 20)
        });
        
        // Create a batch record for the failed upload
        await prisma.energyDataUploadBatch.create({
          data: {
            id: batchId,
            fileName,
            distributorId,
            status: 'failed',
            totalCount: data.length,
            processedCount: 0,
            errorCount: missingInstallations.length,
            notFoundCount: missingInstallations.length,
            processingType: 'cemig',
            errorDetails: JSON.stringify({
              type: 'missing_installations',
              missingCount: missingInstallations.length,
              validationErrors: validationErrors.slice(0, 100) // Store first 100 validation errors
            })
          }
        });
        
        const errorMessage = missingInstallations.length > 10
          ? `${missingInstallations.length} instalações não encontradas (incluindo: ${missingInstallations.slice(0, 10).join(', ')}...)`
          : `Instalações não encontradas: ${missingInstallations.join(', ')}`;
        
        throw new Error(`Falha na validação: ${errorMessage}. As instalações devem ser cadastradas antes do upload de dados.`);
      }

      // Create database record for the upload batch
      const uploadBatch = await prisma.energyDataUploadBatch.create({
        data: {
          id: batchId,
          fileName,
          distributorId,
          status: 'processing',
          totalCount: data.length,
          processedCount: 0,
          errorCount: 0,
          notFoundCount: 0,
          processingType: 'cemig',
        }
      });

      log.info(`Batch record created successfully`, { batchId, fileName });
      
      // Process each row
      let processedCount = 0;
      let errorCount = 0;
      let notFoundCount = 0;
      
      // Batch processing for better performance
      const billDataToCreate = [];
      
      // Now process each row with our installation map
      for (const row of data) {
        try {
          const installationNumber = String(row['Instalação'] || row['Instalacao'] || row['instalacao'] || row['instalação'] || '').trim();
          
          if (!installationNumber) {
            log.warn('Row without installation number', { row, batchId });
            errorCount++;
            continue;
          }
          
          // Get the installation ID from our map
          const installationId = existingInstallationMap.get(installationNumber);
          
          if (!installationId) {
            // This should never happen since we validated all installations exist
            log.error(`Installation not found in map despite validation: ${installationNumber}`, { 
              batchId, 
              row,
              mapSize: existingInstallationMap.size
            });
            notFoundCount++;
            continue;
          }
          
          // Extract period (MM/AAAA)
          const period = String(row['Período'] || row['Periodo'] || row['Data'] || '');
          if (!period) {
            log.warn('Row without period defined', { installationNumber, batchId });
            errorCount++;
            continue;
          }
          
          // Prepare data for creation
          billDataToCreate.push({
            uploadBatchId: batchId,
            installationId,
            period,
            modality: String(row['Modalidade'] || ''),
            quota: this.parseFloatSafe(row['Quota'] || row['Quota (%)'] || 0),
            tariffPost: String(row['Posto Horário'] || row['Posto Horario'] || ''),
            previousBalance: this.parseFloatSafe(row['Saldo Anterior'] || 0),
            expiredBalance: this.parseFloatSafe(row['Saldo Expirado'] || 0),
            consumption: this.parseFloatSafe(row['Consumo'] || 0),
            generation: this.parseFloatSafe(row['Geração'] || row['Geracao'] || 0),
            compensation: this.parseFloatSafe(row['Compensação'] || row['Compensacao'] || 0),
            transferred: this.parseFloatSafe(row['Transferido'] || 0),
            received: this.parseFloatSafe(row['Recebimento'] || row['Recebido'] || 0),
            currentBalance: this.parseFloatSafe(row['Saldo Atual'] || 0),
            expiringBalanceAmount: this.parseFloatSafe(row['Quantidade Saldo a Expirar'] || 0),
            expiringBalancePeriod: String(row['Período Saldo a Expirar'] || row['Periodo Saldo a Expirar'] || ''),
            dataSource: 'cemig_upload',
          });
          
          processedCount++;
        } catch (rowError) {
          log.error('Error processing file row', { error: rowError, row, batchId });
          errorCount++;
        }
      }
      
      // Create all records in a single batch for better performance
      log.info(`Inserting ${billDataToCreate.length} records into CemigEnergyBillData`, { batchId });
      if (billDataToCreate.length > 0) {
        try {
          await prisma.cemigEnergyBillData.createMany({
            data: billDataToCreate,
            skipDuplicates: true, // Skip if there's a duplicate (installationId + period)
          });
          log.info(`Successfully inserted ${billDataToCreate.length} records`, { batchId });
          
          // Após criar os registros regulares, criar também registros permanentes
          log.info(`Creating permanent records for historical preservation`, { batchId });
          
          // Construir dados para os registros permanentes
          // Para cada registro, precisamos obter informações adicionais da instalação e do proprietário
          const permanentRecords = [];
          for (const billData of billDataToCreate) {
            try {
              // Buscar detalhes da instalação
              const installation = await prisma.installation.findUnique({
                where: { id: billData.installationId },
                include: {
                  distributor: true,
                  owner: {
                    include: {
                      document: true
                    }
                  }
                }
              });
              
              if (!installation) {
                log.warn(`Installation not found for permanent record creation: ${billData.installationId}`, { batchId });
                continue;
              }
              
              // Construir registro permanente com dados completos
              permanentRecords.push({
                originalInstallationId: installation.id,
                installationNumber: installation.installationNumber,
                distributorId: installation.distributorId,
                distributorName: installation.distributor?.name || 'Unknown Distributor',
                period: billData.period,
                type: installation.type,
                originalOwnerId: installation.ownerId,
                ownerName: installation.owner?.name || null,
                ownerDocument: installation.owner?.document?.cpf || installation.owner?.document?.cnpj || null,
                consumption: billData.consumption,
                generation: billData.generation,
                transferred: billData.transferred,
                received: billData.received,
                compensation: billData.compensation,
                previousBalance: billData.previousBalance,
                currentBalance: billData.currentBalance,
                expiredBalance: billData.expiredBalance,
                expiringBalanceAmount: billData.expiringBalanceAmount,
                expiringBalancePeriod: billData.expiringBalancePeriod,
                quota: billData.quota,
                modality: billData.modality,
                tariffPost: billData.tariffPost,
                recordSource: 'upload_' + batchId
              });
            } catch (recordError) {
              log.error(`Error creating permanent record for installation ${billData.installationId}`, { 
                error: recordError, 
                batchId,
                billData 
              });
            }
          }
          
          // Criar registros permanentes em lote
          if (permanentRecords.length > 0) {
            try {
              await prisma.permanentEnergyRecord.createMany({
                data: permanentRecords,
                skipDuplicates: true, // Skip if there's a duplicate for the same installation and period
              });
              log.info(`Successfully created ${permanentRecords.length} permanent energy records`, { batchId });
            } catch (permanentRecordError) {
              log.error(`Error creating permanent energy records`, { 
                error: permanentRecordError, 
                batchId,
                count: permanentRecords.length
              });
              // Não interrompemos o processo por falha na criação dos registros permanentes
              // O processamento principal já foi bem-sucedido
            }
          }
        } catch (insertError) {
          log.error('Error inserting data into CemigEnergyBillData', { 
            error: insertError, 
            batchId,
            sampleData: billDataToCreate.length > 0 ? billDataToCreate[0] : null
          });
          throw new Error(`Falha ao inserir dados: ${insertError instanceof Error ? insertError.message : 'Erro desconhecido'}`);
        }
      }
      
      // Update batch status
      const status = processedCount > 0 ? 'success' : 'failed';
      await this.updateBatchStatus(batchId, status, data.length, processedCount, errorCount, notFoundCount);
      
      // Format response using UploadBatch interface
      const result: ProcessingResult = {
        batchId,
        total: data.length,
        processed: processedCount,
        errors: errorCount,
        notFound: notFoundCount,
        status: status as 'success' | 'processing' | 'failed'
      };
      
      return result;
    } catch (error) {
      log.error('Erro ao processar arquivo CEMIG', { error });
      throw error;
    }
  }

  private parseFloatSafe(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    // If value is already a number, return it
    if (typeof value === 'number') {
      return value;
    }
    
    // Convert to string and try to parse
    const strValue = String(value).replace(',', '.');
    const parsed = parseFloat(strValue);
    
    return isNaN(parsed) ? null : parsed;
  }

  private async updateBatchStatus(
    batchId: string, 
    status: 'success' | 'processing' | 'failed', 
    total: number, 
    processed: number, 
    errors: number, 
    notFound: number
  ): Promise<void> {
    await prisma.energyDataUploadBatch.update({
      where: { id: batchId },
      data: {
        status,
        totalCount: total,
        processedCount: processed,
        errorCount: errors,
        notFoundCount: notFound,
        completedAt: status !== 'processing' ? new Date() : undefined
      }
    });
  }
}

/**
 * Factory class to create the appropriate strategy based on distributor
 */
class FileProcessingStrategyFactory {
  static async createStrategy(distributorId: string): Promise<FileProcessingStrategy> {
    try {
      // Get distributor details
      const distributor = await prisma.distributor.findUnique({
        where: { id: distributorId }
      });
      
      if (!distributor) {
        throw new Error(`Distribuidora não encontrada (ID: ${distributorId})`);
      }
      
      // For now, we're only supporting CEMIG, but this is where you'd add more strategies
      const distributorName = distributor.name.toLowerCase();
      
      if (distributorName === 'cemig') {
        return new CemigXlsxProcessingStrategy();
      }
      
      // Default to CEMIG strategy for now
      log.warn(`Estratégia de processamento não específica para distribuidora ${distributorName}, usando CEMIG como padrão`);
      return new CemigXlsxProcessingStrategy();
    } catch (error) {
      log.error('Erro ao criar estratégia de processamento', { error, distributorId });
      throw new Error('Não foi possível determinar a estratégia de processamento para esta distribuidora');
    }
  }
}

/**
 * POST /api/energy-data/upload
 * Endpoint para processar o upload de arquivos de dados de energia
 */
export async function POST(request: NextRequest) {
  log.info('Received energy data file upload request');

  // Verificar autenticação
  const authCheck = validateAuthentication(request);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(request);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN_STAFF') {
    log.warn('Unauthorized attempt to upload energy data', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const distributorId = formData.get('distributorId') as string;

    // Validate input
    if (!file) {
      const validationError: ValidationError = {
        type: 'invalid_format',
        message: 'Nenhum arquivo enviado'
      };
      return createErrorResponse(validationError.message, 400);
    }

    if (!distributorId) {
      const validationError: ValidationError = {
        type: 'other',
        message: 'ID da distribuidora não informado'
      };
      return createErrorResponse(validationError.message, 400);
    }

    // Validate file type
    const fileType = file.type;
    if (!fileType.includes('spreadsheet') && !fileType.includes('excel')) {
      const validationError: ValidationError = {
        type: 'invalid_format',
        message: 'Formato de arquivo inválido. Envie um arquivo Excel (.xlsx ou .xls)'
      };
      return createErrorResponse(validationError.message, 400);
    }

    // Get processing strategy based on distributor
    const strategy = await FileProcessingStrategyFactory.createStrategy(distributorId);
    
    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Process the file
    const result = await strategy.process(fileBuffer, distributorId, file.name);
    
    log.info('Processamento de arquivo concluído', { result });
    
    // Converter o resultado para UploadBatch se ainda não estiver no formato
    const uploadResult: UploadBatch = {
      id: result.batchId,
      fileName: file.name,
      distributorId,
      status: result.status as 'processing' | 'success' | 'failed',
      totalCount: result.total,
      processedCount: result.processed,
      errorCount: result.errors,
      notFoundCount: result.notFound,
      processingType: 'cemig',
      createdAt: new Date(),
      completedAt: result.status !== 'processing' ? new Date() : undefined
    };
    
    return NextResponse.json({
      success: true,
      message: 'Arquivo processado com sucesso',
      batch: uploadResult
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log.error('Erro ao processar arquivo de dados de energia', { error });
    
    // Criar um objeto ValidationError para a resposta
    const validationError: ValidationError = {
      type: 'other',
      message: errorMessage
    };
    
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao processar arquivo: ${errorMessage}`,
        error: validationError
      },
      { status: 500 }
    );
  }
} 
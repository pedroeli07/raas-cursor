import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { getUserFromRequest } from '@/lib/utils/utils';

// Interface for API response format
interface UploadHistoryItem {
  id: string;
  distributorId: string;
  distributorName: string;
  fileName: string;
  status: string;
  uploadedAt: Date;
  processedItems: number;
  totalItems: number;
  errorCount: number;
  notFoundCount: number;
}

interface UploadBatch {
  id: string;
  fileName: string;
  distributorId: string;
  status: string;
  createdAt: Date;
  processedCount: number;
  errorCount: number;
  distributor: {
    name: string | null;
  };
}

/**
 * Endpoint para obter o histórico de uploads de dados de energia
 * GET /api/energy-data/upload/history
 */
export async function GET(request: NextRequest) {
  log.info('Received request to fetch energy data upload history');

  // Verificar autenticação
  const authCheck = validateAuthentication(request);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(request);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN_STAFF') {
    log.warn('Unauthorized attempt to access upload history', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    // Get uploads from database using Prisma directly
    const uploadBatches = await prisma.energyDataUploadBatch.findMany({
      include: {
        distributor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform the data for the frontend
    const uploads = uploadBatches.map((batch: UploadBatch) => ({
      id: batch.id,
      fileName: batch.fileName,
      distributorId: batch.distributorId,
      distributorName: batch.distributor.name || 'Desconhecida',
      timestamp: batch.createdAt.toISOString(),
      status: mapStatusForFrontend(batch.status),
      fileSize: 0, // File size isn't stored, could be added to schema if needed
      itemsProcessed: batch.processedCount,
      errorCount: batch.errorCount
    }));

    log.info('Upload history fetched successfully', { count: uploads.length });
    
    return NextResponse.json({
      success: true,
      uploads
    });
  } catch (error) {
    log.error('Error fetching upload history', { error });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar histórico de uploads',
      },
      { status: 500 }
    );
  }
}

/**
 * Maps the database status values to what the frontend component expects
 */
function mapStatusForFrontend(status: string): 'completed' | 'processing' | 'error' {
  switch (status) {
    case 'success':
      return 'completed';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'error';
    default:
      return 'processing';
  }
} 
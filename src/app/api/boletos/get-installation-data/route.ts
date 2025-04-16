import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse } from '@/lib/api/response-helpers';
import { validateAuthentication } from '@/lib/api/auth-helpers';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('api:boletos:get-installation-data');
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  log.info('Fetching installation data for boletos');
  
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for installation data request');
    return authCheck.errorResponse;
  }

  // Get installation ID from the URL query parameters
  const url = new URL(req.url);
  const installationId = url.searchParams.get('installationId');
  const clientId = url.searchParams.get('clientId');

  if (!installationId) {
    log.warn('No installation ID provided');
    return createErrorResponse('Installation ID is required', 400);
  }

  try {
    // Get installation with latest energy data
    const installation = await prisma.installation.findUnique({
      where: {
        id: installationId,
        ...(clientId ? { ownerId: clientId } : {}),
      },
      include: {
        distributor: {
          include: {
            kwhPrices: {
              orderBy: { startDate: 'desc' },
              take: 1,
            }
          }
        },
        cemigEnergyBills: {
          orderBy: {
            period: 'desc'
          },
          take: 5 // Get last 5 records for history
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        address: true
      }
    });

    if (!installation) {
      log.warn(`Installation not found: ${installationId}`);
      return createErrorResponse('Installation not found', 404);
    }

    // Calculate some aggregated values
    const latestBill = installation.cemigEnergyBills[0];
    const totalEnergyCompensation = installation.cemigEnergyBills
      .reduce((sum, bill) => sum + (bill.compensation || 0), 0);
    
    const currentKwhPrice = installation.distributor.kwhPrices.length > 0 
      ? installation.distributor.kwhPrices[0].price / 1000 // Convert from centavos to reais
      : 0.976; // Default value if no price is defined
    
    log.info(`Installation data fetched successfully: ${installationId}`);
    
    return NextResponse.json({
      installation: {
        id: installation.id,
        installationNumber: installation.installationNumber,
        type: installation.type,
        address: installation.address ? {
          street: installation.address.street,
          number: installation.address.number,
          complement: installation.address.complement,
          neighborhood: installation.address.neighborhood,
          city: installation.address.city,
          state: installation.address.state,
          zip: installation.address.zip
        } : null,
        owner: installation.owner,
        distributor: {
          id: installation.distributor.id,
          name: installation.distributor.name,
          pricePerKwh: currentKwhPrice
        },
        energyData: {
          latestPeriod: latestBill?.period,
          consumption: latestBill?.consumption || 0,
          generation: latestBill?.generation || 0,
          compensation: latestBill?.compensation || 0,
          transferred: latestBill?.transferred || 0,
          received: latestBill?.received || 0,
          previousBalance: latestBill?.previousBalance || 0,
          currentBalance: latestBill?.currentBalance || 0,
          totalCompensation: totalEnergyCompensation
        },
        history: installation.cemigEnergyBills.map(bill => ({
          period: bill.period,
          compensation: bill.compensation || 0,
          consumption: bill.consumption || 0
        }))
      }
    });
  } catch (error) {
    log.error('Error fetching installation data for boletos', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
} 
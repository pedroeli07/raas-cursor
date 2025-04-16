import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse } from '@/lib/api/response-helpers';
import { createLogger } from '@/lib/utils/logger';
import { validateAuthentication } from '@/lib/api/auth-helpers';

const log = createLogger('api:boletos:get-client-data');
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  log.info('Fetching client data for boletos');
  
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for client data request');
    return authCheck.errorResponse;
  }

  // Get client ID from the URL query parameters
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');

  try {
    // If clientId is provided, get specific client data
    if (clientId) {
      const client = await prisma.user.findUnique({
        where: {
          id: clientId,
          role: { in: ['CUSTOMER', 'ENERGY_RENTER'] },
        },
        include: {
          installations: {
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
                take: 1
              }
            }
          }
        }
      });

      if (!client) {
        log.warn(`Client not found: ${clientId}`);
        return createErrorResponse('Client not found', 404);
      }

      log.info(`Client data fetched successfully: ${clientId}`);
      return NextResponse.json({ 
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          installations: client.installations.map(inst => ({
            id: inst.id,
            installationNumber: inst.installationNumber,
            type: inst.type,
            distributor: {
              id: inst.distributor.id,
              name: inst.distributor.name,
              pricePerKwh: inst.distributor.kwhPrices.length > 0 
                ? inst.distributor.kwhPrices[0].price / 1000 // Convert from centavos to reais
                : 0
            },
            latestData: inst.cemigEnergyBills.length > 0 ? {
              period: inst.cemigEnergyBills[0].period,
              previousBalance: inst.cemigEnergyBills[0].previousBalance,
              consumption: inst.cemigEnergyBills[0].consumption,
              generation: inst.cemigEnergyBills[0].generation,
              compensation: inst.cemigEnergyBills[0].compensation,
              currentBalance: inst.cemigEnergyBills[0].currentBalance
            } : null
          }))
        } 
      });
    } 
    // Otherwise, get a list of all clients
    else {
      const clients = await prisma.user.findMany({
        where: {
          role: { in: ['CUSTOMER', 'ENERGY_RENTER'] },
        },
        select: {
          id: true,
          name: true,
          email: true,
          installations: {
            select: {
              id: true,
              distributor: {
                select: {
                  name: true
                }
              }
            },
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      log.info(`Fetched ${clients.length} clients`);
      
      return NextResponse.json({ 
        clients: clients.map(client => ({
          id: client.id,
          name: client.name || client.email,
          email: client.email,
          installationsCount: client.installations.length,
          mainDistributor: client.installations.length > 0 
            ? client.installations[0].distributor.name 
            : null
        }))
      });
    }
  } catch (error) {
    log.error('Error fetching client data for boletos', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
} 
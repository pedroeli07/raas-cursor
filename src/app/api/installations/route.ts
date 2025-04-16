import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { getUserFromRequest } from '@/lib/utils/utils';
import { validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { installations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Prisma } from '@prisma/client'; // Import Prisma types

// GET - List all installations (consider pagination for large datasets)
export async function GET(req: NextRequest) {
  log.info('Received request to list installations');
  console.log('API: Received GET request for installations');

  const { searchParams } = new URL(req.url);

  // Extract filter parameters from query string
  const consumptionMin = searchParams.get('consumption_min');
  const consumptionMax = searchParams.get('consumption_max');
  const generationMin = searchParams.get('generation_min');
  const generationMax = searchParams.get('generation_max');
  const receivedMin = searchParams.get('received_min');
  const receivedMax = searchParams.get('received_max');
  const transferredMin = searchParams.get('transferred_min');
  const transferredMax = searchParams.get('transferred_max');
  const period = searchParams.get('period'); // Allow filtering by a specific period (e.g., 'YYYY-MM')

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    console.error('API: Authentication failed for installations request');
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  console.log('API: User role for installations request', { userRole });
  
  // Check admin rights directly
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN_STAFF') {
    log.warn('Unauthorized attempt to list installations', { userRole });
    console.error('API: Unauthorized role for installations request', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    console.log('API: Querying database for installations with filters', {
      consumptionMin, consumptionMax, generationMin, generationMax,
      receivedMin, receivedMax, transferredMin, transferredMax, period
    });

    // Build the filter conditions for CemigEnergyBill
    const energyBillFilters: Prisma.CemigEnergyBillDataWhereInput[] = [];

    if (period) {
      energyBillFilters.push({ period });
    }
    if (consumptionMin) {
      energyBillFilters.push({ consumption: { gte: parseFloat(consumptionMin) } });
    }
    if (consumptionMax) {
      energyBillFilters.push({ consumption: { lte: parseFloat(consumptionMax) } });
    }
    if (generationMin) {
      energyBillFilters.push({ generation: { gte: parseFloat(generationMin) } });
    }
    if (generationMax) {
      energyBillFilters.push({ generation: { lte: parseFloat(generationMax) } });
    }
    if (receivedMin) {
      energyBillFilters.push({ received: { gte: parseFloat(receivedMin) } });
    }
    if (receivedMax) {
      energyBillFilters.push({ received: { lte: parseFloat(receivedMax) } });
    }
    if (transferredMin) {
      energyBillFilters.push({ transferred: { gte: parseFloat(transferredMin) } });
    }
    if (transferredMax) {
      energyBillFilters.push({ transferred: { lte: parseFloat(transferredMax) } });
    }

    // Determine if energy bill filters are applied
    const hasEnergyFilters = energyBillFilters.length > 0;

    try {
      const installations = await prisma.installation.findMany({
        // Apply WHERE clause only if energy filters are present
        where: hasEnergyFilters ? {
          cemigEnergyBills: {
            some: energyBillFilters.length > 1 ? { AND: energyBillFilters } : energyBillFilters[0]
          }
        } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, role: true, contact: { select: { emails: true } } } },
          distributor: { select: { id: true, name: true } },
          address: true, // Include full address details
          cemigEnergyBills: {
            orderBy: { period: 'desc' },
            // If filtering by period, fetch that specific bill, otherwise the latest
            where: period ? { period } : undefined,
            take: 1,
            select: {
              period: true,
              consumption: true,
              generation: true,
              received: true,
              compensation: true,
              transferred: true,
              previousBalance: true,
              currentBalance: true,
              expiringBalanceAmount: true,
              expiringBalancePeriod: true,
              quota: true
            }
          }
        }
      });

      // Transform installations to include latest (or period-specific) energy data
      const transformedInstallations = installations.map(installation => {
        // If filtering by energy data, the bill included should already match the criteria.
        // If not filtering by energy, the latest bill is included.
        const bill = installation.cemigEnergyBills[0];
        return {
          ...installation,
          latestEnergyData: bill ? { // Rename for clarity, even if filtered by period
            period: bill.period,
            consumption: bill.consumption,
            generation: bill.generation,
            receipt: bill.received,
            compensation: bill.compensation,
            transferred: bill.transferred,
            previousBalance: bill.previousBalance,
            currentBalance: bill.currentBalance,
            expiringBalanceAmount: bill.expiringBalanceAmount,
            expiringBalancePeriod: bill.expiringBalancePeriod,
            quota: bill.quota
          } : null
        };
      })
      // We need to re-filter the results in memory if energy filters were applied
      // because the primary query fetched installations if *any* bill matched,
      // but we only included the *latest* or *period-specific* bill in the result.
      // This ensures the final list only contains installations where the relevant bill meets the criteria.
      .filter(installation => {
        if (!hasEnergyFilters || !installation.latestEnergyData) {
          // Keep if no energy filters or no energy data to filter on
          return true;
        }
        const data = installation.latestEnergyData;
        // Check against all applied filters
        return (
          (!consumptionMin || (data.consumption ?? 0) >= parseFloat(consumptionMin)) &&
          (!consumptionMax || (data.consumption ?? 0) <= parseFloat(consumptionMax)) &&
          (!generationMin || (data.generation ?? 0) >= parseFloat(generationMin)) &&
          (!generationMax || (data.generation ?? 0) <= parseFloat(generationMax)) &&
          (!receivedMin || (data.receipt ?? 0) >= parseFloat(receivedMin)) &&
          (!receivedMax || (data.receipt ?? 0) <= parseFloat(receivedMax)) &&
          (!transferredMin || (data.transferred ?? 0) >= parseFloat(transferredMin)) &&
          (!transferredMax || (data.transferred ?? 0) <= parseFloat(transferredMax))
        );
      });

      console.log('API: Successfully fetched and filtered installations', {
        count: transformedInstallations.length,
        sampleIds: transformedInstallations.slice(0, 3).map(i => i.id)
      });
      
      if (transformedInstallations.length > 0) {
        console.log('API: Sample installation data', {
          id: transformedInstallations[0].id,
          installationNumber: transformedInstallations[0].installationNumber,
          type: transformedInstallations[0].type,
          status: transformedInstallations[0].status,
          distributorName: transformedInstallations[0].distributor?.name,
          hasEnergyData: !!transformedInstallations[0].latestEnergyData
        });
      } else {
        console.log('API: No installations found in the database');
      }

      log.info('Installations fetched successfully', { count: transformedInstallations.length });
      return NextResponse.json({ installations: transformedInstallations });
    } catch (dbError) {
      console.error('API: Database error fetching installations', dbError);
      log.error('Database error fetching installations', { error: dbError });
      return createErrorResponse('Database Error: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'), 500);
    }
  } catch (error) {
    console.error('API: Error fetching installations', error);
    log.error('Error fetching installations', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// POST - Create a new installation
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authCheck = validateAuthentication(req);
    if (!authCheck.isAuthenticated) {
      return authCheck.errorResponse;
    }

    const { userRole, userId } = getUserFromRequest(req);
    // Check admin rights directly
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN_STAFF') {
      log.warn('Unauthorized attempt to create installation', { userRole });
      return createErrorResponse('Forbidden: Admin privileges required', 403);
    }

    log.info("Received request to create installation");

    const data = await req.json();
    const { installationNumber, type, distributorId, ownerId, address, status } = data;

    // Validate required fields
    if (!installationNumber || !type || !distributorId) {
      return NextResponse.json(
        { error: "Campos obrigatórios não informados" },
        { status: 400 }
      );
    }

    // Ensure valid status - convert to uppercase or use default
    const validStatus = status ? status.toUpperCase() : 'ACTIVE';
    
    // Check if the status is a valid enum value
    if (!['ACTIVE', 'INACTIVE'].includes(validStatus)) {
      return NextResponse.json(
        { error: "Status inválido. Valores permitidos: ACTIVE, INACTIVE" },
        { status: 400 }
      );
    }

    // Verify if distributor exists
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      return NextResponse.json(
        { error: "Distribuidora não encontrada" },
        { status: 404 }
      );
    }

    // Verify if owner exists (if provided)
    if (ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, role: true },
      });

      if (!owner) {
        return NextResponse.json(
          { error: "Proprietário não encontrado" },
          { status: 404 }
        );
      }

      // Verify if owner role is valid (CUSTOMER or ENERGY_RENTER)
      if (owner.role !== "CUSTOMER" && owner.role !== "ENERGY_RENTER") {
        return NextResponse.json(
          { error: "Papel do proprietário não é válido" },
          { status: 400 }
        );
      }
    }

    // Check if installation number already exists for this distributor
    const existingInstallation = await prisma.installation.findFirst({
      where: {
        installationNumber,
        distributorId,
      },
    });

    if (existingInstallation) {
      return NextResponse.json(
        {
          error: "Já existe uma instalação com este número para esta distribuidora",
        },
        { status: 409 }
      );
    }

    // Create a new address first
    let newAddress;
    if (!address) {
      return NextResponse.json(
        { error: "Endereço é obrigatório" },
        { status: 400 }
      );
    }

    try {
      newAddress = await prisma.address.create({
        data: {
          street: address.street,
          number: address.number,
          complement: address.complement || "",
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zip: address.zip,
          type: "INSTALLATION"
        },
      });
      log.info("Created new address", { addressId: newAddress.id });
    } catch (error) {
      log.error("Error creating address", { error });
      return NextResponse.json(
        { error: "Erro ao criar endereço" },
        { status: 500 }
      );
    }

    // Prepare installation data with the addressId
    const installationData = {
      installationNumber,
      type,
      distributorId,
      addressId: newAddress.id,
      status: validStatus,
    };

    // Add ownerId if provided
    if (ownerId) {
      Object.assign(installationData, { ownerId });
    }

    // Create the installation
    const installation = await prisma.installation.create({
      data: installationData,
      include: {
        address: true,
        distributor: true,
        owner: true,
      },
    });

    return NextResponse.json(installation, { status: 201 });
  } catch (error) {
    log.error("Error creating installation", { error });
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an installation
export async function DELETE(req: NextRequest) {
  log.info('Received request to delete installation');
  console.log('API: Received DELETE request for installation');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    console.error('API: Authentication failed for installation deletion request');
    return authCheck.errorResponse;
  }

  const { userRole, userId } = getUserFromRequest(req);
  // Apenas ADMIN e SUPER_ADMIN podem excluir instalações
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized attempt to delete installation', { userRole });
    console.error('API: Unauthorized role for installation deletion', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    // Obter o ID da instalação a ser excluída da URL
    const url = new URL(req.url);
    const idParam = url.searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'ID da instalação não informado' }, { status: 400 });
    }

    // Buscar o usuário para obter o nome
    const user = await prisma.user.findUnique({
      where: { id: userId || '' },
      select: { name: true, email: true }
    });

    const userName = user?.name || user?.email || 'Usuário desconhecido';

    // Buscar a instalação antes de excluí-la para obter seus detalhes
    const installation = await prisma.installation.findUnique({
      where: { id: idParam },
      include: {
        distributor: true,
        owner: true,
        address: true,
        cemigEnergyBills: {
          take: 1,
          orderBy: { period: 'desc' }
        }
      }
    });

    if (!installation) {
      return NextResponse.json({ error: 'Instalação não encontrada' }, { status: 404 });
    }

    // Criar um snapshot de metadados para salvar no log de exclusão
    const metadataSnapshot = {
      installationNumber: installation.installationNumber,
      type: installation.type,
      status: installation.status,
      distributor: installation.distributor?.name,
      address: installation.address 
        ? `${installation.address.street}, ${installation.address.number}, ${installation.address.city}-${installation.address.state}`
        : null,
      owner: installation.owner 
        ? { id: installation.owner.id, name: installation.owner.name, email: installation.owner.email }
        : null,
      recentEnergyData: installation.cemigEnergyBills[0] || null,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt
    };

    // Registrar a exclusão no log de exclusões
    const deletionLog = await prisma.deletionLog.create({
      data: {
        entityType: 'installation',
        entityId: installation.id,
        entityIdentifier: installation.installationNumber,
        reason: url.searchParams.get('reason') || 'Razão não especificada',
        deletedBy: userId || '',
        deletedByName: userName,
        metadataSnapshot: JSON.stringify(metadataSnapshot)
      }
    });

    log.info('Created deletion log record for installation', { 
      installationId: installation.id, 
      deletionLogId: deletionLog.id 
    });
    
    // Excluir a instalação
    await prisma.installation.delete({
      where: { id: idParam }
    });

    log.info('Installation deleted successfully', { 
      installationId: idParam,
      installationNumber: installation.installationNumber,
      deletionLogId: deletionLog.id
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Instalação excluída com sucesso', 
      deletionLog: {
        id: deletionLog.id,
        timestamp: deletionLog.deletedAt
      }
    });
  } catch (error) {
    log.error('Error deleting installation', { error });
    return NextResponse.json(
      { error: 'Erro ao excluir instalação', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 
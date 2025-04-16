import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/utils';
import { prisma } from '@/lib/db/db';
import { isAdmin } from '@/lib/utils/utils';
import { backendLog } from '@/lib/logs/logger';

// GET - Fetch all allocations
export async function GET(req: NextRequest) {
  try {
    // Get user info from request
    const user = getUserFromRequest(req);
    
    if (!user.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Determine which allocations to fetch based on user role
    let allocations;
    
    if (isAdmin(user.userRole)) {
      // Admins can see all allocations
      allocations = await prisma.allocation.findMany({
        include: {
          generator: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              distributor: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          consumer: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              distributor: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Non-admins can only see allocations related to their installations
      const userInstallations = await prisma.installation.findMany({
        where: {
          ownerId: user.userId
        },
        select: {
          id: true
        }
      });

      const installationIds = userInstallations.map(install => install.id);

      allocations = await prisma.allocation.findMany({
        where: {
          OR: [
            { generatorId: { in: installationIds } },
            { consumerId: { in: installationIds } }
          ]
        },
        include: {
          generator: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              distributor: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          consumer: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              distributor: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json({ allocations });
  } catch (error) {
    backendLog.error('Error fetching allocations:', error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to fetch allocations" },
      { status: 500 }
    );
  }
}

// POST - Create a new allocation
export async function POST(req: NextRequest) {
  try {
    // Get user info from request
    const user = getUserFromRequest(req);
    
    if (!user.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admins can create allocations
    if (!isAdmin(user.userRole)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { generatorId, consumerId, quota } = body;

    // Validate required fields
    if (!generatorId || !consumerId || quota === undefined || quota === null) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if quota is a valid number
    if (isNaN(quota) || quota <= 0 || quota > 100) {
      return NextResponse.json(
        { error: "Bad Request", message: "Quota must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Check if generator exists and is of correct type
    const generator = await prisma.installation.findUnique({
      where: { id: generatorId },
    });

    if (!generator || generator.type !== 'GENERATOR') {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid generator installation" },
        { status: 400 }
      );
    }

    // Check if consumer exists and is of correct type
    const consumer = await prisma.installation.findUnique({
      where: { id: consumerId },
    });

    if (!consumer || consumer.type !== 'CONSUMER') {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid consumer installation" },
        { status: 400 }
      );
    }

    // Check if the allocation already exists
    const existingAllocation = await prisma.allocation.findFirst({
      where: {
        generatorId,
        consumerId
      }
    });

    if (existingAllocation) {
      return NextResponse.json(
        { error: "Conflict", message: "Allocation between these installations already exists" },
        { status: 409 }
      );
    }

    // Calculate total allocations for the generator
    const generatorAllocations = await prisma.allocation.findMany({
      where: {
        generatorId
      }
    });

    const totalAllocatedQuota = generatorAllocations.reduce((sum, allocation) => sum + allocation.quota, 0);

    // Check if adding this allocation would exceed 100%
    if (totalAllocatedQuota + quota > 100) {
      return NextResponse.json(
        { error: "Bad Request", message: "Total allocations for this generator would exceed 100%" },
        { status: 400 }
      );
    }

    // Create the allocation
    const allocation = await prisma.allocation.create({
      data: {
        generatorId,
        consumerId,
        quota
      },
      include: {
        generator: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            distributor: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        consumer: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            distributor: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    backendLog.error('Error creating allocation:', error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to create allocation" },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/utils';
import { prisma } from '@/lib/db/db';
import { isAdmin } from '@/lib/utils/utils';
import { backendLog } from '@/lib/logs/logger';

// GET - Get a specific allocation by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Allocation ID is required" },
        { status: 400 }
      );
    }

    // Get user info from request
    const user = getUserFromRequest(req);
    
    if (!user.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch the allocation
    const allocation = await prisma.allocation.findUnique({
      where: { id },
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

    if (!allocation) {
      return NextResponse.json(
        { error: "Not Found", message: "Allocation not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this allocation
    if (!isAdmin(user.userRole)) {
      // Non-admin users can only access their own allocations
      const userInstallations = await prisma.installation.findMany({
        where: {
          ownerId: user.userId
        },
        select: {
          id: true
        }
      });

      const installationIds = userInstallations.map(install => install.id);
      
      if (!installationIds.includes(allocation.generatorId) && !installationIds.includes(allocation.consumerId)) {
        return NextResponse.json(
          { error: "Forbidden", message: "Access denied to this allocation" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(allocation);
  } catch (error) {
    backendLog.error('Error fetching allocation by ID:', error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to fetch allocation" },
      { status: 500 }
    );
  }
}

// PUT - Update an allocation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Allocation ID is required" },
        { status: 400 }
      );
    }

    // Get user info from request
    const user = getUserFromRequest(req);
    
    if (!user.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admins can update allocations
    if (!isAdmin(user.userRole)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if allocation exists
    const existingAllocation = await prisma.allocation.findUnique({
      where: { id }
    });

    if (!existingAllocation) {
      return NextResponse.json(
        { error: "Not Found", message: "Allocation not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { generatorId, consumerId, quota } = body;

    // Validate data
    if (quota !== undefined && (isNaN(quota) || quota <= 0 || quota > 100)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Quota must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Check for installation type validity if IDs are provided
    if (generatorId) {
      const generator = await prisma.installation.findUnique({
        where: { id: generatorId }
      });
      
      if (!generator || generator.type !== 'GENERATOR') {
        return NextResponse.json(
          { error: "Bad Request", message: "Invalid generator installation" },
          { status: 400 }
        );
      }
    }

    if (consumerId) {
      const consumer = await prisma.installation.findUnique({
        where: { id: consumerId }
      });
      
      if (!consumer || consumer.type !== 'CONSUMER') {
        return NextResponse.json(
          { error: "Bad Request", message: "Invalid consumer installation" },
          { status: 400 }
        );
      }
    }

    // Check if the new allocation combination already exists
    if (generatorId && consumerId && (generatorId !== existingAllocation.generatorId || consumerId !== existingAllocation.consumerId)) {
      const duplicateAllocation = await prisma.allocation.findFirst({
        where: {
          generatorId,
          consumerId,
          id: { not: id } // Exclude the current allocation
        }
      });

      if (duplicateAllocation) {
        return NextResponse.json(
          { error: "Conflict", message: "Allocation between these installations already exists" },
          { status: 409 }
        );
      }
    }

    // Calculate total allocations for the generator if quota is changing
    if (quota !== undefined && (quota !== existingAllocation.quota || generatorId !== existingAllocation.generatorId)) {
      const targetGeneratorId = generatorId || existingAllocation.generatorId;
      
      const generatorAllocations = await prisma.allocation.findMany({
        where: {
          generatorId: targetGeneratorId,
          id: { not: id } // Exclude the current allocation
        }
      });

      const totalAllocatedQuota = generatorAllocations.reduce((sum, allocation) => sum + allocation.quota, 0);

      if (totalAllocatedQuota + quota > 100) {
        return NextResponse.json(
          { error: "Bad Request", message: "Total allocations for this generator would exceed 100%" },
          { status: 400 }
        );
      }
    }

    // Update the allocation
    const updatedAllocation = await prisma.allocation.update({
      where: { id },
      data: {
        generatorId: generatorId || undefined,
        consumerId: consumerId || undefined,
        quota: quota !== undefined ? quota : undefined,
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

    return NextResponse.json(updatedAllocation);
  } catch (error) {
    backendLog.error('Error updating allocation:', error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to update allocation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an allocation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Allocation ID is required" },
        { status: 400 }
      );
    }

    // Get user info from request
    const user = getUserFromRequest(req);
    
    if (!user.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admins can delete allocations
    if (!isAdmin(user.userRole)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if allocation exists
    const allocation = await prisma.allocation.findUnique({
      where: { id }
    });

    if (!allocation) {
      return NextResponse.json(
        { error: "Not Found", message: "Allocation not found" },
        { status: 404 }
      );
    }

    // Delete the allocation
    await prisma.allocation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Allocation deleted successfully" });
  } catch (error) {
    backendLog.error('Error deleting allocation:', error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to delete allocation" },
      { status: 500 }
    );
  }
} 
/**
 * Individual Project API - GET, PUT, DELETE
 *
 * GET /api/projects/[id] - Get project by ID (user-scoped)
 * PUT /api/projects/[id] - Update project (user-scoped)
 * DELETE /api/projects/[id] - Delete project (user-scoped)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/projects/[id]
 * Fetch a single project - only if it belongs to the authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch project with userId filter for security
    const project = await prisma.savedProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // CRITICAL: Verify ownership before returning data
    if (project.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - You do not have access to this project',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('[API] Error fetching project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project - only if it belongs to the authenticated user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if project exists and verify ownership
    const existing = await prisma.savedProject.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // CRITICAL: Verify ownership before allowing update
    if (existing.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - You do not have permission to update this project',
        },
        { status: 403 }
      );
    }

    // Update project
    const project = await prisma.savedProject.update({
      where: { id },
      data: {
        projectName: body.projectName,
        notes: body.notes,
        tags: body.tags,
        roiData: body.roiData,
        estimatedValue: body.estimatedValue ? parseFloat(body.estimatedValue) : undefined,
        mapSnapshot: body.mapSnapshot,
        // Allow updating other fields as needed
      },
    });

    console.log(`[API] ✅ Updated project: ${id}`);

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('[API] Error updating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project - only if it belongs to the authenticated user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user ID from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if project exists and verify ownership
    const existing = await prisma.savedProject.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // CRITICAL: Verify ownership before allowing deletion
    if (existing.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - You do not have permission to delete this project',
        },
        { status: 403 }
      );
    }

    // Delete project
    await prisma.savedProject.delete({
      where: { id },
    });

    console.log(`[API] ✅ Deleted project: ${id} (user: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

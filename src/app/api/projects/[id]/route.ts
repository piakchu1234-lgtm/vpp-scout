/**
 * Individual Project API - GET, PUT, DELETE
 *
 * GET /api/projects/[id] - Get project by ID
 * PUT /api/projects/[id] - Update project
 * DELETE /api/projects/[id] - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/projects/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if project exists
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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if project exists
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

    // Delete project
    await prisma.savedProject.delete({
      where: { id },
    });

    console.log(`[API] ✅ Deleted project: ${id}`);

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

/**
 * Projects API - GET (list) and POST (create)
 *
 * GET /api/projects - List all saved projects
 * POST /api/projects - Create new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * List all saved projects (with pagination and filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get('userId');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch projects
    const [projects, total] = await Promise.all([
      prisma.savedProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          address: true,
          zoneCode: true,
          zoneDescription: true,
          lotArea: true,
          overlays: true,
          coordinates: true,
          estimatedValue: true,
          roiData: true,
          floorArea: true,
          projectName: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          // Exclude large fields (mapSnapshot, notes)
        },
      }),
      prisma.savedProject.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create new saved project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      address,
      pfi,
      zoneCode,
      zoneDescription,
      lotArea,
      overlays,
      coordinates,
      estimatedValue,
      marketDataSource,
      roiData,
      massingGeometry,
      floorArea,
      buildingHeight,
      mapState,
      mapSnapshot,
      projectName,
      notes,
      tags,
      userId,
    } = body;

    // Validation
    if (!address || !zoneCode || !lotArea || !coordinates || !roiData || !mapState) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['address', 'zoneCode', 'lotArea', 'coordinates', 'roiData', 'mapState'],
        },
        { status: 400 }
      );
    }

    // Create project
    const project = await prisma.savedProject.create({
      data: {
        userId,
        address,
        pfi,
        zoneCode,
        zoneDescription,
        lotArea: parseFloat(lotArea),
        overlays: overlays || [],
        coordinates,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        marketDataSource,
        roiData,
        massingGeometry,
        floorArea: floorArea ? parseFloat(floorArea) : null,
        buildingHeight: buildingHeight ? parseFloat(buildingHeight) : 5.0,
        mapState,
        mapSnapshot,
        projectName,
        notes,
        tags: tags || [],
      },
    });

    console.log(`[API] ✅ Created project: ${project.id} - ${project.address}`);

    return NextResponse.json(
      {
        success: true,
        project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Neighborhood Context Card
 *
 * Displays nearby amenities, transit options, and walkability score.
 * Provides Domain/REA neighborhood intelligence parity.
 */

'use client';

import React, { useMemo } from 'react';
import { MapPin, TrendingUp, Calendar } from 'lucide-react';
import {
  getMockAmenitiesForSuburb,
  findNearestAmenity,
  formatAmenityDistance,
  calculateWalkabilityScore,
  getWalkabilityRating,
  type NearbyAmenity,
} from '@/lib/map/amenitiesUtils';
import type { Position } from 'geojson';
import type { SuburbMarketTrends } from '@/lib/agentMarketIntegration';

interface NeighborhoodContextCardProps {
  propertyCoords: Position;
  suburb: string;
  postcode: string;
  suburbTrends?: SuburbMarketTrends;
}

export default function NeighborhoodContextCard({
  propertyCoords,
  suburb,
  postcode,
  suburbTrends,
}: NeighborhoodContextCardProps) {
  // Get amenities (mock data for now - in production would query Mapbox/OSM)
  const amenities = useMemo(
    () => getMockAmenitiesForSuburb(propertyCoords, suburb),
    [propertyCoords, suburb]
  );

  // Find nearest of each type
  const nearestSchool = findNearestAmenity(
    propertyCoords,
    amenities.filter(a => a.type === 'school')
  );
  const nearestTrain = findNearestAmenity(
    propertyCoords,
    amenities.filter(a => a.type === 'train')
  );
  const nearestBus = findNearestAmenity(
    propertyCoords,
    amenities.filter(a => a.type === 'bus')
  );
  const nearestPark = findNearestAmenity(
    propertyCoords,
    amenities.filter(a => a.type === 'park')
  );
  const nearestShopping = findNearestAmenity(
    propertyCoords,
    amenities.filter(a => a.type === 'shopping')
  );

  // Calculate walkability
  const walkabilityScore = calculateWalkabilityScore({
    nearestSchool: nearestSchool?.distance,
    nearestTransit: nearestTrain?.distance || nearestBus?.distance,
    nearestPark: nearestPark?.distance,
    nearestShopping: nearestShopping?.distance,
  });

  const walkability = getWalkabilityRating(walkabilityScore);

  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#E9E778]" />
        <h3 className="text-lg font-bold text-white">Neighborhood Context</h3>
      </div>

      {/* Suburb Market Trends */}
      {suburbTrends && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Market Trends - {suburb} {postcode}
          </h4>

          <div className="grid grid-cols-1 gap-2">
            {/* Suburb Median Price */}
            {suburbTrends.suburbMedianPrice && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Suburb Median</span>
                <span className="font-semibold text-white">
                  ${(suburbTrends.suburbMedianPrice / 1000).toFixed(0)}k
                </span>
              </div>
            )}

            {/* Growth Rate */}
            {suburbTrends.suburbGrowthRate !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Annual Growth</span>
                <span
                  className={`font-semibold ${
                    suburbTrends.suburbGrowthRate > 0
                      ? 'text-green-500'
                      : suburbTrends.suburbGrowthRate < 0
                      ? 'text-red-500'
                      : 'text-zinc-400'
                  }`}
                >
                  {suburbTrends.suburbGrowthRate > 0 ? '+' : ''}
                  {suburbTrends.suburbGrowthRate.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Days on Market */}
            {suburbTrends.averageDaysOnMarket && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Avg. Days on Market
                </span>
                <span className="font-semibold text-white">
                  {suburbTrends.averageDaysOnMarket} days
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nearby Amenities */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-400">Nearby Amenities</h4>

        <div className="space-y-2">
          {nearestSchool && (
            <AmenityRow
              icon={nearestSchool.icon}
              distance={formatAmenityDistance(nearestSchool.distance)}
              label={nearestSchool.name}
            />
          )}

          {nearestTrain && (
            <AmenityRow
              icon={nearestTrain.icon}
              distance={formatAmenityDistance(nearestTrain.distance)}
              label={nearestTrain.name}
            />
          )}

          {nearestBus && (
            <AmenityRow
              icon={nearestBus.icon}
              distance={formatAmenityDistance(nearestBus.distance)}
              label={nearestBus.name}
            />
          )}

          {nearestPark && (
            <AmenityRow
              icon={nearestPark.icon}
              distance={formatAmenityDistance(nearestPark.distance)}
              label={nearestPark.name}
            />
          )}

          {nearestShopping && (
            <AmenityRow
              icon={nearestShopping.icon}
              distance={formatAmenityDistance(nearestShopping.distance)}
              label={nearestShopping.name}
            />
          )}
        </div>
      </div>

      {/* Walkability Score */}
      <div className="pt-3 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Walkability Score</div>
            <div className="text-xs text-zinc-600 mt-0.5">{walkability.description}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{walkabilityScore}</div>
            <div className={`text-xs font-semibold ${walkability.color}`}>
              {walkability.label}
            </div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              walkabilityScore >= 80
                ? 'bg-green-500'
                : walkabilityScore >= 60
                ? 'bg-blue-500'
                : walkabilityScore >= 40
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${walkabilityScore}%` }}
          />
        </div>
      </div>

      {/* Data Source Note */}
      <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-500 italic">
        Amenity distances calculated from property center. Transit and POI data from OpenStreetMap.
      </div>
    </div>
  );
}

interface AmenityRowProps {
  icon: string;
  distance: string;
  label: string;
}

function AmenityRow({ icon, distance, label }: AmenityRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-zinc-400">{label}</span>
      </div>
      <span className="font-mono font-semibold text-[#E9E778]">{distance}</span>
    </div>
  );
}

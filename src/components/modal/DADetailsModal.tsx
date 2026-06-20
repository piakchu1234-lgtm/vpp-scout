/**
 * DA Details Modal
 *
 * Displays detailed information about a selected Development Application.
 * Glassmorphic modal with timeline, description, and council portal link.
 */

'use client';

import React from 'react';
import { X, ExternalLink, Calendar, Building2, MapPin } from 'lucide-react';
import type { DevelopmentApplication } from '@/types/developmentApplication';
import { getDAStatusLabel, getDAStatusColor, formatDADate } from '@/lib/da/daUtils';

interface DADetailsModalProps {
  da: DevelopmentApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DADetailsModal({ da, isOpen, onClose }: DADetailsModalProps) {
  if (!isOpen || !da) return null;

  const statusColor = getDAStatusColor(da.status);
  const statusLabel = getDAStatusLabel(da.status);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-[#E9E778]" />
              <h2 className="text-xl font-bold text-white">{da.daNumber}</h2>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <MapPin className="w-4 h-4" />
              <span>{da.address}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Description
            </h3>
            <p className="text-white leading-relaxed">{da.description}</p>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <div className="text-xs text-zinc-500">Lodged</div>
                  <div className="text-sm text-white font-medium">
                    {formatDADate(da.lodgedDate)}
                  </div>
                </div>
              </div>
              {da.decidedDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-zinc-500">Decided</div>
                    <div className="text-sm text-white font-medium">
                      {formatDADate(da.decidedDate)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Council
              </h3>
              <p className="text-sm text-white">{da.councilName}</p>
            </div>
            {da.distanceFromSubject !== undefined && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Distance
                </h3>
                <p className="text-sm text-white">
                  {da.distanceFromSubject < 1000
                    ? `${Math.round(da.distanceFromSubject)}m`
                    : `${(da.distanceFromSubject / 1000).toFixed(2)}km`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          {da.url ? (
            <a
              href={da.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#E9E778] hover:bg-[#E9E778]/90 text-[#05060E] font-semibold rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Council Portal
            </a>
          ) : (
            <div className="text-center text-sm text-zinc-500">
              No council portal link available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

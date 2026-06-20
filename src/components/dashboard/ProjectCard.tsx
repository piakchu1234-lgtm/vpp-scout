/**
 * Project Card Component
 *
 * Displays saved project with thumbnail, stats, and actions
 */

'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, TrendingUp, DollarSign, Trash2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: {
    id: string;
    projectName: string | null;
    address: string;
    zoneCode: string;
    lotArea: number;
    tags: string[];
    mapSnapshot: string | null;
    roiData: {
      constructionCost: number;
      endValue?: number;
      profit?: number;
      roi?: number;
      isViable: boolean;
    };
    estimatedValue: number | null;
    createdAt: string;
  };
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpen = () => {
    // Navigate to main app with project ID
    router.push(`/app?projectId=${project.id}`);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      onDelete(project.id);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString('en-AU')}`;
  };

  const getRoiColor = (roi: number | undefined) => {
    if (roi === undefined) return 'text-zinc-400';
    if (roi >= 20) return 'text-green-500';
    if (roi >= 10) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="group relative bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-[#E9E778]/10">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-800 overflow-hidden">
        {project.mapSnapshot ? (
          <img
            src={project.mapSnapshot}
            alt={project.projectName || project.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-zinc-700" />
          </div>
        )}

        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />

        {/* ROI Badge */}
        {project.roiData.roi !== undefined && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-xs font-bold">
            <span className={getRoiColor(project.roiData.roi)}>
              {project.roiData.roi.toFixed(1)}% ROI
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-base font-semibold text-white mb-1 line-clamp-1">
            {project.projectName || project.address}
          </h3>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{project.address}</span>
          </div>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-zinc-500">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Zone & Lot Area */}
          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="text-xs text-zinc-500 mb-0.5">Zone • Lot</div>
            <div className="text-sm font-semibold text-white">
              {project.zoneCode} • {project.lotArea.toFixed(0)}m²
            </div>
          </div>

          {/* Profit */}
          {project.roiData.profit !== undefined && (
            <div className="p-2 bg-zinc-800/50 rounded">
              <div className="flex items-center gap-1 text-xs text-zinc-500 mb-0.5">
                <TrendingUp className="w-3 h-3" />
                Profit
              </div>
              <div className={`text-sm font-semibold ${
                project.roiData.profit >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatCurrency(project.roiData.profit)}
              </div>
            </div>
          )}

          {/* End Value */}
          {project.roiData.endValue !== undefined && (
            <div className="p-2 bg-zinc-800/50 rounded col-span-2">
              <div className="flex items-center gap-1 text-xs text-zinc-500 mb-0.5">
                <DollarSign className="w-3 h-3" />
                Estimated Value
              </div>
              <div className="text-sm font-semibold text-white">
                {formatCurrency(project.roiData.endValue)}
              </div>
            </div>
          )}
        </div>

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-3">
          <Calendar className="w-3 h-3" />
          Saved {formatDate(project.createdAt)}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleOpen}
            className="flex-1 px-3 py-2 bg-[#E9E778] hover:bg-[#E9E778]/90 text-zinc-900 font-semibold rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              showDeleteConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm ? (isDeleting ? '...' : 'Confirm') : ''}
          </button>
        </div>

        {showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="w-full mt-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

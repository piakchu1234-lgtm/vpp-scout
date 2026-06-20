/**
 * Saved Projects Dashboard
 *
 * Grid view of all saved projects with filtering and management
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, FolderOpen, Search, Filter } from 'lucide-react';
import ProjectCard from '@/components/dashboard/ProjectCard';

interface SavedProject {
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
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects when search or tag changes
  useEffect(() => {
    let filtered = projects;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.address.toLowerCase().includes(query) ||
          p.projectName?.toLowerCase().includes(query) ||
          p.zoneCode.toLowerCase().includes(query)
      );
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter((p) => p.tags.includes(selectedTag));
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, selectedTag]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json();
      setProjects(data.projects || []);
      setFilteredProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  // Get all unique tags
  const allTags = Array.from(
    new Set(projects.flatMap((p) => p.tags))
  ).sort();

  return (
    <div className="min-h-screen bg-[#241F21] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#241F21]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/app')}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Back to Map"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">My Projects</h1>
                <p className="text-sm text-zinc-400">
                  {projects.length} saved project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/app')}
              className="px-4 py-2 bg-[#E9E778] hover:bg-[#E9E778]/90 text-zinc-900 font-semibold rounded-lg transition-colors"
            >
              New Project
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address, name, or zone..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E9E778] focus:border-transparent"
              />
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <select
                  value={selectedTag || ''}
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E9E778] focus:border-transparent"
                >
                  <option value="">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          // Loading state
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#E9E778] animate-spin mb-4" />
            <p className="text-zinc-400">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-zinc-900/50 rounded-full mb-6">
              <FolderOpen className="w-16 h-16 text-zinc-700" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {projects.length === 0 ? 'No projects yet' : 'No results found'}
            </h2>
            <p className="text-zinc-400 mb-6 text-center max-w-md">
              {projects.length === 0
                ? 'Start by analyzing a property and saving your first project.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => router.push('/app')}
                className="px-6 py-3 bg-[#E9E778] hover:bg-[#E9E778]/90 text-zinc-900 font-semibold rounded-lg transition-colors"
              >
                Create First Project
              </button>
            )}
            {projects.length > 0 && filteredProjects.length === 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          // Project Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

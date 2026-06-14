'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Loader2 } from 'lucide-react';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type GeocodingFeature = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  text: string;
};

type GeocodingResponse = {
  features: GeocodingFeature[];
};

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      fetchGeocoding(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  async function fetchGeocoding(searchQuery: string) {
    if (!TOKEN) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set');
      setIsLoading(false);
      return;
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${TOKEN}&bbox=140.96,-39.15,149.97,-33.98&country=au&types=address&limit=5`;
      const response = await fetch(url);
      const data: GeocodingResponse = await response.json();
      setResults(data.features || []);
      setIsOpen(true);
    } catch (error) {
      console.error('Geocoding error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectResult(feature: GeocodingFeature) {
    const [lng, lat] = feature.center;
    const addressName = feature.place_name;

    // Update URL - existing useEffect hooks will handle state cascade
    router.push(`/app?address=${encodeURIComponent(addressName)}&lat=${lat}&lon=${lng}`);

    // Clear search UI
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="absolute top-4 left-4 z-50 w-[400px]">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address in Victoria..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E9E778] transition-shadow"
        />
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-white/20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-2xl overflow-hidden">
          {results.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleSelectResult(feature)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {feature.text}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {feature.place_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && !isLoading && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-white/20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-2xl p-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No addresses found in Victoria. Try a different search.
          </p>
        </div>
      )}
    </div>
  );
}

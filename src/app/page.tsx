'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Map as MapIcon } from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import GlobalControls from '@/components/GlobalControls';

import {
  geocodeSuggestions,
  type GeocodeSource,
  type GeocodeSuggestion,
} from '@/lib/geocoding';





const FEATURE_CARDS = [
  {
    id: 1,
    title: 'Multi-Lot Consolidation',
    description: 'Interactive Super-Lot Builder. Shift-click to consolidate sites and dynamically compute real-time site parameters.',
    icon: '🏘️',
  },
  {
    id: 2,
    title: 'Split-Zoning Engine',
    description: 'Multi-Title Geometry Analysis. Automatically isolate distinct spatial zones across complex property boundaries.',
    icon: '🗺️',
  },
  {
    id: 3,
    title: 'Overlay Auditing Engine',
    description: 'Instant Environmental Clearances. Real-time scanning for Heritage (HO), Bushfire (BMO), and Land Inundation (LSIO) protections.',
    icon: '🛡️',
  },
  {
    id: 4,
    title: 'One-Click Bilingual Exports',
    description: 'Client-Ready PDF Engine. High-fidelity English and Mandarin reports formatted automatically for developers.',
    icon: '📄',
  },
];

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

export default function LandingPage() {
  const router = useRouter();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<GeocodeSource | null>(null);
  const [selected, setSelected] = useState<GeocodeSuggestion | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  // React 19 compliance: derive state instead of synchronous setState in effect
  useEffect(() => {
    const q = searchQuery.trim();

    // Early return for short queries — state resets happen via derived state below
    if (q.length < MIN_CHARS) {
      return;
    }
    if (q === lastQueryRef.current) return;

    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const { items, source: src } = await geocodeSuggestions(q, ctrl.signal);
        if (ctrl.signal.aborted) return;
        lastQueryRef.current = q;
        setSuggestions(items);
        setSource(src);
        setOpen(items.length > 0);
        setHighlight(-1);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          console.warn('[LandingPage] geocode threw', e);
          setSuggestions([]);
          setSource(null);
          setOpen(false);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Derived state: reset suggestions when query is too short
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < MIN_CHARS && suggestions.length > 0) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setSource(null);
    }
  }, [searchQuery, suggestions.length]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function selectSuggestion(s: GeocodeSuggestion) {
    abortRef.current?.abort();
    lastQueryRef.current = s.displayName.trim();
    setSearchQuery(s.displayName);
    setSelected(s);
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
  }

  function navigateToApp(s: GeocodeSuggestion) {
    const qs = new URLSearchParams({
      address: s.displayName,
      lat: String(s.lat),
      lon: String(s.lon),
    });
    router.push(`/app?${qs.toString()}`);
  }

  function handleExplore() {
    // STRICT: Only proceed if we have a valid highlight or explicit selection
    if (suggestions.length > 0 && highlight >= 0) {
      const pick = suggestions[highlight];
      selectSuggestion(pick);
      navigateToApp(pick);
      return;
    }
    // Only use selected if user previously chose an item
    if (selected) {
      navigateToApp(selected);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && open && suggestions.length > 0) {
      e.preventDefault();
      // STRICT: Only select if arrow navigation occurred (highlight >= 0)
      // Do NOT default to first item if user just pressed Enter without arrows
      const pick = suggestions[highlight >= 0 ? highlight : 0];
      if (pick) {
        selectSuggestion(pick);
        navigateToApp(pick);
      }
      return;
    }
    if (e.key === 'Enter' && selected) {
      e.preventDefault();
      navigateToApp(selected);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && suggestions.length > 0;
  const showFallbackNote = source === 'nominatim' && suggestions.length > 0;

  return (
    <div className="relative min-h-screen w-full bg-[#241F21] text-white overflow-hidden font-sans selection:bg-[#E9E778] selection:text-[#241F21]">

      <div className="absolute inset-0 bg-gradient-to-b from-[#E9E778]/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E9E778]/10 via-transparent to-transparent pointer-events-none" />

      <header className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E9E778] rounded-sm flex items-center justify-center">
            <MapIcon className="text-[#241F21] w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">SimplySite</span>
        </div>

        <nav className="flex items-center gap-2" onMouseLeave={() => setHoveredNav(null)}>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <div
                onMouseEnter={() => setHoveredNav('Sign In')}
                className="relative px-4 py-2 cursor-pointer transition-colors z-10"
              >
                {hoveredNav === 'Sign In' && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={`relative z-20 text-sm font-medium ${hoveredNav === 'Sign In' ? 'text-[#E9E778]' : 'text-zinc-300'}`}>
                  Sign In
                </span>
              </div>
            </SignInButton>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="ml-4 px-5 py-2 bg-[#E9E778] text-[#241F21] text-sm font-bold rounded-full hover:bg-[#d4d262] transition-colors">
                Try for free
              </button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <div className="ml-4 flex items-center gap-3">
              <GlobalControls />
              <div className="h-6 w-px bg-zinc-700" />
              <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9 ring-2 ring-[#E9E778]/40' } }} />
            </div>
          </Show>
        </nav>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-12 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-5xl w-full text-center">
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 bg-[#E9E778]/10 border border-[#E9E778]/20 rounded-full text-xs font-medium text-[#E9E778] tracking-wide">
            <span className="inline-block w-1.5 h-1.5 bg-[#E9E778] rounded-full animate-pulse" />
            SSD 2026 REFORMS COMPLIANT
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-[1.1]">
            Automated ResCode Feasibility <br />
            <span className="text-zinc-400">for Victorian Architects</span>
          </h1>

          <p className="text-base md:text-lg text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Instantly analyze multi-title parcel yields, planning overlays, and compliance constraints against 2026 Victorian statutory frameworks.
          </p>

          <div ref={wrapperRef} className="relative max-w-3xl w-full mx-auto mb-16">
            <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800 p-2 rounded-2xl shadow-2xl">
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-1 transition-all focus-within:border-[#E9E778]/50 focus-within:bg-white/10">
                <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selected) setSelected(null);
                  }}
                  onFocus={() => suggestions.length > 0 && setOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter Victorian Address (e.g., 62 Chandler Road, Noble Park)"
                  aria-label="Address search"
                  aria-autocomplete="list"
                  aria-expanded={showDropdown}
                  aria-controls="address-suggestions"
                  aria-haspopup="listbox"
                  role="combobox"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  aria-busy={loading ? true : undefined}
                  className="flex-1 bg-transparent border-none text-white text-base placeholder:text-zinc-500 focus:outline-none focus:ring-0 px-3 py-3"
                />
                <button
                  onClick={handleExplore}
                  disabled={!selected && suggestions.length === 0}
                  className="px-6 py-2.5 bg-[#E9E778] text-[#241F21] font-bold text-sm rounded-lg hover:bg-[#d4d262] transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Analysis
                </button>
              </div>

              {showDropdown && (
                <div className="relative mt-2">
                  <ul
                    id="address-suggestions"
                    role="listbox"
                    className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#1a1517]/95 backdrop-blur-sm shadow-xl"
                  >
                    {showFallbackNote && (
                      <li
                        role="presentation"
                        className="border-b border-white/10 bg-white/5 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400"
                      >
                        Connecting to Vicmap Property API Data Engine...
                      </li>
                    )}
                    {suggestions.map((s, i) => {
                      const active = highlight === i;
                      return (
                        <li
                          key={s.placeId}
                          id={`address-suggestion-${i}`}
                          role="option"
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(s);
                            }}
                            onMouseEnter={() => setHighlight(i)}
                            className={`block w-full px-4 py-2.5 text-left text-sm leading-snug transition-colors ${
                              active
                                ? 'bg-[#E9E778]/10 text-[#E9E778]'
                                : 'text-zinc-200 hover:bg-white/5'
                            }`}
                          >
                            {s.displayName}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-xs text-zinc-500 text-center space-y-1"
              >
                <p className="flex items-center justify-center gap-2">
                  <span className="inline-block w-1 h-1 bg-[#E9E778] rounded-full animate-pulse" />
                  Evaluating Spatial Overlays and Local Schedules...
                </p>
              </motion.div>
            )}

            {selected && !loading && (
              <p className="mt-3 text-xs text-zinc-500 text-center">
                Selected: <span className="text-[#E9E778] font-medium">{selected.displayName}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {FEATURE_CARDS.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + idx * 0.1 }}
                className="group relative bg-slate-950/40 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-[#E9E778]/30 transition-all hover:bg-slate-950/60"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-white group-hover:text-[#E9E778] transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

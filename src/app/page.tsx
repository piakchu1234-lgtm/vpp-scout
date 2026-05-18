'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Map as MapIcon } from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import {
  geocodeSuggestions,
  type GeocodeSource,
  type GeocodeSuggestion,
} from '@/lib/geocoding';

const NAV_ITEMS = ['Product', 'Pricing', 'API'];

const FLOATING_ELEMENTS = [
  { id: 1, label: 'GRZ1', top: '20%', left: '15%', delay: 0 },
  { id: 2, label: '711m²', top: '60%', left: '10%', delay: 1.5 },
  { id: 3, label: 'No Overlays', top: '30%', left: '80%', delay: 0.5 },
  { id: 4, label: '3 Townhouses', top: '70%', left: '75%', delay: 2 },
  { id: 5, label: 'Clause 55', top: '15%', left: '60%', delay: 1 },
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

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setSource(null);
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
    if (suggestions.length > 0) {
      const pick = suggestions[highlight >= 0 ? highlight : 0];
      selectSuggestion(pick);
      navigateToApp(pick);
      return;
    }
    if (selected) navigateToApp(selected);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && open && suggestions.length > 0) {
      e.preventDefault();
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

      {FLOATING_ELEMENTS.map((el) => (
        <motion.div
          key={el.id}
          initial={{ y: 0 }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: el.delay }}
          className="absolute z-0 px-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-zinc-400 backdrop-blur-sm pointer-events-none"
          style={{ top: el.top, left: el.left }}
        >
          {el.label}
        </motion.div>
      ))}

      <header className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E9E778] rounded-sm flex items-center justify-center">
            <MapIcon className="text-[#241F21] w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">SimplySite</span>
        </div>

        <nav className="flex items-center gap-2" onMouseLeave={() => setHoveredNav(null)}>
          {NAV_ITEMS.map((item) => (
            <div key={item} onMouseEnter={() => setHoveredNav(item)} className="relative px-4 py-2 cursor-pointer transition-colors z-10">
              {hoveredNav === item && (
                <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/10 rounded-full -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
              )}
              <span className={`relative z-20 text-sm font-medium ${hoveredNav === item ? 'text-[#E9E778]' : 'text-zinc-300'}`}>
                {item}
              </span>
            </div>
          ))}

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
            <div className="ml-4">
              <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9 ring-2 ring-[#E9E778]/40' } }} />
            </div>
          </Show>
        </nav>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Unlock any site&apos;s potential. <br />
            <span className="text-zinc-500">Made instantly.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Type any Victorian address to instantly generate spatial yields, statutory limits, and commercial feasibilities.
          </p>

          <div ref={wrapperRef} className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-0 bg-[#E9E778]/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white/10 border border-white/20 backdrop-blur-md rounded-full p-2 pl-6 shadow-2xl transition-all group-focus-within:border-[#E9E778]/50 group-focus-within:bg-white/15">
              <Search className="w-6 h-6 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selected) setSelected(null);
                }}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search any address (e.g. 62 Chandler Road, Noble Park)"
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
                className="w-full bg-transparent border-none text-white text-lg placeholder:text-zinc-500 focus:outline-none focus:ring-0 px-4 py-4"
              />
              <button
                onClick={handleExplore}
                className="px-8 py-4 bg-[#E9E778] text-[#241F21] font-bold text-lg rounded-full hover:bg-[#d4d262] transition-colors flex-shrink-0"
              >
                Explore
              </button>
            </div>

            {showDropdown && (
              <ul
                id="address-suggestions"
                role="listbox"
                className="absolute left-6 right-6 top-full z-50 mt-3 max-h-80 overflow-auto rounded-2xl border border-white/15 bg-[#1a1517]/95 backdrop-blur-md shadow-2xl text-left"
              >
                {showFallbackNote && (
                  <li
                    role="presentation"
                    className="border-b border-white/10 bg-white/5 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                  >
                    Using standard search (Vicmap is slow)
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
                        className={`block w-full px-5 py-3 text-left text-sm leading-snug transition-colors ${
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
            )}
          </div>

          {selected && (
            <p className="mt-6 text-sm text-zinc-500">
              Selected: <span className="text-[#E9E778]">{selected.displayName}</span>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

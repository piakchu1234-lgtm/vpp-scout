'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Map as MapIcon } from 'lucide-react';
import { Show, SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import GlobalControls from '@/components/GlobalControls';
import TierBadge from '@/components/TierBadge';
import { useLanguage } from '@/contexts/LanguageContext';

import {
  geocodeSuggestions,
  type GeocodeSource,
  type GeocodeSuggestion,
} from '@/lib/geocoding';

const FEATURE_CARDS = [
  {
    id: 1,
    title: { en: 'Multi-Lot Consolidation', zh: '多地块合并' },
    description: {
      en: 'Interactive Super-Lot Builder. Shift-click to consolidate sites and dynamically compute real-time site parameters.',
      zh: '交互式超级地块构建器。按住 Shift 点击合并地块并动态计算实时场地参数。'
    },
    icon: '🏘️',
  },
  {
    id: 2,
    title: { en: 'Split-Zoning Engine', zh: '分区拆分引擎' },
    description: {
      en: 'Multi-Title Geometry Analysis. Automatically isolate distinct spatial zones across complex property boundaries.',
      zh: '多产权几何分析。自动识别复杂产权边界内的独立空间分区。'
    },
    icon: '🗺️',
  },
  {
    id: 3,
    title: { en: 'Overlay Auditing Engine', zh: '覆盖区审核引擎' },
    description: {
      en: 'Instant Environmental Clearances. Real-time scanning for Heritage (HO), Bushfire (BMO), and Land Inundation (LSIO) protections.',
      zh: '即时环境清查。实时扫描遗产覆盖区 (HO)、山火管理覆盖区 (BMO) 和淹水覆盖区 (LSIO)。'
    },
    icon: '🛡️',
  },
  {
    id: 4,
    title: { en: 'One-Click Bilingual Exports', zh: '一键双语导出' },
    description: {
      en: 'Client-Ready PDF Engine. High-fidelity English and Mandarin reports formatted automatically for developers.',
      zh: '客户就绪 PDF 引擎。自动生成高保真中英文开发报告。'
    },
    icon: '📄',
  },
];

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

export default function LandingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { has, isLoaded } = useAuth();
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

  // Check user tier from Clerk Billing using has()
  const isPro = isLoaded && (has?.({ plan: 'pro' }) ?? false);
  const userTier: 'free' | 'pro' = isPro ? 'pro' : 'free';

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

  const t = {
    badge: { en: 'SSD 2026 REFORMS COMPLIANT', zh: 'SSD 2026 改革合规' },
    heading: { en: 'Instant Property Feasibility Reports', zh: '即时房产可行性报告' },
    subheading: { en: 'for Victoria, Australia', zh: '澳大利亚维多利亚州' },
    description: {
      en: 'Professional development analysis in seconds. Planning overlays, compliance constraints, and yield potential for any Victorian address.',
      zh: '数秒内完成专业开发分析。涵盖规划覆盖区、合规性约束及任何维多利亚州地址的收益潜力。'
    },
    placeholder: {
      en: 'Enter Victorian Address (e.g., 62 Chandler Road, Noble Park)',
      zh: '输入维多利亚州地址（例如：62 Chandler Road, Noble Park）'
    },
    buttonText: { en: 'Run Analysis', zh: '运行分析' },
    tryFree: { en: 'Try for free', zh: '免费试用' },
    loading: {
      en: 'Evaluating Spatial Overlays and Local Schedules...',
      zh: '正在评估空间覆盖区和地方附表...'
    },
    selected: { en: 'Selected:', zh: '已选择：' },
    fallbackNote: {
      en: 'Connecting to Vicmap Property API Data Engine...',
      zh: '正在连接 Vicmap 产权 API 数据引擎...'
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-50 dark:bg-[#241F21] text-zinc-900 dark:text-white overflow-hidden font-sans selection:bg-[#E9E778] selection:text-[#241F21] transition-colors duration-300">

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
              <button className="px-5 py-2 bg-[#E9E778] text-[#241F21] text-sm font-bold rounded-full hover:bg-[#d4d262] transition-colors">
                {t.tryFree[language]}
              </button>
            </SignInButton>
          </Show>

          {/* Show Tier Badge when signed in */}
          <Show when="signed-in">
            <TierBadge userTier={userTier} language={language} />
            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700" />
          </Show>

          {/* GlobalControls includes UserButton when signed in */}
          <GlobalControls />
        </nav>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-12 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-5xl w-full text-center">
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 bg-[#E9E778]/10 border border-[#E9E778]/20 rounded-full text-xs font-medium text-[#E9E778] tracking-wide">
            <span className="inline-block w-1.5 h-1.5 bg-[#E9E778] rounded-full animate-pulse" />
            {t.badge[language]}
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-[1.1]">
            {t.heading[language]} <br />
            <span className="text-zinc-500 dark:text-zinc-400">{t.subheading[language]}</span>
          </h1>

          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            {t.description[language]}
          </p>

          <div ref={wrapperRef} className="relative max-w-3xl w-full mx-auto mb-16">
            <div className="bg-white dark:bg-slate-950/40 backdrop-blur-md border border-zinc-200 dark:border-slate-800 rounded-2xl shadow-lg dark:shadow-2xl p-2">
              <div className="relative flex items-center bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-1 transition-all focus-within:border-[#E9E778]/50 focus-within:bg-zinc-100 dark:focus-within:bg-white/10">
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
                  placeholder={t.placeholder[language]}
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
                  className="flex-1 bg-transparent border-none text-zinc-900 dark:text-white text-base placeholder:text-zinc-500 focus:outline-none focus:ring-0 px-3 py-3"
                />
                <button
                  onClick={handleExplore}
                  disabled={!selected && suggestions.length === 0}
                  className="px-6 py-2.5 bg-[#E9E778] text-[#241F21] font-bold text-sm rounded-lg hover:bg-[#d4d262] transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.buttonText[language]}
                </button>
              </div>

              {showDropdown && (
                <div className="relative mt-2">
                  <ul
                    id="address-suggestions"
                    role="listbox"
                    className="max-h-64 overflow-auto rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1517]/95 backdrop-blur-sm shadow-lg"
                  >
                    {showFallbackNote && (
                      <li
                        role="presentation"
                        className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                      >
                        {t.fallbackNote[language]}
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
                                : 'text-zinc-900 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/5'
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
                  {t.loading[language]}
                </p>
              </motion.div>
            )}

            {selected && !loading && (
              <p className="mt-3 text-xs text-zinc-500 text-center">
                {t.selected[language]} <span className="text-[#E9E778] font-medium">{selected.displayName}</span>
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
                className="group relative bg-white dark:bg-slate-950/40 backdrop-blur-sm border border-zinc-200 dark:border-slate-800 rounded-2xl p-6 hover:border-[#E9E778]/30 transition-all hover:shadow-md dark:hover:bg-slate-950/60"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white group-hover:text-[#E9E778] transition-colors">
                  {card.title[language]}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {card.description[language]}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

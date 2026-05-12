'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

import {
  geocodeSuggestions,
  type GeocodeSource,
  type GeocodeSuggestion,
} from '@/lib/geocoding';

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  onSelect: (s: GeocodeSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Bilingual copy injected by the parent so this component stays language-agnostic. */
  searchingLabel?: string;
  fallbackNote?: string;
};

export function AddressAutocomplete({
  value,
  onValueChange,
  onSelect,
  placeholder,
  disabled,
  ariaLabel,
  searchingLabel = 'Searching…',
  fallbackNote = 'Using standard search (Vicmap is slow)',
}: Props) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<GeocodeSource | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  useEffect(() => {
    const q = value.trim();
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
        // geocodeSuggestions catches its own errors; this guard is belt-and-braces
        // so a thrown error never crashes the autocomplete.
        if (!ctrl.signal.aborted) {
          console.warn('[AddressAutocomplete] suggestions threw unexpectedly', e);
          setSuggestions([]);
          setSource(null);
          setOpen(false);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [value]);

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
    // Preserve the user-typed unit prefix (e.g. "3/") if the geocoder result
    // has dropped it — the address line must accurately reflect what was
    // entered, not just what the map dataset returned.
    const typed = value.trim();
    const userUnitMatch = typed.match(/^([0-9A-Za-z]+)\s*\//);
    const userUnit = userUnitMatch ? userUnitMatch[1] : null;
    const finalDisplay =
      userUnit && !s.displayName.startsWith(`${userUnit}/`)
        ? `${userUnit}/${s.displayName}`
        : s.displayName;
    const finalSelection: GeocodeSuggestion =
      finalDisplay === s.displayName ? s : { ...s, displayName: finalDisplay };

    lastQueryRef.current = finalDisplay.trim();
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
    onValueChange(finalDisplay);
    onSelect(finalSelection);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = suggestions[highlight >= 0 ? highlight : 0];
      if (pick) selectSuggestion(pick);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const activeId =
    highlight >= 0 ? `address-suggestion-${highlight}` : undefined;
  const showDropdown = open && suggestions.length > 0;
  const showLoading = loading && value.trim().length >= MIN_CHARS;
  const showFallbackNote = source === 'nominatim' && suggestions.length > 0;

  return (
    <div ref={wrapperRef} className="relative flex flex-1 items-center gap-3">
      <Search
        aria-hidden
        className="size-4 shrink-0 text-zinc-400"
        strokeWidth={1.5}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="address-suggestions"
        aria-activedescendant={activeId}
        aria-haspopup="listbox"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-busy={disabled || showLoading ? true : undefined}
        className="flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400"
      />
      {showLoading && (
        <span
          aria-live="polite"
          className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
        >
          <Loader2 aria-hidden className="size-3 animate-spin" strokeWidth={1.75} />
          {searchingLabel}
        </span>
      )}
      {showDropdown && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-3 max-h-80 overflow-auto border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:border-zinc-800 dark:bg-zinc-950"
        >
          {showFallbackNote && (
            <li
              role="presentation"
              className="border-b border-zinc-200 bg-amber-50 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-800 dark:border-zinc-800 dark:bg-amber-950/30 dark:text-amber-300"
            >
              {fallbackNote}
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
                  className={`block w-full px-4 py-3 text-left text-sm leading-snug transition-colors ${
                    active
                      ? 'bg-zinc-50 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900'
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
  );
}

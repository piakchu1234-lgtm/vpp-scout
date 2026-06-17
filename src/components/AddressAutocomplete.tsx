'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import {
  geocodeSuggestions,
  type GeocodeSource,
  type GeocodeSuggestion,
} from '@/lib/geocoding';

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLeadingHouseNumber(s: string): string | null {
  const m = s.match(/^([0-9]+[A-Za-z]?)\s+/);
  return m ? m[1] : null;
}

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
  fallbackNote = 'Victorian Planning Registry Authority (Dynamic)',
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
    // Preserve what the user typed when the geocoder returns a truncated
    // result. Two failure modes we guard against:
    //   1. `s.displayName` lost the unit prefix entirely — e.g. user typed
    //      "1/34 Edwin Street" and Vicmap returned "34 Edwin Street …".
    //   2. `s.displayName` kept the unit but lost the parent house number —
    //      e.g. "1/ Edwin Street …" or "1 Edwin Street …". This happens
    //      when Vicmap resolves the unit row independently of the lot
    //      row, dropping `house_number_1`.
    // In both cases we splice the typed values back in so the address
    // header reads "1/34 Edwin Street" — what the user entered.
    const typed = value.trim();
    const typedMatch = typed.match(
      /^([0-9A-Za-z]+)\s*\/\s*([0-9]+[A-Za-z]?)\s+(.+)$/,
    );
    const userUnit = typedMatch
      ? typedMatch[1]
      : typed.match(/^([0-9A-Za-z]+)\s*\//)?.[1] ?? null;
    const userHouse = typedMatch ? typedMatch[2] : null;

    const looksLikeFullAddress =
      s.displayName.length >= 8 && /\s/.test(s.displayName);

    let finalDisplay = s.displayName;
    if (userUnit && looksLikeFullAddress) {
      // Strip any existing unit fragment to normalise, then rebuild.
      // Matches "1/", "1 /", "1/ ", "1 / " — and the "1 " orphan case where
      // the slash itself was lost. The trailing capture is the road portion.
      const stripped = finalDisplay
        .replace(
          new RegExp(
            `^${escapeRegExp(userUnit)}\\s*\\/?\\s*(?:[0-9]+[A-Za-z]?\\s+)?`,
            'i',
          ),
          '',
        )
        .trim();
      const houseToUse = userHouse ?? extractLeadingHouseNumber(stripped);
      if (houseToUse) {
        // Drop any leading house number on `stripped` so we don't double it
        // when re-attaching. e.g. stripped = "34 Edwin Street …" + houseToUse
        // "34" → "Edwin Street …".
        const rest = stripped.replace(/^[0-9]+[A-Za-z]?\s+/, '').trim();
        finalDisplay = `${userUnit}/${houseToUse} ${rest}`;
      } else if (!finalDisplay.startsWith(`${userUnit}/`)) {
        finalDisplay = `${userUnit}/${stripped}`;
      }
    }

    // CRITICAL: Preserve unique identifiers (placeId, lat, lon) from the API
    // response. The parent component uses these exact coordinates to load the
    // Mapbox viewport and fetch parcel geometry. Do NOT pass raw text strings.
    const finalSelection: GeocodeSuggestion =
      finalDisplay === s.displayName ? s : { ...s, displayName: finalDisplay };

    lastQueryRef.current = finalDisplay.trim();
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
    onValueChange(finalDisplay);
    // Pass the complete GeocodeSuggestion object with placeId, lat, lon
    onSelect(finalSelection);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && open && suggestions.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && open && suggestions.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // STRICT: Only select if a valid highlight index exists
      // Do NOT default to index 0 if no arrow navigation has occurred
      if (open && suggestions.length > 0 && highlight >= 0) {
        const pick = suggestions[highlight];
        if (pick) selectSuggestion(pick);
      }
      // If highlight is -1 (no arrow key navigation), do nothing
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
      {showDropdown && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-3 max-h-80 overflow-auto border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:border-zinc-800 dark:bg-zinc-950"
        >
          {showFallbackNote && (
            <li
              role="presentation"
              className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
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

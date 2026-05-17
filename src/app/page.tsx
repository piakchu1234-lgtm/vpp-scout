'use client';

import { useState } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MapPreview } from '@/components/MapPreview';
import type { GeocodeSuggestion } from '@/lib/geocoding';

type TabId = 'details' | 'zoning' | 'report';

const TABS: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Property Details' },
  { id: 'zoning', label: 'Zoning & ResCode' },
  { id: 'report', label: 'AI Report' },
];

const MELBOURNE_CBD = { lat: -37.8136, lon: 144.9631 };

type SelectedSite = {
  lat: number;
  lon: number;
  label: string;
} | null;

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<SelectedSite>(null);

  const handleSelect = (s: GeocodeSuggestion) => {
    setQuery(s.displayName);
    setSite({ lat: s.lat, lon: s.lon, label: s.displayName });
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
      <Header
        query={query}
        onQueryChange={setQuery}
        onSelect={handleSelect}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <MapPanel site={site} />
        <DataPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          site={site}
        />
      </div>
    </div>
  );
}

function Header({
  query,
  onQueryChange,
  onSelect,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (s: GeocodeSuggestion) => void;
}) {
  return (
    <header className="relative z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-1 items-center gap-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          SimplySite
        </span>
        <div className="hidden h-6 w-px bg-zinc-200 sm:block" />
        <div className="hidden flex-1 sm:block sm:max-w-md">
          <AddressAutocomplete
            value={query}
            onValueChange={onQueryChange}
            onSelect={onSelect}
            placeholder="Search address…"
            ariaLabel="Address search"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900">
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}

function MapPanel({ site }: { site: SelectedSite }) {
  const lat = site?.lat ?? MELBOURNE_CBD.lat;
  const lon = site?.lon ?? MELBOURNE_CBD.lon;
  return (
    <section
      aria-label="Mapbox canvas container"
      className="relative h-[55vh] flex-shrink-0 overflow-hidden bg-[#1b1d22] lg:h-auto lg:flex-1 lg:basis-[60%]"
    >
      <MapPreview
        key={`${lat},${lon}`}
        lat={lat}
        lon={lon}
        className="absolute inset-0 h-full w-full border-0"
      />
      {!site && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          <div className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-200 backdrop-blur-md">
            Search an address to anchor the map
          </div>
        </div>
      )}
    </section>
  );
}

function DataPanel({
  activeTab,
  onTabChange,
  site,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  site: SelectedSite;
}) {
  return (
    <aside className="flex flex-1 flex-col overflow-hidden border-zinc-200 bg-white lg:basis-[40%] lg:border-l">
      <nav
        role="tablist"
        aria-label="Property analysis sections"
        className="flex flex-shrink-0 border-b border-zinc-200 px-4 sm:px-6"
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative -mb-px py-3 px-3 text-xs font-medium tracking-wide transition first:pl-0 ${
                active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-3 bottom-0 h-px bg-zinc-900 first:left-0" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && <PropertyDetailsPanel site={site} />}
        {activeTab === 'zoning' && <ZoningPanel />}
        {activeTab === 'report' && <AiReportPanel site={site} />}
      </div>
    </aside>
  );
}

function PanelShell({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div role="tabpanel" className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          {number}
        </p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function MetricRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-100 py-3 last:border-b-0">
      <div>
        <p className="text-xs font-medium text-zinc-700">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-zinc-400">{hint}</p>}
      </div>
      <p className="font-mono text-sm tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function PropertyDetailsPanel({ site }: { site: SelectedSite }) {
  return (
    <PanelShell
      number="01"
      title="Property Details"
      description="Core site metrics derived from the cadastral parcel and lot geometry."
    >
      {site && (
        <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Selected
          </p>
          <p className="mt-0.5 text-xs font-medium text-zinc-900">
            {site.label}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
            {site.lat.toFixed(5)}, {site.lon.toFixed(5)}
          </p>
        </div>
      )}
      <div className="rounded-md border border-zinc-200">
        <div className="px-4">
          <MetricRow label="Lot area" value="—" hint="Square metres" />
          <MetricRow label="Frontage" value="—" hint="Primary street" />
          <MetricRow label="Site coverage" value="—" hint="Existing built form" />
          <MetricRow label="Front setback" value="—" />
          <MetricRow label="Side setbacks" value="—" />
          <MetricRow label="Rear setback" value="—" />
        </div>
      </div>
      {!site && (
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          Select a parcel on the map to populate these values.
        </p>
      )}
    </PanelShell>
  );
}

function ZoningPanel() {
  return (
    <PanelShell
      number="02"
      title="Zoning & ResCode"
      description="Victoria Planning Provisions context for this site, including overlays and ResCode standards (Clauses 54 / 55)."
    >
      <div className="space-y-3">
        <ScaffoldCard en="Zone" zh="分区" body="Awaiting parcel selection." />
        <ScaffoldCard
          en="Overlays"
          zh="规划覆盖区"
          body="HO, BMO, FO and SBO checks will surface here."
        />
        <ScaffoldCard
          en="ResCode standards"
          zh="ResCode 标准"
          body="Clause 54 / 55 setback, site coverage and amenity tests."
        />
      </div>
    </PanelShell>
  );
}

function ScaffoldCard({
  en,
  zh,
  body,
}: {
  en: string;
  zh: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-zinc-900">{en}</p>
        <span className="text-[11px] text-zinc-400">{zh}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}

function AiReportPanel({ site }: { site: SelectedSite }) {
  return (
    <PanelShell
      number="03"
      title="AI Report"
      description="Generate a Senior-Architect-grade feasibility memo for the selected site. Powered by SSD 2026 + NCC 2026 logic."
    >
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-900">Feasibility memo</p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          A multi-page PDF covering lot capacity, overlay impact, ResCode
          compliance, and a draft built-form envelope.
        </p>
        <button
          type="button"
          disabled={!site}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate report
        </button>
        {!site && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">
            Available once a site is selected
          </p>
        )}
      </div>
    </PanelShell>
  );
}

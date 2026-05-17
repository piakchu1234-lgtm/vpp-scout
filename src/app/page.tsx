'use client';

import { useState } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';

type TabId = 'details' | 'zoning' | 'report';

const TABS: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Property Details' },
  { id: 'zoning', label: 'Zoning & ResCode' },
  { id: 'report', label: 'AI Report' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('details');

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
      <Header />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <MapPanel />
        <DataPanel activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          SimplySite
        </span>
        <div className="hidden h-6 w-px bg-zinc-200 sm:block" />
        <div className="hidden sm:block">
          <AddressSearchPlaceholder />
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

function AddressSearchPlaceholder() {
  return (
    <div
      role="search"
      aria-label="Address search"
      className="flex h-9 w-[min(28rem,60vw)] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-400"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 flex-shrink-0"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </svg>
      <span className="truncate">Search address…</span>
    </div>
  );
}

function MapPanel() {
  return (
    <section
      aria-label="Mapbox canvas container"
      className="relative h-[55vh] flex-shrink-0 overflow-hidden bg-[#1b1d22] lg:h-auto lg:flex-1 lg:basis-[60%]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.04),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
          Map Surface
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
          Mapbox Canvas Container
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
          The interactive parcel map will mount here. Pan, draw, measure and
          overlay tools will dock to the edges of this surface.
        </p>
      </div>
    </section>
  );
}

function DataPanel({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
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
                active
                  ? 'text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800'
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
        {activeTab === 'details' && <PropertyDetailsPanel />}
        {activeTab === 'zoning' && <ZoningPanel />}
        {activeTab === 'report' && <AiReportPanel />}
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
    <div
      role="tabpanel"
      className="px-4 py-6 sm:px-6 sm:py-8"
    >
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

function PropertyDetailsPanel() {
  return (
    <PanelShell
      number="01"
      title="Property Details"
      description="Core site metrics derived from the cadastral parcel and lot geometry."
    >
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
      <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
        Select a parcel on the map to populate these values.
      </p>
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
        <ScaffoldCard
          en="Zone"
          zh="分区"
          body="Awaiting parcel selection."
        />
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

function AiReportPanel() {
  return (
    <PanelShell
      number="03"
      title="AI Report"
      description="Generate a Senior-Architect-grade feasibility memo for the selected site. Powered by SSD 2026 + NCC 2026 logic."
    >
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-900">
          Feasibility memo
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          A multi-page PDF covering lot capacity, overlay impact, ResCode
          compliance, and a draft built-form envelope.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-xs font-medium text-white opacity-60"
        >
          Generate report
        </button>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">
          Available once a site is selected
        </p>
      </div>
    </PanelShell>
  );
}

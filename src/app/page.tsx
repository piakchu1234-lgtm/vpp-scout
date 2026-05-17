'use client';

import { useEffect, useState } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MapPreview } from '@/components/MapPreview';
import type { GeocodeSuggestion } from '@/lib/geocoding';
import { reverseGeocodeNearest } from '@/lib/geocoding';
import { fetchPropertyData, type PropertyData } from '@/lib/propertyData';
import { calculateFrontage } from '@/lib/propertyGeometry';
import { computeSetbacks, computeSiteCoverage } from '@/lib/spatial';
import type {
  FeasibilityReport,
  ReportRequest,
  ReportResponse,
  ReportSiteMetrics,
} from '@/lib/report';

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

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<SelectedSite>(null);
  const [data, setData] = useState<PropertyData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelect = (s: GeocodeSuggestion) => {
    setQuery(s.displayName);
    setSite({ lat: s.lat, lon: s.lon, label: s.displayName });
  };

  const handleParcelClick = async (lonLat: [number, number]) => {
    const [lon, lat] = lonLat;
    setSite({ lat, lon, label: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
    setQuery('');
    try {
      const hit = await reverseGeocodeNearest(lon, lat);
      if (hit) {
        setQuery(hit.result.displayName);
        setSite({
          lat: hit.result.lat,
          lon: hit.result.lon,
          label: hit.result.displayName,
        });
      }
    } catch (err) {
      console.warn('[page] reverse geocode failed', err);
    }
  };

  useEffect(() => {
    if (!site) {
      setData(null);
      setLoadState('idle');
      setErrorMsg(null);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setErrorMsg(null);
    fetchPropertyData(site.label, site.lon, site.lat)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load property data';
        console.warn('[page] fetchPropertyData failed', err);
        setErrorMsg(msg);
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [site]);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
      <Header
        query={query}
        onQueryChange={setQuery}
        onSelect={handleSelect}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <MapPanel
          site={site}
          data={data}
          onParcelClick={handleParcelClick}
        />
        <DataPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          site={site}
          data={data}
          loadState={loadState}
          errorMsg={errorMsg}
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

function MapPanel({
  site,
  data,
  onParcelClick,
}: {
  site: SelectedSite;
  data: PropertyData | null;
  onParcelClick: (lonLat: [number, number]) => void;
}) {
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
        polygon={data?.parcel ?? null}
        easements={data?.easements ?? []}
        buildings={data?.buildings ?? []}
        onParcelClick={onParcelClick}
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
  data,
  loadState,
  errorMsg,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  site: SelectedSite;
  data: PropertyData | null;
  loadState: LoadState;
  errorMsg: string | null;
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
        {activeTab === 'details' && (
          <PropertyDetailsPanel
            site={site}
            data={data}
            loadState={loadState}
            errorMsg={errorMsg}
          />
        )}
        {activeTab === 'zoning' && (
          <ZoningPanel data={data} loadState={loadState} errorMsg={errorMsg} />
        )}
        {activeTab === 'report' && <AiReportPanel site={site} data={data} />}
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

function PropertyDetailsPanel({
  site,
  data,
  loadState,
  errorMsg,
}: {
  site: SelectedSite;
  data: PropertyData | null;
  loadState: LoadState;
  errorMsg: string | null;
}) {
  const lotAreaM2 = data?.area.valueM2 ?? null;
  const frontageM = data?.parcel ? calculateFrontage(data.parcel) : null;
  const councilLabel = data?.councilName ?? data?.council.contact?.name ?? null;
  const spi = data?.spi ?? null;
  const coverage = data?.parcel
    ? computeSiteCoverage(data.parcel, data.buildings)
    : null;
  const setbacks = data?.parcel
    ? computeSetbacks(data.parcel, data.buildings)
    : null;

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

      <LoadBanner loadState={loadState} errorMsg={errorMsg} />

      <div className="rounded-md border border-zinc-200">
        <div className="px-4">
          <MetricRow
            label="Lot area"
            value={lotAreaM2 != null ? `${lotAreaM2.toLocaleString()} m²` : '—'}
            hint={areaSourceHint(data)}
          />
          <MetricRow
            label="Frontage"
            value={frontageM != null ? `${frontageM.toFixed(1)} m` : '—'}
            hint="Shortest cadastral edge"
          />
          <MetricRow
            label="Council"
            value={councilLabel ?? '—'}
            hint="Vicmap_Admin"
          />
          <MetricRow
            label="SPI"
            value={spi ?? '—'}
            hint="Standard Parcel Identifier"
          />
          <MetricRow
            label="Site coverage"
            value={
              coverage
                ? `${coverage.pct.toFixed(1)}%`
                : data?.parcel
                ? '0%'
                : '—'
            }
            hint={
              coverage
                ? `${coverage.coveredM2.toLocaleString()} m² of ${coverage.lotM2.toLocaleString()} m²`
                : 'Built form ÷ lot'
            }
          />
          <MetricRow
            label="Front setback"
            value={
              setbacks
                ? `${setbacks.frontM.toFixed(1)} m`
                : data?.parcel
                ? 'Vacant lot'
                : '—'
            }
            hint="Longest edge → nearest building corner"
          />
          <MetricRow
            label="Side setback (min)"
            value={
              setbacks
                ? `${setbacks.sideMinM.toFixed(1)} m`
                : data?.parcel
                ? 'No building detected'
                : '—'
            }
            hint="Binding side edge"
          />
          <MetricRow
            label="Rear setback"
            value={
              setbacks
                ? `${setbacks.rearM.toFixed(1)} m`
                : data?.parcel
                ? 'Vacant lot'
                : '—'
            }
            hint="Opposite the frontage"
          />
        </div>
      </div>

      {!site && (
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          Search an address above to populate these values.
        </p>
      )}
    </PanelShell>
  );
}

function areaSourceHint(data: PropertyData | null): string {
  if (!data) return 'Square metres';
  switch (data.area.source) {
    case 'verified':
      return 'Verified record';
    case 'vicmap':
      return 'Vicmap cadastral';
    case 'domain':
      return 'Domain enrichment';
    default:
      return 'Square metres';
  }
}

function LoadBanner({
  loadState,
  errorMsg,
}: {
  loadState: LoadState;
  errorMsg: string | null;
}) {
  if (loadState === 'loading') {
    return (
      <div className="mb-4 rounded-md border border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-500">
        Loading planning data…
      </div>
    );
  }
  if (loadState === 'error') {
    return (
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
        {errorMsg ?? 'Failed to load planning data.'}
      </div>
    );
  }
  return null;
}

function ZoningPanel({
  data,
  loadState,
  errorMsg,
}: {
  data: PropertyData | null;
  loadState: LoadState;
  errorMsg: string | null;
}) {
  const zoneCode = data?.vicPlan.zoneCode ?? null;
  const zoneDescription = data?.vicPlan.zoneDescription ?? null;
  const overlayCodes = data?.vicPlan.overlayCodes ?? [];
  const overlayRaw = data?.vicPlan.overlayRaw ?? [];

  return (
    <PanelShell
      number="02"
      title="Zoning & ResCode"
      description="Victoria Planning Provisions context for this site, including overlays and ResCode standards (Clauses 54 / 55)."
    >
      <LoadBanner loadState={loadState} errorMsg={errorMsg} />

      <div className="space-y-3">
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-900">Zone</p>
            <span className="text-[11px] text-zinc-400">分区</span>
          </div>
          {zoneCode ? (
            <div className="mt-2">
              <p className="font-mono text-sm tracking-tight text-zinc-900">
                {zoneCode}
              </p>
              {zoneDescription && (
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {zoneDescription}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Awaiting parcel selection.
            </p>
          )}
        </div>

        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-900">Overlays</p>
            <span className="text-[11px] text-zinc-400">规划覆盖区</span>
          </div>
          {overlayCodes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {overlayCodes.map((c) => (
                <span
                  key={c}
                  className="rounded-sm border border-zinc-300 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-800"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : data ? (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              No HO / BMO / FO / SBO / DDO intersections at this point.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              HO, BMO, FO and SBO checks will surface here.
            </p>
          )}
          {overlayRaw.length > 0 && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-400">
              Scheme codes: {overlayRaw.join(', ')}
            </p>
          )}
        </div>

        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-900">ResCode standards</p>
            <span className="text-[11px] text-zinc-400">ResCode 标准</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Clause 54 / 55 setback, site coverage and amenity tests run against
            the lot geometry once selected.
          </p>
        </div>
      </div>
    </PanelShell>
  );
}

function AiReportPanel({
  site,
  data,
}: {
  site: SelectedSite;
  data: PropertyData | null;
}) {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<FeasibilityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = Boolean(site && data);

  const handleGenerate = async () => {
    if (!site || !data) return;
    setGenerating(true);
    setError(null);
    setReport(null);

    const frontageM = data.parcel ? calculateFrontage(data.parcel) : null;
    const coverage = data.parcel
      ? computeSiteCoverage(data.parcel, data.buildings)
      : null;
    const setbacks = data.parcel
      ? computeSetbacks(data.parcel, data.buildings)
      : null;

    const metrics: ReportSiteMetrics = {
      address: site.label,
      lat: site.lat,
      lon: site.lon,
      spi: data.spi,
      council: data.councilName ?? data.council.contact?.name ?? null,
      zoneCode: data.vicPlan.zoneCode,
      zoneDescription: data.vicPlan.zoneDescription,
      overlayCodes: data.vicPlan.overlayCodes,
      overlayRaw: data.vicPlan.overlayRaw,
      lotAreaM2: data.area.valueM2,
      frontageM,
      siteCoveragePct: coverage ? coverage.pct : null,
      setbackFrontM: setbacks ? setbacks.frontM : null,
      setbackSideMinM: setbacks ? setbacks.sideMinM : null,
      setbackRearM: setbacks ? setbacks.rearM : null,
    };

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metrics } satisfies ReportRequest),
      });
      const json = (await res.json()) as ReportResponse;
      if (!json.ok) {
        setError(json.error);
      } else {
        setReport(json.report);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PanelShell
      number="03"
      title="AI Report"
      description="Generate a Senior-Architect-grade feasibility memo for the selected site. Powered by SSD 2026 + NCC 2026 logic."
    >
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-900">Bilingual feasibility brief</p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Side-by-side English and Mandarin assessment of development capacity,
          zoning context, ResCode considerations, and risk.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate report'}
        </button>
        {!canGenerate && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">
            Available once a site is selected
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {error}
        </div>
      )}

      {report && <ReportView report={report} />}
    </PanelShell>
  );
}

function ReportView({ report }: { report: FeasibilityReport }) {
  const sections: { key: keyof FeasibilityReport; title: string }[] = [
    { key: 'verdict', title: 'Verdict' },
    { key: 'summary', title: 'Summary' },
    { key: 'developmentCapacity', title: 'Development capacity' },
    { key: 'zoningAnalysis', title: 'Zoning analysis' },
    { key: 'rescodeConsiderations', title: 'ResCode considerations' },
    { key: 'risks', title: 'Risks' },
    { key: 'recommendation', title: 'Recommendation' },
  ];
  return (
    <div className="mt-6 space-y-5">
      {sections.map(({ key, title }) => (
        <div
          key={key}
          className="overflow-hidden rounded-md border border-zinc-200"
        >
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {title}
            </p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                EN
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-800">
                {report[key].en}
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                ZH
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-800">
                {report[key].zh}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

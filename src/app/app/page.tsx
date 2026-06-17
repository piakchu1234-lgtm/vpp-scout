'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Map as MapIcon, FileText, FileDown } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import GlobalControls from '@/components/GlobalControls';
import area from '@turf/area';
import StorefrontDrawer from '@/components/sidebar/StorefrontDrawer';
import SuccessModal from '@/components/sidebar/SuccessModal';
import { MarketBarChart } from '@/components/charts/MarketBarChart';
import { SpatialPieChart } from '@/components/charts/SpatialPieChart';
import { RegulatoryRadarChart } from '@/components/charts/RegulatoryRadarChart';
import { SsdBadge } from '@/components/ui/SsdBadge';
import ComprehensiveReport from '@/components/report/ComprehensiveReport';
import { MapPreview } from '@/components/MapPreview';
import MapControlsToolbar from '@/components/MapControlsToolbar';
import InsightPanel from '@/components/dashboard/InsightPanel';
import DocumentConfigurator from '@/components/dashboard/DocumentConfigurator';
import { describeOverlayCode, type PlanningOverlay } from '@/components/dashboard/PlanningCard';
import CollapsibleSidebar from '@/components/dashboard/CollapsibleSidebar';
import { usePropertyData } from '@/hooks/usePropertyData';
import {
  fetchVicParcelForPoint,
  fetchVicPlanForPoint,
  type ParcelFeature,
  type ParcelPolygon,
  type VicPlanData,
} from '@/lib/vicPlanApi';
import { fetchLgaForPoint } from '@/lib/lgaApi';
import { reverseGeocodeNearest } from '@/lib/geocoding';
import { calculateYield, emptyYield, type YieldData } from '@/lib/yieldEngine';
import { mergeParcelGeometries } from '@/lib/spatialAnalysis';
import { snapToNearestParcel } from '@/lib/spatialSnapping';
import { auditVPPCompliance } from '@/lib/vppAuditor';
import { useProjectState } from '@/hooks/useProjectState';
import { fetchMarketData, type MarketDataResult } from '@/lib/marketData';
import { generatePropertyPDF, type DocumentConfig } from '@/lib/pdfGenerator';

const MELBOURNE_FALLBACK = { lat: -37.8136, lon: 144.9631 };
const VICMAP_TIMEOUT_MS = 15000;

export type AIOverlay = { code: string; description: string };

export type AINearbySchool = { name: string; distance: string };

export type AIInsightData = {
  insightSummary: string;
  executiveSummary: string;
  targetDemographicPitch?: string;
  ssdFeasibility: {
    isEligible: boolean;
    reasoning: string;
  };
  isVacantLand: boolean;
  estimatedLandSizeM2: number;
  estimatedFrontage: string;
  marketEstimate: string;
  localCouncil: string;
  lotPlanNumber: string;
  zoning: string;
  zoningDescription: string;
  overlays: AIOverlay[];
  hazards: string[];
  bedrooms: number;
  bathrooms: number;
  carspaces: number;
  propertyOverview: string;
  designFeatures: string[];
  nearbySchools: AINearbySchool[];
  estimatedLastSoldPrice?: string;
  estimatedContractDate?: string;
};

type Lang = 'en' | 'zh';

const STOREFRONT_CTA: Record<Lang, string> = {
  en: 'Download Reports & Title',
  zh: '下载报告与产权文件',
};

// Memoized MapPreview to prevent re-renders from theme/language changes
const MapPreviewMemoized = memo(
  MapPreview,
  (prevProps, nextProps) => {
    // Only re-render if these critical props change
    // Explicitly exclude theme, language, and other global state
    return (
      prevProps.lat === nextProps.lat &&
      prevProps.lon === nextProps.lon &&
      prevProps.polygon === nextProps.polygon &&
      prevProps.selectedParcels === nextProps.selectedParcels &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.is3D === nextProps.is3D &&
      prevProps.drawMode === nextProps.drawMode &&
      prevProps.drawnArea === nextProps.drawnArea &&
      prevProps.zoneCode === nextProps.zoneCode &&
      prevProps.overlayCodes === nextProps.overlayCodes &&
      prevProps.vppAuditResult === nextProps.vppAuditResult
    );
  }
);
MapPreviewMemoized.displayName = 'MapPreviewMemoized';

function AppCanvas() {
  const params = useSearchParams();
  const router = useRouter();
  const addressParam = params.get('address');
  const latParam = params.get('lat');
  const lonParam = params.get('lon');
  const lat = latParam ? Number(latParam) : MELBOURNE_FALLBACK.lat;
  const lon = lonParam ? Number(lonParam) : MELBOURNE_FALLBACK.lon;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  // Address recovery state — when the checkout pipeline drops the address
  // parameter but preserves lat/lon, we reverse-geocode to recover the
  // authoritative Vicmap address string so the AI insight fetch can proceed.
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);
  // Derived address state - clears recoveredAddress when addressParam is present
  const address = addressParam || recoveredAddress;
  const shouldRecoverAddress = !addressParam && hasCoords;

  const [polygon, setPolygon] = useState<ParcelPolygon | null>(null);
  const [spi, setSpi] = useState<string | null>(null);
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelMessage, setParcelMessage] = useState<string | null>(null);
  const [planData, setPlanData] = useState<VicPlanData | null>(null);
  const [liveCouncil, setLiveCouncil] = useState<string | null>(null);
  const [isStorefrontOpen, setIsStorefrontOpen] = useState(false);
  const [language, setLanguage] = useState<Lang>('en');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Handler for PDF export
  const handleExportPdf = async () => {
    if (!address || !planData || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    try {
      // Capture map snapshot
      const mapSnapshot = await mapPreviewRef.current?.getSnapshot();

      // Gather payload
      const payload = {
        address,
        zoneCode: planData.zoneCode,
        lotSize: landSizeM2 || 0,
        frontage: null, // TODO: Calculate from geometry
        overlays: planData.overlayRaw || [],
        auditResult: {
          isFastTrackEligible:
            (landSizeM2 || 0) >= 300 &&
            ['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ'].some(zone => planData.zoneCode?.toUpperCase().startsWith(zone)) &&
            !planData.overlayRaw?.some(o => ['HO', 'BMO', 'LSIO', 'SBO', 'BFO'].some(prefix => o.toUpperCase().startsWith(prefix))),
          tier: yieldData?.isFeasible ? 'Standard' : 'Complex',
          noThirdPartyAppeals: false,
          developerSummary: '',
          maxDeemedDwellings: yieldData?.scenarios?.townhouse?.maxYield || 0,
        },
        financialProforma: {
          tdc: 0,
          grv: 0,
          profit: 0,
          profitMarginPercent: 0,
        },
        language: language === 'zh' ? 'zh' : 'en',
      };

      // Call API
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const data = await response.json();

      // TODO: Download PDF blob
      console.log('[PDF Export] Report generated:', data);

    } catch (error) {
      console.error('[PDF Export] Error:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  const [isNavigating, setIsNavigating] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsightData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  // Tracks whether the AI insight fetch has *settled at least once* for the
  // current address (success, failure, or cancellation). The post-checkout
  // auto-print path gates on this so the print can't fire before the
  // Auditor has had a chance to populate the report — `isLoadingAI`
  // alone is insufficient because it initialises false, opening a race
  // window on first render where the timer could fire with a null insight.
  const [hasAttemptedAI, setHasAttemptedAI] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  // Market data state — property attributes from Domain API (beds/baths/cars/etc)
  const [marketData, setMarketData] = useState<MarketDataResult | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDocumentConfigurator, setShowDocumentConfigurator] = useState(false);

  // Derive report language from UI language state - unified language control
  const reportLanguage = language === 'en' ? 'English' : 'Chinese';

  // Multi-parcel selection state for MapControlsToolbar — restored from localStorage on mount
  const [selectedParcels, setSelectedParcels] = useState<ParcelFeature[]>([]);

  // NEW: Backend orchestrator integration for cached property intelligence
  const [selectedProperty, setSelectedProperty] = useState<{
    pfi: string | null;
    lng: number | null;
    lat: number | null;
  }>({ pfi: null, lng: null, lat: null });

  // Connect to backend orchestrator (30-day cache, full agent swarm)
  const orchestratorData = usePropertyData(
    selectedProperty.pfi,
    selectedProperty.lng,
    selectedProperty.lat,
    selectedProperty.pfi !== null || (selectedProperty.lng !== null && selectedProperty.lat !== null)
  );

  // Initialize state from localStorage on mount (client-side only to avoid hydration mismatch)
  // Session persistence hook
  const projectState = useProjectState();

  // View mode and camera state for MapControlsToolbar
  type ViewMode = 'plan' | 'satellite' | 'hybrid';
  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [is3D, setIs3D] = useState(false);

  // Drawing mode state for MapControlsToolbar and MapPreview
  type DrawMode = 'draw_polygon' | 'draw_line_string' | null;
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [drawnArea, setDrawnArea] = useState<number | null>(null);
  const mapPreviewRef = useRef<any>(null);

  // Hydrate state from localStorage on mount (client-side only to avoid SSR mismatch)
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    if (!projectState.isLoaded) return;

    if (projectState.savedState?.selectedParcels && projectState.savedState.selectedParcels.length > 0) {
      setSelectedParcels(projectState.savedState.selectedParcels);
    }
    if (projectState.savedState?.aiInsight) {
      setAiInsight(projectState.savedState.aiInsight);
    }

    setHasHydrated(true);
  }, [projectState.isLoaded, projectState.savedState]);

  const paymentParam = params.get('payment');
  const typeParam = params.get('type');
  const successType: 'ai-report' | 'title-search' | null =
    typeParam === 'ai-report' || typeParam === 'title-search' ? typeParam : null;
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(
    paymentParam === 'success',
  );

  useEffect(() => {
    if (paymentParam !== 'success') return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('session_id');
    url.searchParams.delete('type');
    window.history.replaceState({}, '', url.toString());
  }, [paymentParam]);

  // Address recovery — when the checkout pipeline drops the address parameter
  // but preserves lat/lon (payment success redirect), reverse-geocode to
  // recover the authoritative Vicmap address string so the AI insight fetch
  // can proceed. React 19: clear stale state via dependency-gated early return.
  useEffect(() => {
    if (addressParam) {
      // Address param present - clear recovery state asynchronously
      setRecoveredAddress(null);
      return;
    }
    if (!hasCoords) return;
    let cancelled = false;

    reverseGeocodeNearest(lon, lat)
      .then((hit) => {
        if (cancelled) return;
        if (hit?.result.displayName) {
          console.log('[AppCanvas] Recovered address from Vicmap:', hit.result.displayName);
          setRecoveredAddress(hit.result.displayName);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[AppCanvas] Address recovery failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [addressParam, hasCoords, lat, lon]);

  // Geospatial data fetch keyed to coordinates
  const coordKey = useMemo(() => `${lat},${lon}`, [lat, lon]);
  const prevCoordKeyRef = useRef<string>('');

  useEffect(() => {
    if (!hasCoords) return;

    // React 19 pattern: detect coordinate change via ref comparison instead of synchronous setState
    const coordChanged = prevCoordKeyRef.current !== coordKey;
    prevCoordKeyRef.current = coordKey;

    if (coordChanged) {
      setParcelLoading(true);
      setParcelMessage(null);
      setPolygon(null);
      setSpi(null);
      setPlanData(null);
      setLiveCouncil(null);
    }

    let stale = false;

    // SPATIAL SNAPPING PIPELINE:
    // 1. Try direct intersection at coordinates
    // 2. If no parcel found, attempt 15m buffer snap
    // 3. Update coordinates if snapped successfully
    fetchVicParcelForPoint(lon, lat, VICMAP_TIMEOUT_MS)
      .then(async (result) => {
        if (stale) return;

        // Direct hit - use as-is
        if (result) {
          setPolygon(result.polygon);
          setSpi(result.spi);
          return;
        }

        // MISSED TARGET: Attempt spatial snapping
        console.log('[AppCanvas] No direct parcel intersection, attempting spatial snap...');
        setParcelMessage('Snapping to nearest property...');

        try {
          const snapResult = await snapToNearestParcel(lon, lat, null);

          if (snapResult && !stale) {
            console.log(`[AppCanvas] Snapped to parcel ${snapResult.distanceM.toFixed(1)}m away (${snapResult.method})`);

            // Update polygon from snapped parcel
            setPolygon(snapResult.parcel.geometry);
            setSpi(snapResult.parcel.properties.PARCEL_PFI || null);

            // Note: Coordinates remain at original search location for map display
            // The polygon is correctly snapped to the nearest parcel
            setParcelMessage(`Snapped to nearest property (${snapResult.distanceM.toFixed(0)}m)`);
          } else {
            setParcelMessage('No parcel found at this point');
          }
        } catch (error) {
          console.warn('[AppCanvas] Spatial snap failed:', error);
          setParcelMessage('No parcel found at this point');
        }
      })
      .catch((err: unknown) => {
        if (stale) return;
        const isTimeout =
          err instanceof Error && /timeout|ECONNABORTED/i.test(err.message);
        console.warn('[AppCanvas] parcel fetch failed', err);
        setParcelMessage(
          isTimeout ? 'Vicmap timed out — no parcel rendered' : 'No parcel found at this point',
        );
      })
      .finally(() => {
        if (!stale) setParcelLoading(false);
      });

    fetchVicPlanForPoint(lon, lat, VICMAP_TIMEOUT_MS)
      .then((data) => {
        if (stale) return;
        setPlanData(data);
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] plan fetch failed', err);
        setPlanData(null);
      });

    // Deterministic LGA lookup — Vicmap_Admin layer 0. Authoritative,
    // free, and doesn't depend on the AI Auditor returning successfully.
    // Council display in the sidebar prefers this over aiInsight.localCouncil.
    fetchLgaForPoint(lon, lat)
      .then((name) => {
        if (stale) return;
        setLiveCouncil(name);
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] LGA fetch failed', err);
        setLiveCouncil(null);
      });

    return () => {
      stale = true;
    };
  }, [hasCoords, lat, lon]);

  // Active site geometry — unified polygon representing either the single
  // clicked parcel or the merged result of multiple selected parcels. This
  // drives all downstream feasibility calculations for multi-lot acquisitions.
  const activeSiteGeometry = useMemo(() => {
    if (selectedParcels.length > 1) {
      // Multi-parcel mode: merge all selected parcels into unified geometry
      const merged = mergeParcelGeometries(selectedParcels);
      return merged?.geometry ?? null;
    } else if (selectedParcels.length === 1) {
      // Single selected parcel from map click
      return selectedParcels[0].geometry;
    } else {
      // No selection: fall back to coordinate-based fetch polygon
      return polygon;
    }
  }, [selectedParcels, polygon]);

  const landSizeM2 = useMemo(() => {
    if (!activeSiteGeometry) return null;
    try {
      const m2 = area({ type: 'Feature', properties: {}, geometry: activeSiteGeometry });
      return Number.isFinite(m2) && m2 > 0 ? m2 : null;
    } catch {
      return null;
    }
  }, [activeSiteGeometry]);

  const hasPrimaryLandSize =
    typeof landSizeM2 === 'number' && Number.isFinite(landSizeM2) && landSizeM2 > 0;

  // Single source of truth: fetch agentic insight at the page level for
  // every address (Vicmap parcel data covers geometry only — beds/baths/
  // overview/hazards/etc. always come from the AI Auditor). Phase-3 plan
  // wires this through a PostgreSQL cache to bound API spend.
  // State clearing is handled by the dependency change triggering a new fetch.
  const aiStateKeyRef = useRef(0);
  useEffect(() => {
    // Increment the key when dependencies change to invalidate stale state
    aiStateKeyRef.current += 1;
    const currentKey = aiStateKeyRef.current;

    if (!address) {
      setAiInsight(null);
      setHasAttemptedAI(false);
      setIsLoadingAI(false);
      return;
    }

    let cancelled = false;
    setIsLoadingAI(true);
    setAiInsight(null);
    setHasAttemptedAI(false);

    // Construct consolidated address string for multi-parcel selections
    const consolidatedAddress = selectedParcels.length > 1
      ? `Consolidated Site (${selectedParcels.length} Parcels) - ${address}`
      : address;

    // Extract overlay codes from planData for backend eligibility checks
    const overlayCodes = planData?.overlayRaw ?? [];

    fetch('/api/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: consolidatedAddress,
        language: reportLanguage,
        metrics: {
          lotAreaM2: landSizeM2,
          overlayCodes,
          parcelCount: selectedParcels.length || 1,
          lat,
          lon,
        },
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (!cancelled && currentKey === aiStateKeyRef.current && response?.data) {
          setAiInsight(response.data);
        }
      })
      .catch((err) => {
        if (!cancelled && currentKey === aiStateKeyRef.current) {
          console.error('[AppCanvas] AI insight fetch failed', err);
        }
      })
      .finally(() => {
        if (!cancelled && currentKey === aiStateKeyRef.current) {
          setIsLoadingAI(false);
          setHasAttemptedAI(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [address, reportLanguage]);

  // Market data fetch — property attributes from Domain API (beds/baths/cars/year built/last sold)
  useEffect(() => {
    if (!address || !hasCoords) {
      setMarketData(null);
      setIsLoadingMarket(false);
      return;
    }

    let cancelled = false;
    setIsLoadingMarket(true);
    setMarketData(null);

    fetchMarketData(address)
      .then((data: MarketDataResult) => {
        if (!cancelled) {
          setMarketData(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error('[AppCanvas] Market data fetch failed', err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMarket(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, lat, lon, hasCoords]);

  // Auto-save to localStorage when key state changes (debounced)
  useEffect(() => {
    if (!hasHydrated) return; // Don't save on initial hydration
    const timeoutId = setTimeout(() => {
      projectState.saveState(selectedParcels, aiInsight);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedParcels, aiInsight, hasHydrated, projectState]);

  const effectiveLandSizeM2 = hasPrimaryLandSize
    ? landSizeM2
    : aiInsight?.estimatedLandSizeM2 ?? null;

  // Report preview handler — opens full-screen preview instead of directly printing
  const reportRef = useRef<HTMLDivElement>(null);
  const handleOpenPreview = () => {
    setShowReportPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Capture the print intent at mount so the existing URL-cleanup effect
  // (which strips ?payment=success via replaceState) can't race with us.
  const [shouldAutoOpenPreview, setShouldAutoOpenPreview] = useState(paymentParam === 'success');

  // Hold the preview until the AI Auditor settles. We require both
  // `hasAttemptedAI` (the fetch has been kicked off and finished — success
  // OR failure) and `!isLoadingAI` (no in-flight request right now). On
  // initial mount, isLoadingAI is false before the AI effect runs, so
  // gating on it alone opens a race window where the timer could fire
  // with aiInsight=null. hasAttemptedAI closes that window.
  useEffect(() => {
    if (!shouldAutoOpenPreview) return;
    if (!hasAttemptedAI) return;
    if (isLoadingAI) return;
    const id = window.setTimeout(() => {
      handleOpenPreview();
      setShouldAutoOpenPreview(false);
    }, 400);
    return () => window.clearTimeout(id);
  }, [shouldAutoOpenPreview, hasAttemptedAI, isLoadingAI]);

  const overlays: PlanningOverlay[] | null = useMemo(() => {
    if (!planData) return null;
    const seen = new Set<string>();
    const out: PlanningOverlay[] = [];
    for (const raw of planData.overlayRaw) {
      const code = raw.toUpperCase();
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({ code, name: describeOverlayCode(code) });
    }
    return out;
  }, [planData]);

  const yieldData: YieldData = useMemo(() => {
    if (typeof landSizeM2 !== 'number' || !Number.isFinite(landSizeM2) || landSizeM2 <= 0) {
      return emptyYield(
        'Awaiting Vicmap parcel geometry — yield model will populate once the lot resolves.',
      );
    }
    return calculateYield(
      landSizeM2,
      planData?.zoneCode ?? '',
      planData?.overlayRaw ?? [],
    );
  }, [landSizeM2, planData?.zoneCode, planData?.overlayRaw]);

  // VPP Audit calculation for map boundary coloring
  const vppAuditResult = useMemo(() => {
    if (!planData?.zoneCode || !landSizeM2 || landSizeM2 <= 0) return null;

    // Parse frontage to number
    const frontage = aiInsight?.estimatedFrontage
      ? parseFloat(aiInsight.estimatedFrontage.replace(/[^0-9.]/g, ''))
      : null;

    const audit = auditVPPCompliance(
      planData.zoneCode,
      landSizeM2,
      frontage,
      planData.overlayRaw || []
    );

    return {
      isFastTrackEligible: audit.isFastTrackEligible,
      tier: audit.tier,
      noThirdPartyAppeals: audit.noThirdPartyAppeals,
    };
  }, [planData?.zoneCode, planData?.overlayRaw, landSizeM2, aiInsight?.estimatedFrontage]);

  // SaaS CTA handlers
  const handleSaveToProject = () => {
    projectState.saveState(selectedParcels, aiInsight);
    return true; // Signal success to PropertyInspector
  };

  const handlePurchaseTitleSearch = () => {
    if (!address) return;
    const landataUrl = `https://www.landata.vic.gov.au/order?address=${encodeURIComponent(address)}`;
    window.open(landataUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClearSelection = () => {
    setSelectedParcels([]);
    projectState.clearState();
  };

  // Multi-parcel selection with Shift + Click modifier for site consolidation.
  // Standard click: single-parcel selection (clears array, then adds one).
  // Shift + Click: multi-parcel toggle (adds/removes without clearing).
  // Clicking empty space: clears all selections.
  function handleMapParcelClick(
    lonLat: [number, number],
    clickedParcel: ParcelFeature | null,
    shiftKey: boolean = false,
  ) {
    // If no parcel was clicked (empty space), clear selection array
    if (!clickedParcel) {
      handleClearSelection();
      return;
    }

    // NEW: Update orchestrator state for backend property intelligence
    setSelectedProperty({
      pfi: clickedParcel.properties.PARCEL_PFI || null,
      lng: lonLat[0],
      lat: lonLat[1],
    });

    // Standard click (no Shift): replace selection with single parcel
    if (!shiftKey) {
      setSelectedParcels([clickedParcel]);
      return;
    }

    // Shift + Click: toggle parcel in array for multi-site consolidation
    setSelectedParcels((prev) => {
      const pfi = clickedParcel.properties.PARCEL_PFI;
      const exists = prev.some((p) => p.properties.PARCEL_PFI === pfi);

      if (exists) {
        // Remove from array
        return prev.filter((p) => p.properties.PARCEL_PFI !== pfi);
      } else {
        // Add to array
        return [...prev, clickedParcel];
      }
    });
  }

  // Map control handlers for zoom, bearing, and drawing tools
  const handleZoomIn = () => {
    const map = mapPreviewRef.current?.getMap?.();
    if (!map) return;
    map.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    const map = mapPreviewRef.current?.getMap?.();
    if (!map) return;
    map.zoomOut({ duration: 300 });
  };

  const handleResetBearing = () => {
    const map = mapPreviewRef.current?.getMap?.();
    if (!map) return;
    map.easeTo({
      bearing: 0,
      pitch: is3D ? 60 : 0,
      duration: 500,
    });
  };

  const handleDrawModeChange = (mode: DrawMode) => {
    setDrawMode(mode);
  };

  const handleClearDrawing = () => {
    // Clear drawing via MapPreview's internal draw control
    setDrawMode(null);
    setDrawnArea(null);
  };

  // PDF generation handler with DocumentConfigurator
  const handleOpenDocumentConfigurator = () => {
    setShowDocumentConfigurator(true);
  };

  const handleGeneratePDF = async (config: DocumentConfig) => {
    if (!address) return;

    // Close configurator
    setShowDocumentConfigurator(false);

    setIsGeneratingPDF(true);
    try {
      // Capture map snapshot
      const mapSnapshot = await mapPreviewRef.current?.getSnapshot();
      if (!mapSnapshot) {
        console.error('Failed to capture map snapshot');
        return;
      }

      // Extract frontage from AI insight
      const frontageM = aiInsight?.estimatedFrontage
        ? parseFloat(aiInsight.estimatedFrontage.replace(/[^\d.]/g, '')) || null
        : null;

      // Format split-zone data if enabled
      const splitZoneData = config.includeSplitZoningGrid && planData?.zoneCode
        ? `Primary Zone: ${planData.zoneCode} (100% of parcel area)`
        : null;

      // Generate PDF with configuration options
      await generatePropertyPDF({
        address,
        mapSnapshotBase64: mapSnapshot,
        landSizeM2,
        zoneCode: planData?.zoneCode ?? null,
        frontageM,
        orientation: null, // TODO: Add orientation to AI insight
        bedrooms: marketData?.bedrooms ?? aiInsight?.bedrooms ?? null,
        bathrooms: marketData?.bathrooms ?? aiInsight?.bathrooms ?? null,
        carspaces: marketData?.carspaces ?? aiInsight?.carspaces ?? null,
        lastSold: marketData?.lastSoldPrice ?? aiInsight?.estimatedLastSoldPrice ?? null,
        aiSummary: aiInsight?.insightSummary ?? 'No AI analysis available',
        overlays: planData?.overlayRaw ?? [],
        language,
        config,
        splitZoneData,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  return (
    <div className="flex h-screen overflow-hidden bg-[#05060E]">
      {/* Left Control Rail */}
      <aside className="fixed left-0 top-0 h-full w-20 z-50 bg-[#05060E]/70 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-6">
        {/* Logo at top */}
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#E9E778] rounded-lg flex items-center justify-center">
            <MapIcon className="text-[#05060E] w-6 h-6" />
          </div>
        </div>

        {/* Primary Navigation Icons - Center */}
        <nav className="flex-1 flex flex-col items-center gap-6 mt-8">
          <button
            onClick={() => router.push('/')}
            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
            aria-label="Back to search"
            title="Search"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-[#E9E778]" />
          </button>

          <button
            onClick={() => setShowDocumentConfigurator(true)}
            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
            aria-label="View report"
            title="Report"
          >
            <FileText className="w-5 h-5 text-zinc-400 group-hover:text-[#E9E778]" />
          </button>
        </nav>

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-4">
          <GlobalControls />
          <div className="h-px w-8 bg-zinc-700" />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10 rounded-lg border border-zinc-700 hover:border-[#E9E778] transition-colors"
              }
            }}
          />
        </div>
      </aside>

      {/* Main Content - Full-Bleed Map */}
      <main className="flex-1 ml-20 relative">
        {/* Map Canvas */}
        <div className="absolute inset-0 w-full h-full">
          {hasCoords ? (
            <>
              <MapPreviewMemoized
                ref={mapPreviewRef}
                lat={lat}
                lon={lon}
                polygon={activeSiteGeometry}
                selectedParcels={selectedParcels}
                viewMode={viewMode}
                setViewMode={setViewMode}
                is3D={is3D}
                setIs3D={setIs3D}
                drawMode={drawMode}
                onDrawModeChange={handleDrawModeChange}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetBearing={handleResetBearing}
                onClearDrawing={handleClearDrawing}
                drawnArea={drawnArea}
                onDrawnAreaChange={setDrawnArea}
                onParcelClick={handleMapParcelClick}
                zoneCode={planData?.zoneCode}
                overlayCodes={planData?.overlayRaw}
                vppAuditResult={vppAuditResult}
                className="h-full w-full"
              />
              <MapControlsToolbar
                selectedParcels={selectedParcels}
                onClearSelection={() => setSelectedParcels([])}
                viewMode={viewMode}
                setViewMode={setViewMode}
                is3D={is3D}
                setIs3D={setIs3D}
                lang={language}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetBearing={handleResetBearing}
                drawMode={drawMode}
                onDrawModeChange={handleDrawModeChange}
                onClearDrawing={handleClearDrawing}
                drawnArea={drawnArea}
              />
              {(parcelLoading || parcelMessage || isNavigating) && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-xs font-medium tracking-wide pointer-events-none">
                  {isNavigating && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#E9E778] animate-spin" />
                      <span className="text-zinc-200">Resolving address…</span>
                    </>
                  )}
                  {!isNavigating && parcelLoading && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#E9E778] animate-spin" />
                      <span className="text-zinc-200">Analyzing Clause 55/57 Compliance…</span>
                    </>
                  )}
                  {!isNavigating && !parcelLoading && parcelMessage && (
                    <>
                      {parcelMessage.includes('Snapped') ? (
                        <>
                          <span className="text-[#00FF66]">✓</span>
                          <span className="text-zinc-200">{parcelMessage}</span>
                        </>
                      ) : parcelMessage.includes('No parcel found') ? (
                        <div className="flex flex-col items-center gap-1 py-1">
                          <span className="text-[#E9E778]">👆 Click any highlighted parcel on the map</span>
                          <span className="text-zinc-400 text-[10px]">Point outside property boundary</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">{parcelMessage}</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
              Invalid coordinates
            </div>
          )}
      </div>

        {/* Floating Bottom Dashboard */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-5xl px-6">
          <div className="flex flex-row gap-6 flex-wrap md:flex-nowrap justify-center">

            {/* Card 1: Market Performance */}
            <div className="flex-1 min-w-[320px] max-w-md bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white shadow-2xl">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-3">Market Performance</h3>
              {marketData?.bedrooms ? (
                <MarketBarChart bedrooms={marketData.bedrooms} bathrooms={marketData.bathrooms} carspaces={marketData.carspaces} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-zinc-500">
                  Aggregating market data...
                </div>
              )}
            </div>

            {/* Card 2: Site Parameters */}
            <div className="flex-1 min-w-[320px] max-w-md bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white shadow-2xl">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-3">Site Parameters</h3>
              {landSizeM2 ? (
                <SpatialPieChart landSize={landSizeM2} effectiveLandSize={effectiveLandSizeM2} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-zinc-500">
                  Loading spatial data...
                </div>
              )}
            </div>

            {/* Card 3: Development Assessment */}
            <div className="flex-1 min-w-[320px] max-w-md bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Development Assessment</h3>
                {planData && landSizeM2 && (
                  <SsdBadge
                    eligible={
                      landSizeM2 >= 300 &&
                      ['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ'].some(zone => planData.zoneCode?.toUpperCase().startsWith(zone)) &&
                      !planData.overlayRaw?.some(o => ['HO', 'BMO', 'LSIO', 'SBO', 'BFO'].some(prefix => o.toUpperCase().startsWith(prefix)))
                    }
                    reason={
                      landSizeM2 < 300
                        ? 'Lot size below 300m² minimum'
                        : planData.overlayRaw?.some(o => ['HO', 'BMO', 'LSIO', 'SBO', 'BFO'].some(prefix => o.toUpperCase().startsWith(prefix)))
                        ? 'Restrictive overlays present'
                        : 'SSD fast-track pathway available'
                    }
                  />
                )}
              </div>
              {yieldData ? (
                <RegulatoryRadarChart yieldData={yieldData} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-zinc-500">
                  Processing compliance data...
                </div>
              )}

              {/* Export PDF Button */}
              <button
                onClick={handleExportPdf}
                disabled={!address || isGeneratingPdf}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E9E778] text-[#05060E] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#d4d262] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Export PDF Report
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* Document Configurator Modal */}
      {showDocumentConfigurator && (
        <DocumentConfigurator
          lang={language}
          onGenerate={handleGeneratePDF}
          onCancel={() => setShowDocumentConfigurator(false)}
        />
      )}

      <SuccessModal
        isOpen={isSuccessModalOpen}
        type={successType}
        onClose={() => setIsSuccessModalOpen(false)}
        address={address}
        onDownload={handleOpenPreview}
        isLoadingData={isLoadingAI}
      />

      {/* Report Preview Mode — Full-screen scrollable preview with action bar */}
      {showReportPreview ? (
        <div className="fixed inset-0 z-[99999] min-h-screen bg-zinc-200 overflow-y-auto">
          {/* Floating Action Bar — Hidden during print */}
          <div className="sticky top-0 z-50 bg-white border-b border-zinc-300 shadow-sm print:hidden">
            <div className="max-w-[210mm] mx-auto px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowReportPreview(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Map
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#E9E778] text-[#241F21] text-sm font-bold uppercase tracking-wider hover:bg-[#d4d262] transition-colors"
              >
                <Download className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Report Container */}
          <div className="py-12 flex justify-center">
            <ComprehensiveReport
              ref={reportRef}
              address={address}
              lat={lat}
              lon={lon}
              landSizeM2={landSizeM2}
              lotPlan={spi}
              planData={planData}
              aiInsight={aiInsight}
              liveCouncil={liveCouncil}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AppRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#241F21]" />}>
      <AppCanvas />
    </Suspense>
  );
}

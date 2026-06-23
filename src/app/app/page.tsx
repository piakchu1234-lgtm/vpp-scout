'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Map as MapIcon, FileText, FileDown, Search, MapPin, FolderOpen } from 'lucide-react';
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import GlobalControls from '@/components/GlobalControls';
import { useLanguage } from '@/contexts/LanguageContext';
import area from '@turf/area';
import distance from '@turf/distance';
import pointToLineDistance from '@turf/point-to-line-distance';
import length from '@turf/length';
import * as turf from '@turf/helpers';
import StorefrontDrawer from '@/components/sidebar/StorefrontDrawer';
import SuccessModal from '@/components/sidebar/SuccessModal';
import { MarketBarChart } from '@/components/charts/MarketBarChart';
import { SpatialPieChart } from '@/components/charts/SpatialPieChart';
import { RegulatoryRadarChart } from '@/components/charts/RegulatoryRadarChart';
import { SsdBadge } from '@/components/ui/SsdBadge';
import { PROPERTY_UI, type Language } from '@/lib/i18n/propertyUi';
import ComprehensiveReport from '@/components/report/ComprehensiveReport';
import { MapPreview } from '@/components/MapPreview';
import MapControlsToolbar from '@/components/MapControlsToolbar';
import PropertySidePanel from '@/components/dashboard/PropertySidePanel';
import InsightPanel from '@/components/dashboard/InsightPanel';
import DocumentConfigurator from '@/components/dashboard/DocumentConfigurator';
import DADetailsModal from '@/components/modal/DADetailsModal';
import SaveProjectModal from '@/components/modal/SaveProjectModal';
import { describeOverlayCode, type PlanningOverlay } from '@/components/dashboard/PlanningCard';
import CollapsibleSidebar from '@/components/dashboard/CollapsibleSidebar';
import FeasibilityReportTemplate from '@/components/FeasibilityReportTemplate';
import { usePropertyData } from '@/hooks/usePropertyData';
import {
  fetchVicParcelForPoint,
  fetchVicPlanForPoint,
  type ParcelFeature,
  type ParcelPolygon,
  type VicPlanData,
} from '@/lib/vicPlanApi';
import { fetchLgaForPoint } from '@/lib/lgaApi';
import { fetchOverlaysNearPoint, type OverlayGeometry } from '@/lib/overlayService';
import { reverseGeocodeNearest } from '@/lib/geocoding';
import { calculateYield, emptyYield, type YieldData } from '@/lib/yieldEngine';
import { mergeParcelGeometries } from '@/lib/spatialAnalysis';
import { snapToNearestParcel } from '@/lib/spatialSnapping';
import { auditVPPCompliance } from '@/lib/vppAuditor';
import { useProjectState } from '@/hooks/useProjectState';
import { fetchMarketData, type MarketDataResult } from '@/lib/marketData';
import { generatePropertyPDF, type DocumentConfig } from '@/lib/pdfGenerator';
import { fetchAgentMarketData } from '@/lib/sources/AgentSource';
import { mergeAgentMarketData, type MergedMarketData } from '@/lib/agentMarketIntegration';
import { DataSourceBadge } from '@/components/ui/DataSourceBadge';
import { calculateSSDFeasibility } from '@/lib/planning/ssdCalculator';
import {
  generateBuildingEnvelope,
  getStandardSetbacks,
  calculateFinancialAnalysis,
  formatCurrency,
  formatROI,
  type MassingResult,
} from '@/lib/massingEngine';
import { prepareProjectState, generateProjectName } from '@/lib/projectPersistence';
import type { AIMarketResponse } from '@/types/property';
import { detectSchoolZones } from '@/lib/schoolZoneDetection';
import { getCrimeStatsForLGA } from '@/lib/crimeStats';
import { calculateEstimatedValue, formatEstimatedValue } from '@/lib/valuationCalculator';


const MELBOURNE_FALLBACK = { lat: -37.8136, lon: 144.9631 };
const VICMAP_TIMEOUT_MS = 15000;

export type AIOverlay = { code: string; description: string };

export type AINearbySchool = { name: string; distance: string };

export type AIInsightData = {
  insightSummary: string;
  executiveSummary: string;
  targetDemographicPitch?: string;
  highestBestUse?: string;
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
      prevProps.vppAuditResult === nextProps.vppAuditResult &&
      prevProps.overlayGeometries === nextProps.overlayGeometries &&
      prevProps.showOverlays === nextProps.showOverlays
    );
  }
);
MapPreviewMemoized.displayName = 'MapPreviewMemoized';

function AppCanvas() {
  const params = useSearchParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const addressParam = params.get('address');
  const latParam = params.get('lat');
  const lonParam = params.get('lon');
  const projectIdParam = params.get('projectId');
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
  const [overlayGeometries, setOverlayGeometries] = useState<OverlayGeometry[]>([]);
  const [isStorefrontOpen, setIsStorefrontOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // Collapsible side panel state
  const [activeScenario, setActiveScenario] = useState<'current' | 'ssd' | 'dual_occ' | 'townhouse'>('current'); // Scenario Engine

  // School zone and crime stats state
  const [schoolZones, setSchoolZones] = useState<Array<{ schoolName: string; type: 'primary' | 'secondary' }>>([]);
  const [crimeStats, setCrimeStats] = useState<{ incidents: number; ratePer100k: number } | null>(null);

  // Real user tier from Clerk metadata (replaces simulated state)
  const isPro = user?.publicMetadata?.plan === 'pro';
  const userTier = isPro ? 'pro' : 'free';

  // Geocoding state for top bar search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [calculatedFrontageM, setCalculatedFrontageM] = useState<number | null>(null);

  const { language } = useLanguage();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [capturedMapSnapshot, setCapturedMapSnapshot] = useState<string | null>(null);

  // Geocoding API fetch with debounce
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const fetchAddresses = async () => {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&country=au&types=address&limit=5`;

      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        setSearchResults(data.features || []);
      } catch (error) {
        console.error('[Geocoding] Failed to fetch addresses:', error);
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(fetchAddresses, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handler for address selection (flyTo + auto parcel extraction)
  const handleSelectAddress = (feature: any) => {
    const [lng, lat] = feature.center;
    const selectedAddress = feature.place_name;

    // Update URL and trigger navigation
    router.push(`/app?address=${encodeURIComponent(selectedAddress)}`);

    // Store coordinates for automatic parcel extraction after flyTo
    const searchCoordinates = { lng, lat };

    // Fly camera to location with cinematic animation
    if (mapPreviewRef.current?.getMap) {
      const mapInstance = mapPreviewRef.current.getMap();

      mapInstance.flyTo({
        center: [lng, lat],
        zoom: 19,
        pitch: 60,
        bearing: 0,
        duration: 2500,
        essential: true,
      });

      // Listen for flyTo animation completion, then trigger automatic parcel extraction
      mapInstance.once('moveend', () => {
        console.log('[Geocoding] flyTo complete, triggering automatic parcel extraction...');

        // Simulate map click at center to trigger existing parcel extraction logic
        // This reuses the existing MapPreview parcel fetch infrastructure
        const centerPoint = mapInstance.project([lng, lat]);

        // Fire a synthetic click event at the center coordinates
        // MapPreview's onClick handler will catch this and fetch the parcel
        if (mapPreviewRef.current?.handleClick) {
          mapPreviewRef.current.handleClick({
            lngLat: { lng, lat },
            point: centerPoint,
          });
        }

        console.log('[Geocoding] ✅ Automatic parcel extraction initiated at:', { lng, lat });
      });
    }

    setSearchQuery(selectedAddress);
    setSearchResults([]);
  };

  // Calculate frontage using street-facing edge detection (Turf.js)
  const calculateFrontageFromGeometry = (geometry: any, searchLng: number, searchLat: number): number | null => {
    try {
      if (!geometry || geometry.type !== 'Polygon') {
        console.warn('[Frontage] Geometry is not a Polygon, skipping calculation');
        return null;
      }

      // Extract the outer ring of the polygon (first array in coordinates)
      const coordinates = geometry.coordinates[0];

      if (coordinates.length < 3) {
        console.warn('[Frontage] Insufficient coordinates for polygon');
        return null;
      }

      // Reference point: the search coordinate (geocoded street access point)
      const searchPoint = turf.point([searchLng, searchLat]);

      let closestEdgeDistance = Infinity;
      let streetFacingEdgeLength = 0;

      // Iterate through all polygon edges
      for (let i = 0; i < coordinates.length - 1; i++) {
        const pt1 = coordinates[i];
        const pt2 = coordinates[i + 1];

        // Create a line segment for this edge
        const edgeLine = turf.lineString([pt1, pt2]);

        // Calculate distance from search point to this edge
        const distanceToEdge = pointToLineDistance(searchPoint, edgeLine, { units: 'meters' });

        // If this edge is closer to the search point, it's likely the street-facing edge
        if (distanceToEdge < closestEdgeDistance) {
          closestEdgeDistance = distanceToEdge;

          // Calculate the length of this edge using @turf/distance for accuracy
          const pt1Point = turf.point(pt1);
          const pt2Point = turf.point(pt2);
          streetFacingEdgeLength = distance(pt1Point, pt2Point, { units: 'meters' });
        }
      }

      // Round to one decimal place
      const frontageM = Math.round(streetFacingEdgeLength * 10) / 10;

      console.log('[Frontage] ✅ Street-facing edge detected:', {
        distanceFromSearch: closestEdgeDistance.toFixed(1) + 'm',
        frontageLength: frontageM + 'm',
      });

      return frontageM;
    } catch (error) {
      console.error('[Frontage] Calculation failed:', error);
      return null;
    }
  };

  // Handler for PDF export (client-side with html2pdf.js)
  const handleExportPdf = async () => {
    if (!address || isGeneratingPdf) return;

    // Paywall: Block PDF export for free users
    if (userTier === 'free') {
      alert('Upgrade to Pro to generate professional PDF feasibility reports.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      console.log('[PDF Export] Starting client-side PDF generation...');

      // Dynamically import html2pdf (client-side only library)
      const html2pdf = (await import('html2pdf.js')).default;

      // 1. Capture Mapbox WebGL canvas snapshot
      const mapInstance = mapPreviewRef.current?.getMap();
      if (!mapInstance) {
        console.error('[PDF Export] Map instance not available');
        setIsGeneratingPdf(false);
        return;
      }

      const mapCanvas = mapInstance.getCanvas();
      const mapSnapshot = mapCanvas.toDataURL('image/jpeg', 0.9);
      console.log('[PDF Export] ✅ Map snapshot captured');

      // 2. Update state to inject snapshot into hidden template
      setCapturedMapSnapshot(mapSnapshot);

      // 3. Wait for React to render the snapshot into the template
      await new Promise(resolve => setTimeout(resolve, 150));

      // 4. Find the hidden PDF template element
      const reportElement = document.getElementById('pdf-report-container');
      if (!reportElement) {
        console.error('[PDF Export] Report template element not found');
        setIsGeneratingPdf(false);
        return;
      }

      // 5. Configure html2pdf options
      const filename = `Feasibility_${address.replace(/\s+/g, '_')}_${language}.pdf`;
      const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      console.log('[PDF Export] Generating PDF:', filename);

      // 6. Generate and download PDF
      await html2pdf().set(opt).from(reportElement).save();

      console.log('[PDF Export] ✅ PDF generated successfully');
    } catch (error) {
      console.error('[PDF Export] Failed:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler for Save Project
  const handleSaveProject = async (projectName: string, notes: string, tags: string[]) => {
    if (!address || !planData || !lat || !lon || isSavingProject) {
      throw new Error('Missing required data for saving project');
    }

    setIsSavingProject(true);
    try {
      console.log('[SaveProject] Starting project save...');

      // Step 1: Capture map snapshot
      console.log('[SaveProject] Capturing map canvas...');
      const mapSnapshot = await mapPreviewRef.current?.getSnapshot();

      if (!mapSnapshot) {
        console.warn('[SaveProject] ⚠️ Map snapshot capture failed, continuing without image');
      } else {
        console.log('[SaveProject] ✅ Map snapshot captured');
      }

      // Step 2: Get current map viewport state
      const map = mapPreviewRef.current?.getMap();
      const mapState = {
        center: map ? [map.getCenter().lng, map.getCenter().lat] as [number, number] : [lon, lat],
        zoom: map?.getZoom() || 19,
        bearing: map?.getBearing() || 0,
        pitch: map?.getPitch() || 0,
      };

      // Step 3: Prepare project state
      console.log('[SaveProject] Preparing project state...');
      const projectState = prepareProjectState({
        address,
        pfi: undefined, // VicPlanData doesn't have pfi field
        zoneCode: planData.zoneCode || 'UNKNOWN',
        zoneDescription: planData.zoneDescription || undefined,
        lotArea: landSizeM2 || 0,
        overlays: planData.overlayRaw || [],
        lat,
        lng: lon,
        estimatedValue: enhancedMarketData?.estimatedValue ?? undefined,
        marketDataSource: enhancedMarketData?.source || undefined,
        generatedMassing,
        financialAnalysis,
        mapCenter: mapState.center as [number, number],
        mapZoom: mapState.zoom,
        mapBearing: mapState.bearing,
        mapPitch: mapState.pitch,
        mapSnapshot: mapSnapshot || undefined,
        projectName,
        notes,
        tags,
      });

      console.log('[SaveProject] Project state prepared:', {
        address: projectState.address,
        zoneCode: projectState.zoneCode,
        hasSnapshot: !!projectState.mapSnapshot,
        hasMassing: !!projectState.massingGeometry,
      });

      // Step 4: Save to database
      console.log('[SaveProject] Saving to database...');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectState),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save project');
      }

      const result = await response.json();
      console.log('[SaveProject] ✅ Project saved successfully:', result.project.id);

      // Success notification (you can add a toast here)
      alert(`✅ Project saved successfully!\n\nProject ID: ${result.project.id}`);

    } catch (error) {
      console.error('[SaveProject] ❌ Error:', error);
      alert(`❌ Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setIsSavingProject(false);
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

  // Market data state — property attributes from Domain API (beds/baths/cars/etc)
  const [marketData, setMarketData] = useState<MarketDataResult | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  // Agent market data state — agentic web scraping for bedrooms/bathrooms/value
  const [agentMarketData, setAgentMarketData] = useState<AIMarketResponse | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [hasAttemptedAgent, setHasAttemptedAgent] = useState(false);

  // Merged market data with source tracking
  const mergedMarketData: MergedMarketData = useMemo(() => {
    return mergeAgentMarketData(
      agentMarketData,
      marketData?.bedrooms,
      marketData?.bathrooms
    );
  }, [agentMarketData, marketData]);

  const [showReportPreview, setShowReportPreview] = useState(false);

  // Agent test state
  const [isTestingAgent, setIsTestingAgent] = useState(false);

  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDocumentConfigurator, setShowDocumentConfigurator] = useState(false);

  // Derive report language from UI language state - unified language control
  const reportLanguage = language === 'en' ? 'English' : 'Chinese';

  // Map layer visibility state
  const [showEasements, setShowEasements] = useState(false);
  const [showDAs, setShowDAs] = useState(false);
  const [show3DMassing, setShow3DMassing] = useState(false);

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

  // Load project from database when projectId is present
  useEffect(() => {
    if (!projectIdParam) return;

    const loadProject = async () => {
      try {
        console.log('[Project Load] Loading project:', projectIdParam);
        const response = await fetch(`/api/projects/${projectIdParam}`);

        if (!response.ok) {
          throw new Error('Failed to load project');
        }

        const data = await response.json();
        const project = data.project;

        console.log('[Project Load] ✅ Project loaded:', project.address);

        // Update URL with address and coordinates
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('projectId');
        newUrl.searchParams.set('address', project.address);
        newUrl.searchParams.set('lat', project.coordinates.lat.toString());
        newUrl.searchParams.set('lon', project.coordinates.lng.toString());
        router.replace(newUrl.pathname + newUrl.search);

        // Restore map viewport state
        if (project.mapState && mapPreviewRef.current) {
          const map = mapPreviewRef.current.getMap();
          if (map) {
            setTimeout(() => {
              map.flyTo({
                center: project.mapState.center,
                zoom: project.mapState.zoom,
                bearing: project.mapState.bearing,
                pitch: project.mapState.pitch,
                duration: 2000,
              });
            }, 500);
          }
        }

        // Restore 3D massing state
        if (project.massingGeometry) {
          setShow3DMassing(true);
        }

        console.log('[Project Load] ✅ State hydrated');
      } catch (error) {
        console.error('[Project Load] ❌ Error:', error);
        alert('Failed to load project');
      }
    };

    loadProject();
  }, [projectIdParam, router]);

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

    // Fetch overlay geometries for spatial intersection analysis
    // Buffer radius: 100m covers typical parcel + surroundings for accurate risk detection
    fetchOverlaysNearPoint(lon, lat, 100, VICMAP_TIMEOUT_MS)
      .then((overlays) => {
        if (stale) return;
        setOverlayGeometries(overlays);
        console.log(`[AppCanvas] Fetched ${overlays.length} overlay geometries for spatial analysis`);
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] Overlay geometry fetch failed', err);
        setOverlayGeometries([]);
      });

    // School zone detection using Turf.js spatial intersection
    detectSchoolZones(lon, lat)
      .then((zones) => {
        if (stale) return;
        setSchoolZones(zones);
        console.log(`[AppCanvas] Detected ${zones.length} school zone(s):`, zones);
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] School zone detection failed', err);
        setSchoolZones([]);
      });

    // Crime statistics lookup for LGA (fetched after LGA name is available)
    // We'll chain this after fetchLgaForPoint resolves
    fetchLgaForPoint(lon, lat)
      .then(async (lgaName) => {
        if (stale) return;
        setLiveCouncil(lgaName);

        // Fetch crime stats for this LGA
        if (lgaName) {
          try {
            const stats = await getCrimeStatsForLGA(lgaName);
            if (!stale && stats) {
              setCrimeStats(stats);
              console.log(`[AppCanvas] Crime stats for ${lgaName}:`, stats);
            }
          } catch (err) {
            console.warn('[AppCanvas] Crime stats fetch failed', err);
            setCrimeStats(null);
          }
        }
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] LGA fetch failed', err);
        setLiveCouncil(null);
        setCrimeStats(null);
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

  // Enhanced market data with dynamic valuation fallback
  const enhancedMarketData: MergedMarketData = useMemo(() => {
    // If agent/domain provided a value, use it
    if (mergedMarketData.estimatedValue) {
      return mergedMarketData;
    }

    // Fallback: Calculate dynamic value based on lot size and zoning
    if (landSizeM2 && planData?.zoneCode) {
      const dynamicValue = calculateEstimatedValue(landSizeM2, planData.zoneCode);
      return {
        ...mergedMarketData,
        estimatedValue: dynamicValue,
        source: 'calculated',
      };
    }

    return mergedMarketData;
  }, [mergedMarketData, landSizeM2, planData?.zoneCode]);

  // Automatic frontage calculation when geometry and coordinates are available
  useEffect(() => {
    if (activeSiteGeometry && lat && lon) {
      console.log('[Frontage] Calculating frontage from geometry...');
      const frontage = calculateFrontageFromGeometry(activeSiteGeometry, lon, lat);

      if (frontage !== null) {
        setCalculatedFrontageM(frontage);
        console.log('[Frontage] ✅ Calculated frontage:', frontage + 'm');
      } else {
        console.warn('[Frontage] ⚠️ Calculation returned null');
        setCalculatedFrontageM(null);
      }
    } else {
      // Clear frontage if geometry or coordinates are missing
      setCalculatedFrontageM(null);
    }
  }, [activeSiteGeometry, lat, lon]);

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

  // Agent market data fetch — agentic web scraping for bedrooms/bathrooms/value
  // Runs in parallel with AI insight fetch to minimize latency
  useEffect(() => {
    if (!address) {
      setAgentMarketData(null);
      setHasAttemptedAgent(false);
      setIsLoadingAgent(false);
      return;
    }

    let cancelled = false;
    setIsLoadingAgent(true);
    setAgentMarketData(null);
    setHasAttemptedAgent(false);

    fetchAgentMarketData(address)
      .then((data: AIMarketResponse) => {
        if (!cancelled) {
          setAgentMarketData(data);
          console.log('[AppCanvas] Agent market data fetched:', data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error('[AppCanvas] Agent market fetch failed', err);
          // Set empty data on error instead of leaving null
          setAgentMarketData({ bedrooms: null, bathrooms: null, estimated_value: null });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAgent(false);
          setHasAttemptedAgent(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

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
  // Auto-save to localStorage with deep equality check to prevent infinite loops.
  // React 19: projectState object reference changes on every render, so we
  // destructure saveState and only depend on the data that actually changes.
  const { saveState } = projectState;
  useEffect(() => {
    if (!hasHydrated) return; // Don't save on initial hydration
    const timeoutId = setTimeout(() => {
      saveState(selectedParcels, aiInsight);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedParcels, aiInsight, hasHydrated, saveState]);

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

  // SSD Feasibility calculation
  const ssdFeasibility = useMemo(() => {
    if (!planData?.zoneCode || !landSizeM2 || landSizeM2 <= 0) return null;

    return calculateSSDFeasibility({
      totalLotArea: landSizeM2,
      zoningCode: planData.zoneCode,
      existingFootprint: effectiveLandSizeM2 ? landSizeM2 - effectiveLandSizeM2 : undefined,
      effectiveLandSize: effectiveLandSizeM2 ?? undefined,
      overlays: planData.overlayRaw || [],
    });
  }, [landSizeM2, planData?.zoneCode, planData?.overlayRaw, effectiveLandSizeM2]);

  // Scenario Engine: Computed metrics based on active scenario
  const scenarioMetrics = useMemo(() => {
    // Prioritize Turf.js calculated frontage over AI estimate
    const frontage = calculatedFrontageM !== null
      ? calculatedFrontageM
      : aiInsight?.estimatedFrontage
        ? parseFloat(aiInsight.estimatedFrontage.replace(/[^0-9.]/g, ''))
        : null;

    const baseValue = enhancedMarketData.estimatedValue || 0;
    const townhouseYield = yieldData?.scenarios?.townhouse?.maxYield || 0;

    // Check if zone is commercial/CBD
    const zoneCode = planData?.zoneCode || '';
    const isCommercialZone = zoneCode.startsWith('CCZ') || zoneCode.startsWith('C1Z') || zoneCode.startsWith('C2Z');

    // Calculate commercial land value if applicable
    const commercialValue = isCommercialZone && landSizeM2 > 0
      ? landSizeM2 * 12000
      : 0;

    // Scenario data dictionary
    const scenarios = {
      current: {
        label: 'Current Status',
        maxYield: isCommercialZone ? 'High-Density Commercial/Mixed-Use' : '1 Dwelling',
        estValue: isCommercialZone && commercialValue > 0 ? commercialValue : baseValue,
      },
      ssd: {
        label: 'Small Second Dwelling (60m²)',
        maxYield: ssdFeasibility?.isEligible ? `1 SSD (${ssdFeasibility.maxSsdSize}m²)` : 'Not Eligible',
        estValue: ssdFeasibility?.isEligible ? baseValue * 1.25 : baseValue,
      },
      dual_occ: {
        label: 'Dual Occupancy (2 Dwellings)',
        maxYield: '2 Units',
        estValue: baseValue * 1.6,
      },
      townhouse: {
        label: 'Townhouses (Max Yield)',
        maxYield: townhouseYield > 0 ? `${townhouseYield} TH` : 'Not Feasible',
        estValue: townhouseYield > 0 ? baseValue * (1.8 + townhouseYield * 0.2) : baseValue,
      },
    };

    const active = scenarios[activeScenario];

    return {
      zoning: planData?.zoneCode || '—',
      lotSize: landSizeM2 || 0,
      frontage: frontage || 0,
      maxYield: active.maxYield,
      estValue: active.estValue,
      label: active.label,
    };
  }, [
    activeScenario,
    planData?.zoneCode,
    landSizeM2,
    calculatedFrontageM,
    aiInsight?.estimatedFrontage,
    enhancedMarketData.estimatedValue,
    yieldData?.scenarios?.townhouse?.maxYield,
    ssdFeasibility,
  ]);

  // Easement data and spatial conflict detection
  const [easementData, setEasementData] = useState<any[]>([]);
  const [spatialConflict, setSpatialConflict] = useState<{
    hasConflict: boolean;
    message?: string;
  }>({ hasConflict: false });

  // 3D Massing generation
  const generatedMassing = useMemo<MassingResult | null>(() => {
    if (!show3DMassing || !activeSiteGeometry || !planData?.zoneCode) {
      return null;
    }

    // Only support Polygon geometry (not MultiPolygon)
    if (activeSiteGeometry.type !== 'Polygon') {
      console.warn('[massingEngine] MultiPolygon not supported for massing generation');
      return null;
    }

    const setbacks = getStandardSetbacks(planData.zoneCode);
    const massing = generateBuildingEnvelope(activeSiteGeometry, setbacks, 60);

    return massing;
  }, [show3DMassing, activeSiteGeometry, planData?.zoneCode]);

  // Financial analysis for generated massing
  const financialAnalysis = useMemo(() => {
    if (!generatedMassing) return null;

    // Use market data estimated value if available
    const estimatedValue = enhancedMarketData?.estimatedValue ?? undefined;

    return calculateFinancialAnalysis(
      generatedMassing.floorArea,
      2500, // $2500/sqm construction cost
      estimatedValue,
      15 // 15% ROI threshold
    );
  }, [generatedMassing, enhancedMarketData]);

  // DA modal state
  const [selectedDA, setSelectedDA] = useState<any>(null);
  const [showDAModal, setShowDAModal] = useState(false);
  const [daData, setDAData] = useState<any[]>([]);

  const handleDAClick = (da: any) => {
    setSelectedDA(da);
    setShowDAModal(true);
  };

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
        overlays: [...new Set(planData?.overlayRaw ?? [])],
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
    <div className="relative h-screen overflow-hidden bg-[#05060E]">
      {/* Archistar-Style Floating Top Bar - Z-Index: 30 (Global Navigation) */}
      <div className="absolute top-4 left-6 right-6 h-16 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl z-30 flex items-center justify-between px-6 shadow-2xl">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E9E778] rounded-lg flex items-center justify-center">
            <MapIcon className="text-[#05060E] w-6 h-6" />
          </div>
          <span className="text-white font-bold tracking-widest text-lg">SIMPLYSITE</span>
        </div>

        {/* Global Search Omni-box */}
        <div className="relative w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder={language === 'en' ? 'Search any property address...' : '搜索任何房产地址...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                handleSelectAddress(searchResults[0]);
              } else if (e.key === 'Escape') {
                setSearchResults([]);
              }
            }}
            className="w-full bg-zinc-900/50 border border-zinc-700 text-white rounded-full pl-12 pr-6 py-2 text-sm focus:ring-2 focus:ring-[#E9E778] outline-none transition-all placeholder:text-zinc-500"
          />

          {/* Custom Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0 w-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto">
              {searchResults.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleSelectAddress(feature)}
                  className="flex items-center text-left w-full px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  <MapPin size={16} className="text-zinc-500 mr-3 shrink-0" />
                  <span className="text-zinc-200 text-sm truncate">{feature.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: SaaS Monetization + Global Controls */}
        <div className="flex items-center gap-4">
          {/* Tier Badge - Dynamic based on user tier */}
          {userTier === 'free' ? (
            <>
              {/* Free Tier Badge */}
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest">TIER</span>
                <span className="text-sm font-bold text-emerald-400">FREE</span>
              </div>

              {/* Upgrade Button */}
              <button
                onClick={() => {
                  const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/test_your_product_link';
                  const finalCheckoutUrl = userId
                    ? `${STRIPE_CHECKOUT_URL}?client_reference_id=${userId}`
                    : STRIPE_CHECKOUT_URL;
                  window.open(finalCheckoutUrl, '_blank');
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-1.5 rounded-full transition-colors text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {language === 'en' ? 'Upgrade' : '升级'}
              </button>
            </>
          ) : (
            <>
              {/* Pro Tier Badge */}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">PRO</span>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-8 bg-zinc-700/50" />

          {/* Utility Icons */}
          <GlobalControls />
        </div>
      </div>

      {/* Property Side Panel - Z-Index: 40 (Right Side - Adjusted for Top Bar) */}
      {hasCoords && (
        <>
          {/* Side Panel */}
          <div
            className={`fixed right-6 top-24 bottom-6 w-[400px] z-40 transition-transform duration-300 ease-in-out rounded-2xl ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'
            }`}
          >
            <PropertySidePanel
              address={address}
              language={language}
              zoneCode={planData?.zoneCode || null}
              zoneDescription={planData?.zoneDescription || null}
              planData={planData}
              onExportPDF={handleExportPdf}
              isGeneratingPDF={isGeneratingPdf}
              onSaveProject={() => setShowSaveModal(true)}
              isSavingProject={isSavingProject}
              activeScenario={activeScenario}
              onScenarioChange={setActiveScenario}
              scenarioLabel={scenarioMetrics.label}
            onTestAgent={async () => {
              setIsTestingAgent(true);
              try {
                const testAddress = addressParam || '45 Kooyong Road, Armadale VIC 3143';
                console.log('🤖 [TEST AGENT] Starting agentic search for:', testAddress);
                const result = await fetchAgentMarketData(testAddress);
                console.log('🤖 [TEST AGENT] ✅ SUCCESS! Result:', result);
              } catch (error) {
                console.error('🤖 [TEST AGENT] ❌ FAILED:', error);
              } finally {
                setIsTestingAgent(false);
              }
            }}
            isTestingAgent={isTestingAgent}
            showEasements={showEasements}
            onToggleEasements={setShowEasements}
          showDAs={showDAs}
          onToggleDAs={setShowDAs}
          show3DMassing={show3DMassing}
          onToggle3DMassing={setShow3DMassing}
          daData={daData}
          propertyLat={lat}
          propertyLng={lon}
          schoolZones={schoolZones}
          crimeStats={crimeStats}
          userTier={userTier}
          lotSize={scenarioMetrics.lotSize > 0 ? `${scenarioMetrics.lotSize.toLocaleString()}m²` : '—'}
          frontage={scenarioMetrics.frontage > 0 ? `${scenarioMetrics.frontage.toFixed(1)}m` : '—'}
        />
          </div>

          {/* Toggle Button - Left Edge of Panel (Chevron) */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`fixed top-1/2 -translate-y-1/2 z-50 w-10 h-16 bg-zinc-950/80 backdrop-blur-xl border border-white/10 border-r-0 rounded-l-xl shadow-lg hover:bg-zinc-900/80 transition-all duration-300 flex items-center justify-center ${
              isPanelOpen ? 'right-[424px]' : 'right-6'
            }`}
            aria-label={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
            title={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
          >
            <svg
              className="w-4 h-4 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isPanelOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </>
      )}

      {/* Main Content - Full-Screen Map (Hero) - Z-Index: 0 (Base Layer) */}
      <main className="absolute inset-0 w-screen h-screen z-0">
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
                showDAs={showDAs}
                onDAClick={handleDAClick}
                onDAsLoaded={setDAData}
                showEasements={showEasements}
                onEasementsLoaded={setEasementData}
                onSpatialConflict={setSpatialConflict}
                show3DMassing={show3DMassing}
                generatedMassing={generatedMassing}
                overlayGeometries={overlayGeometries}
                showOverlays={overlayGeometries.length > 0}
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
      </main>

      {/* Clean Metrics Ribbon - Z-Index: 20 (Bottom Overlay - Below Top Bar) */}
      {hasCoords && planData && (
        <div className="absolute bottom-6 left-6 z-30 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-6 py-4 flex items-center justify-start space-x-8 overflow-x-auto max-w-[calc(100vw-420px)] custom-scrollbar pointer-events-auto transition-all duration-300">
          <div className="flex items-center gap-12">
              {/* Zoning */}
              <div className="flex flex-col">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Zoning</span>
                <span className="text-white text-lg font-semibold mt-0.5">{scenarioMetrics.zoning}</span>
              </div>

              <div className="w-px h-8 bg-zinc-800" />

              {/* Lot Size */}
              <div className="flex flex-col">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Lot Size</span>
                <span className="text-white text-lg font-semibold mt-0.5">
                  {scenarioMetrics.lotSize > 0 ? `${scenarioMetrics.lotSize.toLocaleString()} m²` : '—'}
                </span>
              </div>

              <div className="w-px h-8 bg-zinc-800" />

              {/* Frontage */}
              <div className="flex flex-col">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Frontage</span>
                <span className="text-white text-lg font-semibold mt-0.5">
                  {scenarioMetrics.frontage > 0 ? `${scenarioMetrics.frontage.toFixed(1)} m` : '—'}
                </span>
              </div>

              <div className="w-px h-8 bg-zinc-800" />

              {/* Max Yield (Scenario-Based) */}
              <div className="flex flex-col">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Max Yield</span>
                <span className="text-blue-400 text-lg font-semibold mt-0.5">{scenarioMetrics.maxYield}</span>
              </div>

              <div className="w-px h-8 bg-zinc-800" />

              {/* Est. Value (Scenario-Based) */}
              <div className="flex flex-col">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Est. Value</span>
                <span className="text-green-400 text-lg font-semibold mt-0.5">
                  {scenarioMetrics.estValue > 0
                    ? `$${(scenarioMetrics.estValue / 1000000).toFixed(2)}M`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
      )}

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
                {userTier === 'free' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Print / Save PDF
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Print / Save PDF
                  </>
                )}
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
              mergedMarketData={enhancedMarketData}
              language={language}
              mapSnapshot={capturedMapSnapshot}
              generatedMassing={generatedMassing}
              financialAnalysis={financialAnalysis}
              schoolZones={schoolZones}
              crimeStats={crimeStats}
            />
          </div>
        </div>
      ) : null}

      {/* DA Details Modal */}
      <DADetailsModal
        da={selectedDA}
        isOpen={showDAModal}
        onClose={() => setShowDAModal(false)}
      />

      {/* Save Project Modal */}
      <SaveProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveProject}
        defaultName={
          address && planData?.zoneCode
            ? generateProjectName(address, planData.zoneCode)
            : ''
        }
      />

      {/* Hidden PDF Report Template (Client-Side) */}
      <FeasibilityReportTemplate
        language={language}
        address={address || 'N/A'}
        mapSnapshot={capturedMapSnapshot}
        zoneCode={planData?.zoneCode || null}
        zoneDescription={planData?.zoneDescription || null}
        lotSize={scenarioMetrics.lotSize}
        frontage={scenarioMetrics.frontage}
        maxYield={scenarioMetrics.maxYield}
        estValue={scenarioMetrics.estValue}
        activeScenario={activeScenario}
        scenarioLabel={scenarioMetrics.label}
        overlays={planData?.overlayRaw?.slice(0, 5) || []}
        ssdRules={
          activeScenario === 'ssd'
            ? {
                maxHeight: '5.0 meters',
                minGarden: '35%',
                permitRequired: language === 'en' ? 'No' : '否',
              }
            : undefined
        }
      />
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

'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Layer,
  Map,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type MapMouseEvent,
  type MapRef,
} from 'react-map-gl/mapbox';
import { circle } from '@turf/circle';
import area from '@turf/area';
import type { GeoJSONSource } from 'mapbox-gl';

import {
  fetchVicParcelsForBbox,
  fetchOverlayPolygonsForBbox,
  type OverlayLayerCategory,
  type OverlayPolygonFeature,
  type ParcelFeature,
  type ParcelPolygon,
} from '@/lib/vicPlanApi';
import type { EasementData } from '@/lib/easementApi';
import { tpzRadiusM } from '@/lib/tpz';

import 'mapbox-gl/dist/mapbox-gl.css';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type MapHoverInfo = {
  zoneLabel: string;
  zoneValue: string | null;
  overlayLabel: string;
  overlayValue: string | null;
};

export type MapTool = 'pan' | 'tree' | 'distance' | 'area';

export type ViewMode = 'plan' | 'aerial' | 'hybrid';

const STYLE_BY_VIEW: Record<ViewMode, string> = {
  plan: 'mapbox://styles/mapbox/dark-v11',
  aerial: 'mapbox://styles/mapbox/satellite-v9',
  hybrid: 'mapbox://styles/mapbox/satellite-v9',
};

type LonLat = [number, number];

type Props = {
  lat: number;
  lon: number;
  lang?: 'en' | 'zh';
  polygon?: ParcelPolygon | null;
  envelope?: ParcelPolygon | null;
  envelopeExceeded?: boolean;
  proposedFootprint?: ParcelPolygon | null;
  splitLine?: [LonLat, LonLat] | null;
  easements?: EasementData[];
  buildings?: ParcelPolygon[];
  treeDbhMm?: number;
  treeLon?: number | null;
  treeLat?: number | null;
  tool?: MapTool;
  distancePoints?: LonLat[];
  areaPoints?: LonLat[];
  onMapClick?: (lonLat: LonLat) => void;
  onParcelClick?: (lonLat: LonLat) => void;
  hoverInfo?: MapHoverInfo | null;
  className?: string;
};

export type MapPreviewHandle = {
  getSnapshot(): Promise<string | null>;
};

// SimplySite "Dark Commercial Monochrome" basemap palette. The base
// style is mapbox/dark-v11 with paint overrides applied once
// `style.load` resolves; land seamlessly blends into the #241F21 app
// background so the cadastral overlay reads as the figure and the
// basemap as the ground.
const PAPER_LAND = '#241F21';
const PAPER_WATER = '#18181b';
const PAPER_GREEN = '#2a2426';
const PAPER_BUILDING = '#3f3f46';
const PAPER_BUILDING_OUTLINE = '#52525b';
const PAPER_ROAD_FILL = '#3f3f46';
const PAPER_ROAD_CASING = '#3f3f46';
const PAPER_ROAD_MAJOR = '#52525b';
const PAPER_ROAD_MAJOR_CASING = '#52525b';
const PAPER_LABEL = '#d4d4d8';
const PAPER_LABEL_HALO = '#18181b';
const PARCEL_LINE = '#a1a1aa';
const PARCEL_HIGHLIGHT_LIME = '#E9E778';

const HATCH_IMAGE_ID = 'simplysite-easement-hatch';
const HATCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
<rect width="16" height="16" fill="rgba(249,115,22,0.10)"/>
<path d="M-4,4 L4,-4 M0,16 L16,0 M12,20 L20,12" stroke="#F97316" stroke-width="1.4"/>
</svg>`;

function haversineM(a: LonLat, b: LonLat): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function polylineLengthM(points: LonLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

function polygonAreaM2(points: LonLat[]): number {
  if (points.length < 3) return 0;
  const ring = [...points, points[0]];
  return area({
    type: 'Polygon',
    coordinates: [ring],
  });
}

export const MapPreview = forwardRef<MapPreviewHandle, Props>(
  function MapPreview(
    {
      lat,
      lon,
      lang = 'en',
      polygon,
      envelope,
      envelopeExceeded = false,
      proposedFootprint,
      splitLine,
      easements = [],
      buildings = [],
      treeDbhMm,
      treeLon,
      treeLat,
      tool = 'pan',
      distancePoints = [],
      areaPoints = [],
      onMapClick,
      onParcelClick,
      hoverInfo,
      className,
    },
    ref,
  ) {
    const mapRef = useRef<MapRef | null>(null);
    const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);
    const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [cadastralParcels, setCadastralParcels] = useState<ParcelFeature[]>([]);
    const [highlightedParcel, setHighlightedParcel] = useState<ParcelFeature | null>(null);
    const parcelFetchRef = useRef<AbortController | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('plan');
    const [proGateOpen, setProGateOpen] = useState(false);

    // Phase A & B planning overlay vector layers — HO / BMO / FO. The
    // Set drives both the toggle UI's pressed state and the imperative
    // Mapbox visibility property; the fetched features hydrate three
    // independent GeoJSON sources keyed off the category tag returned
    // by fetchOverlayPolygonsForBbox.
    const [activeLayerIds, setActiveLayerIds] = useState<Set<OverlayLayerCategory>>(
      () => new Set(),
    );
    const [overlayFeatures, setOverlayFeatures] = useState<OverlayPolygonFeature[]>([]);
    const overlayFetchRef = useRef<AbortController | null>(null);

    const treeLonResolved = treeLon ?? lon;
    const treeLatResolved = treeLat ?? lat;

    const tpzCircle = useMemo(() => {
      if (!treeDbhMm || treeDbhMm <= 0) return null;
      const radiusM = tpzRadiusM(treeDbhMm);
      const feature = circle(
        [treeLonResolved, treeLatResolved],
        radiusM,
        { units: 'meters', steps: 64 },
      );
      return feature.geometry;
    }, [treeLonResolved, treeLatResolved, treeDbhMm]);

    useEffect(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      // Prefer framing the parcel polygon when we have one — fitBounds
      // gives a deterministic, lot-sized view independent of the geocoded
      // centroid's zoom. Fall back to flyTo on the point when no
      // polygon is available yet.
      if (polygon) {
        let minLon = Infinity;
        let minLat = Infinity;
        let maxLon = -Infinity;
        let maxLat = -Infinity;
        for (const ring of polygon.coordinates) {
          for (const [x, y] of ring) {
            if (x < minLon) minLon = x;
            if (y < minLat) minLat = y;
            if (x > maxLon) maxLon = x;
            if (y > maxLat) maxLat = y;
          }
        }
        if (Number.isFinite(minLon) && Number.isFinite(minLat)) {
          map.fitBounds(
            [
              [minLon, minLat],
              [maxLon, maxLat],
            ],
            { padding: 80, duration: 1500, pitch: 45, essential: true, maxZoom: 20 },
          );
          return;
        }
      }
      map.flyTo({
        center: [lon, lat],
        zoom: 19,
        pitch: 45,
        duration: 1500,
        essential: true,
        easing: (t) => t * (2 - t),
      });
    }, [lat, lon, polygon]);

    useImperativeHandle(
      ref,
      () => ({
        async getSnapshot() {
          const map = mapRef.current?.getMap();
          if (!map) return null;
          if (!map.loaded()) {
            await new Promise<void>((r) => map.once('idle', () => r()));
          }
          return map.getCanvas().toDataURL('image/png');
        },
      }),
      [],
    );

    // Cadastral parcel loader. Mapbox `moveend` fires on every pan/zoom
    // settle; we fetch the Vicmap_Parcel FeatureServer only when the
    // viewport is at parcel scale (zoom >= 16) — at city zoom the layer
    // would return thousands of features and overwhelm both the network
    // and the GPU. The previous fetch is aborted on the next move so a
    // fast pan does not stack queued requests.
    useEffect(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      function refreshParcels() {
        const m = mapRef.current?.getMap();
        if (!m) return;
        const zoom = m.getZoom();
        if (zoom < 16) {
          setCadastralParcels([]);
          return;
        }
        const b = m.getBounds();
        if (!b) return;
        parcelFetchRef.current?.abort();
        const controller = new AbortController();
        parcelFetchRef.current = controller;
        fetchVicParcelsForBbox(
          b.getWest(),
          b.getSouth(),
          b.getEast(),
          b.getNorth(),
          controller.signal,
        ).then((parcels) => {
          if (!controller.signal.aborted) setCadastralParcels(parcels);
        });
      }
      map.on('moveend', refreshParcels);
      map.on('zoomend', refreshParcels);
      refreshParcels();
      return () => {
        map.off('moveend', refreshParcels);
        map.off('zoomend', refreshParcels);
        parcelFetchRef.current?.abort();
      };
    }, []);

    // Planning overlay polygon loader — Phase A & B. Mirrors the cadastral
    // parcel fetch idiom (moveend + zoomend, abort prior request). Only
    // fires when at least one overlay toggle is active so we don't spam
    // the FeatureServer for users who never open the layer panel. The
    // zoom threshold is lower than parcels (14 vs 16) because overlay
    // polygons are typically suburb-sized — they need to be visible
    // when zoomed out enough to plan against, not just at lot scale.
    useEffect(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const activeArr = Array.from(activeLayerIds);
      if (activeArr.length === 0) {
        setOverlayFeatures([]);
        return;
      }
      function refreshOverlays() {
        const m = mapRef.current?.getMap();
        if (!m) return;
        if (m.getZoom() < 14) {
          setOverlayFeatures([]);
          return;
        }
        const b = m.getBounds();
        if (!b) return;
        overlayFetchRef.current?.abort();
        const controller = new AbortController();
        overlayFetchRef.current = controller;
        fetchOverlayPolygonsForBbox(
          b.getWest(),
          b.getSouth(),
          b.getEast(),
          b.getNorth(),
          activeArr,
          controller.signal,
        ).then((features) => {
          if (!controller.signal.aborted) setOverlayFeatures(features);
        });
      }
      map.on('moveend', refreshOverlays);
      map.on('zoomend', refreshOverlays);
      refreshOverlays();
      return () => {
        map.off('moveend', refreshOverlays);
        map.off('zoomend', refreshOverlays);
        overlayFetchRef.current?.abort();
      };
    }, [activeLayerIds]);

    // Imperative source/layer attachment for the 3 overlay vector layers.
    // Mirrors the property-boundary pattern so the layers survive a base-
    // map switch (Plan ↔ Aerial) — Mapbox wipes every source/layer when
    // `setStyle` resolves, so the `styledata` re-attach is mandatory.
    // Default visibility is 'none' for every layer; the activeLayerIds
    // Set drives setLayoutProperty so a user toggle is a one-line call
    // rather than a full re-render.
    useEffect(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const OVERLAY_PAINT: Record<
        OverlayLayerCategory,
        { fill: string; line: string; opacity: number }
      > = {
        HO: { fill: '#E6C280', line: '#B89653', opacity: 0.25 },
        BMO: { fill: '#E9A078', line: '#B97050', opacity: 0.2 },
        FO: { fill: '#78A0E9', line: '#4C6FA8', opacity: 0.3 },
      };
      const CATEGORIES: OverlayLayerCategory[] = ['HO', 'BMO', 'FO'];

      function sourceIdFor(cat: OverlayLayerCategory): string {
        return `vicplan-overlay-${cat.toLowerCase()}`;
      }
      function fillIdFor(cat: OverlayLayerCategory): string {
        return `vicplan-overlay-${cat.toLowerCase()}-fill`;
      }
      function lineIdFor(cat: OverlayLayerCategory): string {
        return `vicplan-overlay-${cat.toLowerCase()}-line`;
      }

      function dataForCategory(cat: OverlayLayerCategory) {
        return {
          type: 'FeatureCollection' as const,
          features: overlayFeatures.filter(
            (f) => f.properties.category === cat,
          ),
        };
      }

      function attach() {
        const m = mapRef.current?.getMap();
        if (!m || !m.isStyleLoaded()) return;
        for (const cat of CATEGORIES) {
          const srcId = sourceIdFor(cat);
          const fillId = fillIdFor(cat);
          const lineId = lineIdFor(cat);
          const data = dataForCategory(cat);

          const existing = m.getSource(srcId) as GeoJSONSource | undefined;
          if (existing) {
            existing.setData(data);
          } else {
            m.addSource(srcId, { type: 'geojson', data });
          }

          const paint = OVERLAY_PAINT[cat];
          const visibility = activeLayerIds.has(cat) ? 'visible' : 'none';
          if (!m.getLayer(fillId)) {
            m.addLayer({
              id: fillId,
              type: 'fill',
              source: srcId,
              layout: { visibility },
              paint: {
                'fill-color': paint.fill,
                'fill-opacity': paint.opacity,
              },
            });
          } else {
            m.setLayoutProperty(fillId, 'visibility', visibility);
          }
          if (!m.getLayer(lineId)) {
            m.addLayer({
              id: lineId,
              type: 'line',
              source: srcId,
              layout: { visibility },
              paint: {
                'line-color': paint.line,
                'line-width': 1,
                'line-opacity': 0.8,
              },
            });
          } else {
            m.setLayoutProperty(lineId, 'visibility', visibility);
          }
        }
      }

      attach();
      map.on('styledata', attach);

      return () => {
        map.off('styledata', attach);
        try {
          for (const cat of CATEGORIES) {
            const fillId = fillIdFor(cat);
            const lineId = lineIdFor(cat);
            const srcId = sourceIdFor(cat);
            if (map.getLayer(lineId)) map.removeLayer(lineId);
            if (map.getLayer(fillId)) map.removeLayer(fillId);
            if (map.getSource(srcId)) map.removeSource(srcId);
          }
        } catch {
          // Map is being torn down — Mapbox already cleared sources/layers.
        }
      };
    }, [overlayFeatures, activeLayerIds]);

    // Property-boundary source/layers are attached imperatively via
    // map.addSource / map.addLayer rather than through react-map-gl JSX.
    // The two are equivalent at runtime (the JSX wrapper compiles down to
    // these same calls), but the imperative form is easier to re-attach
    // after a style switch — Mapbox wipes every source/layer when
    // `setStyle` resolves, and we need to redraw the lot boundary on top
    // of the freshly-loaded plan/aerial/hybrid raster.
    useEffect(() => {
      const map = mapRef.current?.getMap();
      if (!map || !polygon) return;

      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: polygon,
      };

      function attach() {
        const m = mapRef.current?.getMap();
        if (!m || !m.isStyleLoaded()) return;
        const existing = m.getSource('property-boundary') as
          | GeoJSONSource
          | undefined;
        if (existing) {
          existing.setData(data);
          return;
        }
        m.addSource('property-boundary', { type: 'geojson', data });
        m.addLayer({
          id: 'property-boundary-fill',
          type: 'fill',
          source: 'property-boundary',
          paint: {
            'fill-color': PARCEL_HIGHLIGHT_LIME,
            'fill-opacity': 0,
          },
        });
        m.addLayer({
          id: 'property-boundary-line',
          type: 'line',
          source: 'property-boundary',
          paint: {
            'line-color': PARCEL_HIGHLIGHT_LIME,
            'line-width': 3,
            'line-opacity': 1,
          },
        });
      }

      attach();
      // `styledata` fires during style switches (and during initial load).
      // The isStyleLoaded() guard inside attach() makes the early fires
      // no-ops, and the later "style finished" fire actually re-adds.
      map.on('styledata', attach);

      return () => {
        map.off('styledata', attach);
        try {
          if (map.getLayer('property-boundary-line'))
            map.removeLayer('property-boundary-line');
          if (map.getLayer('property-boundary-fill'))
            map.removeLayer('property-boundary-fill');
          if (map.getSource('property-boundary'))
            map.removeSource('property-boundary');
        } catch {
          // Map is being torn down — Mapbox has already removed the
          // sources for us, so the lookups can throw. Swallow.
        }
      };
    }, [polygon]);

    function applyMonochrome() {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const style = map.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        const id = layer.id;
        const type = layer.type;
        try {
          // Hide Mapbox built-in buildings — Vicmap layer renders instead.
          if (id.includes('building')) {
            map.setLayoutProperty(id, 'visibility', 'none');
            continue;
          }
          // Symbol layers: keep road labels (rendered along road axis by
          // mapbox/light-v11) and hide everything else (POI, transit,
          // place, country, marine labels). Road names carry the
          // cadastral context; the rest is noise on a survey drawing.
          if (type === 'symbol') {
            const isRoadLabel =
              id.includes('road-label') ||
              id.includes('road-number') ||
              id.includes('road-shield');
            if (!isRoadLabel) {
              map.setLayoutProperty(id, 'visibility', 'none');
              continue;
            }
            map.setPaintProperty(id, 'text-color', PAPER_LABEL);
            map.setPaintProperty(id, 'text-halo-color', PAPER_LABEL_HALO);
            map.setPaintProperty(id, 'text-halo-width', 1.5);
            // Force a clean sans serif. Inter is requested via the page
            // font CSS variable; if the style doesn't ship that glyph
            // set, Mapbox falls back through the array to Open Sans.
            try {
              map.setLayoutProperty(id, 'text-font', [
                'Open Sans Regular',
                'Arial Unicode MS Regular',
              ]);
            } catch {
              // Some styles lock text-font; ignore quietly.
            }
            continue;
          }
          if (type === 'background') {
            map.setPaintProperty(id, 'background-color', PAPER_LAND);
          } else if (type === 'fill') {
            if (id.includes('water')) {
              map.setPaintProperty(id, 'fill-color', PAPER_WATER);
            } else if (
              id.includes('park') ||
              id.includes('landuse') ||
              id.includes('green') ||
              id.includes('wood')
            ) {
              map.setPaintProperty(id, 'fill-color', PAPER_GREEN);
            } else if (id.includes('land') || id.includes('background')) {
              map.setPaintProperty(id, 'fill-color', PAPER_LAND);
            }
          } else if (type === 'line') {
            if (id.includes('water')) {
              map.setPaintProperty(id, 'line-color', PAPER_WATER);
            } else if (
              id.includes('road') ||
              id.includes('street') ||
              id.includes('motorway')
            ) {
              const major =
                id.includes('motorway') ||
                id.includes('primary') ||
                id.includes('trunk');
              const isCase = id.includes('case') || id.includes('outline');
              if (isCase) {
                map.setPaintProperty(
                  id,
                  'line-color',
                  major ? PAPER_ROAD_MAJOR_CASING : PAPER_ROAD_CASING,
                );
              } else {
                map.setPaintProperty(
                  id,
                  'line-color',
                  major ? PAPER_ROAD_MAJOR : PAPER_ROAD_FILL,
                );
              }
            }
          }
        } catch {
          // Layer doesn't support that paint/layout property; skip silently.
        }
      }
    }

    function loadHatchPattern() {
      const map = mapRef.current?.getMap();
      if (!map || map.hasImage(HATCH_IMAGE_ID)) return;
      const img = new Image(16, 16);
      img.onload = () => {
        if (!map.hasImage(HATCH_IMAGE_ID)) {
          map.addImage(HATCH_IMAGE_ID, img, { pixelRatio: 2 });
        }
      };
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(HATCH_SVG)}`;
    }

    function handleStyleLoad() {
      if (viewMode === 'plan') applyMonochrome();
      loadHatchPattern();
    }

    if (!TOKEN) {
      return (
        <div
          className={`flex items-center justify-center border border-zinc-200 bg-zinc-50 px-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 ${className ?? ''}`}
        >
          Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
        </div>
      );
    }

    const showHover = hover !== null && hoverInfo;
    const cursorClass = tool === 'pan' ? '' : 'crosshair';

    function handleMouseMove(e: MapMouseEvent) {
      setCursorCoords({ lat: e.lngLat.lat, lon: e.lngLat.lng });

      const map = mapRef.current?.getMap();
      if (map && cursorClass) map.getCanvas().style.cursor = 'crosshair';

      if (!polygon || !hoverInfo || tool !== 'pan') return;
      const hit = e.features?.[0];
      if (hit && hit.layer?.id === 'property-boundary-fill') {
        if (map) map.getCanvas().style.cursor = 'crosshair';
        setHover({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      } else {
        if (map) map.getCanvas().style.cursor = '';
        setHover(null);
      }
    }

    function handleMouseLeave() {
      const map = mapRef.current?.getMap();
      if (map) map.getCanvas().style.cursor = '';
      setHover(null);
      setCursorCoords(null);
    }

    function handleClick(e: MapMouseEvent) {
      // Measurement tools take precedence — clicks feed coordinates
      // into the distance / area / tree pickers, not the cadastral
      // highlight.
      if (tool !== 'pan') {
        onMapClick?.([e.lngLat.lng, e.lngLat.lat]);
        return;
      }
      const hit = e.features?.find(
        (f) => f.layer?.id === 'cadastral-parcels-fill',
      );
      if (hit && onParcelClick) {
        const props = hit.properties as ParcelFeature['properties'] | undefined;
        const pfi = props?.PARCEL_PFI ?? null;
        const match = pfi
          ? cadastralParcels.find((p) => p.properties.PARCEL_PFI === pfi)
          : null;
        if (match) setHighlightedParcel(match);
        onParcelClick([e.lngLat.lng, e.lngLat.lat]);
      }
    }

    async function handleLocateMe() {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 19,
          pitch: 45,
          duration: 1500,
          essential: true,
          easing: (t) => t * (2 - t),
        });
      } catch (error) {
        console.error('Geolocation error:', error);
      }
    }

    const distanceTotalM = polylineLengthM(distancePoints);
    const areaTotalM2 = polygonAreaM2(areaPoints);

    return (
      <div
        className={`relative overflow-hidden border border-zinc-200 dark:border-zinc-800 ${className ?? ''}`}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          preserveDrawingBuffer
          initialViewState={{ latitude: lat, longitude: lon, zoom: 19 }}
          mapStyle={STYLE_BY_VIEW[viewMode]}
          style={{ width: '100%', height: '100%' }}
          interactiveLayerIds={
            tool === 'pan'
              ? [
                  ...(polygon ? ['property-boundary-fill'] : []),
                  'cadastral-parcels-fill',
                ]
              : []
          }
          onLoad={handleStyleLoad}
          onStyleData={handleStyleLoad}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {viewMode !== 'aerial' && cadastralParcels.length > 0 && (
            <Source
              id="cadastral-parcels"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: cadastralParcels,
              }}
            >
              <Layer
                id="cadastral-parcels-fill"
                type="fill"
                paint={{ 'fill-color': PAPER_LAND, 'fill-opacity': 0 }}
              />
              <Layer
                id="cadastral-parcels-line"
                type="line"
                paint={{
                  'line-color': PARCEL_LINE,
                  'line-width': 1.25,
                  'line-opacity': 0.75,
                }}
              />
              <Layer
                id="cadastral-parcels-label"
                type="symbol"
                minzoom={17}
                filter={['has', 'LOT_NUMBER']}
                layout={{
                  'text-field': ['get', 'LOT_NUMBER'],
                  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                  'text-size': 11,
                  'text-allow-overlap': false,
                  'text-ignore-placement': false,
                }}
                paint={{
                  'text-color': PAPER_LABEL,
                  'text-halo-color': PAPER_LABEL_HALO,
                  'text-halo-width': 1.5,
                }}
              />
            </Source>
          )}
          {highlightedParcel && (
            <Source
              id="cadastral-highlight"
              type="geojson"
              data={highlightedParcel}
            >
              <Layer
                id="cadastral-highlight-fill"
                type="fill"
                paint={{
                  'fill-color': PARCEL_HIGHLIGHT_LIME,
                  'fill-opacity': 0.2,
                }}
              />
              <Layer
                id="cadastral-highlight-line"
                type="line"
                paint={{ 'line-color': PARCEL_LINE, 'line-width': 1 }}
              />
            </Source>
          )}
          {/* property-boundary source/layers are attached imperatively in
              the useEffect above so they survive Mapbox style switches. */}
          {buildings.length > 0 && (
            <Source
              id="vicmap-buildings"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: buildings.map((b) => ({
                  type: 'Feature',
                  properties: {},
                  geometry: b,
                })),
              }}
            >
              <Layer
                id="vicmap-buildings-fill"
                type="fill"
                paint={{
                  'fill-color': PAPER_BUILDING,
                  'fill-opacity': 0.9,
                }}
              />
              <Layer
                id="vicmap-buildings-line"
                type="line"
                paint={{
                  'line-color': PAPER_BUILDING_OUTLINE,
                  'line-width': 0.75,
                }}
              />
            </Source>
          )}
          {envelope && (
            <Source
              id="envelope"
              type="geojson"
              data={{ type: 'Feature', properties: {}, geometry: envelope }}
            >
              <Layer
                id="envelope-fill"
                type="fill"
                paint={{
                  'fill-color': envelopeExceeded ? '#dc2626' : '#18181b',
                  'fill-opacity': envelopeExceeded ? 0.1 : 0.06,
                }}
              />
              <Layer
                id="envelope-line"
                type="line"
                paint={{
                  'line-color': envelopeExceeded ? '#dc2626' : '#71717a',
                  'line-width': envelopeExceeded ? 2.5 : 2,
                  'line-dasharray': [4, 2],
                }}
              />
            </Source>
          )}
          {proposedFootprint && (
            <Source
              id="proposed-footprint"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: proposedFootprint,
              }}
            >
              <Layer
                id="proposed-footprint-fill"
                type="fill"
                paint={{
                  'fill-color': envelopeExceeded ? '#dc2626' : '#0f766e',
                  'fill-opacity': 0.35,
                }}
              />
              <Layer
                id="proposed-footprint-line"
                type="line"
                paint={{
                  'line-color': envelopeExceeded ? '#dc2626' : '#0f766e',
                  'line-width': 1.5,
                }}
              />
            </Source>
          )}
          {splitLine && (
            <Source
              id="split-line"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: splitLine },
              }}
            >
              <Layer
                id="split-line-stroke"
                type="line"
                paint={{
                  'line-color': '#0f172a',
                  'line-width': 1.5,
                  'line-dasharray': [6, 4],
                }}
              />
            </Source>
          )}
          {tpzCircle && (
            <Source
              id="tpz"
              type="geojson"
              data={{ type: 'Feature', properties: {}, geometry: tpzCircle }}
            >
              <Layer
                id="tpz-fill"
                type="fill"
                paint={{ 'fill-color': '#EAB308', 'fill-opacity': 0.2 }}
              />
              <Layer
                id="tpz-line"
                type="line"
                paint={{
                  'line-color': '#EAB308',
                  'line-width': 2,
                  'line-dasharray': [4, 3],
                }}
              />
            </Source>
          )}
          {easements.map((easement, idx) => (
            <Source
              key={`easement-${idx}`}
              id={`easement-${idx}`}
              type="geojson"
              data={{ type: 'Feature', properties: {}, geometry: easement.polygon }}
            >
              <Layer
                id={`easement-fill-${idx}`}
                type="fill"
                paint={{ 'fill-pattern': HATCH_IMAGE_ID, 'fill-opacity': 0.95 }}
              />
              <Layer
                id={`easement-line-${idx}`}
                type="line"
                paint={{ 'line-color': '#EA580C', 'line-width': 1.25 }}
              />
            </Source>
          ))}
          {distancePoints.length >= 2 && (
            <Source
              id="distance-line"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: distancePoints },
              }}
            >
              <Layer
                id="distance-stroke"
                type="line"
                paint={{
                  'line-color': '#0f172a',
                  'line-width': 2,
                  'line-dasharray': [2, 2],
                }}
              />
            </Source>
          )}
          {distancePoints.map((p, i) => (
            <Marker key={`dpt-${i}`} longitude={p[0]} latitude={p[1]} anchor="center">
              <span className="block size-2 rounded-full border border-white bg-zinc-900" />
            </Marker>
          ))}
          {areaPoints.length >= 3 && (
            <Source
              id="area-poly"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [[...areaPoints, areaPoints[0]]],
                },
              }}
            >
              <Layer
                id="area-fill"
                type="fill"
                paint={{ 'fill-color': '#0f172a', 'fill-opacity': 0.08 }}
              />
              <Layer
                id="area-line"
                type="line"
                paint={{ 'line-color': '#0f172a', 'line-width': 1.5 }}
              />
            </Source>
          )}
          {areaPoints.map((p, i) => (
            <Marker key={`apt-${i}`} longitude={p[0]} latitude={p[1]} anchor="center">
              <span className="block size-2 rounded-full border border-white bg-zinc-900" />
            </Marker>
          ))}
          {treeDbhMm && treeDbhMm > 0 && (
            <Marker longitude={treeLonResolved} latitude={treeLatResolved} anchor="center">
              <span className="block size-2.5 rounded-full border-2 border-white bg-[#E9E778] shadow-md" />
            </Marker>
          )}
          <ScaleControl maxWidth={100} unit="metric" position="bottom-left" />
          <NavigationControl position="top-right" showCompass visualizePitch />

          <div className="absolute right-4 top-24">
            <button
              type="button"
              onClick={handleLocateMe}
              className="flex size-10 items-center justify-center rounded border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              title="Locate Me"
              aria-label="Locate Me"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-zinc-700 dark:text-zinc-300">
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <Marker latitude={lat} longitude={lon} anchor="center">
            <Crosshair />
          </Marker>
          {showHover && hover && hoverInfo && (
            <Popup
              latitude={hover.lat}
              longitude={hover.lon}
              closeButton={false}
              closeOnClick={false}
              anchor="top"
              offset={12}
              className="lcf-popup"
            >
              <div className="space-y-1 px-1 py-1 text-[11px] leading-snug text-zinc-900">
                <div>
                  <span className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {hoverInfo.zoneLabel}
                  </span>{' '}
                  <span>{hoverInfo.zoneValue ?? '—'}</span>
                </div>
                <div>
                  <span className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {hoverInfo.overlayLabel}
                  </span>{' '}
                  <span>{hoverInfo.overlayValue ?? '—'}</span>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {(distancePoints.length >= 2 || areaPoints.length >= 3) && (
          <div className="absolute left-2 top-2 space-y-1 rounded bg-white/95 px-3 py-2 font-mono text-xs shadow-sm backdrop-blur dark:bg-zinc-950/95">
            {distancePoints.length >= 2 && (
              <div>
                <span className="text-zinc-500">Distance · </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {distanceTotalM < 1000
                    ? `${distanceTotalM.toFixed(1)} m`
                    : `${(distanceTotalM / 1000).toFixed(2)} km`}
                </span>
              </div>
            )}
            {areaPoints.length >= 3 && (
              <div>
                <span className="text-zinc-500">Area · </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {areaTotalM2 < 10000
                    ? `${areaTotalM2.toFixed(1)} m²`
                    : `${(areaTotalM2 / 10000).toFixed(3)} ha`}
                </span>
              </div>
            )}
          </div>
        )}

        {cursorCoords && (
          <div className="absolute bottom-2 right-2 rounded bg-black/75 px-3 py-1.5 font-mono text-xs text-white backdrop-blur">
            {cursorCoords.lat.toFixed(6)}°, {cursorCoords.lon.toFixed(6)}°
          </div>
        )}

        <div className="absolute bottom-10 left-2 flex gap-1.5 rounded-sm bg-[#241F21] p-1.5 shadow-lg">
          <ViewThumb
            label="Plan"
            active={viewMode === 'plan'}
            onClick={() => setViewMode('plan')}
            swatch={
              <div className="h-full w-full bg-[#F5F2ED]">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-zinc-400/60" />
                  <div className="border-r border-b border-zinc-400/60" />
                  <div className="border-b border-zinc-400/60" />
                  <div className="border-r border-b border-zinc-400/60" />
                  <div className="border-r border-b border-zinc-400/60" />
                  <div className="border-b border-zinc-400/60" />
                  <div className="border-r border-zinc-400/60" />
                  <div className="border-r border-zinc-400/60" />
                  <div />
                </div>
              </div>
            }
          />
          <ViewThumb
            label="Aerial"
            active={viewMode === 'aerial'}
            onClick={() => setViewMode('aerial')}
            swatch={
              <div className="h-full w-full bg-gradient-to-br from-[#4a5d3a] via-[#6b7a4f] to-[#3d4a2e]" />
            }
          />
          <ViewThumb
            label="Hybrid"
            active={viewMode === 'hybrid'}
            onClick={() => setViewMode('hybrid')}
            swatch={
              <div className="relative h-full w-full bg-gradient-to-br from-[#4a5d3a] via-[#6b7a4f] to-[#3d4a2e]">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-b border-white/70" />
                  <div className="border-r border-white/70" />
                  <div className="border-r border-white/70" />
                  <div />
                </div>
              </div>
            }
          />
          <ViewThumb
            label="High-Res"
            active={false}
            locked
            onClick={() => setProGateOpen(true)}
            swatch={
              <div className="h-full w-full bg-gradient-to-br from-[#5b6f48] via-[#8a9968] to-[#4a5d3a]" />
            }
          />
        </div>

        {/* Planning overlay layer toggles — HO / BMO / FO. Sits above the
            view-mode thumbs so the architect can layer overlays onto any
            basemap (Plan or Aerial) without losing their viewport. */}
        <div className="absolute bottom-32 left-2 flex flex-col gap-1 rounded-sm bg-[#241F21] p-1.5 shadow-lg">
          <span className="px-1 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {lang === 'en' ? 'Overlays' : '规划覆盖区'}
          </span>
          {(
            [
              {
                id: 'HO',
                label: lang === 'en' ? 'Heritage Overlay' : '遗产覆盖区 (HO)',
                swatch: '#E6C280',
              },
              {
                id: 'BMO',
                label: lang === 'en' ? 'Bushfire Overlay' : '山火管理覆盖区 (BMO)',
                swatch: '#E9A078',
              },
              {
                id: 'FO',
                label:
                  lang === 'en' ? 'Flood Overlay (LSIO / SBO)' : '淹水覆盖区 (FO / LSIO / SBO)',
                swatch: '#78A0E9',
              },
            ] as const
          ).map((opt) => {
            const isActive = activeLayerIds.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setActiveLayerIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(opt.id)) next.delete(opt.id);
                    else next.add(opt.id);
                    return next;
                  })
                }
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-sm border px-2 py-1 text-left transition-colors ${
                  isActive
                    ? 'border-[#E9E778] bg-[#E9E778]/10 text-zinc-100'
                    : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <span
                  className="inline-block size-2.5 rounded-sm border border-black/30"
                  style={{ backgroundColor: opt.swatch }}
                  aria-hidden
                />
                <span className="text-[10px] font-medium tracking-wide">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {proGateOpen && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setProGateOpen(false)}
          >
            <div
              className="mx-4 max-w-sm rounded-sm border border-[#E9E778]/40 bg-[#241F21] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-sm bg-[#E9E778]/15">
                <PadlockIcon className="size-5 text-[#E9E778]" />
              </div>
              <h3 className="mb-2 text-base font-semibold tracking-tight text-white">
                SimplySite Pro Required
              </h3>
              <p className="mb-5 text-xs leading-relaxed text-zinc-300">
                High-Res Nearmap imagery (sub-10 cm aerial captures, refreshed quarterly) is part of the SimplySite Pro tier. Upgrade to access historical captures, oblique views, and AI-derived footprint analytics.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProGateOpen(false)}
                  className="flex-1 rounded-sm border border-zinc-700 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => setProGateOpen(false)}
                  className="flex-1 rounded-sm bg-[#E9E778] px-3 py-2 text-xs font-semibold text-[#241F21] transition-opacity hover:opacity-90"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

function ViewThumb({
  label,
  active,
  locked = false,
  onClick,
  swatch,
}: {
  label: string;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  swatch: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-16 flex-col overflow-hidden rounded-sm border transition-all ${
        active
          ? 'border-[#E9E778] ring-1 ring-[#E9E778]'
          : 'border-zinc-700 hover:border-zinc-500'
      }`}
      aria-label={`${label} view${locked ? ' (locked)' : ''}`}
      aria-pressed={active}
    >
      <span className="relative block h-12 w-full overflow-hidden">
        {swatch}
        {locked && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45">
            <PadlockIcon className="size-4 text-[#E9E778]" />
          </span>
        )}
      </span>
      <span
        className={`block px-1 py-1 text-[10px] font-medium tracking-wide ${
          active ? 'bg-[#E9E778] text-[#241F21]' : 'bg-[#241F21] text-zinc-300'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function PadlockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </svg>
  );
}

function Crosshair() {
  const color = '#18181b';
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" aria-hidden style={{ display: 'block' }}>
      <line x1="22" y1="2" x2="22" y2="15" stroke={color} strokeWidth="1.25" />
      <line x1="22" y1="29" x2="22" y2="42" stroke={color} strokeWidth="1.25" />
      <line x1="2" y1="22" x2="15" y2="22" stroke={color} strokeWidth="1.25" />
      <line x1="29" y1="22" x2="42" y2="22" stroke={color} strokeWidth="1.25" />
      <circle cx="22" cy="22" r="5" fill="none" stroke={color} strokeWidth="1.25" />
      <circle cx="22" cy="22" r="1.5" fill={color} />
    </svg>
  );
}

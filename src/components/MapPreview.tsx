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
  Popup,
  Source,
  type MapMouseEvent,
  type MapRef,
} from 'react-map-gl/mapbox';
import { circle } from '@turf/circle';

import type { ParcelPolygon } from '@/lib/vicPlanApi';

import 'mapbox-gl/dist/mapbox-gl.css';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type MapHoverInfo = {
  zoneLabel: string;
  zoneValue: string | null;
  overlayLabel: string;
  overlayValue: string | null;
};

type Props = {
  lat: number;
  lon: number;
  polygon?: ParcelPolygon | null;
  envelope?: ParcelPolygon | null;
  treeDbhMm?: number;
  treeOffsetX?: number;
  treeOffsetY?: number;
  hoverInfo?: MapHoverInfo | null;
  className?: string;
};

export type MapPreviewHandle = {
  getSnapshot(): Promise<string | null>;
};

export const MapPreview = forwardRef<MapPreviewHandle, Props>(
  function MapPreview({ lat, lon, polygon, envelope, treeDbhMm, treeOffsetX = 0, treeOffsetY = 0, hoverInfo, className }, ref) {
    const mapRef = useRef<MapRef | null>(null);
    const [hover, setHover] = useState<{
      lat: number;
      lon: number;
    } | null>(null);

    const tpzCircle = useMemo(() => {
      if (!treeDbhMm || treeDbhMm <= 0) return null;
      // TPZ radius = 12 × DBH (in mm), convert to metres
      const radiusM = (12 * treeDbhMm) / 1000;
      // Apply X/Y offset (in metres) to tree center
      // Approximate: 1 metre ≈ 0.00001 degrees at Melbourne latitude
      const offsetLon = lon + treeOffsetX * 0.000012;
      const offsetLat = lat + treeOffsetY * 0.000009;
      // Turf circle expects radius in the units specified; we use 'meters'
      const feature = circle([offsetLon, offsetLat], radiusM, { units: 'meters', steps: 64 });
      return feature.geometry;
    }, [lat, lon, treeDbhMm, treeOffsetX, treeOffsetY]);

    useEffect(() => {
      mapRef.current?.flyTo({
        center: [lon, lat],
        zoom: 19,
        duration: 2000,
      });
    }, [lat, lon]);

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

    function handleMouseMove(e: MapMouseEvent) {
      if (!polygon || !hoverInfo) return;
      const hit = e.features?.[0];
      if (hit && hit.layer?.id === 'parcel-fill') {
        const map = mapRef.current?.getMap();
        if (map) map.getCanvas().style.cursor = 'crosshair';
        setHover({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      } else {
        const map = mapRef.current?.getMap();
        if (map) map.getCanvas().style.cursor = '';
        setHover(null);
      }
    }

    function handleMouseLeave() {
      const map = mapRef.current?.getMap();
      if (map) map.getCanvas().style.cursor = '';
      setHover(null);
    }

    return (
      <div
        className={`overflow-hidden border border-zinc-200 dark:border-zinc-800 ${className ?? ''}`}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          preserveDrawingBuffer
          initialViewState={{ latitude: lat, longitude: lon, zoom: 19 }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          style={{ width: '100%', height: '100%' }}
          interactiveLayerIds={polygon ? ['parcel-fill'] : []}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {polygon && (
            <Source
              id="parcel"
              type="geojson"
              data={{ type: 'Feature', properties: {}, geometry: polygon }}
            >
              <Layer
                id="parcel-fill"
                type="fill"
                paint={{ 'fill-color': '#DC2626', 'fill-opacity': 0.1 }}
              />
              <Layer
                id="parcel-line"
                type="line"
                paint={{ 'line-color': '#DC2626', 'line-width': 2 }}
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
                  'fill-color': '#DC2626',
                  'fill-opacity': 0.15,
                  'fill-outline-color': '#DC2626',
                }}
              />
              <Layer
                id="envelope-line"
                type="line"
                paint={{
                  'line-color': '#DC2626',
                  'line-width': 1.5,
                  'line-dasharray': [3, 2],
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
                id="tpz-fi"
                type="fill"
                paint={{
                  'fill-color': '#EAB308',
                  'fill-opacity': 0.2,
                }}
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
      </div>
    );
  },
);

function Crosshair() {
  const color = '#DC2626';
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      aria-hidden
      style={{ display: 'block' }}
    >
      <line x1="22" y1="2" x2="22" y2="15" stroke={color} strokeWidth="1.25" />
      <line x1="22" y1="29" x2="22" y2="42" stroke={color} strokeWidth="1.25" />
      <line x1="2" y1="22" x2="15" y2="22" stroke={color} strokeWidth="1.25" />
      <line x1="29" y1="22" x2="42" y2="22" stroke={color} strokeWidth="1.25" />
      <circle
        cx="22"
        cy="22"
        r="5"
        fill="none"
        stroke={color}
        strokeWidth="1.25"
      />
      <circle cx="22" cy="22" r="1.5" fill={color} />
    </svg>
  );
}

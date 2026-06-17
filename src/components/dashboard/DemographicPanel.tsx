'use client';

import React from 'react';
import { Train, School, Coffee, TreePine, Heart, Baby } from 'lucide-react';

type Lang = 'en' | 'zh';

type DemographicPanelProps = {
  targetDemographicPitch?: string;
  amenities?: {
    transit?: number | null; // meters
    schools?: number; // count within 1km
    retail?: number; // count within 500m
    parks?: number; // count within 1km
  };
  lang: Lang;
};

const LABELS = {
  title: { en: 'AI Demographic & Amenity Pitch', zh: 'AI 人口统计与便利设施分析' },
  noPitch: { en: 'No demographic analysis available', zh: '无人口统计分析' },
  amenities: { en: 'Nearby Amenities', zh: '附近设施' },
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  transit: <Train className="w-3.5 h-3.5" />,
  schools: <School className="w-3.5 h-3.5" />,
  retail: <Coffee className="w-3.5 h-3.5" />,
  parks: <TreePine className="w-3.5 h-3.5" />,
  healthcare: <Heart className="w-3.5 h-3.5" />,
  childcare: <Baby className="w-3.5 h-3.5" />,
};

export default function DemographicPanel({
  targetDemographicPitch,
  amenities,
  lang,
}: DemographicPanelProps) {
  if (!targetDemographicPitch) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200 mb-3">
          {LABELS.title[lang]}
        </h3>
        <p className="text-sm text-zinc-500">{LABELS.noPitch[lang]}</p>
      </div>
    );
  }

  // Parse amenity data into pill badges
  const amenityBadges = [];

  if (amenities?.transit !== null && amenities?.transit !== undefined) {
    amenityBadges.push({
      icon: AMENITY_ICONS.transit,
      label: `${Math.round(amenities.transit)}m`,
      emoji: '🚆',
    });
  }

  if (amenities?.schools && amenities.schools > 0) {
    amenityBadges.push({
      icon: AMENITY_ICONS.schools,
      label: `${amenities.schools} within 1km`,
      emoji: '🏫',
    });
  }

  if (amenities?.retail && amenities.retail > 0) {
    amenityBadges.push({
      icon: AMENITY_ICONS.retail,
      label: `${amenities.retail} within 500m`,
      emoji: '☕',
    });
  }

  if (amenities?.parks && amenities.parks > 0) {
    amenityBadges.push({
      icon: AMENITY_ICONS.parks,
      label: `${amenities.parks} within 1km`,
      emoji: '🌳',
    });
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200 mb-4">
        {LABELS.title[lang]}
      </h3>

      {/* AI Demographic Pitch - Premium serif italic style */}
      <div className="mb-4 rounded-md border border-zinc-600/50 bg-zinc-900/40 p-4">
        <p className="font-serif text-sm italic leading-relaxed text-slate-300">
          "{targetDemographicPitch}"
        </p>
      </div>

      {/* Amenity Pills */}
      {amenityBadges.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {LABELS.amenities[lang]}
          </h4>
          <div className="flex flex-wrap gap-2">
            {amenityBadges.map((badge, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300"
              >
                <span className="text-base">{badge.emoji}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

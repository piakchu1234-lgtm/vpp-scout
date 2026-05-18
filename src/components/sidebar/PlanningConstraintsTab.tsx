'use client';
import React from 'react';
import { ShieldAlert, BookOpen, AlertCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';

const MOCK_PLANNING_DATA = {
  zone: {
    code: "GRZ1",
    name: "General Residential Zone - Schedule 1",
    description: "Encourages a diversity of housing types and moderate housing growth in locations offering good access to services and transport."
  },
  overlays: [
    { code: "DDO8", name: "Design and Development Overlay" },
    { code: "SBO", name: "Special Building Overlay" }
  ],
  hazards: [
    { name: "Bushfire Prone Area (BPA)", active: false },
    { name: "Flood Risk (LSIO/SBO)", active: true, detail: "Melbourne Water referral required." },
    { name: "Cultural Heritage Sensitivity", active: false },
    { name: "Erosion Management", active: false }
  ],
  permits: [
    { id: "PLN-23-0142", status: "Approved", description: "Construction of 3 double-storey townhouses.", date: "12 Oct 2023" },
    { id: "PLN-19-0881", status: "Lapsed", description: "Subdivision of land into two lots.", date: "04 May 2019" }
  ]
};

export default function PlanningConstraintsTab() {
  const data = MOCK_PLANNING_DATA;

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-300 pb-10">

      {/* 1. Zoning Information */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Principal Zoning
        </h3>
        <div className="flex items-start gap-4">
          <div className="px-3 py-1.5 bg-[#E9E778] text-[#241F21] rounded-md font-bold text-lg uppercase tracking-wider shrink-0">
            {data.zone.code}
          </div>
          <div>
            <p className="font-semibold text-white mb-1">{data.zone.name}</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{data.zone.description}</p>
          </div>
        </div>
      </div>

      {/* 2. Overlays */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Planning Overlays
        </h3>
        {data.overlays.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.overlays.map((overlay, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-black/20 border border-white/5 rounded-lg">
                <span className="px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded">
                  {overlay.code}
                </span>
                <span className="text-sm text-zinc-300">{overlay.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">No overlays affecting this site.</p>
        )}
      </div>

      {/* 3. Hazards Matrix */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Hazards & Risks
        </h3>
        <div className="grid grid-cols-1 divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden bg-black/10">
          {data.hazards.map((hazard, idx) => (
            <div key={idx} className={`p-3 flex items-start gap-3 ${hazard.active ? 'bg-red-500/5' : ''}`}>
              {hazard.active ? (
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400/50 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${hazard.active ? 'text-red-300' : 'text-zinc-400'}`}>
                  {hazard.name}
                </p>
                {hazard.active && hazard.detail && (
                  <p className="text-xs text-red-400/70 mt-1">{hazard.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Permit History */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Recent Permit History
        </h3>
        <div className="flex flex-col gap-4">
          {data.permits.map((permit, idx) => (
            <div key={idx} className="relative pl-4 border-l-2 border-white/10">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#E9E778]" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{permit.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                  permit.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {permit.status}
                </span>
              </div>
              <p className="text-sm text-zinc-300 mb-1">{permit.description}</p>
              <p className="text-xs text-zinc-500">{permit.date}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

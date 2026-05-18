'use client';
import React from 'react';
import { X, FileText, Download, Lock, ChevronRight, FileBadge2, CreditCard } from 'lucide-react';

interface StorefrontDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StorefrontDrawer({ isOpen, onClose }: StorefrontDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#241F21] animate-in slide-in-from-bottom-full duration-300">

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/20">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#E9E778]" />
            Intelligence Store
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Purchase official documents and AI reports.</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 pb-24">

        {/* Category 1: AI Reports */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3">AI Feasibility Reports</h3>
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 border border-[#E9E778]/30 rounded-xl p-4 relative overflow-hidden group cursor-pointer hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 px-3 py-1 bg-[#E9E778] text-[#241F21] text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                Popular
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-[#E9E778] shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Comprehensive Site Analysis</h4>
                  <p className="text-xs text-zinc-400 mb-3">Full PDF report including yield models, ResCode compliance, and commercial pro-forma.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-white">$49.00</span>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#241F21] bg-[#E9E778] px-3 py-1.5 rounded-full">
                      <Lock className="w-3 h-3" /> Purchase
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category 2: LANDATA Official */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3">LANDATA® Official Documents</h3>
          <div className="flex flex-col gap-2">

            <div className="flex items-center justify-between bg-black/20 border border-white/5 p-3 rounded-lg hover:border-white/20 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <FileBadge2 className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-white">Copy of Title (Register Search)</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Official State Record</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-zinc-300">$15.50</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/20 border border-white/5 p-3 rounded-lg hover:border-white/20 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <FileBadge2 className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-white">Copy of Plan (Title Diagram)</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Easements & Boundaries</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-zinc-300">$19.80</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

'use client';
import React, { useState } from 'react';
import { X, FileText, Lock, Loader2, ChevronRight, FileBadge2, CreditCard } from 'lucide-react';

interface StorefrontDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  address?: string | null;
  spi?: string | null;
  lat?: number;
  lon?: number;
}

type ProductType = 'ai-report' | 'title-search';

export default function StorefrontDrawer({ isOpen, onClose, address, spi, lat, lon }: StorefrontDrawerProps) {
  const [isProcessing, setIsProcessing] = useState<ProductType | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCheckout(type: ProductType) {
    if (isProcessing) return;
    setIsProcessing(type);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lat, lon }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || `Checkout responded ${res.status}`);
      }
      window.location.href = data.url;
    } catch (err) {
      console.warn('[StorefrontDrawer] checkout failed', err);
      setIsProcessing(null);
      setCheckoutError('Checkout failed. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] md:absolute flex flex-col bg-[#241F21] animate-in slide-in-from-bottom-full duration-300">

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
            <div className="bg-white/5 border border-[#E9E778]/30 rounded-xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 px-3 py-1 bg-[#E9E778] text-[#241F21] text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                Popular
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-[#E9E778] shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Comprehensive Site Analysis</h4>
                  <p className="text-xs text-zinc-400 mb-3">Full PDF report including yield models, ResCode compliance, and commercial pro-forma.</p>
                  {checkoutError && (
                    <p className="text-red-400 text-xs text-center p-2 bg-red-500/10 rounded-md mb-3">
                      {checkoutError}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-white">$49.00</span>
                    <button
                      onClick={() => handleCheckout('ai-report')}
                      disabled={isProcessing !== null}
                      aria-busy={isProcessing === 'ai-report'}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#241F21] bg-[#E9E778] px-3 py-1.5 rounded-full transition-colors hover:bg-[#d4d262] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isProcessing === 'ai-report' ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> Purchase
                        </>
                      )}
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

            <div className="flex items-center justify-between bg-black/20 border border-white/5 p-3 rounded-lg hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <FileBadge2 className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-white">Copy of Title (Register Search)</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Official State Record</p>
                </div>
              </div>
              <button
                onClick={() => handleCheckout('title-search')}
                disabled={isProcessing !== null}
                aria-busy={isProcessing === 'title-search'}
                className="flex items-center gap-2 text-sm font-bold text-zinc-200 hover:text-[#E9E778] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing === 'title-search' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </>
                ) : (
                  <>
                    <span>$15.50</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </>
                )}
              </button>
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

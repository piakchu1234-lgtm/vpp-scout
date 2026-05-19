'use client';
import React, { useState } from 'react';
import { CheckCircle, Download, Loader2, X } from 'lucide-react';
import { generateFeasibilityPdf } from '@/lib/generatePdf';

type ProductType = 'ai-report' | 'title-search';

interface SuccessModalProps {
  isOpen: boolean;
  type: ProductType | null;
  onClose: () => void;
  address?: string | null;
}

const PRODUCT_LABEL: Record<ProductType, string> = {
  'ai-report': 'Report',
  'title-search': 'Title',
};

export default function SuccessModal({ isOpen, type, onClose, address }: SuccessModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const label = type ? PRODUCT_LABEL[type] : 'Document';

  async function handleDownload() {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      await generateFeasibilityPdf('pdf-report-template', address ?? 'Property');
    } catch (err) {
      console.warn('[SuccessModal] PDF generation failed', err);
      setError('PDF generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[92%] max-w-md rounded-2xl border border-[#E9E778] bg-[#241F21] p-8 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-[#E9E778]/10 p-4 border border-[#E9E778]/30">
            <CheckCircle className="w-12 h-12 text-[#E9E778]" strokeWidth={1.5} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Payment Successful.
            </h2>
            <p className="text-sm text-zinc-400">
              Your {label} is ready.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center p-2 bg-red-500/10 rounded-md w-full">
              {error}
            </p>
          )}

          <button
            onClick={handleDownload}
            disabled={isGenerating}
            aria-busy={isGenerating}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#E9E778] py-3 text-sm font-bold uppercase tracking-wider text-[#241F21] transition-colors hover:bg-[#d4d262] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

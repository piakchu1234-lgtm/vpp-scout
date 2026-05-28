'use client';
import React from 'react';
import { CheckCircle, Download, Loader2, Mail, X } from 'lucide-react';

type ProductType = 'ai-report' | 'title-search';

interface SuccessModalProps {
  isOpen: boolean;
  type: ProductType | null;
  onClose: () => void;
  address?: string | null;
  /**
   * Trigger the comprehensive PDF print. Wired by the parent to the
   * `useReactToPrint` handler that clones the off-screen
   * <ComprehensiveReport> ref into an isolated iframe — calling
   * `window.print()` directly here would hit a stale @media print rule
   * targeting an ID that no longer renders, producing a blank A4.
   */
  onDownload?: () => void;
  /** Print gate — disable download button while AI insight is loading */
  isLoadingData?: boolean;
}

export default function SuccessModal({
  isOpen,
  type,
  onClose,
  onDownload,
  isLoadingData = false,
}: SuccessModalProps) {
  if (!isOpen) return null;

  function handleDownload() {
    if (isLoadingData) return; // Print gate — block until data loads
    if (onDownload) {
      onDownload();
      return;
    }
    // Last-resort fallback: parent forgot to wire onDownload. Bare
    // window.print() will likely yield a blank page given the current
    // global print stylesheet, but at least surfaces *something* to the
    // user instead of a silent no-op.
    window.print();
  }

  const isTitleSearch = type === 'title-search';
  const heading = isTitleSearch ? 'Title Search Queued.' : 'Payment Successful.';
  const subtext = isTitleSearch
    ? 'Your official LANDATA® Register Search has been requested. A certified PDF will be securely emailed to your account within 1-2 business days.'
    : 'Your Report is ready.';

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
            {isTitleSearch ? (
              <Mail className="w-12 h-12 text-[#E9E778]" strokeWidth={1.5} />
            ) : (
              <CheckCircle className="w-12 h-12 text-[#E9E778]" strokeWidth={1.5} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {heading}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {subtext}
            </p>
          </div>

          {isTitleSearch ? (
            <button
              onClick={onClose}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#E9E778] py-3 text-sm font-bold uppercase tracking-wider text-[#241F21] transition-colors hover:bg-[#d4d262]"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleDownload}
              disabled={isLoadingData}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                isLoadingData
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-[#E9E778] text-[#241F21] hover:bg-[#d4d262]'
              }`}
            >
              {isLoadingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Insights...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

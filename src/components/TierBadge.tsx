/**
 * TIER BADGE COMPONENT
 *
 * Displays user tier status (FREE vs PRO) and provides upgrade functionality.
 * Uses Clerk's built-in billing system instead of manual Stripe integration.
 *
 * Features:
 * - FREE tier: Shows badge + upgrade button
 * - PRO tier: Shows pro badge with checkmark
 * - Bilingual support (EN/中文)
 * - Uses Clerk Billing for automatic subscription management
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

type TierBadgeProps = {
  userTier: 'free' | 'pro';
  language: 'en' | 'zh';
};

export default function TierBadge({ userTier, language }: TierBadgeProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    // Redirect to pricing page which will show Clerk's <PricingTable />
    router.push('/pricing');
  };

  if (userTier === 'free') {
    return (
      <>
        {/* Free Tier Badge */}
        <div className="flex flex-col items-end mr-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest">TIER</span>
          <span className="text-sm font-bold text-emerald-400">FREE</span>
        </div>

        {/* Upgrade Button */}
        <button
          onClick={handleUpgrade}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-1.5 rounded-full transition-colors text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          {language === 'en' ? 'Upgrade' : '升级'}
        </button>
      </>
    );
  }

  // PRO tier
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
      <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">PRO</span>
    </div>
  );
}

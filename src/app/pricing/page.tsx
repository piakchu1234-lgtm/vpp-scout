/**
 * PRICING PAGE
 *
 * Shows available subscription plans using Clerk's built-in billing system.
 * The PricingTable component automatically handles:
 * - Displaying all plans configured in Clerk Dashboard
 * - Opening checkout drawer when user selects a plan
 * - Managing subscription state and upgrades/downgrades
 * - Syncing payment status with Clerk
 */

import { PricingTable } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function PricingPage() {
  const { has } = await auth();
  const isPro = has({ plan: 'pro' });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#241F21] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
          >
            ← Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-zinc-900 dark:text-white">
            Choose Your Plan
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {isPro
              ? 'You\'re on the Pro plan. Manage your subscription below.'
              : 'Upgrade to Pro for unlimited access to all features.'
            }
          </p>
        </div>

        {/* Clerk Pricing Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
          <PricingTable />
        </div>

        {/* Features Comparison */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white">
            What's Included in Pro
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow">
              <div className="text-3xl mb-3">🏘️</div>
              <h3 className="font-bold mb-2 text-zinc-900 dark:text-white">Multi-Lot Consolidation</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Interactive Super-Lot Builder with real-time site parameters
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="font-bold mb-2 text-zinc-900 dark:text-white">Split-Zoning Engine</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Multi-Title Geometry Analysis across complex boundaries
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="font-bold mb-2 text-zinc-900 dark:text-white">PDF Exports</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Professional bilingual reports for clients
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

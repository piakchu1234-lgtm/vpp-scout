/**
 * ADMIN CRAWLER ROUTE
 *
 * Administrative interface for bulk suburb property ingestion.
 * Allows authorized users to trigger background crawling jobs.
 *
 * Route: /admin/crawler
 * Access: Admin only (implement auth middleware in production)
 */

import CrawlerConsole from '@/components/dashboard/CrawlerConsole';

export default function AdminCrawlerPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Admin Header */}
      <header className="border-b border-zinc-800 bg-[#0F0F0F]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SimplySite Admin</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Suburb Data Ingestion Console</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-600 font-mono">
              Build {process.env.NEXT_PUBLIC_BUILD_ID || 'dev'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Security Warning */}
        <div className="mb-6 p-4 border border-amber-700/50 bg-amber-900/10 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-1">
                Administrative Access Required
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This console triggers bulk property data ingestion. Use responsibly and adhere to rate limits.
                Aggressive crawling may result in IP blocks from Victorian Government WFS services.
                <strong className="text-zinc-300"> Rate limit: 1500ms between requests.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="mb-6 p-4 border border-zinc-800 bg-zinc-900/50 rounded-lg">
          <h3 className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
            Data Attribution Notice
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Spatial and cadastral data sourced from Vicmap © State of Victoria (Department of Energy,
            Environment and Climate Action). Licensed under Creative Commons Attribution 4.0 International
            (CC BY 4.0). All ingested data is for desktop assessment and preliminary feasibility screening only.
          </p>
        </div>

        {/* Crawler Console Component */}
        <CrawlerConsole />

        {/* Usage Guide */}
        <div className="mt-8 p-6 border border-zinc-800 bg-zinc-900/30 rounded-lg">
          <h3 className="text-sm font-semibold text-white mb-4">📖 Usage Guide</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              <strong className="text-zinc-300">1. Enter Suburb Name:</strong> Type the target suburb
              (e.g., "Malvern", "Toorak", "Richmond")
            </div>
            <div>
              <strong className="text-zinc-300">2. Select State:</strong> Choose VIC (Victoria) or other states
            </div>
            <div>
              <strong className="text-zinc-300">3. Start Crawl:</strong> Click "Start Crawl" to begin ingestion
            </div>
            <div>
              <strong className="text-zinc-300">4. Monitor Progress:</strong> Watch real-time progress bar
              and parcel count
            </div>
            <div>
              <strong className="text-zinc-300">5. Review Results:</strong> Check success/failure counts
              and error log
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
              Performance Estimates
            </h4>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="text-zinc-500 mb-1">Small Suburb</div>
                <div className="text-lg font-bold text-white">~500</div>
                <div className="text-zinc-600 mt-1">~12 minutes</div>
              </div>
              <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="text-zinc-500 mb-1">Medium Suburb</div>
                <div className="text-lg font-bold text-white">~1,500</div>
                <div className="text-zinc-600 mt-1">~38 minutes</div>
              </div>
              <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="text-zinc-500 mb-1">Large Suburb</div>
                <div className="text-lg font-bold text-white">~3,000</div>
                <div className="text-zinc-600 mt-1">~75 minutes</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-zinc-600">
          SimplySite Admin Console | Automated Desktop Assessment Platform |
          Rate Limit: 1500ms | Vicmap © State of Victoria
        </div>
      </footer>
    </div>
  );
}

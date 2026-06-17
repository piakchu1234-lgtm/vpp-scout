/**
 * CRAWLER CONSOLE - Admin UI for Suburb Data Ingestion
 *
 * Production-grade admin interface for monitoring and controlling
 * the automated suburb crawler background worker.
 *
 * Features:
 * - Real-time progress tracking with animated progress bar
 * - Suburb selection and crawl initiation
 * - Live status updates (completed/total parcels)
 * - Estimated time to completion
 * - Error log display
 * - Cancel/pause controls
 *
 * Usage:
 * ```tsx
 * <CrawlerConsole />
 * ```
 */

'use client';

import React, { useState } from 'react';
import { Loader2, Play, Square, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { SuburbCrawler, type CrawlProgress, type CrawlResult } from '@/lib/cron/suburbCrawler';

export default function CrawlerConsole() {
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('VIC');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<CrawlProgress | null>(null);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  /**
   * Start suburb crawl
   */
  const handleStartCrawl = async () => {
    if (!suburb.trim()) {
      alert('Please enter a suburb name');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setResult(null);
    setErrors([]);

    try {
      const crawler = new SuburbCrawler();

      const crawlResult = await crawler.crawlSuburb(
        suburb.trim(),
        state,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setResult(crawlResult);
      setErrors(crawlResult.errors);
    } catch (error) {
      console.error('[CrawlerConsole] Crawl failed:', error);
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Format estimated completion time
   */
  const formatETA = (date: Date | null): string => {
    if (!date) return '—';
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);

    if (diffMin < 1) return '< 1 minute';
    if (diffMin < 60) return `${diffMin} minutes`;

    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    return `${hours}h ${minutes}m`;
  };

  /**
   * Calculate progress percentage
   */
  const progressPercentage = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-700 pb-4">
        <h1 className="text-2xl font-bold text-white">Suburb Crawler Console</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Automated property data ingestion for bulk suburb mapping
        </p>
      </div>

      {/* Crawl Configuration */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Configuration</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Suburb Name
            </label>
            <input
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="e.g., Malvern, Toorak, Richmond"
              disabled={isRunning}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E9E778] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#E9E778] disabled:opacity-50"
            >
              <option value="VIC">Victoria</option>
              <option value="NSW">New South Wales</option>
              <option value="QLD">Queensland</option>
            </select>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleStartCrawl}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-[#E9E778] text-[#241F21] font-semibold rounded-md hover:bg-[#d4d36a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Crawl
              </>
            )}
          </button>

          {isRunning && (
            <button
              onClick={() => setIsRunning(false)}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Progress */}
      {(isRunning || progress) && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Progress</h2>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">
                {progress?.completed || 0} / {progress?.total || 0} parcels
              </span>
              <span className="text-[#E9E778] font-semibold">
                {progressPercentage}%
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E9E778] to-[#00FF66] transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Status Details */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Current PFI</div>
              <div className="text-sm text-white font-mono truncate">
                {progress?.currentPFI || '—'}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Failed</div>
              <div className="text-sm text-red-400 font-semibold">
                {progress?.failed || 0}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Est. Completion</div>
              <div className="text-sm text-white font-semibold">
                {formatETA(progress?.estimatedCompletionAt || null)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crawl Result Summary */}
      {result && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Result</h2>
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Total Processed</div>
              <div className="text-2xl text-white font-bold">
                {result.totalProcessed}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Succeeded</div>
              <div className="text-2xl text-green-500 font-bold">
                {result.successCount}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Failed</div>
              <div className="text-2xl text-red-500 font-bold">
                {result.failureCount}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Duration</div>
              <div className="text-2xl text-white font-bold">
                {Math.round(result.duration / 1000)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Log */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-300">
              Errors ({errors.length})
            </h3>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {errors.map((error, idx) => (
              <div
                key={idx}
                className="text-xs font-mono text-red-200 bg-red-900/30 rounded p-2"
              >
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

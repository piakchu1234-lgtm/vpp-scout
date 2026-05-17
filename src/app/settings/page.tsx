'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/Logo';

const KEYS = {
  domain: 'simplysite.domain_api_key',
  google: 'simplysite.google_maps_key',
} as const;

export default function SettingsPage() {
  const [domainKey, setDomainKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDomainKey(window.localStorage.getItem(KEYS.domain) ?? '');
    setGoogleKey(window.localStorage.getItem(KEYS.google) ?? '');
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (domainKey.trim()) window.localStorage.setItem(KEYS.domain, domainKey.trim());
    else window.localStorage.removeItem(KEYS.domain);
    if (googleKey.trim()) window.localStorage.setItem(KEYS.google, googleKey.trim());
    else window.localStorage.removeItem(KEYS.google);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header className="flex items-center gap-3">
        <Logo size={20} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">
          SimplySite · Settings
        </span>
      </header>

      <h1 className="mt-12 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        API Keys
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Connect external data providers used by the Market Context card and the
        Frontage View. Keys are stored in this browser&apos;s local storage —
        never sent to a SimplySite server.
      </p>

      <p className="mt-4 border-l-2 border-amber-400 pl-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
        Demo storage only. Production deployments must move these keys to
        server-side environment variables; localStorage is exposed to any
        script running in this browser tab.
      </p>

      <form onSubmit={handleSave} className="mt-10 space-y-8">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Domain API Key
          </span>
          <input
            type="password"
            autoComplete="off"
            value={domainKey}
            onChange={(e) => setDomainKey(e.target.value)}
            placeholder="key_..."
            className="mt-2 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <span className="mt-2 block text-xs text-zinc-500">
            Powers <em>last sold price</em> and comparable sales in the Market
            Context card. Without it, demo numbers are shown.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Google Maps Key
          </span>
          <input
            type="password"
            autoComplete="off"
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
            placeholder="AIza..."
            className="mt-2 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <span className="mt-2 block text-xs text-zinc-500">
            Powers Street View Frontage previews. Without it, an architectural
            placeholder is shown.
          </span>
        </label>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="border-2 border-zinc-900 px-6 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
          >
            Save
          </button>
          {saved && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              Saved.
            </span>
          )}
          <Link
            href="/"
            className="ml-auto text-xs text-zinc-500 underline-offset-2 hover:underline"
          >
            ← Back to assessment
          </Link>
        </div>
      </form>
    </main>
  );
}

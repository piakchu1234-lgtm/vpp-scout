'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import {
  type GlossaryEntry,
  getOrdinanceUrl,
} from '@/lib/regulatoryGlossary';

type Props = {
  entry: GlossaryEntry;
  lang: 'en' | 'zh';
  lga?: string | null;
  onClose: () => void;
};

const T = {
  officialReference: { en: 'Official Reference', zh: '官方参考' },
  viewPlanningScheme: { en: 'View Planning Scheme', zh: '查看规划方案' },
  viewOrdinance: {
    en: 'View Live Ordinance',
    zh: '查看实时条款原文',
  },
  close: { en: 'Close', zh: '关闭' },
};

export function RegulatoryModal({ entry, lang, lga, onClose }: Props) {
  const t = (key: keyof typeof T) => T[key][lang];

  const ordinanceUrl =
    entry.clause && lga ? getOrdinanceUrl(lga, entry.clause) : null;

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-2 py-1 font-mono text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                {entry.code}
              </span>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {entry.name[lang]}
              </h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {entry.definition[lang]}
            </p>
            {entry.pdfUrl && (
              <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                  {t('officialReference')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={entry.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors hover:bg-zinc-950 hover:text-white dark:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-950"
                  >
                    {t('viewPlanningScheme')} →
                  </a>
                  {ordinanceUrl && (
                    <a
                      href={ordinanceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-[#E9E778] bg-[#E9E778] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#241F21] transition-colors hover:bg-[#dcd960]"
                    >
                      {t('viewOrdinance')} →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={t('close')}
          >
            <X className="size-5 text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

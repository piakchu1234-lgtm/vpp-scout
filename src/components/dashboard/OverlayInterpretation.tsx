'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { VPPInterpretation } from '@/lib/ai/vppInterpreter';

type Props = {
  code: string;
  language: 'en' | 'zh';
};

export function OverlayInterpretation({ code, language }: Props) {
  const [interpretation, setInterpretation] = useState<VPPInterpretation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchInterpretation() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch('/api/interpret-overlay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json() as VPPInterpretation;

        if (mounted) {
          setInterpretation(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('[OverlayInterpretation] Failed to fetch:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchInterpretation();

    return () => {
      mounted = false;
    };
  }, [code, language]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-zinc-700/50 rounded w-3/4" />
        <div className="h-3 bg-zinc-700/50 rounded w-full" />
        <div className="h-3 bg-zinc-700/50 rounded w-5/6" />
      </div>
    );
  }

  if (error || !interpretation) {
    return (
      <p className="text-xs text-zinc-400 leading-relaxed italic">
        {language === 'zh'
          ? '法律定义暂时无法加载。请稍后重试。'
          : 'Legal definition temporarily unavailable. Please try again later.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">
          {language === 'zh' ? '法定目的' : 'Statutory Purpose'}
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {interpretation.statutoryPurpose}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">
          {language === 'zh' ? '实际影响' : 'Practical Impact'}
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {interpretation.practicalImpact}
        </p>
      </div>
    </div>
  );
}

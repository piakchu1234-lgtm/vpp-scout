'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type VPPAgentResult = {
  code: string;
  definition: {
    en: string;
    zh: string;
  };
  source: 'scraped' | 'ai-generated' | 'fallback';
};

type Props = {
  code: string;
  language: 'en' | 'zh';
  trigger?: 'immediate' | 'onClick';
  onFetch?: () => void;
};

export function VPPAgentDefinition({ code, language, trigger = 'immediate', onFetch }: Props) {
  const [definition, setDefinition] = useState<VPPAgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function fetchDefinition() {
    if (fetched) return; // Only fetch once

    try {
      setLoading(true);
      setError(false);
      onFetch?.();

      const response = await fetch('/api/vpp-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as VPPAgentResult;
      setDefinition(data);
      setFetched(true);
    } catch (err) {
      console.error('[VPPAgentDefinition] Failed to fetch:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (trigger === 'immediate') {
      fetchDefinition();
    }
  }, [code, trigger]);

  if (trigger === 'onClick' && !fetched && !loading) {
    return (
      <button
        onClick={fetchDefinition}
        className="text-xs text-[#E9E778] hover:text-[#d4d262] underline transition-colors"
      >
        {language === 'zh' ? '点击加载法律定义' : 'Click to load legal definition'}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-zinc-700/50 rounded w-full" />
        <div className="h-3 bg-zinc-700/50 rounded w-5/6" />
        <div className="flex items-center gap-2 mt-3">
          <Loader2 className="w-3 h-3 text-[#E9E778] animate-spin" />
          <span className="text-[10px] text-zinc-500">
            {language === 'zh' ? '正在从维多利亚州规划方案获取定义...' : 'Fetching definition from Victorian planning scheme...'}
          </span>
        </div>
      </div>
    );
  }

  if (error || !definition) {
    return (
      <p className="text-xs text-zinc-400 leading-relaxed italic">
        {language === 'zh'
          ? '法律定义暂时无法加载。请稍后重试。'
          : 'Legal definition temporarily unavailable. Please try again later.'}
      </p>
    );
  }

  const text = definition.definition[language];

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-300 leading-relaxed">
        {text}
      </p>
      {definition.source === 'scraped' && (
        <p className="text-[10px] text-zinc-600 italic">
          {language === 'zh' ? '来源: 维多利亚州规划官网' : 'Source: Victorian planning scheme'}
        </p>
      )}
      {definition.source === 'ai-generated' && (
        <p className="text-[10px] text-zinc-600 italic">
          {language === 'zh' ? '来源: AI 生成摘要' : 'Source: AI-generated summary'}
        </p>
      )}
    </div>
  );
}

/**
 * Data Source Badge
 *
 * Visual indicator showing the origin of property market data.
 * Used to build user trust by transparently showing data provenance.
 */

import { type DataSource, formatDataSource, getSourceConfidence } from '@/lib/agentMarketIntegration';

type DataSourceBadgeProps = {
  source: DataSource;
  language: 'en' | 'zh';
  className?: string;
};

export function DataSourceBadge({ source, language, className = '' }: DataSourceBadgeProps) {
  const confidence = getSourceConfidence(source);
  const label = formatDataSource(source, language);

  // Confidence-based styling
  const colorClasses = {
    high: 'bg-[#E9E778]/20 text-[#E9E778] border-[#E9E778]/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/50',
  };

  const iconEmoji = {
    agent: '🤖',
    domain: '📊',
    mock: '📋',
    none: '—',
    calculated: '🧮',
  };

  if (source === 'none') {
    return null; // Don't show badge if no data
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${colorClasses[confidence]} ${className}`}
      title={language === 'en' ? `Data source: ${label}` : `数据来源: ${label}`}
    >
      <span>{iconEmoji[source]}</span>
      <span>{label}</span>
    </span>
  );
}

'use client';

/**
 * Pure Visual Symbols Risk Matrix
 *
 * Clean, high-contrast assessment grid with ✅/❌/⚠️ symbols.
 * No background boxes or shading — icons sit directly on UI background.
 */

type RiskStatus = 'pass' | 'fail' | 'warning';

type RiskCriterion = {
  category: string;
  label: string;
  status: RiskStatus;
  detail?: string;
};

type Props = {
  criteria: RiskCriterion[];
  lang: 'en' | 'zh';
};

const STATUS_SYMBOLS: Record<RiskStatus, string> = {
  pass: '✅',
  fail: '❌',
  warning: '⚠️',
};

const HEADERS = {
  category: { en: 'Category', zh: '类别' },
  criterion: { en: 'Criterion', zh: '标准' },
  status: { en: 'Status', zh: '状态' },
  detail: { en: 'Detail', zh: '详情' },
};

export function RiskMatrix({ criteria, lang }: Props) {
  const t = (key: keyof typeof HEADERS) => HEADERS[key][lang];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t('category')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t('criterion')}
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t('status')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t('detail')}
            </th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion, idx) => (
            <tr
              key={idx}
              className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/50"
            >
              <td className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                {criterion.category}
              </td>
              <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                {criterion.label}
              </td>
              <td className="px-4 py-3 text-center text-2xl">
                {STATUS_SYMBOLS[criterion.status]}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {criterion.detail || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

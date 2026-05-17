'use client';

import { useState } from 'react';
import { X, Loader2, Check, Minus } from 'lucide-react';

import { BETA_FREE, BETA_REPORT_CTA } from '@/lib/betaConfig';

type Lang = 'en' | 'zh';

type Props = {
  lang: Lang;
  address: string | null;
  spi: string | null;
  onClose: () => void;
};

type FeatureRow = {
  label: { en: string; zh: string };
  free: boolean | { en: string; zh: string };
  premium: boolean | { en: string; zh: string };
};

const COPY = {
  heading: { en: 'Pricing', zh: '定价' },
  subheading: {
    en: 'Use the dashboard freely. Pay only when you need an audit-grade A4 PDF for your architect, lender, or council application.',
    zh: '面板始终免费使用。仅当需向建筑师、贷款机构或市议会提交审计级 A4 PDF 时再付费。',
  },
  tier1Title: { en: 'Free Basic Audit', zh: '免费基础审计' },
  tier1Price: { en: '$0', zh: '$0' },
  tier1Note: { en: 'Forever · Live dashboard', zh: '永久免费 · 实时面板' },
  tier1Cta: { en: 'Currently active', zh: '当前已启用' },
  tier2Title: { en: 'Premium Property Report', zh: '专业地产报告' },
  tier2Price: { en: '$49', zh: '$49' },
  tier2PriceBeta: { en: 'Free', zh: '免费' },
  tier2Note: { en: 'AUD · per report', zh: '澳元 · 每份报告' },
  tier2NoteBeta: {
    en: 'Beta Launch Access · per report',
    zh: '公测启用 · 每份报告',
  },
  tier2Cta: { en: 'Unlock Premium Report', zh: '解锁专业报告' },
  tier2CtaBeta: BETA_REPORT_CTA,
  tier2CtaLoading: { en: 'Opening Stripe Checkout…', zh: '正在打开 Stripe 结账…' },
  matrixHeading: { en: 'What\'s included', zh: '功能包含' },
  errorGeneric: {
    en: 'Could not open checkout. Please try again.',
    zh: '无法打开结账,请稍后重试。',
  },
  errorNotConfigured: {
    en: 'Stripe configuration keys pending',
    zh: 'Stripe 配置密钥待设置',
  },
  close: { en: 'Close', zh: '关闭' },
  included: { en: 'Included', zh: '包含' },
  notIncluded: { en: 'Not included', zh: '不包含' },
};

const FEATURES: FeatureRow[] = [
  {
    label: { en: 'Cadastral parcel boundaries', zh: '地籍地块边界' },
    free: true,
    premium: true,
  },
  {
    label: { en: 'Live LGA zoning lookup', zh: '实时 LGA 分区查询' },
    free: true,
    premium: true,
  },
  {
    label: { en: 'Planning overlays (HO · BMO · LSIO · DDO)', zh: '规划覆盖区(HO · BMO · LSIO · DDO)' },
    free: true,
    premium: true,
  },
  {
    label: { en: 'ResCode compliance checks', zh: 'ResCode 合规检查' },
    free: true,
    premium: true,
  },
  {
    label: { en: 'Indicative sub-market estimate', zh: '次级市场参考估算' },
    free: true,
    premium: true,
  },
  {
    label: { en: 'High-resolution frontage imagery', zh: '高分辨率临街影像' },
    free: false,
    premium: true,
  },
  {
    label: { en: 'Legal SPI (Standard Parcel Identifier)', zh: '法定 SPI 标识码' },
    free: false,
    premium: true,
  },
  {
    label: { en: 'SSD setback compliance matrix', zh: 'SSD 退界合规矩阵' },
    free: false,
    premium: true,
  },
  {
    label: { en: 'Downloadable A4 PDF report', zh: '可下载 A4 PDF 报告' },
    free: false,
    premium: { en: 'English / 简体中文', zh: 'English / 简体中文' },
  },
];

function pick<T>(map: { en: T; zh: T }, lang: Lang): T {
  return map[lang];
}

function CellGlyph({
  value,
  lang,
  premium,
}: {
  value: FeatureRow['free'];
  lang: Lang;
  premium: boolean;
}) {
  if (typeof value === 'object') {
    return (
      <span
        className={`text-[11px] tracking-wide ${
          premium ? 'text-[#E9E778]' : 'text-zinc-300'
        }`}
      >
        {pick(value, lang)}
      </span>
    );
  }
  if (value) {
    return (
      <span aria-label={pick(COPY.included, lang)}>
        <Check
          aria-hidden
          className={`size-4 ${premium ? 'text-[#E9E778]' : 'text-zinc-300'}`}
          strokeWidth={2.25}
        />
      </span>
    );
  }
  return (
    <span aria-label={pick(COPY.notIncluded, lang)}>
      <Minus
        aria-hidden
        className="size-3.5 text-zinc-700"
        strokeWidth={2}
      />
    </span>
  );
}

export function PricingBanner({ lang, address, spi, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'generic' | 'notConfigured' | null>(null);

  async function handlePurchase() {
    if (BETA_FREE) {
      // Beta launch — paid path is gated off. The /api/checkout route
      // and Stripe SDK remain wired up so flipping BETA_FREE back to
      // false re-activates the full purchase flow with no further
      // changes. We simply close the banner; the Reports tab CTA
      // already triggers the free PDF download.
      onClose();
      return;
    }
    setLoading(true);
    setError(null);
    setErrorKind(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, spi, lang }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        const isNotConfigured =
          res.status === 500 &&
          typeof body.error === 'string' &&
          body.error.includes('STRIPE_SECRET_KEY');
        if (isNotConfigured) {
          setErrorKind('notConfigured');
          setError(pick(COPY.errorNotConfigured, lang));
        } else {
          setErrorKind('generic');
          setError(pick(COPY.errorGeneric, lang));
        }
        return;
      }
      window.location.href = body.url;
    } catch {
      setErrorKind('generic');
      setError(pick(COPY.errorGeneric, lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative border-b border-zinc-800 bg-[#241F21] text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <button
          type="button"
          onClick={onClose}
          aria-label={pick(COPY.close, lang)}
          className="absolute right-5 top-5 inline-flex size-8 items-center justify-center border border-zinc-700 text-zinc-300 transition-colors hover:border-[#E9E778] hover:text-[#E9E778]"
        >
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        </button>

        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E9E778]">
            {pick(COPY.heading, lang)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            {pick(COPY.subheading, lang)}
          </p>
        </div>

        {/* Feature matrix — three columns: feature label, free, premium */}
        <div className="mt-8 overflow-hidden border border-zinc-800">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th
                  scope="col"
                  className="w-[44%] px-5 py-5 align-bottom text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500"
                >
                  {pick(COPY.matrixHeading, lang)}
                </th>
                <th
                  scope="col"
                  className="w-[28%] border-l border-zinc-800 px-5 py-5 align-bottom"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                    {pick(COPY.tier1Title, lang)}
                  </p>
                  <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-zinc-100">
                    {pick(COPY.tier1Price, lang)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    {pick(COPY.tier1Note, lang)}
                  </p>
                </th>
                <th
                  scope="col"
                  className="w-[28%] border-l border-[#E9E778]/40 bg-[#E9E778]/[0.06] px-5 py-5 align-bottom"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E9E778]">
                    {pick(COPY.tier2Title, lang)}
                  </p>
                  <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-[#E9E778]">
                    {pick(BETA_FREE ? COPY.tier2PriceBeta : COPY.tier2Price, lang)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                    {pick(BETA_FREE ? COPY.tier2NoteBeta : COPY.tier2Note, lang)}
                  </p>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, i) => {
                const isLast = i === FEATURES.length - 1;
                return (
                  <tr
                    key={row.label.en}
                    className={isLast ? '' : 'border-b border-zinc-900'}
                  >
                    <td className="px-5 py-3 text-xs leading-relaxed text-zinc-200">
                      {pick(row.label, lang)}
                    </td>
                    <td className="border-l border-zinc-800 px-5 py-3">
                      <CellGlyph value={row.free} lang={lang} premium={false} />
                    </td>
                    <td className="border-l border-[#E9E778]/40 bg-[#E9E778]/[0.04] px-5 py-3">
                      <CellGlyph value={row.premium} lang={lang} premium={true} />
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-zinc-800 bg-zinc-900/40">
                <td className="px-5 py-5" aria-hidden />
                <td className="border-l border-zinc-800 px-5 py-5">
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-default border border-zinc-700 bg-transparent px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500"
                  >
                    {pick(COPY.tier1Cta, lang)}
                  </button>
                </td>
                <td className="border-l border-[#E9E778]/40 bg-[#E9E778]/[0.06] px-5 py-5">
                  <button
                    type="button"
                    onClick={handlePurchase}
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#E9E778] bg-[#E9E778] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#241F21] transition-all hover:bg-[#f3f08c] hover:shadow-[0_0_22px_rgba(233,231,120,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 aria-hidden className="size-3.5 animate-spin" strokeWidth={2} />
                        {pick(COPY.tier2CtaLoading, lang)}
                      </>
                    ) : (
                      pick(BETA_FREE ? COPY.tier2CtaBeta : COPY.tier2Cta, lang)
                    )}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {error && (
          <div
            role="status"
            className={`mt-5 inline-flex items-center gap-2.5 border px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] ${
              errorKind === 'notConfigured'
                ? 'border-zinc-700 bg-zinc-900/60 text-zinc-300'
                : 'border-zinc-700 bg-zinc-900/60 text-zinc-200'
            }`}
          >
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${
                errorKind === 'notConfigured' ? 'bg-zinc-500' : 'bg-[#E9E778]'
              }`}
            />
            <span className="normal-case tracking-normal">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

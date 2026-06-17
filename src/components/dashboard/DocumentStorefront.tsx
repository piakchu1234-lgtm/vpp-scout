'use client';

import React from 'react';
import { FileText, MapIcon, Shield, ShoppingCart } from 'lucide-react';

type Lang = 'en' | 'zh';

const COPY: Record<Lang, {
  title: string;
  subtitle: string;
  items: {
    registerSearch: { title: string; description: string };
    copyOfPlan: { title: string; description: string };
    instrumentSearch: { title: string; description: string };
  };
  purchaseButton: string;
  footerNote: string;
  spiLabel: string;
  unavailable: string;
}> = {
  en: {
    title: 'Official Property Documents',
    subtitle: 'Purchase certified documents directly from LANDATA',
    items: {
      registerSearch: {
        title: 'Register Search Statement (Title)',
        description: 'Current ownership, mortgages, caveats, and encumbrances',
      },
      copyOfPlan: {
        title: 'Copy of Plan',
        description: 'Exact boundary dimensions, easements, and restrictions',
      },
      instrumentSearch: {
        title: 'Instrument Search',
        description: 'Detailed covenant and caveat documentation',
      },
    },
    purchaseButton: 'Purchase Documents',
    footerNote: 'Powered by LANDATA. Using SPI routing to bypass land index search fees.',
    spiLabel: 'Standard Parcel Identifier (SPI)',
    unavailable: 'Document purchase unavailable — awaiting parcel resolution.',
  },
  zh: {
    title: '官方产权文件',
    subtitle: '直接从 LANDATA 购买认证文件',
    items: {
      registerSearch: {
        title: 'Register Search Statement (产权证明)',
        description: '当前所有权、抵押、警示和产权负担',
      },
      copyOfPlan: {
        title: 'Copy of Plan (地块图纸)',
        description: '精确边界尺寸、地役权和限制条款',
      },
      instrumentSearch: {
        title: 'Instrument Search (契约搜索)',
        description: '详细的契约和警示文件',
      },
    },
    purchaseButton: '购买文件',
    footerNote: '由 LANDATA 提供支持。使用 SPI 路由绕过土地索引搜索费用。',
    spiLabel: '标准地块标识符 (SPI)',
    unavailable: '文件购买不可用 — 等待地块解析。',
  },
};

type DocumentItem = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: 'registerSearch' | 'copyOfPlan' | 'instrumentSearch';
  price: string;
};

const DOCUMENTS: DocumentItem[] = [
  {
    id: 'register-search',
    icon: FileText,
    titleKey: 'registerSearch',
    price: '$15.00',
  },
  {
    id: 'copy-of-plan',
    icon: MapIcon,
    titleKey: 'copyOfPlan',
    price: '$20.00',
  },
  {
    id: 'instrument-search',
    icon: Shield,
    titleKey: 'instrumentSearch',
    price: '$25.00',
  },
];

type Props = {
  lotPlan: string | null;
  lang?: Lang;
  onPurchase?: () => void;
};

export default function DocumentStorefront({
  lotPlan,
  lang = 'en',
  onPurchase,
}: Props) {
  const t = COPY[lang];

  const handlePurchase = () => {
    if (!lotPlan) return;
    if (onPurchase) {
      onPurchase();
    } else {
      // Default behavior: Open LANDATA with SPI routing
      const landataUrl = `https://www.landata.vic.gov.au/order?spi=${encodeURIComponent(lotPlan)}`;
      window.open(landataUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1">{t.title}</h3>
        <p className="text-xs text-zinc-400">{t.subtitle}</p>
      </div>

      {/* SPI Display */}
      {lotPlan && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
            {t.spiLabel}
          </p>
          <p className="text-sm font-mono text-[#E9E778]">{lotPlan}</p>
        </div>
      )}

      {/* Document Items */}
      {lotPlan ? (
        <>
          <div className="space-y-3">
            {DOCUMENTS.map((doc) => {
              const Icon = doc.icon;
              const item = t.items[doc.titleKey];
              return (
                <div
                  key={doc.id}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E9E778]/10 border border-[#E9E778]/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#E9E778]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white leading-tight">
                          {item.title}
                        </h4>
                        <span className="text-sm font-bold text-[#E9E778] shrink-0">
                          {doc.price}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#E9E778] py-3 text-sm font-bold uppercase tracking-wider text-[#241F21] transition-colors hover:bg-[#d4d262]"
          >
            <ShoppingCart className="w-4 h-4" />
            {t.purchaseButton}
          </button>

          {/* Footer Note */}
          <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
            {t.footerNote}
          </p>
        </>
      ) : (
        <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-500 italic">{t.unavailable}</p>
        </div>
      )}
    </div>
  );
}

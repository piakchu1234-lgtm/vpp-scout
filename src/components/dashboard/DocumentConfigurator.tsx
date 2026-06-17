'use client';

import React, { useState } from 'react';
import { Map, Grid3x3, AlertTriangle, Globe, FileText, X } from 'lucide-react';

type Lang = 'en' | 'zh';

export type DocumentConfig = {
  includeMapCanvas: boolean;
  includeSplitZoningGrid: boolean;
  includeHazardsLedger: boolean;
  reportLanguage: 'english' | 'bilingual';
};

type DocumentConfiguratorProps = {
  lang: Lang;
  onGenerate: (config: DocumentConfig) => void;
  onCancel: () => void;
};

const LABELS = {
  title: { en: 'Configure Feasibility Report', zh: '配置可行性报告' },
  subtitle: { en: 'Select optional sections to include in your document', zh: '选择要包含在文档中的可选部分' },
  mapCanvas: { en: 'Include WebGL Map Canvas Layout', zh: '包含 WebGL 地图布局' },
  mapCanvasDesc: { en: 'High-resolution satellite imagery with parcel boundaries', zh: '带地块边界的高分辨率卫星图像' },
  splitZoning: { en: 'Include Detailed Split-Zoning Data Grid', zh: '包含详细分区数据网格' },
  splitZoningDesc: { en: 'Multi-zone parcel percentage breakdowns and ResCode routing', zh: '多区域地块百分比细分和 ResCode 路由' },
  hazardsLedger: { en: 'Include Local Hazard & Overlay Ledger', zh: '包含本地风险与覆盖区清单' },
  hazardsLedgerDesc: { en: 'Flood zones, bushfire risk, heritage overlays, and environmental constraints', zh: '洪水区、山火风险、遗产覆盖区和环境限制' },
  languageSelection: { en: 'Primary Report Language Selection', zh: '主报告语言选择' },
  englishOnly: { en: 'English Only', zh: '仅英文' },
  bilingual: { en: 'Bilingual EN/ZH', zh: '双语 EN/ZH' },
  generate: { en: 'Generate Report', zh: '生成报告' },
  cancel: { en: 'Cancel', zh: '取消' },
};

const DEFAULT_CONFIG: DocumentConfig = {
  includeMapCanvas: true,
  includeSplitZoningGrid: true,
  includeHazardsLedger: true,
  reportLanguage: 'english',
};

export default function DocumentConfigurator({
  lang,
  onGenerate,
  onCancel,
}: DocumentConfiguratorProps) {
  const [config, setConfig] = useState<DocumentConfig>(DEFAULT_CONFIG);

  const toggleOption = (key: keyof Omit<DocumentConfig, 'reportLanguage'>) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setLanguage = (language: DocumentConfig['reportLanguage']) => {
    setConfig((prev) => ({ ...prev, reportLanguage: language }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241F21]/90 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative border-b border-white/10 px-6 py-4">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 pr-12">
            <div className="rounded-lg bg-[#E9E778]/10 p-2">
              <FileText className="w-5 h-5 text-[#E9E778]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {LABELS.title[lang]}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {LABELS.subtitle[lang]}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="p-6 space-y-4">
          {/* Option 1: Map Canvas */}
          <div
            onClick={() => toggleOption('includeMapCanvas')}
            className="group relative rounded-xl border border-zinc-700 bg-zinc-900/40 p-4 cursor-pointer hover:bg-zinc-800/60 hover:border-zinc-600 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                config.includeMapCanvas ? 'bg-[#E9E778]/20' : 'bg-zinc-800'
              }`}>
                <Map className={`w-5 h-5 ${config.includeMapCanvas ? 'text-[#E9E778]' : 'text-zinc-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">
                    {LABELS.mapCanvas[lang]}
                  </h3>
                  <div
                    className={`ml-auto flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
                      config.includeMapCanvas ? 'bg-[#E9E778]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mt-0.5 ${
                        config.includeMapCanvas ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {LABELS.mapCanvasDesc[lang]}
                </p>
              </div>
            </div>
          </div>

          {/* Option 2: Split-Zoning Grid */}
          <div
            onClick={() => toggleOption('includeSplitZoningGrid')}
            className="group relative rounded-xl border border-zinc-700 bg-zinc-900/40 p-4 cursor-pointer hover:bg-zinc-800/60 hover:border-zinc-600 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                config.includeSplitZoningGrid ? 'bg-[#E9E778]/20' : 'bg-zinc-800'
              }`}>
                <Grid3x3 className={`w-5 h-5 ${config.includeSplitZoningGrid ? 'text-[#E9E778]' : 'text-zinc-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">
                    {LABELS.splitZoning[lang]}
                  </h3>
                  <div
                    className={`ml-auto flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
                      config.includeSplitZoningGrid ? 'bg-[#E9E778]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mt-0.5 ${
                        config.includeSplitZoningGrid ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {LABELS.splitZoningDesc[lang]}
                </p>
              </div>
            </div>
          </div>

          {/* Option 3: Hazards Ledger */}
          <div
            onClick={() => toggleOption('includeHazardsLedger')}
            className="group relative rounded-xl border border-zinc-700 bg-zinc-900/40 p-4 cursor-pointer hover:bg-zinc-800/60 hover:border-zinc-600 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                config.includeHazardsLedger ? 'bg-[#E9E778]/20' : 'bg-zinc-800'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${config.includeHazardsLedger ? 'text-[#E9E778]' : 'text-zinc-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">
                    {LABELS.hazardsLedger[lang]}
                  </h3>
                  <div
                    className={`ml-auto flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
                      config.includeHazardsLedger ? 'bg-[#E9E778]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mt-0.5 ${
                        config.includeHazardsLedger ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {LABELS.hazardsLedgerDesc[lang]}
                </p>
              </div>
            </div>
          </div>

          {/* Option 4: Language Selection */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Globe className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-3">
                  {LABELS.languageSelection[lang]}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage('english')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      config.reportLanguage === 'english'
                        ? 'bg-[#E9E778] text-[#241F21] shadow-lg'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {LABELS.englishOnly[lang]}
                  </button>
                  <button
                    onClick={() => setLanguage('bilingual')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      config.reportLanguage === 'bilingual'
                        ? 'bg-[#E9E778] text-[#241F21] shadow-lg'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {LABELS.bilingual[lang]}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {LABELS.cancel[lang]}
          </button>
          <button
            onClick={() => onGenerate(config)}
            className="px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider bg-[#E9E778] text-[#241F21] hover:bg-[#E9E778]/90 transition-colors shadow-lg"
          >
            {LABELS.generate[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { ChevronDown, CheckCircle, Clock, FileText, MapPin } from 'lucide-react';

type Lang = 'en' | 'zh';

type PermitRecord = {
  status: 'APPROVED' | 'PENDING' | 'RECEIVED' | 'REFUSED';
  applicationCode: string;
  filingDate: string; // ISO date string
  proximityAddress: string;
  description: string;
};

type PermitHistoryPanelProps = {
  permits: PermitRecord[];
  lang: Lang;
};

const LABELS = {
  permitHistory: { en: 'Development Activity Logs', zh: '开发活动日志' },
  noPermits: { en: 'No recent planning permit applications found', zh: '未找到近期规划许可申请' },
  status: { en: 'Status', zh: '状态' },
  application: { en: 'Application', zh: '申请编号' },
  filed: { en: 'Filed', zh: '提交日期' },
  location: { en: 'Location', zh: '位置' },
  description: { en: 'Description', zh: '描述' },
  approved: { en: 'APPROVED', zh: '已批准' },
  pending: { en: 'PENDING', zh: '待审批' },
  received: { en: 'RECEIVED', zh: '已接收' },
  refused: { en: 'REFUSED', zh: '已拒绝' },
  showMore: { en: 'Show More', zh: '显示更多' },
  showLess: { en: 'Show Less', zh: '显示较少' },
};

const MOCK_PERMITS: PermitRecord[] = [
  {
    status: 'APPROVED',
    applicationCode: 'PA2024-001234',
    filingDate: '2024-03-15',
    proximityAddress: '12 Smith Street, Richmond',
    description:
      'Construction of a two storey dwelling with basement car parking and associated landscaping works',
  },
  {
    status: 'PENDING',
    applicationCode: 'PA2024-005678',
    filingDate: '2024-08-22',
    proximityAddress: '45 Jones Avenue, Richmond',
    description: 'Subdivision of land into two lots and construction of Small Second Dwelling',
  },
  {
    status: 'RECEIVED',
    applicationCode: 'PA2025-000123',
    filingDate: '2025-01-10',
    proximityAddress: '78 Brown Street, Richmond',
    description: 'Demolition of existing dwelling and construction of townhouse development (4 dwellings)',
  },
  {
    status: 'APPROVED',
    applicationCode: 'PA2023-009876',
    filingDate: '2023-11-05',
    proximityAddress: '23 Wilson Court, Richmond',
    description: 'Extension to existing dwelling including first floor addition and rear deck',
  },
];

export default function PermitHistoryPanel({ permits = MOCK_PERMITS, lang }: PermitHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedPermits = isExpanded ? permits : permits.slice(0, 3);

  const getStatusColor = (status: PermitRecord['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-400 bg-green-900/30 border-green-700';
      case 'PENDING':
      case 'RECEIVED':
        return 'text-amber-400 bg-amber-900/30 border-amber-700';
      case 'REFUSED':
        return 'text-red-400 bg-red-900/30 border-red-700';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const getStatusIcon = (status: PermitRecord['status']) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
      case 'RECEIVED':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString(lang === 'en' ? 'en-AU' : 'zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  const truncateDescription = (text: string, maxLength: number = 80): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (!permits || permits.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200 mb-3">
          {LABELS.permitHistory[lang]}
        </h3>
        <p className="text-sm text-zinc-500">{LABELS.noPermits[lang]}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200 mb-4">
        {LABELS.permitHistory[lang]}
      </h3>

      {/* Interactive Collapsible Table */}
      <div className="space-y-3">
        {displayedPermits.map((permit, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 hover:bg-zinc-900/60 transition-colors"
          >
            {/* Status Badge Row */}
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold uppercase tracking-wider ${getStatusColor(permit.status)}`}>
                {getStatusIcon(permit.status)}
                {LABELS[permit.status.toLowerCase() as keyof typeof LABELS][lang]}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {permit.applicationCode}
              </div>
            </div>

            {/* Filing Date & Location */}
            <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <FileText className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wider">{LABELS.filed[lang]}:</span>
                <span className="text-zinc-300">{formatDate(permit.filingDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <MapPin className="w-3 h-3" />
                <span className="text-zinc-300 truncate">{permit.proximityAddress}</span>
              </div>
            </div>

            {/* Description */}
            <div className="text-xs text-zinc-300 leading-relaxed">
              {truncateDescription(permit.description, 100)}
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Toggle */}
      {permits.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800/60"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          {isExpanded ? LABELS.showLess[lang] : LABELS.showMore[lang]}
        </button>
      )}
    </div>
  );
}

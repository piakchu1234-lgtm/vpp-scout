'use client';

import type { ReactNode } from 'react';

import { Logo } from '@/components/Logo';

type Lang = 'en' | 'zh';
type SSDStatus = 'Permit Exempt' | 'Permit Required';

const REPORT_T = {
  reportTitle: {
    en: '2026 Small Second Dwelling Feasibility',
    zh: '2026 小型第二住宅可行性',
  },
  reportSubtitle: {
    en: 'Victoria Planning Provisions assessment',
    zh: '维多利亚州规划条款评估',
  },
  generated: { en: 'Generated', zh: '生成日期' },
  planningContext: { en: 'Planning Context', zh: '规划背景' },
  basis: { en: 'Assessment Basis', zh: '评估依据' },
  serviceRequirements: { en: 'Service Requirements', zh: '服务要求' },
  advice: { en: "Consultant's Advice", zh: '顾问建议' },
  regulatoryNotices: { en: 'Regulatory Notices', zh: '监管须知' },
  constraintsLabel: { en: 'Site Constraints', zh: '场地限制' },
  tpzLabel: { en: 'Tree Protection Zone', zh: '树木保护区' },
  specialNotesLabel: { en: 'Special Consultant Notes', zh: '特别顾问备注' },
  zone: { en: 'Zone', zh: '分区' },
  overlays: { en: 'Overlays', zh: '规划覆盖区' },
  lotSize: { en: 'Lot size', zh: '地块面积' },
  gfa: { en: 'Gross floor area', zh: '总建筑面积' },
  warning: { en: 'Warning', zh: '警告' },
  disclaimerLabel: { en: 'Disclaimer', zh: '免责声明' },
} as const;

export type PrintReportData = {
  generatedAt: Date;
  address: {
    displayName: string | null;
    sourceLabel: string;
  };
  mapSnapshot: string | null;
  planning: {
    zoneLine: string | null;
    overlayLine: string | null;
  };
  inputs: {
    lotSize: number;
    gfa: number;
  };
  assessment: {
    status: SSDStatus;
    statusLabel: string;
    reasons: string[];
    gfaWarning: string | null;
  };
  serviceRequirements: {
    gasBanLabel: string;
    gasBanBody: string;
    energyLabel: string;
    energyBody: string;
  };
  advice: string;
  notices: {
    dpu: string;
  };
  constraints?: {
    easementWarning: string | null;
    tpzNote: string | null;
  };
  specialNotes?: string | null;
  disclaimer: {
    en: string;
    zh: string;
  };
};

type Props = {
  lang: Lang;
  data: PrintReportData;
};

export function PrintReport({ lang, data }: Props) {
  const t = (k: keyof typeof REPORT_T) => REPORT_T[k][lang];
  const ts = data.generatedAt
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  const isExempt = data.assessment.status === 'Permit Exempt';

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '18mm 16mm',
        background: 'white',
        color: 'black',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          gap: '14mm',
          borderBottom: '1px solid black',
          paddingBottom: '22px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Logo size={20} />
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              LandCheckFirst
            </span>
          </div>
          <h1
            style={{
              fontSize: '19px',
              fontWeight: 600,
              lineHeight: 1.2,
              margin: '22px 0 6px',
              letterSpacing: '-0.005em',
            }}
          >
            {t('reportTitle')}
          </h1>
          <p style={{ fontSize: '10.5px', margin: 0, color: '#444' }}>
            {t('reportSubtitle')}
          </p>
          <p
            style={{
              fontSize: '12px',
              margin: '24px 0 0',
              lineHeight: 1.4,
            }}
          >
            {data.address.displayName ?? '—'}
          </p>
          <p
            style={{
              fontSize: '9px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              margin: '8px 0 0',
              color: '#444',
            }}
          >
            {t('generated')} · {ts} · {data.address.sourceLabel}
          </p>
        </div>
        <div style={{ width: '72mm', flexShrink: 0 }}>
          {data.mapSnapshot ? (
            <img
              src={data.mapSnapshot}
              alt=""
              style={{
                display: 'block',
                width: '100%',
                height: '52mm',
                objectFit: 'cover',
                border: '1px solid black',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '52mm',
                border: '1px solid black',
                background: '#fafafa',
              }}
            />
          )}
        </div>
      </header>

      <Section title={t('planningContext')}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
          }}
        >
          <tbody>
            <Row label={t('zone')} value={data.planning.zoneLine ?? '—'} />
            <Row
              label={t('overlays')}
              value={data.planning.overlayLine ?? '—'}
            />
            <Row label={t('lotSize')} value={`${data.inputs.lotSize} m²`} />
            <Row label={t('gfa')} value={`${data.inputs.gfa} m²`} last />
          </tbody>
        </table>
      </Section>

      <div style={{ margin: '40px 0 18px' }}>
        <div
          style={{
            background: isExempt ? 'black' : 'transparent',
            color: isExempt ? 'white' : 'black',
            border: '3px solid black',
            padding: '34px 40px',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.15,
          }}
        >
          {data.assessment.statusLabel}
        </div>
      </div>

      <Section title={t('basis')}>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {data.assessment.reasons.map((r, i) => (
            <li
              key={i}
              style={{
                fontSize: '11px',
                lineHeight: 1.55,
                display: 'flex',
                gap: '10px',
                marginTop: i === 0 ? 0 : '5px',
              }}
            >
              <span>·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {data.assessment.gfaWarning && (
          <p
            style={{
              fontSize: '11px',
              border: '1px solid black',
              padding: '8px 10px',
              marginTop: '12px',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontSize: '9px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginRight: '6px',
              }}
            >
              {t('warning')} ·
            </span>
            {data.assessment.gfaWarning}
          </p>
        )}
      </Section>

      <Section title={t('serviceRequirements')}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, margin: 0 }}>
              {data.serviceRequirements.gasBanLabel}
            </p>
            <p
              style={{
                fontSize: '11px',
                lineHeight: 1.55,
                margin: '3px 0 0',
              }}
            >
              {data.serviceRequirements.gasBanBody}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, margin: 0 }}>
              {data.serviceRequirements.energyLabel}
            </p>
            <p
              style={{
                fontSize: '11px',
                lineHeight: 1.55,
                margin: '3px 0 0',
              }}
            >
              {data.serviceRequirements.energyBody}
            </p>
          </div>
        </div>
      </Section>

      <Section title={t('advice')}>
        <p style={{ fontSize: '11px', lineHeight: 1.6, margin: 0 }}>
          {data.advice}
        </p>
      </Section>

      <Section title={t('regulatoryNotices')}>
        <p style={{ fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
          {data.notices.dpu}
        </p>
      </Section>

      {data.constraints && (
        <>
          {data.constraints.easementWarning && (
            <Section title={t('constraintsLabel')}>
              <p
                style={{
                  fontSize: '11px',
                  lineHeight: 1.55,
                  margin: 0,
                  color: '#92400e',
                }}
              >
                {data.constraints.easementWarning}
              </p>
            </Section>
          )}
          {data.constraints.tpzNote && (
            <Section title={t('tpzLabel')}>
              <p style={{ fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
                {data.constraints.tpzNote}
              </p>
            </Section>
          )}
        </>
      )}

      {data.specialNotes && (
        <Section title={t('specialNotesLabel')}>
          <p
            style={{
              fontSize: '11px',
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.specialNotes}
          </p>
        </Section>
      )}

      <footer
        style={{
          borderTop: '1px solid black',
          paddingTop: '12px',
          marginTop: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #ddd',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '9px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                margin: 0,
                fontWeight: 600,
              }}
            >
              {lang === 'en' ? 'Book Consultation' : '预约咨询'}
            </p>
            <p
              style={{
                fontSize: '10px',
                margin: '4px 0 0',
                color: '#444',
              }}
            >
              architect@landcheckfirst.com.au
            </p>
          </div>
          <div
            style={{
              border: '2px solid black',
              padding: '8px 16px',
              fontSize: '9px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {lang === 'en' ? 'Contact Architect' : '联系建筑师'}
          </div>
        </div>
        <p
          style={{
            fontSize: '9px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            margin: 0,
            fontWeight: 600,
          }}
        >
          {t('disclaimerLabel')}
        </p>
        <p
          style={{
            fontSize: '9.5px',
            lineHeight: 1.55,
            margin: '5px 0 0',
            color: '#222',
          }}
        >
          {data.disclaimer.en}
        </p>
        <p
          style={{
            fontSize: '8.5px',
            lineHeight: 1.7,
            margin: '8px 0 0',
            color: '#666',
          }}
        >
          {data.disclaimer.zh}
        </p>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: '22px' }}>
      <p
        style={{
          fontSize: '10px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          margin: '0 0 10px',
          fontWeight: 600,
          borderBottom: '1px solid black',
          paddingBottom: '5px',
        }}
      >
        {title}
      </p>
      <div>{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const borderBottom = last ? 'none' : '1px solid #ddd';
  return (
    <tr>
      <td
        style={{
          width: '32%',
          padding: '7px 0',
          fontSize: '9.5px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          verticalAlign: 'top',
          color: '#333',
          borderBottom,
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '7px 0',
          fontSize: '11px',
          lineHeight: 1.5,
          verticalAlign: 'top',
          borderBottom,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

'use client';

import type { ReactNode } from 'react';

import { Logo } from '@/components/Logo';
import { REGULATORY_GLOSSARY } from '@/lib/regulatoryGlossary';
import type { YieldScenarios } from '@/lib/yieldCalculator';

type Lang = 'en' | 'zh';
type SSDStatus = 'Permit Exempt' | 'Permit Required' | 'Refinement Required';
type ReportTier = 'basic' | 'premium';

const REPORT_T = {
  reportTitle: {
    en: 'SimplySite: Professional Property Audit & Intelligence',
    zh: 'SimplySite:专业地产审计与情报',
  },
  reportSubtitle: {
    en: '2026 Small Second Dwelling feasibility · Victoria Planning Provisions',
    zh: '2026 小型第二住宅可行性 · 维多利亚州规划条款',
  },
  generated: { en: 'Generated', zh: '生成日期' },
  complianceSummary: { en: 'Compliance Summary', zh: '合规总评' },
  planningContext: { en: 'Planning Context', zh: '规划背景' },
  basis: { en: 'Assessment Basis', zh: '评估依据' },
  serviceRequirements: { en: 'Service Requirements', zh: '服务要求' },
  advice: { en: "Consultant's Advice", zh: '顾问建议' },
  regulatoryNotices: { en: 'Regulatory Notices', zh: '监管须知' },
  constraintsLabel: { en: 'Site Constraints', zh: '场地限制' },
  tpzLabel: { en: 'Tree Protection Zone', zh: '树木保护区' },
  specialNotesLabel: { en: 'Special Consultant Notes', zh: '特别顾问备注' },
  nextStepsLabel: { en: 'Next Steps', zh: '后续步骤' },
  councilLabel: { en: 'Local Council', zh: '当地市议会' },
  schoolsLabel: { en: 'Schools (within 2 km)', zh: '学校(2 公里范围)' },
  childcareLabel: { en: 'Childcare (within 2 km)', zh: '托儿所(2 公里范围)' },
  demographicsLabel: { en: 'Lifestyle & Demographics', zh: '生活方式与人口结构' },
  censusIncome: { en: 'Median household income', zh: '家庭收入中位数' },
  censusAge: { en: 'Median age', zh: '年龄中位数' },
  censusPopulation: { en: 'Population', zh: '人口' },
  pendingLabel: { en: 'Verification Pending', zh: '核实进行中' },
  zone: { en: 'Zone', zh: '分区' },
  overlays: { en: 'Overlays', zh: '规划覆盖区' },
  spi: { en: 'SPI (Standard Parcel Identifier)', zh: '标准地块识别码 (SPI)' },
  lotSize: { en: 'Lot size', zh: '地块面积' },
  gfa: { en: 'Gross floor area', zh: '总建筑面积' },
  warning: { en: 'Warning', zh: '警告' },
  disclaimerLabel: { en: 'Disclaimer', zh: '免责声明' },
} as const;

export type PrintReportData = {
  tier: ReportTier;
  generatedAt: Date;
  address: {
    displayName: string | null;
    sourceLabel: string;
  };
  mapSnapshot: string | null;
  planning: {
    zoneLine: string | null;
    overlayLine: string | null;
    spi: string | null;
  };
  inputs: {
    lotSize: number;
    gfa: number;
  };
  /** Physical site metrics — frontage and orientation derived from
   * parcel geometry. Surfaced on the Premium tier's page 1 only. */
  propertyMetrics?: {
    frontageM: number | null;
    orientation: string | null;
  } | null;
  /** Automated Clause 55 yield scenarios — Premium page 2. */
  yieldScenarios?: YieldScenarios | null;
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
  council?: {
    name: string;
    nameZh: string | null;
    phone: string | null;
    email: string | null;
    website: string;
  } | null;
  verdict?: {
    status: 'compliant' | 'refinement';
    label: string;
  } | null;
  executiveSummary?: {
    title: string;
    buildCost: number;
    weeklyRent: number;
    dwellings: number;
    totalAnnualRent: number;
    paybackYears: number | null;
    grossYieldPct: number | null;
    narrative: string;
  } | null;
  schools?: Array<{ name: string; typeLabel: string; distanceM: number }> | null;
  childcare?: Array<{ name: string; typeLabel: string; distanceM: number }> | null;
  demographics?: {
    postcode: string;
    medianIncomeWeekly: number;
    medianAge: number;
    population: number | null;
  } | null;
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
  const isPremium = data.tier === 'premium';
  const tierBadge = isPremium
    ? (lang === 'en' ? 'Premium Developer Feasibility Pack' : '高级开发可行性套件')
    : (lang === 'en' ? 'Basic Site Summary' : '基础场地摘要');

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
              SimplySite
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
            {data.address.displayName ? data.address.displayName : <PendingBadge lang={lang} />}
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

      {isPremium && data.verdict && (
        <div
          style={{
            marginTop: '22px',
            border: data.verdict.status === 'compliant' ? '2px solid #047857' : '2px solid #b45309',
            background: data.verdict.status === 'compliant' ? '#ecfdf5' : '#fffbeb',
            padding: '20px 24px',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 600,
              color: data.verdict.status === 'compliant' ? '#065f46' : '#92400e',
            }}
          >
            {t('complianceSummary')}
          </p>
          <p
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              margin: '8px 0 0',
              color: data.verdict.status === 'compliant' ? '#064e3b' : '#78350f',
            }}
          >
            {data.verdict.label}
          </p>
        </div>
      )}

      {isPremium && data.executiveSummary && (
        <Section title={data.executiveSummary.title}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ width: '32%', padding: '7px 0', fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#333', borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
                  {lang === 'en' ? 'Total annual rent' : '年总租金'}
                </td>
                <td style={{ padding: '7px 0', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
                  ${Math.round(data.executiveSummary.totalAnnualRent).toLocaleString('en-AU')}
                </td>
              </tr>
              <tr>
                <td style={{ width: '32%', padding: '7px 0', fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#333', borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
                  {lang === 'en' ? 'Simple payback' : '简单回本期'}
                </td>
                <td style={{ padding: '7px 0', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
                  {data.executiveSummary.paybackYears !== null ? `${data.executiveSummary.paybackYears.toFixed(1)} ${lang === 'en' ? 'years' : '年'}` : '—'}
                </td>
              </tr>
              <tr>
                <td style={{ width: '32%', padding: '7px 0', fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#333', verticalAlign: 'top' }}>
                  {lang === 'en' ? 'Gross yield' : '毛收益率'}
                </td>
                <td style={{ padding: '7px 0', fontSize: '13px', fontWeight: 600, verticalAlign: 'top' }}>
                  {data.executiveSummary.grossYieldPct !== null ? `${data.executiveSummary.grossYieldPct.toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '10px', fontSize: '10px', lineHeight: 1.55, color: '#555' }}>
            {lang === 'en'
              ? `Inputs: build cost $${data.executiveSummary.buildCost.toLocaleString('en-AU')}, expected weekly rent $${data.executiveSummary.weeklyRent.toLocaleString('en-AU')}, ${data.executiveSummary.dwellings} ${data.executiveSummary.dwellings === 1 ? 'dwelling' : 'dwellings'}.`
              : `输入:建造成本 $${data.executiveSummary.buildCost.toLocaleString('en-AU')}、预期周租金 $${data.executiveSummary.weeklyRent.toLocaleString('en-AU')}、${data.executiveSummary.dwellings} 套住宅。`}
          </p>
          <p style={{ marginTop: '8px', fontSize: '10px', lineHeight: 1.55, color: '#333' }}>
            {data.executiveSummary.narrative}
          </p>
        </Section>
      )}

      <Section title={t('planningContext')}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
          }}
        >
          <tbody>
            <Row label={t('zone')} value={data.planning.zoneLine} lang={lang} />
            <Row
              label={t('overlays')}
              value={data.planning.overlayLine}
              lang={lang}
            />
            {data.planning.spi && (
              <Row label={t('spi')} value={data.planning.spi} lang={lang} />
            )}
            <Row label={t('lotSize')} value={`${data.inputs.lotSize} m²`} lang={lang} />
            <Row label={t('gfa')} value={`${data.inputs.gfa} m²`} lang={lang} last />
          </tbody>
        </table>
      </Section>

      {isPremium && data.propertyMetrics && (
        <Section title={lang === 'en' ? 'Site Geometry' : '场地几何'}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <Row
                label={lang === 'en' ? 'Land Size' : '地块面积'}
                value={`${data.inputs.lotSize} m²`}
                lang={lang}
              />
              <Row
                label={lang === 'en' ? 'Calculated Frontage' : '临街宽度(测算)'}
                value={
                  data.propertyMetrics.frontageM != null
                    ? `${data.propertyMetrics.frontageM} m`
                    : null
                }
                lang={lang}
              />
              <Row
                label={lang === 'en' ? 'Orientation' : '朝向'}
                value={data.propertyMetrics.orientation}
                lang={lang}
                last
              />
            </tbody>
          </table>
          <p style={{ marginTop: '10px', fontSize: '9.5px', lineHeight: 1.55, color: '#555' }}>
            {lang === 'en'
              ? 'Frontage and orientation derived from cadastral parcel geometry. Verify on site before final design.'
              : '临街宽度与朝向由地籍地块几何测算。设计定案前请在场地进行核实。'}
          </p>
        </Section>
      )}

      {isPremium && (
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
      )}

      {isPremium && (
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
      )}

      {isPremium && (
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
      )}

      {isPremium && (
      <Section title={t('advice')}>
        <p style={{ fontSize: '11px', lineHeight: 1.6, margin: 0 }}>
          {data.advice}
        </p>
      </Section>
      )}

      {isPremium && (
      <Section title={t('regulatoryNotices')}>
        <p style={{ fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
          {data.notices.dpu}
        </p>
      </Section>
      )}

      {isPremium && data.constraints && (
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

      {isPremium && data.specialNotes && (
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

      {isPremium && data.demographics && (
        <Section title={t('demographicsLabel')}>
          <p style={{ fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 8px', color: '#444' }}>
            {lang === 'en' ? 'Postcode' : '邮编'} {data.demographics.postcode}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <Row label={t('censusIncome')} value={`$${data.demographics.medianIncomeWeekly.toLocaleString('en-AU')} / ${lang === 'en' ? 'wk' : '周'}`} lang={lang} />
              <Row label={t('censusAge')} value={`${data.demographics.medianAge} ${lang === 'en' ? 'yrs' : '岁'}`} lang={lang} />
              <Row
                label={t('censusPopulation')}
                value={data.demographics.population != null ? data.demographics.population.toLocaleString('en-AU') : null}
                lang={lang}
                last
              />
            </tbody>
          </table>
        </Section>
      )}

      {isPremium && data.schools && data.schools.length > 0 && (
        <Section title={t('schoolsLabel')}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {data.schools.slice(0, 5).map((s, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '10.5px', padding: '4px 0', borderBottom: i === Math.min(data.schools!.length, 5) - 1 ? 'none' : '1px solid #eee' }}>
                <span>{s.name}</span>
                <span style={{ color: '#444', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', marginRight: '10px' }}>{s.typeLabel}</span>
                  {(s.distanceM / 1000).toFixed(2)} km
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isPremium && data.childcare && data.childcare.length > 0 && (
        <Section title={t('childcareLabel')}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {data.childcare.slice(0, 5).map((c, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '10.5px', padding: '4px 0', borderBottom: i === Math.min(data.childcare!.length, 5) - 1 ? 'none' : '1px solid #eee' }}>
                <span>{c.name}</span>
                <span style={{ color: '#444', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', marginRight: '10px' }}>{c.typeLabel}</span>
                  {(c.distanceM / 1000).toFixed(2)} km
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isPremium && data.yieldScenarios && (
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page', paddingTop: '8mm' }}>
          <Section
            title={
              lang === 'en'
                ? 'Automated Clause 55 Yield'
                : '自动化 Clause 55 产出测算'
            }
          >
            <p style={{ fontSize: '10.5px', lineHeight: 1.55, margin: '0 0 14px', color: '#444' }}>
              {lang === 'en'
                ? 'Indicative scenarios computed from lot area and zone. Every figure remains subject to a ResCode (Clause 55) / Clause 54 assessment by a registered architect.'
                : '基于地块面积与分区自动测算的指示性方案。所有数字仍须由注册建筑师按 ResCode(Clause 55)/ Clause 54 进行评估。'}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid black' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {lang === 'en' ? 'Scenario' : '方案'}
                  </th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {lang === 'en' ? 'Output' : '产出'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Townhouse yield */}
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 0', fontSize: '11px', verticalAlign: 'top' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {lang === 'en' ? 'Maximum Townhouse Yield' : '最大联排住宅产出'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '9.5px', color: '#555', lineHeight: 1.5 }}>
                      {data.yieldScenarios.townhouse.citation}
                    </p>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top' }}>
                    {data.yieldScenarios.townhouse.mixedUseFlag ? (
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {lang === 'en' ? 'Mixed-Use Potential' : '混合用途潜力'}
                      </span>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }}>
                          {data.yieldScenarios.townhouse.dwellings}
                        </span>
                        <span style={{ fontSize: '10px', marginLeft: '4px', color: '#555' }}>
                          {lang === 'en' ? 'dwellings' : '套'}
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: '9.5px', color: '#555' }}>
                          @ {data.yieldScenarios.townhouse.averageDwellingGfaM2} m² avg ·
                          1 / {data.yieldScenarios.townhouse.divisorM2PerDwelling} m²
                        </p>
                      </>
                    )}
                  </td>
                </tr>
                {/* Site coverage */}
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 0', fontSize: '11px', verticalAlign: 'top' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {lang === 'en' ? 'Max Site Coverage' : '最大场地覆盖率'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '9.5px', color: '#555', lineHeight: 1.5 }}>
                      {lang === 'en'
                        ? 'Standard B8 / Clause 55.03-3 (multi-dwelling) · Standard A5 / Clause 54.03-3 (single).'
                        : 'B8 标准 / Clause 55.03-3(多套住宅)· A5 标准 / Clause 54.03-3(单套)。'}
                    </p>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }}>
                      {Math.round(data.yieldScenarios.luxurySingle.siteCoverageCap * 100)}%
                    </span>
                  </td>
                </tr>
                {/* Garden area */}
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 0', fontSize: '11px', verticalAlign: 'top' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {lang === 'en' ? 'Mandatory Garden Area' : '强制性花园面积'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '9.5px', color: '#555', lineHeight: 1.5 }}>
                      {data.yieldScenarios.gardenArea.citation}
                    </p>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top' }}>
                    {data.yieldScenarios.gardenArea.notApplicable ? (
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {lang === 'en' ? 'N/A in this zone' : '该分区不适用'}
                      </span>
                    ) : data.yieldScenarios.gardenArea.exempt ? (
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {lang === 'en' ? 'Exempt (< 400 m²)' : '豁免 (< 400 m²)'}
                      </span>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }}>
                          {data.yieldScenarios.gardenArea.requiredAreaM2} m²
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: '9.5px', color: '#555' }}>
                          ({Math.round(data.yieldScenarios.gardenArea.requiredFraction * 100)}% of lot)
                        </p>
                      </>
                    )}
                  </td>
                </tr>
                {/* Single luxury dwelling */}
                <tr>
                  <td style={{ padding: '8px 0', fontSize: '11px', verticalAlign: 'top' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {lang === 'en' ? 'Single Luxury Dwelling' : '单套豪华住宅'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '9.5px', color: '#555', lineHeight: 1.5 }}>
                      {data.yieldScenarios.luxurySingle.citation}
                    </p>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }}>
                      {data.yieldScenarios.luxurySingle.maxBuildableGfaM2} m²
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: '9.5px', color: '#555' }}>
                      {lang === 'en' ? 'max indicative GFA · ' : '指示性最大建筑面积 · '}
                      {data.yieldScenarios.luxurySingle.groundFootprintM2} m² ×{' '}
                      {data.yieldScenarios.luxurySingle.storeysAssumed}
                      {lang === 'en' ? ' storeys' : ' 层'}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {isPremium && (
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page', paddingTop: '8mm' }}>
          <Section
            title={
              lang === 'en'
                ? 'Bilingual Statutory Glossary'
                : '法定术语双语对照'
            }
          >
            <p style={{ fontSize: '10.5px', lineHeight: 1.55, margin: '0 0 14px', color: '#444' }}>
              {lang === 'en'
                ? 'Authoritative Victorian Planning Provisions terminology — English alongside the published Mandarin renderings.'
                : '维多利亚州规划条款官方术语 — 英文原文与官方中文表述对照。'}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid black' }}>
                  <th style={{ textAlign: 'left', width: '14%', padding: '6px 6px 6px 0', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Code
                  </th>
                  <th style={{ textAlign: 'left', width: '36%', padding: '6px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                    English
                  </th>
                  <th style={{ textAlign: 'left', width: '50%', padding: '6px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                    简体中文
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.values(REGULATORY_GLOSSARY).map((entry) => (
                  <tr key={entry.code} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <td style={{ padding: '6px 6px 6px 0', fontFamily: 'monospace', fontWeight: 600 }}>
                      {entry.code}
                    </td>
                    <td style={{ padding: '6px', lineHeight: 1.5 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{entry.name.en}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9.5px', color: '#555' }}>
                        {entry.definition.en}
                      </p>
                    </td>
                    <td style={{ padding: '6px', lineHeight: 1.5 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{entry.name.zh}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9.5px', color: '#555' }}>
                        {entry.definition.zh}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {data.council && (
        <Section title={t('nextStepsLabel')}>
          <p style={{ fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px', color: '#444' }}>
            {t('councilLabel')}
          </p>
          <p style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>
            {data.council.name}
            {data.council.nameZh && lang === 'zh' && (
              <span style={{ color: '#666', fontWeight: 400 }}> · {data.council.nameZh}</span>
            )}
          </p>
          <table style={{ marginTop: '8px', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <tbody>
              {data.council.phone && (
                <tr>
                  <td style={{ padding: '3px 12px 3px 0', color: '#444', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', verticalAlign: 'top' }}>
                    {lang === 'en' ? 'Phone' : '电话'}
                  </td>
                  <td style={{ padding: '3px 0' }}>{data.council.phone}</td>
                </tr>
              )}
              {data.council.email && (
                <tr>
                  <td style={{ padding: '3px 12px 3px 0', color: '#444', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', verticalAlign: 'top' }}>
                    {lang === 'en' ? 'Email' : '邮箱'}
                  </td>
                  <td style={{ padding: '3px 0' }}>{data.council.email}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '3px 12px 3px 0', color: '#444', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', verticalAlign: 'top' }}>
                  {lang === 'en' ? 'Website' : '官网'}
                </td>
                <td style={{ padding: '3px 0' }}>{data.council.website.replace(/^https?:\/\//, '')}</td>
              </tr>
            </tbody>
          </table>
        </Section>
      )}

      <Section title={lang === 'en' ? 'Official Legal Documents' : '官方法律文件'}>
        <p style={{ fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
          {lang === 'en'
            ? 'For legally binding title searches and registered plans of subdivision, order direct from LANDATA — Land Use Victoria\'s authoritative title channel. Fees apply per document.'
            : '若需具法律效力的地契查询及注册分割图,可直接通过 LANDATA(维多利亚州土地利用局官方渠道)订购。每项文件按件收费。'}
        </p>
        <p style={{ fontSize: '10.5px', margin: '8px 0 0', fontWeight: 600 }}>
          {lang === 'en'
            ? 'Order official title and plan documents from LANDATA (fees apply) ↗'
            : '通过 LANDATA 订购官方地契与图则文件(按件收费) ↗'}
        </p>
        <p
          style={{
            fontSize: '9.5px',
            margin: '4px 0 0',
            color: '#555',
            letterSpacing: '0.04em',
          }}
        >
          https://www.landata.vic.gov.au
        </p>
      </Section>

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
              architect@simplysite.com.au
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
          {lang === 'en' ? data.disclaimer.en : data.disclaimer.zh}
        </p>
        {lang === 'zh' && (
          <p
            style={{
              fontSize: '8.5px',
              lineHeight: 1.7,
              margin: '8px 0 0',
              color: '#666',
            }}
          >
            {data.disclaimer.en}
          </p>
        )}
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
  lang,
}: {
  label: string;
  value: string | null;
  last?: boolean;
  lang: Lang;
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
        {value ? value : <PendingBadge lang={lang} />}
      </td>
    </tr>
  );
}

function PendingBadge({ lang }: { lang: Lang }) {
  // Acid Lime / Charcoal pill matching the on-screen "Verification
  // Pending" indicator. Inline-styled so html2canvas-style PDF
  // renderers don't drop the colours.
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: '1px solid #241F21',
        background: '#E9E778',
        color: '#241F21',
        padding: '2px 7px',
        fontSize: '8.5px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#241F21',
        }}
      />
      {lang === 'en' ? 'Verification Pending' : '核实进行中'}
    </span>
  );
}

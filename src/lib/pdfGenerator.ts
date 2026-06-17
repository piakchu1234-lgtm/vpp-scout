import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type DocumentConfig = {
  includeMapCanvas: boolean;
  includeSplitZoningGrid: boolean;
  includeHazardsLedger: boolean;
  reportLanguage: 'english' | 'bilingual';
};

export type PDFGenerationOptions = {
  address: string;
  mapSnapshotBase64: string;
  landSizeM2: number | null;
  zoneCode: string | null;
  frontageM: number | null;
  orientation: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  lastSold: string | null;
  aiSummary: string;
  overlays: string[];
  language: 'en' | 'zh';
  config: DocumentConfig;
  splitZoneData?: string | null;
};

export async function generatePropertyPDF(options: PDFGenerationOptions): Promise<void> {
  const {
    address,
    mapSnapshotBase64,
    landSizeM2,
    zoneCode,
    frontageM,
    orientation,
    bedrooms,
    bathrooms,
    carspaces,
    lastSold,
    aiSummary,
    overlays,
    language,
    config,
    splitZoneData,
  } = options;

  // Determine report language based on config
  const useBilingual = config.reportLanguage === 'bilingual';
  const displayLang = useBilingual ? 'both' : language;

  // Create off-screen HTML container for Unicode-safe rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.style.padding = '20mm';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Noto Sans SC', sans-serif";
  container.style.color = '#000000';

  document.body.appendChild(container);

  const formatLandSize = (m2: number | null) => {
    if (!m2 || !Number.isFinite(m2) || m2 <= 0) return '—';
    return `${Math.round(m2)} m²`;
  };

  const formatFrontage = (m: number | null) => {
    if (!m || !Number.isFinite(m) || m <= 0) return '—';
    return `${m.toFixed(1)} m`;
  };

  // Build HTML template with conditional sections based on configuration
  let htmlContent = `
    <div style="font-family: 'Noto Sans SC', sans-serif; line-height: 1.6;">
      <!-- Header -->
      <div style="border-bottom: 3px solid #E9E778; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #241F21;">
          SimplySite ${language === 'en' ? 'Feasibility Report' : '可行性报告'}
          ${useBilingual ? ' / 可行性报告' : ''}
        </h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
          ${address}
        </p>
      </div>`;

  // Conditional Section 1: Map Canvas
  if (config.includeMapCanvas) {
    htmlContent += `
      <!-- Map Snapshot -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: bold; color: #241F21; margin-bottom: 8px;">
          ${language === 'en' ? 'Site Location' : '场地位置'}
          ${useBilingual ? ' / Site Location' : ''}
        </h2>
        <img src="${mapSnapshotBase64}" style="width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;" />
      </div>`;
  }

  // Always include Property Details
  htmlContent += `
      <!-- Property Details -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #241F21; margin-bottom: 12px; border-bottom: 2px solid #E9E778; padding-bottom: 4px;">
          ${language === 'en' ? 'Property Details' : '物业详情'}
          ${useBilingual ? ' / Property Details' : ''}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Land Size' : '地块面积'}
              ${useBilingual ? ' / Land Size' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${formatLandSize(landSizeM2)}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Planning Zone' : '规划分区'}
              ${useBilingual ? ' / Planning Zone' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${zoneCode || '—'}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Frontage' : '临街面宽'}
              ${useBilingual ? ' / Frontage' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${formatFrontage(frontageM)}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Orientation' : '朝向'}
              ${useBilingual ? ' / Orientation' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${orientation || '—'}
            </td>
          </tr>
        </table>
      </div>`;

  // Conditional Section 2: Split-Zoning Data Grid
  if (config.includeSplitZoningGrid && splitZoneData) {
    htmlContent += `
      <!-- Split-Zoning Data Grid -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #241F21; margin-bottom: 12px; border-bottom: 2px solid #E9E778; padding-bottom: 4px;">
          ${language === 'en' ? 'Split-Zoning Analysis' : '分区分析'}
          ${useBilingual ? ' / Split-Zoning Analysis' : ''}
        </h2>
        <div style="font-size: 14px; line-height: 1.8; color: #333;">
          ${splitZoneData}
        </div>
      </div>`;
  }

  // Property Attributes
  htmlContent += `
      <!-- Property Attributes -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #241F21; margin-bottom: 12px; border-bottom: 2px solid #E9E778; padding-bottom: 4px;">
          ${language === 'en' ? 'Attributes & History' : '属性与历史'}
          ${useBilingual ? ' / Attributes & History' : ''}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Bedrooms' : '卧室'}
              ${useBilingual ? ' / Bedrooms' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${bedrooms ?? '—'}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Bathrooms' : '浴室'}
              ${useBilingual ? ' / Bathrooms' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${bathrooms ?? '—'}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Carspaces' : '车位'}
              ${useBilingual ? ' / Carspaces' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${carspaces ?? '—'}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">
              ${language === 'en' ? 'Last Sold' : '最后成交价'}
              ${useBilingual ? ' / Last Sold' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${lastSold || '—'}
            </td>
          </tr>
        </table>
      </div>`;

  // AI Summary
  htmlContent += `
      <!-- AI Summary -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #241F21; margin-bottom: 12px; border-bottom: 2px solid #E9E778; padding-bottom: 4px;">
          ${language === 'en' ? 'AI Analysis' : 'AI 分析'}
          ${useBilingual ? ' / AI Analysis' : ''}
        </h2>
        <p style="font-size: 14px; line-height: 1.8; color: #333;">
          ${aiSummary}
        </p>
      </div>`;

  // Conditional Section 3: Hazards & Overlays Ledger
  if (config.includeHazardsLedger && overlays.length > 0) {
    htmlContent += `
      <!-- Overlays & Hazards Ledger -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #241F21; margin-bottom: 12px; border-bottom: 2px solid #E9E778; padding-bottom: 4px;">
          ${language === 'en' ? 'Planning Overlays & Hazards' : '规划覆盖区与风险'}
          ${useBilingual ? ' / Planning Overlays & Hazards' : ''}
        </h2>
        <ul style="padding-left: 20px; margin: 0;">
          ${overlays.map(o => `<li style="margin-bottom: 4px; font-size: 14px;">${o}</li>`).join('')}
        </ul>
      </div>`;
  }

  // Footer
  htmlContent += `
      <!-- Footer -->
      <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        ${language === 'en' ? 'Generated by' : '由以下生成'} <strong>SimplySite</strong> | ${new Date().toLocaleDateString(language === 'en' ? 'en-AU' : 'zh-CN')}
      </div>
    </div>
  `;

  // Add explicit ID for targeted capture
  container.id = 'site-feasibility-report-root';

  container.innerHTML = htmlContent;

  try {
    // Force window to temporarily roll back scroll offsets during capture initialization
    const originalScrollY = window.scrollY;
    const originalScrollX = window.scrollX;
    window.scrollTo(0, 0);

    const reportElement = document.getElementById('site-feasibility-report-root');
    if (!reportElement) {
      throw new Error('Target report root element missing.');
    }

    // Give the DOM a macro-task tick to stabilize layout bindings
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Use html2canvas with explicit coordinate reset and security settings
    const canvas = await html2canvas(reportElement, {
      scale: 2, // High DPI resolution enhancement
      useCORS: true, // Prevent asset security blocking
      allowTaint: false, // Prevent cross-origin tainting
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0, // Force coordinate reset
      scrollY: 0, // Force coordinate reset
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
    });

    // Immediately restore the user's focus position on screen
    window.scrollTo(originalScrollX, originalScrollY);

    // Create PDF and add the rendered canvas as an image
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add image to PDF (may span multiple pages)
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }

    // Download the PDF
    pdf.save(`SimplySite_Feasibility_Report_${new Date().getTime()}.pdf`);
  } finally {
    // Clean up off-screen container
    document.body.removeChild(container);
  }
}

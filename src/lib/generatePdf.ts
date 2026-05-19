export async function generateFeasibilityPdf(
  elementId: string,
  address: string,
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error(`PDF target element "#${elementId}" not found in DOM.`);
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidthMm = doc.internal.pageSize.getWidth();
  const pageHeightMm = doc.internal.pageSize.getHeight();

  const imgWidthMm = pageWidthMm;
  const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

  if (imgHeightMm <= pageHeightMm) {
    doc.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm);
  } else {
    let remaining = imgHeightMm;
    let offsetMm = 0;
    while (remaining > 0) {
      doc.addImage(imgData, 'PNG', 0, -offsetMm, imgWidthMm, imgHeightMm);
      remaining -= pageHeightMm;
      offsetMm += pageHeightMm;
      if (remaining > 0) doc.addPage();
    }
  }

  const safeAddress = (address || 'Property')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);

  doc.save(`SimplySite-Report-${safeAddress}.pdf`);
}

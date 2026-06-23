#!/usr/bin/env node

/**
 * Excel Inspector - Debug script to understand the structure
 */

const XLSX = require('xlsx');

const EXCEL_PATH = 'Data/LGA_Criminal_Incidents_Year_Ending_March_2026_0/Data_Tables_LGA_Criminal_Incidents_Year_Ending_March_2026_0.xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);

console.log('📚 Available sheets:', workbook.SheetNames);

// Inspect each sheet
workbook.SheetNames.forEach((sheetName, idx) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Sheet ${idx + 1}: "${sheetName}"`);
  console.log('='.repeat(60));

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  console.log(`Total rows: ${data.length}`);

  // Show first 25 rows
  console.log('\nFirst 25 rows:');
  for (let i = 0; i < Math.min(25, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row) && row.length > 0) {
      console.log(`Row ${i}:`, row.map(cell => String(cell).substring(0, 40)).join(' | '));
    } else {
      console.log(`Row ${i}: [empty]`);
    }
  }
});

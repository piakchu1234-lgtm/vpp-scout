#!/usr/bin/env node

/**
 * CRIME DATA PROCESSOR
 *
 * Reads LGA crime statistics from Excel file and outputs lightweight JSON
 * for web consumption. Extracts total incidents per LGA for the most recent
 * year ending March 2026.
 *
 * Usage: node scripts/processCrimeData.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'Data/LGA_Criminal_Incidents_Year_Ending_March_2026_0/Data_Tables_LGA_Criminal_Incidents_Year_Ending_March_2026_0.xlsx';
const OUTPUT_PATH = 'public/data/crime_stats.json';

function processCrimeData() {
  console.log('🔍 Reading Excel file:', EXCEL_PATH);

  // Read workbook
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Target "Table 01" sheet which contains LGA totals
  const sheetName = 'Table 01';
  console.log('📊 Processing sheet:', sheetName);

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error('❌ Table 01 not found in workbook');
    console.log('Available sheets:', workbook.SheetNames);
    process.exit(1);
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`📈 Total rows: ${data.length}`);
  console.log('📋 Header:', data[0]);

  // Table 01 structure (row 0 is header):
  // Year | Year ending | Police Region | Local Government Area | Incidents Recorded | Rate per 100,000 population
  const YEAR_COL = 0;
  const YEAR_ENDING_COL = 1;
  const POLICE_REGION_COL = 2;
  const LGA_COL = 3;
  const INCIDENTS_COL = 4;
  const RATE_COL = 5;

  // Parse LGA data
  const crimeStats = {};
  let processedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (!Array.isArray(row) || row.length === 0) continue;

    const year = String(row[YEAR_COL] || '').trim();
    const yearEnding = String(row[YEAR_ENDING_COL] || '').trim();
    const lgaName = String(row[LGA_COL] || '').trim();
    const incidents = row[INCIDENTS_COL];
    const ratePer100k = row[RATE_COL];

    // Skip rows without year 2026 or March ending
    if (year !== '2026' || yearEnding !== 'March') {
      continue;
    }

    // Skip empty rows, "Total" rows, or rows without LGA name
    if (!lgaName || lgaName.toLowerCase().includes('total')) {
      continue;
    }

    // Parse incident count
    let incidentCount = 0;
    if (typeof incidents === 'number') {
      incidentCount = Math.round(incidents);
    } else if (typeof incidents === 'string') {
      incidentCount = parseInt(incidents.replace(/[^0-9]/g, ''), 10) || 0;
    }

    // Parse rate per 100k
    let rate = 0;
    if (typeof ratePer100k === 'number') {
      rate = Math.round(ratePer100k * 10) / 10; // Round to 1 decimal
    } else if (typeof ratePer100k === 'string') {
      rate = Math.round(parseFloat(ratePer100k.replace(/[^0-9.]/g, '')) * 10) / 10 || 0;
    }

    if (incidentCount > 0) {
      crimeStats[lgaName] = {
        incidents: incidentCount,
        ratePer100k: rate,
        year: 'Year Ending March 2026'
      };
      processedCount++;
    }
  }

  console.log(`✅ Processed ${processedCount} LGAs with crime data`);

  // Sample output
  const sampleLGAs = Object.keys(crimeStats).slice(0, 3);
  console.log('📊 Sample data:', sampleLGAs.map(lga => `${lga}: ${crimeStats[lga].incidents} incidents`).join(', '));

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON output
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(crimeStats, null, 2),
    'utf8'
  );

  console.log('✅ Crime data written to:', OUTPUT_PATH);
  console.log(`📦 Total file size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2)} KB`);
}

try {
  processCrimeData();
} catch (error) {
  console.error('❌ Error processing crime data:', error);
  process.exit(1);
}

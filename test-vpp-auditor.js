/**
 * VPP Auditor Test Suite
 *
 * Tests the Clause 55 & 57 compliance audit logic against real Victorian properties.
 */

import { auditVPPCompliance, generateComplianceSummary } from './src/lib/vppAuditor';

console.log('='.repeat(80));
console.log('VPP AUDITOR TEST SUITE - 2026 Victorian Planning Reforms');
console.log('='.repeat(80));
console.log();

// TEST 1: Bentleigh East - GRZ1 Townhouse Site
console.log('TEST 1: 100 St Georges Road, Bentleigh East');
console.log('-'.repeat(80));
const test1 = auditVPPCompliance('GRZ1', 1430, 21.7, []);
console.log('Zone:', 'GRZ1');
console.log('Lot Size:', '1,430 m²');
console.log('Frontage:', '21.7m');
console.log();
console.log('RESULT:');
console.log('- Fast-Track Eligible:', test1.isFastTrackEligible ? '✅ YES' : '❌ NO');
console.log('- Tier:', test1.tier);
console.log('- No Third-Party Appeals:', test1.noThirdPartyAppeals ? '✅ YES' : '❌ NO');
console.log('- Max Dwellings:', test1.maxDeemedDwellings);
console.log('- Applicable Clause:', test1.applicableClause);
console.log();
console.log('Developer Summary:');
console.log(test1.developerSummary);
console.log();

const summary1 = generateComplianceSummary(test1);
console.log('Benefits:');
summary1.benefits.forEach(b => console.log('  ' + b));
console.log();
console.log();

// TEST 2: Small NRZ Site (Below Threshold)
console.log('TEST 2: Small NRZ Site - Below Threshold');
console.log('-'.repeat(80));
const test2 = auditVPPCompliance('NRZ1', 450, 15.0, []);
console.log('Zone:', 'NRZ1');
console.log('Lot Size:', '450 m²');
console.log('Frontage:', '15.0m');
console.log();
console.log('RESULT:');
console.log('- Fast-Track Eligible:', test2.isFastTrackEligible ? '✅ YES' : '❌ NO');
console.log('- Tier:', test2.tier);
console.log('- Max Dwellings:', test2.maxDeemedDwellings);
console.log();
console.log('Developer Summary:');
console.log(test2.developerSummary);
console.log();
console.log();

// TEST 3: RGZ Mid-Rise Site
console.log('TEST 3: RGZ Mid-Rise Opportunity');
console.log('-'.repeat(80));
const test3 = auditVPPCompliance('RGZ1', 1200, 25.0, []);
console.log('Zone:', 'RGZ1');
console.log('Lot Size:', '1,200 m²');
console.log('Frontage:', '25.0m');
console.log();
console.log('RESULT:');
console.log('- Fast-Track Eligible:', test3.isFastTrackEligible ? '✅ YES' : '❌ NO');
console.log('- Tier:', test3.tier);
console.log('- No Third-Party Appeals:', test3.noThirdPartyAppeals ? '✅ YES' : '❌ NO');
console.log('- Max Dwellings:', test3.maxDeemedDwellings);
console.log('- Applicable Clause:', test3.applicableClause);
console.log();
console.log('Developer Summary:');
console.log(test3.developerSummary);
console.log();

const summary3 = generateComplianceSummary(test3);
console.log('Benefits:');
summary3.benefits.forEach(b => console.log('  ' + b));
console.log();
console.log();

// TEST 4: MUZ with DDO Overlay
console.log('TEST 4: Mixed Use Zone with DDO15 Overlay');
console.log('-'.repeat(80));
const test4 = auditVPPCompliance('MUZ', 1500, 30.0, ['DDO15', 'HO123']);
console.log('Zone:', 'MUZ');
console.log('Lot Size:', '1,500 m²');
console.log('Frontage:', '30.0m');
console.log('Overlays:', 'DDO15, HO123');
console.log();
console.log('RESULT:');
console.log('- Fast-Track Eligible:', test4.isFastTrackEligible ? '✅ YES' : '❌ NO');
console.log('- Tier:', test4.tier);
console.log('- No Third-Party Appeals:', test4.noThirdPartyAppeals ? '✅ YES' : '❌ NO');
console.log('- Max Dwellings:', test4.maxDeemedDwellings);
console.log('- Applicable Clause:', test4.applicableClause);
console.log();
console.log('Developer Summary:');
console.log(test4.developerSummary);
console.log();

const summary4 = generateComplianceSummary(test4);
console.log('Benefits:');
summary4.benefits.forEach(b => console.log('  ' + b));
console.log();
console.log();

// TEST 5: Commercial Zone (Ineligible)
console.log('TEST 5: Commercial Zone - Not Eligible');
console.log('-'.repeat(80));
const test5 = auditVPPCompliance('C1Z', 800, 20.0, []);
console.log('Zone:', 'C1Z');
console.log('Lot Size:', '800 m²');
console.log('Frontage:', '20.0m');
console.log();
console.log('RESULT:');
console.log('- Fast-Track Eligible:', test5.isFastTrackEligible ? '✅ YES' : '❌ NO');
console.log('- Tier:', test5.tier);
console.log('- Applicable Clause:', test5.applicableClause);
console.log();
console.log('Developer Summary:');
console.log(test5.developerSummary);
console.log();
console.log();

console.log('='.repeat(80));
console.log('TEST SUITE COMPLETE');
console.log('='.repeat(80));

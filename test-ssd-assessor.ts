/**
 * SSD Assessor Test Suite
 * Demonstrates the Small Second Dwelling compliance engine with Victorian statutory scenarios
 */

import { evaluateSSDFeasibility } from './src/lib/compliance/ssdAssessor.js';

console.log('🏗️  SSD ASSESSOR TEST SUITE\n');

// Test Case 1: Fast-track eligible site (ideal conditions)
console.log('📋 Test Case 1: Fast-Track Eligible Site');
const idealSite = {
  lotSize: 650,
  zones: ['GRZ1'],
  overlays: [],
  hasExistingDwelling: true,
};
const result1 = evaluateSSDFeasibility(idealSite);
console.log('Input:', idealSite);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('✓ Expected: Fast-track eligible, no permit required\n');

// Test Case 2: Undersized lot (below 300m² threshold)
console.log('📋 Test Case 2: Undersized Lot');
const smallSite = {
  lotSize: 280,
  zones: ['GRZ1'],
  overlays: [],
  hasExistingDwelling: true,
};
const result2 = evaluateSSDFeasibility(smallSite);
console.log('Input:', smallSite);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('✓ Expected: Permit required, blocking factor for lot size\n');

// Test Case 3: Heritage Overlay restriction
console.log('📋 Test Case 3: Heritage Overlay');
const heritageSite = {
  lotSize: 500,
  zones: ['NRZ1'],
  overlays: ['HO123'],
  hasExistingDwelling: true,
};
const result3 = evaluateSSDFeasibility(heritageSite);
console.log('Input:', heritageSite);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('✓ Expected: Not eligible, permit required, HO blocking factor\n');

// Test Case 4: Commercial zone (prohibited)
console.log('📋 Test Case 4: Commercial Zone Prohibition');
const commercialSite = {
  lotSize: 800,
  zones: ['C1Z'],
  overlays: [],
  hasExistingDwelling: true,
};
const result4 = evaluateSSDFeasibility(commercialSite);
console.log('Input:', commercialSite);
console.log('Result:', JSON.stringify(result4, null, 2));
console.log('✓ Expected: Not eligible, C1Z blocking factor\n');

// Test Case 5: Vacant land (no existing dwelling)
console.log('📋 Test Case 5: Vacant Land');
const vacantSite = {
  lotSize: 600,
  zones: ['GRZ1'],
  overlays: [],
  hasExistingDwelling: false,
};
const result5 = evaluateSSDFeasibility(vacantSite);
console.log('Input:', vacantSite);
console.log('Result:', JSON.stringify(result5, null, 2));
console.log('✓ Expected: Not eligible, requires existing dwelling\n');

// Test Case 6: Multiple overlays (bushfire + flood)
console.log('📋 Test Case 6: Multiple Restrictive Overlays');
const multiOverlaySite = {
  lotSize: 450,
  zones: ['GRZ1'],
  overlays: ['BMO', 'LSIO'],
  hasExistingDwelling: true,
};
const result6 = evaluateSSDFeasibility(multiOverlaySite);
console.log('Input:', multiOverlaySite);
console.log('Result:', JSON.stringify(result6, null, 2));
console.log('✓ Expected: Not eligible, multiple blocking factors\n');

console.log('🎯 All test cases completed');

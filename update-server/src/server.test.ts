import { compareSemver } from './server';

console.log('=== Starting Update Server Semver & Logic Test Suite ===\n');

// Test 1: Compare Semver logic
const testCases = [
  { v1: '1.0.1', v2: '1.0.0', expected: 1, desc: 'Patch increment is newer' },
  { v1: '1.0.0', v2: '1.0.0', expected: 0, desc: 'Identical versions are equal' },
  { v1: '0.9.9', v2: '1.0.0', expected: -1, desc: 'Older version is smaller' },
  { v1: '2.0.0', v2: '1.9.9', expected: 1, desc: 'Major increment is newer' },
  { v1: 'v1.2.3', v2: '1.2.3', expected: 0, desc: 'Handles leading v correctly' },
  { v1: '1.2.0', v2: '1.1.9', expected: 1, desc: 'Minor increment is newer' },
  { v1: '1.0.0', v2: '1.0.0-beta.1', expected: 1, desc: 'Stable is newer than beta' },
  { v1: '1.0.0-beta.1', v2: '1.0.0', expected: -1, desc: 'Beta is older than stable' },
];

let passed = 0;
for (const tc of testCases) {
  const result = compareSemver(tc.v1, tc.v2);
  if (result === tc.expected) {
    console.log(`  [PASS] ${tc.desc}: compareSemver("${tc.v1}", "${tc.v2}") === ${tc.expected}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${tc.desc}: got ${result}, expected ${tc.expected}`);
    process.exit(1);
  }
}

console.log(`\n=== All ${passed}/${testCases.length} Update Logic Tests Passed Successfully! ===`);

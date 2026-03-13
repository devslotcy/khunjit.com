/**
 * Payout Calculator Tests
 *
 * Comprehensive test suite for all 11 countries
 */

import { calculatePayoutSplit, formatPayoutBreakdown } from './payout-calculator';

// Test data for each country (Platform Fee: 20%)
const testCases = [
  {
    country: 'US',
    currency: 'USD',
    amount: 100,
    expectedPsychologistNet: 80.00,  // 80% (no tax)
    expectedPlatformNet: 20.00,      // 20%
    expectedTax: 0.00,
    taxRate: 0.00,
  },
  {
    country: 'TH',
    currency: 'THB',
    amount: 1000,
    expectedPsychologistNet: 776.00, // 800 - 24 (3% of 800)
    expectedPlatformNet: 224.00,     // 200 + 24
    expectedTax: 24.00,
    taxRate: 0.03,
  },
  {
    country: 'VN',
    currency: 'VND',
    amount: 500000,
    expectedPsychologistNet: 360000.00, // 400000 - 40000 (10% of 400000)
    expectedPlatformNet: 140000.00,     // 100000 + 40000
    expectedTax: 40000.00,
    taxRate: 0.10,
  },
  {
    country: 'PH',
    currency: 'PHP',
    amount: 2000,
    expectedPsychologistNet: 1472.00, // 1600 - 128 (8% of 1600)
    expectedPlatformNet: 528.00,      // 400 + 128
    expectedTax: 128.00,
    taxRate: 0.08,
  },
  {
    country: 'ID',
    currency: 'IDR',
    amount: 300000,
    expectedPsychologistNet: 228000.00, // 240000 - 12000 (5% of 240000)
    expectedPlatformNet: 72000.00,      // 60000 + 12000
    expectedTax: 12000.00,
    taxRate: 0.05,
  },
  {
    country: 'JP',
    currency: 'JPY',
    amount: 10000,
    expectedPsychologistNet: 7183.20,  // 8000 - 816.8 (10.21% of 8000)
    expectedPlatformNet: 2816.80,      // 2000 + 816.8
    expectedTax: 816.80,
    taxRate: 0.1021,
  },
  {
    country: 'KR',
    currency: 'KRW',
    amount: 100000,
    expectedPsychologistNet: 77360.00, // 80000 - 2640 (3.3% of 80000)
    expectedPlatformNet: 22640.00,     // 20000 + 2640
    expectedTax: 2640.00,
    taxRate: 0.033,
  },
  {
    country: 'DE',
    currency: 'EUR',
    amount: 80,
    expectedPsychologistNet: 64.00,  // 80% (no tax)
    expectedPlatformNet: 16.00,      // 20%
    expectedTax: 0.00,
    taxRate: 0.00,
  },
  {
    country: 'TR',
    currency: 'TRY',
    amount: 1500,
    expectedPsychologistNet: 960.00, // 1200 - 240 (20% of 1200)
    expectedPlatformNet: 540.00,     // 300 + 240
    expectedTax: 240.00,
    taxRate: 0.20,
  },
];

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Running Payout Calculator Tests...\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await calculatePayoutSplit(
        testCase.amount,
        testCase.country,
        testCase.currency
      );

      // Check psychologist net
      const psychologistMatch = Math.abs(result.psychologistNet - testCase.expectedPsychologistNet) < 0.02;
      const platformMatch = Math.abs(result.platformNet - testCase.expectedPlatformNet) < 0.02;
      const taxMatch = Math.abs(result.withholdingAmount - testCase.expectedTax) < 0.02;
      const rateMatch = Math.abs(result.withholdingRate - testCase.taxRate) < 0.0001;

      if (psychologistMatch && platformMatch && taxMatch && rateMatch) {
        console.log(`✅ ${testCase.country} (${testCase.currency}): PASSED`);
        console.log(`   Amount: ${testCase.amount} ${testCase.currency}`);
        console.log(`   Psychologist: ${result.psychologistNet} ${testCase.currency}`);
        console.log(`   Platform: ${result.platformNet} ${testCase.currency}`);
        console.log(`   Tax: ${result.withholdingAmount} ${testCase.currency} (${(result.withholdingRate * 100).toFixed(2)}%)`);
        console.log('');
        passed++;
      } else {
        console.error(`❌ ${testCase.country} (${testCase.currency}): FAILED`);
        console.error(`   Expected psychologist: ${testCase.expectedPsychologistNet}, Got: ${result.psychologistNet}`);
        console.error(`   Expected platform: ${testCase.expectedPlatformNet}, Got: ${result.platformNet}`);
        console.error(`   Expected tax: ${testCase.expectedTax}, Got: ${result.withholdingAmount}`);
        console.error('');
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${testCase.country}: ERROR - ${error}`);
      console.error('');
      failed++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review.');
  }

  return { passed, failed };
}

/**
 * Test example with detailed breakdown
 */
async function testDetailedExample() {
  console.log('📝 Detailed Example: Thailand (THB)\n');

  const result = await calculatePayoutSplit(1000, 'TH', 'THB');
  console.log(formatPayoutBreakdown(result));
  console.log('');
}

export { runTests, testDetailedExample };

// Run tests if executed directly
(async () => {
  await testDetailedExample();
  const results = await runTests();
  process.exit(results.failed > 0 ? 1 : 0);
})();

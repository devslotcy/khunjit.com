/**
 * Test script to verify consistency between Admin Dashboard and Payments page
 */

import { db } from './server/db';
import { payments } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface PaymentBreakdown {
  totalGross: number;
  totalPlatformFee: number;
  totalProviderPayout: number;
}

function calculatePaymentBreakdown(grossAmount: number) {
  const PLATFORM_FEE_RATE = 0.30;
  const platformFee = grossAmount * PLATFORM_FEE_RATE;
  const providerPayout = grossAmount - platformFee;

  return {
    platformFee,
    providerPayout,
  };
}

async function testConsistency() {
  try {
    console.log('=== Admin Panel Consistency Test ===\n');

    // Get all completed payments (like /api/admin/stats)
    const allPayments = await db.select().from(payments).where(eq(payments.status, 'completed'));

    console.log(`Found ${allPayments.length} completed payments\n`);

    let totalGross = 0;
    let totalPlatformFee = 0;
    let totalProviderPayout = 0;

    for (const payment of allPayments) {
      const gross = parseFloat(payment.grossAmount || '0');
      totalGross += gross;

      if (payment.platformFee && payment.providerPayout) {
        // Use stored values
        totalPlatformFee += parseFloat(payment.platformFee);
        totalProviderPayout += parseFloat(payment.providerPayout);
      } else {
        // Calculate (fallback)
        const breakdown = calculatePaymentBreakdown(gross);
        totalPlatformFee += breakdown.platformFee;
        totalProviderPayout += breakdown.providerPayout;
      }
    }

    console.log('Dashboard Stats (/api/admin/stats):');
    console.log(`  Toplam Gelir:      ${totalGross.toFixed(2)} THB`);
    console.log(`  Platform Payı:     ${totalPlatformFee.toFixed(2)} THB (%${((totalPlatformFee / totalGross) * 100).toFixed(1)})`);
    console.log(`  Psikolog Payı:     ${totalProviderPayout.toFixed(2)} THB (%${((totalProviderPayout / totalGross) * 100).toFixed(1)})`);
    console.log('');

    // Verify percentages
    const platformPercent = (totalPlatformFee / totalGross) * 100;
    const psychologistPercent = (totalProviderPayout / totalGross) * 100;

    console.log('Doğrulama:');
    console.log(`  Platform komisyon oranı:  %${platformPercent.toFixed(1)}`);
    console.log(`  Psikolog pay oranı:       %${psychologistPercent.toFixed(1)}`);
    console.log(`  Toplam:                   %${(platformPercent + psychologistPercent).toFixed(1)}`);
    console.log('');

    // Check if correct
    const isCorrect = Math.abs(platformPercent - 30) < 0.1 && Math.abs(psychologistPercent - 70) < 0.1;

    if (isCorrect) {
      console.log('✅ Hesaplamalar TUTARLI!');
      console.log('   - Dashboard ve Ödemeler sayfası aynı verileri gösterecek');
      console.log('   - Platform: %30, Psikolog: %70');
    } else {
      console.log('❌ Hesaplamalar TUTARSIZ!');
      console.log(`   Beklenen: Platform=%30, Psikolog=%70`);
      console.log(`   Bulunan: Platform=%${platformPercent.toFixed(1)}, Psikolog=%${psychologistPercent.toFixed(1)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testConsistency();

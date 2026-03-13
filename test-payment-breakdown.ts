/**
 * Test script to verify payment breakdown calculations
 */

interface PaymentBreakdown {
  grossAmount: number;
  vatRate: number;
  vatAmount: number;
  netOfVat: number;
  platformFee: number;
  platformFeeRate: number;
  platformVatAmount: number;
  processorFee: number;
  providerPayout: number;
}

function calculatePaymentBreakdown(grossAmount: number): PaymentBreakdown {
  const PLATFORM_FEE_RATE = 0.30; // 30% Platform komisyonu

  // Yeni sistem: Ülke bazlı vergi (KDV artık kullanılmıyor)
  const platformFee = grossAmount * PLATFORM_FEE_RATE;
  const providerPayout = grossAmount - platformFee; // %70 psikolog payı

  return {
    grossAmount,
    vatRate: 0, // Artık kullanılmıyor - ülke bazlı vergi sistemi var
    vatAmount: 0,
    netOfVat: grossAmount,
    platformFee,
    platformFeeRate: PLATFORM_FEE_RATE,
    platformVatAmount: 0,
    processorFee: 0, // Stripe tarafından otomatik kesilir
    providerPayout
  };
}

// Test case: 1200 THB session
console.log('=== Payment Breakdown Test ===\n');

const testAmount = 1200;
const breakdown = calculatePaymentBreakdown(testAmount);

console.log(`Toplam Tutar (Session Price):      ${breakdown.grossAmount.toFixed(2)} THB`);
console.log('');
console.log(`Platform Payı (%${(breakdown.platformFeeRate * 100).toFixed(0)}):       ${breakdown.platformFee.toFixed(2)} THB`);
console.log(`Psikolog Payı (%70):                ${breakdown.providerPayout.toFixed(2)} THB`);
console.log('');

// Verify percentages
const platformPercent = (breakdown.platformFee / breakdown.grossAmount) * 100;
const psychologistPercent = (breakdown.providerPayout / breakdown.grossAmount) * 100;

console.log('=== Doğrulama ===');
console.log(`Platform komisyon oranı:           %${platformPercent.toFixed(1)}`);
console.log(`Psikolog pay oranı:                %${psychologistPercent.toFixed(1)}`);
console.log(`Toplam:                            %${(platformPercent + psychologistPercent).toFixed(1)}`);
console.log('');

// Check if correct (1200 × 30% = 360, 1200 × 70% = 840)
const isCorrect = (
  Math.abs(breakdown.platformFee - 360) < 0.01 &&
  Math.abs(breakdown.providerPayout - 840) < 0.01
);

if (isCorrect) {
  console.log('✅ Hesaplama DOĞRU!');
  console.log('   - Toplam: 1200 THB (100%)');
  console.log('   - Platform: 360 THB (%30)');
  console.log('   - Psikolog: 840 THB (%70)');
  console.log('');
  console.log('NOT: Stopaj ve KDV ülke bazlı uygulanır.');
  console.log('     Stripe Checkout bu tutarları otomatik hesaplar.');
} else {
  console.log('❌ Hesaplama YANLIŞ!');
  console.log(`   Beklenen: Platform=360, Psikolog=840`);
  console.log(`   Hesaplanan: Platform=${breakdown.platformFee.toFixed(2)}, Psikolog=${breakdown.providerPayout.toFixed(2)}`);
}

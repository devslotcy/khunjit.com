/**
 * Reset Payment Data Script
 *
 * Bu script veritabanındaki tüm ödeme verilerini temizler.
 * UYARI: Bu işlem geri alınamaz!
 */

import { db } from './server/db';
import { payments, refunds, ledgers, payoutLedger, webhookEvents } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function resetPaymentData() {
  console.log('=== Payment Data Reset Script ===\n');
  console.log('⚠️  UYARI: Bu işlem tüm ödeme verilerini silecek!');
  console.log('⚠️  Bu işlem geri alınamaz!\n');

  try {
    // Count existing records
    const paymentCount = await db.select().from(payments);
    const refundCount = await db.select().from(refunds);
    const ledgerCount = await db.select().from(ledgers);
    const payoutLedgerCount = await db.select().from(payoutLedger);
    const webhookCount = await db.select().from(webhookEvents);

    console.log('Mevcut Kayıtlar:');
    console.log(`  - Ödemeler (payments): ${paymentCount.length}`);
    console.log(`  - İadeler (refunds): ${refundCount.length}`);
    console.log(`  - Ledger kayıtları: ${ledgerCount.length}`);
    console.log(`  - Payout Ledger kayıtları: ${payoutLedgerCount.length}`);
    console.log(`  - Webhook kayıtları: ${webhookCount.length}`);
    console.log('');

    if (paymentCount.length === 0) {
      console.log('✅ Zaten temiz! Silinecek veri yok.');
      process.exit(0);
    }

    console.log('🗑️  Silme işlemi başlıyor...\n');

    // Delete in correct order (foreign key constraints)

    // 1. Delete refunds first (references payments)
    if (refundCount.length > 0) {
      console.log(`1. İadeler siliniyor... (${refundCount.length} kayıt)`);
      await db.delete(refunds);
      console.log('   ✅ İadeler silindi');
    }

    // 2. Delete ledgers (references payments)
    if (ledgerCount.length > 0) {
      console.log(`2. Ledger kayıtları siliniyor... (${ledgerCount.length} kayıt)`);
      await db.delete(ledgers);
      console.log('   ✅ Ledger kayıtları silindi');
    }

    // 3. Delete payout ledger
    if (payoutLedgerCount.length > 0) {
      console.log(`3. Payout Ledger kayıtları siliniyor... (${payoutLedgerCount.length} kayıt)`);
      await db.delete(payoutLedger);
      console.log('   ✅ Payout Ledger kayıtları silindi');
    }

    // 4. Delete webhook events
    if (webhookCount.length > 0) {
      console.log(`4. Webhook kayıtları siliniyor... (${webhookCount.length} kayıt)`);
      await db.delete(webhookEvents);
      console.log('   ✅ Webhook kayıtları silindi');
    }

    // 5. Finally delete payments
    console.log(`5. Ödemeler siliniyor... (${paymentCount.length} kayıt)`);
    await db.delete(payments);
    console.log('   ✅ Ödemeler silindi');

    console.log('');
    console.log('🎉 Tüm ödeme verileri başarıyla temizlendi!');
    console.log('');
    console.log('Sonraki adımlar:');
    console.log('  1. Yeni test randevuları oluşturun');
    console.log('  2. Ödemeleri yapın (PromptPay/Stripe)');
    console.log('  3. Admin panelinde doğru rakamları kontrol edin');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Hata oluştu:', error);
    console.error('');
    process.exit(1);
  }
}

// Safety check - don't run in production
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || '';
const isProductionDb = databaseUrl.includes('neon.tech') || databaseUrl.includes('prod');

if (isProduction || isProductionDb) {
  console.error('');
  console.error('❌ GÜVENLİK UYARISI: Bu script production ortamında çalıştırılamaz!');
  console.error('');
  console.error('Mevcut ortam:');
  console.error(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.error(`  DATABASE_URL: ${databaseUrl.substring(0, 30)}...`);
  console.error('');
  console.error('Sadece development ortamında çalıştırın!');
  console.error('');
  process.exit(1);
}

// Run the script
console.log('Script başlatılıyor...\n');
console.log('Ortam: development ✅');
console.log('');
resetPaymentData();

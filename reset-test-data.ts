/**
 * Reset Test Data Script
 *
 * Bu script veritabanındaki test verilerini temizler:
 * - Ödemeler (payments)
 * - Randevular (appointments) - opsiyonel
 * - İlgili tüm kayıtlar
 *
 * UYARI: Bu işlem geri alınamaz!
 */

import { db } from './server/db';
import { payments, refunds, ledgers, payoutLedger, webhookEvents, appointments } from '@shared/schema';
import readline from 'readline';

// Safety check - don't run in production
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || '';
const isProductionDb = databaseUrl.includes('neon.tech') || databaseUrl.includes('prod');

if (isProduction || isProductionDb) {
  console.error('');
  console.error('❌ GÜVENLİK UYARISI: Bu script production ortamında çalıştırılamaz!');
  console.error('');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function resetTestData() {
  console.log('=== Test Data Reset Script ===\n');
  console.log('Ortam: development ✅\n');

  try {
    // Count existing records
    const paymentCount = await db.select().from(payments);
    const appointmentCount = await db.select().from(appointments);
    const refundCount = await db.select().from(refunds);
    const ledgerCount = await db.select().from(ledgers);
    const payoutLedgerCount = await db.select().from(payoutLedger);
    const webhookCount = await db.select().from(webhookEvents);

    console.log('Mevcut Kayıtlar:');
    console.log(`  - Randevular: ${appointmentCount.length}`);
    console.log(`  - Ödemeler: ${paymentCount.length}`);
    console.log(`  - İadeler: ${refundCount.length}`);
    console.log(`  - Ledger: ${ledgerCount.length}`);
    console.log(`  - Payout Ledger: ${payoutLedgerCount.length}`);
    console.log(`  - Webhook: ${webhookCount.length}`);
    console.log('');

    if (paymentCount.length === 0 && appointmentCount.length === 0) {
      console.log('✅ Zaten temiz! Silinecek veri yok.');
      rl.close();
      process.exit(0);
    }

    // Ask for confirmation
    console.log('⚠️  UYARI: Bu işlem geri alınamaz!');
    console.log('');
    const answer = await question('Devam etmek istiyor musunuz? (evet/hayır): ');

    if (answer.toLowerCase() !== 'evet' && answer.toLowerCase() !== 'e') {
      console.log('\n❌ İşlem iptal edildi.');
      rl.close();
      process.exit(0);
    }

    console.log('');
    const deleteAppointments = await question('Randevuları da silmek istiyor musunuz? (evet/hayır): ');
    const shouldDeleteAppointments = deleteAppointments.toLowerCase() === 'evet' || deleteAppointments.toLowerCase() === 'e';

    console.log('\n🗑️  Silme işlemi başlıyor...\n');

    // Delete in correct order (foreign key constraints)
    let deletedCount = 0;

    // 1. Delete refunds first (references payments)
    if (refundCount.length > 0) {
      console.log(`1. İadeler siliniyor... (${refundCount.length} kayıt)`);
      await db.delete(refunds);
      deletedCount += refundCount.length;
      console.log('   ✅ İadeler silindi');
    }

    // 2. Delete ledgers (references payments)
    if (ledgerCount.length > 0) {
      console.log(`2. Ledger kayıtları siliniyor... (${ledgerCount.length} kayıt)`);
      await db.delete(ledgers);
      deletedCount += ledgerCount.length;
      console.log('   ✅ Ledger kayıtları silindi');
    }

    // 3. Delete payout ledger
    if (payoutLedgerCount.length > 0) {
      console.log(`3. Payout Ledger kayıtları siliniyor... (${payoutLedgerCount.length} kayıt)`);
      await db.delete(payoutLedger);
      deletedCount += payoutLedgerCount.length;
      console.log('   ✅ Payout Ledger kayıtları silindi');
    }

    // 4. Delete webhook events
    if (webhookCount.length > 0) {
      console.log(`4. Webhook kayıtları siliniyor... (${webhookCount.length} kayıt)`);
      await db.delete(webhookEvents);
      deletedCount += webhookCount.length;
      console.log('   ✅ Webhook kayıtları silindi');
    }

    // 5. Delete payments
    if (paymentCount.length > 0) {
      console.log(`5. Ödemeler siliniyor... (${paymentCount.length} kayıt)`);
      await db.delete(payments);
      deletedCount += paymentCount.length;
      console.log('   ✅ Ödemeler silindi');
    }

    // 6. Delete appointments (optional)
    if (shouldDeleteAppointments && appointmentCount.length > 0) {
      console.log(`6. Randevular siliniyor... (${appointmentCount.length} kayıt)`);
      await db.delete(appointments);
      deletedCount += appointmentCount.length;
      console.log('   ✅ Randevular silindi');
    }

    console.log('');
    console.log('🎉 Temizleme tamamlandı!');
    console.log(`   Toplam ${deletedCount} kayıt silindi.`);
    console.log('');
    console.log('Sonraki adımlar:');
    console.log('  1. Yeni test randevuları oluşturun');
    console.log('  2. Ödemeleri yapın (PromptPay/Stripe)');
    console.log('  3. Admin panelinde rakamları kontrol edin');
    console.log('');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Hata oluştu:', error);
    console.error('');
    rl.close();
    process.exit(1);
  }
}

// Run the script
resetTestData();

/**
 * Test script for Thai QR code generation
 * Run with: npx tsx test-thai-qr.ts
 */

import { generateThaiQR } from './server/payments/thai-qr-generator';

async function testThaiQR() {
  console.log('=== Testing Thai QR Code Generation ===\n');

  // Test 1: Bank account (primary)
  console.log('Test 1: Bank Account (KBank 0073902908)');
  const result1 = await generateThaiQR({
    receiver: {
      type: 'BANK_ACCOUNT',
      value: '0073902908',
    },
    amount: 1.00,
    description: 'Test payment 1 THB',
  });

  console.log('Result:', {
    success: result1.success,
    amount: result1.amount,
    receiverType: result1.receiverType,
    receiverValue: result1.receiverValue,
    payloadLength: result1.qrPayload?.length,
    error: result1.error,
  });
  console.log('QR Payload:', result1.qrPayload?.substring(0, 100) + '...\n');

  // Test 2: Phone number (fallback)
  console.log('Test 2: Phone Number (0908925858)');
  const result2 = await generateThaiQR({
    receiver: {
      type: 'PHONE',
      value: '0908925858',
    },
    amount: 1.00,
    description: 'Test payment 1 THB',
  });

  console.log('Result:', {
    success: result2.success,
    amount: result2.amount,
    receiverType: result2.receiverType,
    receiverValue: result2.receiverValue,
    payloadLength: result2.qrPayload?.length,
    error: result2.error,
  });
  console.log('QR Payload:', result2.qrPayload?.substring(0, 100) + '...\n');

  // Test 3: Different amount
  console.log('Test 3: Higher amount (500 THB)');
  const result3 = await generateThaiQR({
    receiver: {
      type: 'PHONE',
      value: '0908925858',
    },
    amount: 500.00,
    description: 'Test payment 500 THB',
  });

  console.log('Result:', {
    success: result3.success,
    amount: result3.amount,
    receiverType: result3.receiverType,
    receiverValue: result3.receiverValue,
    payloadLength: result3.qrPayload?.length,
    error: result3.error,
  });
  console.log('QR Payload:', result3.qrPayload?.substring(0, 100) + '...\n');

  console.log('=== Test Complete ===');
}

testThaiQR().catch(console.error);

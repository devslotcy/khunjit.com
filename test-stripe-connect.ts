/**
 * Test Stripe Connect Configuration
 *
 * This script tests if Stripe Connect is properly configured
 * and can create Express accounts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

console.log('🔑 Stripe Secret Key:', stripeSecretKey.substring(0, 20) + '...');
console.log('🌍 Mode:', stripeSecretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST');

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover' as any,
});

async function testStripeConnect() {
  try {
    console.log('\n📋 Testing Stripe Connect capabilities...\n');

    // Test 1: Try to create a test account
    console.log('1️⃣ Attempting to create a test Express account...');

    const testAccount = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Using US because Thailand doesn't support loss-liable platforms
      email: `test-${Date.now()}@example.com`,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    console.log('✅ SUCCESS! Express account created:', testAccount.id);
    console.log('   - Email:', testAccount.email);
    console.log('   - Country:', testAccount.country);
    console.log('   - Type:', testAccount.type);
    console.log('   - Charges enabled:', testAccount.charges_enabled);
    console.log('   - Payouts enabled:', testAccount.payouts_enabled);

    // Test 2: Create account link
    console.log('\n2️⃣ Creating account onboarding link...');

    const accountLink = await stripe.accountLinks.create({
      account: testAccount.id,
      refresh_url: 'http://localhost:5055/profile?stripe_refresh=true',
      return_url: 'http://localhost:5055/profile?stripe_return=true',
      type: 'account_onboarding',
    });

    console.log('✅ SUCCESS! Onboarding link created');
    console.log('   - URL:', accountLink.url.substring(0, 80) + '...');

    // Test 3: Retrieve account
    console.log('\n3️⃣ Retrieving account details...');

    const retrievedAccount = await stripe.accounts.retrieve(testAccount.id);

    console.log('✅ SUCCESS! Account retrieved');
    console.log('   - Status:', retrievedAccount.details_submitted ? 'Details submitted' : 'Incomplete');
    console.log('   - Requirements due:', retrievedAccount.requirements?.currently_due?.length || 0, 'items');

    // Clean up - delete test account
    console.log('\n4️⃣ Cleaning up test account...');
    await stripe.accounts.del(testAccount.id);
    console.log('✅ Test account deleted');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ Stripe Connect is properly configured and working!');
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure your server is running');
    console.log('   2. Login as a psychologist');
    console.log('   3. Go to Profile page');
    console.log('   4. Click "Stripe ile bağla" button');
    console.log('   5. Complete the onboarding flow');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);

    if (error.code === 'account_invalid') {
      console.error('\n🔴 STRIPE CONNECT IS NOT ENABLED!');
      console.error('\n📋 To fix this:');
      console.error('   1. Go to: https://dashboard.stripe.com/test/connect/accounts/overview');
      console.error('   2. Click "Get started with Connect"');
      console.error('   3. Fill in your platform details:');
      console.error('      - Platform name: Mendly');
      console.error('      - Platform type: Platform or marketplace');
      console.error('   4. Complete the setup');
      console.error('   5. Run this script again');
    } else if (error.raw?.message?.includes('signed up for Connect')) {
      console.error('\n🔴 STRIPE CONNECT IS NOT ENABLED!');
      console.error('\n📋 Follow this URL to enable Connect:');
      console.error('   https://stripe.com/docs/connect');
      console.error('\n   Or go to your Stripe Dashboard:');
      console.error('   https://dashboard.stripe.com/test/connect/accounts/overview');
    } else {
      console.error('\n🔴 Unexpected error occurred');
      console.error('   Code:', error.code);
      console.error('   Type:', error.type);
      console.error('   Raw message:', error.raw?.message);
    }

    process.exit(1);
  }
}

testStripeConnect();

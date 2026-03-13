/**
 * Payment Module Exports
 *
 * Stripe Checkout payment system with country-based tax calculation
 */

// Stripe Checkout (primary payment method)
export {
  createCheckoutSession,
  handleCheckoutCompleted,
  handleChargeRefunded,
  getCheckoutSessionStatus,
  getCountryTaxRule,
  calculatePaymentBreakdown,
  type CheckoutResult,
  type TaxBreakdown,
} from './stripe-checkout';

// Stripe Payment Intents (for embedded Payment Element)
export {
  createPaymentIntent,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  getPaymentIntentStatus,
  getPaymentStatus as getStripePaymentStatus,
  type PaymentIntentResult,
} from './stripe-checkout';

// Legacy Payment Service (kept for backward compatibility)
export {
  createPayment,
  getPayment,
  getPaymentByAppointment,
  getPaymentStatus,
  type CreatePaymentParams,
  type PaymentResult,
} from './payment-service';

// Thai QR Generator (legacy)
export {
  generateThaiQR,
  generateQRImage,
  type ThaiQRConfig,
  type ThaiQRResult,
} from './thai-qr-generator';

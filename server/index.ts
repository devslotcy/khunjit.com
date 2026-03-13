import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { setupSignalingServer } from "./signaling";
import { emailService, typeSafeEmailService } from "./email/index.js";
import { startEmailScheduler } from "./email/scheduler.js";
import { storage } from "./storage";
import { setSocketIO } from "./notifications";

const app = express();

// In development: always use HTTP (Vite runs separately and proxies to us)
// In production: use HTTPS if certificates exist
const certPath = resolve(process.cwd(), ".local/certs/localhost+3.pem");
const keyPath = resolve(process.cwd(), ".local/certs/localhost+3-key.pem");

const useHttps = process.env.NODE_ENV === "production" && existsSync(certPath) && existsSync(keyPath);
const httpServer = useHttps
  ? createHttpsServer({
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    }, app)
  : createServer(app);

// Initialize Socket.io signaling server for WebRTC
const io = setupSignalingServer(httpServer);

// Export io instance for use in other modules
export { io };

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CORS Configuration for web and mobile clients
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // In production, restrict to specific domains
    if (process.env.NODE_ENV === "production") {
      const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",")
        : ["https://khunjit.com"];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    }

    // In development, allow all origins
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// ==================== STRIPE WEBHOOK (RAW BODY) ====================
// CRITICAL: This route MUST be defined BEFORE express.json() middleware
// Stripe requires raw body buffer for signature verification
// If express.json() processes it first, signature verification will fail
import Stripe from 'stripe';
import { db } from './db';
import { webhookEvents, psychologistProfiles } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as stripeConnect from './stripe-connect';
import * as stripeCheckout from './payments/stripe-checkout';

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  // Health check / ping test - return early if no body
  if (!req.body || req.body.length === 0) {
    return res.status(200).json({ ok: true, message: 'Stripe webhook endpoint is active' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If no signature, check if this is a ping test
  if (!sig) {
    try {
      const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString() : String(req.body);
      const parsed = JSON.parse(bodyStr);
      if (parsed.ping === true) {
        return res.status(200).json({ ok: true, message: 'Pong! Webhook endpoint is working.' });
      }
    } catch {
      // Not a ping test, continue with error
    }
    console.error('[Stripe Webhook] No stripe-signature header provided');
    return res.status(400).json({ error: 'Webhook Error: No signature' });
  }

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured in .env');
    return res.status(500).json({ error: 'Webhook Error: Server not configured' });
  }

  if (!stripeConnect.stripe) {
    console.error('[Stripe Webhook] Stripe client not initialized');
    return res.status(500).json({ error: 'Webhook Error: Stripe not initialized' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature with raw body buffer
    event = stripeConnect.stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  // Log webhook event to database
  try {
    await db.insert(webhookEvents).values({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      payload: event,
      signature: sig as string,
      status: 'received',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
  } catch (err) {
    console.error('[Stripe Webhook] Failed to log webhook event:', err);
  }

  console.log(`[Stripe Webhook] ✓ Verified event: ${event.type} (${event.id})`);

  // Handle the event
  try {
    switch (event.type) {
      // ===== Checkout Session Events =====
      case 'checkout.session.completed':
        {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`[Stripe Webhook] Processing checkout.session.completed: ${session.id}`);

          const result = await stripeCheckout.handleCheckoutCompleted(session);
          if (!result.success) {
            console.error(`[Stripe Webhook] Failed to process checkout ${session.id}:`, result.error);
          } else {
            console.log(`[Stripe Webhook] ✓ Checkout ${session.id} processed successfully`);

            // TODO: Send notifications for booking confirmation
            // The notification functions (notifyBookingReceived, notifyBookingConfirmed)
            // should be implemented in server/notifications.ts
            console.log(`[Stripe Webhook] Booking confirmed for appointment ${session.metadata?.appointmentId}`);
          }
        }
        break;

      case 'checkout.session.expired':
        {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`[Stripe Webhook] Checkout session expired: ${session.id}`);
          // The payment record already has expiry handled - no additional action needed
        }
        break;

      // ===== Payment Intent Events (for Payment Element flow) =====
      case 'payment_intent.succeeded':
        {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[Stripe Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);

          // Only process if this has our metadata (from Payment Element flow)
          if (paymentIntent.metadata?.appointmentId) {
            const result = await stripeCheckout.handlePaymentIntentSucceeded(paymentIntent);
            if (!result.success) {
              console.error(`[Stripe Webhook] Failed to process payment intent ${paymentIntent.id}:`, result.error);
            } else {
              console.log(`[Stripe Webhook] ✓ Payment intent ${paymentIntent.id} processed successfully`);
              console.log(`[Stripe Webhook] Booking confirmed for appointment ${paymentIntent.metadata.appointmentId}`);
            }
          } else {
            console.log(`[Stripe Webhook] Payment intent ${paymentIntent.id} has no appointmentId metadata (may be from Checkout flow)`);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[Stripe Webhook] Processing payment_intent.payment_failed: ${paymentIntent.id}`);

          if (paymentIntent.metadata?.paymentId) {
            const result = await stripeCheckout.handlePaymentIntentFailed(paymentIntent);
            if (!result.success) {
              console.error(`[Stripe Webhook] Failed to handle failed payment intent ${paymentIntent.id}:`, result.error);
            } else {
              console.log(`[Stripe Webhook] ✓ Failed payment intent ${paymentIntent.id} recorded`);
            }
          }
        }
        break;

      // ===== Refund Events =====
      case 'charge.refunded':
        {
          const charge = event.data.object as Stripe.Charge;
          console.log(`[Stripe Webhook] Processing charge.refunded: ${charge.id}`);

          const result = await stripeCheckout.handleChargeRefunded(charge);
          if (!result.success) {
            console.error(`[Stripe Webhook] Failed to process refund ${charge.id}:`, result.error);
          } else {
            console.log(`[Stripe Webhook] ✓ Refund ${charge.id} processed successfully`);
          }
        }
        break;

      // ===== Connect Account Events =====
      case 'account.updated':
      case 'capability.updated':
        {
          const account = event.data.object as Stripe.Account;
          const accountId = account.id;
          console.log(`[Stripe Webhook] Processing account update: ${accountId}`);

          const result = await stripeConnect.syncAccountStatusByStripeId(accountId);
          if (!result.success) {
            console.error(`[Stripe Webhook] Failed to sync account ${accountId}:`, result.error);
          } else {
            console.log(`[Stripe Webhook] ✓ Account ${accountId} synced`);
          }
        }
        break;

      case 'account.application.deauthorized':
        {
          const account = event.data.object as any;
          const accountId = account.id;
          console.log(`[Stripe Webhook] Account deauthorized: ${accountId}`);

          const [psychologist] = await db
            .select()
            .from(psychologistProfiles)
            .where(eq(psychologistProfiles.stripeAccountId, accountId))
            .limit(1);

          if (psychologist) {
            await db
              .update(psychologistProfiles)
              .set({
                stripeAccountId: null,
                stripeOnboardingStatus: 'NOT_CONNECTED',
                chargesEnabled: false,
                payoutsEnabled: false,
                requirementsDue: null,
                lastStripeSyncAt: new Date(),
              })
              .where(eq(psychologistProfiles.id, psychologist.id));

            console.log(`[Stripe Webhook] ✓ Disconnected account ${accountId}`);
          }
        }
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    await db
      .update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvents.eventId, event.id))
      .catch(err => console.error('[Stripe Webhook] Failed to mark as processed:', err));

    // Always return 200 to acknowledge receipt (Stripe requirement)
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);

    // Mark webhook as failed
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.eventId, event.id))
      .catch(() => {});

    // Still return 200 to prevent Stripe retries for non-recoverable errors
    return res.status(200).json({ received: true, warning: 'Processing error logged' });
  }
});

// ==================== END STRIPE WEBHOOK ====================

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Get client info for debugging mobile vs web requests
      const clientIP = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.get("User-Agent") || "unknown";
      const isMobile = /Expo|okhttp|Android|iOS|Darwin/i.test(userAgent);
      const clientType = isMobile ? "📱 MOBILE" : "🌐 WEB";

      let logLine = `${clientType} [${clientIP}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize email services with storage
  emailService.setStorage(storage);
  typeSafeEmailService.setStorage(storage);

  // Initialize notification system with Socket.io
  setSocketIO(io);

  // Start email scheduler for reminders
  startEmailScheduler();

  await registerRoutes(httpServer, app);

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // In production: serve static files from dist
  // In development: Vite runs on separate port (5173) and proxies API requests here
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  }
  // No Vite middleware in development - frontend runs separately via `npm run client`

  // Backend API server port (default 5055)
  // In development: Vite frontend runs on 5173 and proxies /api/* here
  // In production: this serves both API and static files
  const port = parseInt(process.env.PORT || "5055", 10);
  const protocol = useHttps ? "https" : "http";
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`API server running on ${protocol}://localhost:${port}`);
    },
  );
})();

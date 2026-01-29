import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { psychologistProfiles, appointments, userProfiles, users, auditLogs, payments, refunds, ledgers, payouts, webhookEvents, languages, psychologistLanguages, countryTaxRules, payoutLedger } from "@shared/schema";
import * as paymentService from "./payments";
import * as stripeConnect from "./stripe-connect";
import { eq, and, gte, lte, or, count, sql, desc } from "drizzle-orm";
import { addMinutes, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, isAfter, isBefore, subMinutes, format } from "date-fns";
import { tr } from "date-fns/locale";
import { randomUUID, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { localTimeToUTC, addMinutesToUTC, DEFAULT_TIMEZONE } from "./datetime";
import { emailService } from "./email/service.js";
import {
  sendWelcomeEmail,
  sendAppointmentConfirmedToPatient,
  sendAppointmentConfirmedToPsychologist,
  sendAppointmentCancelledEmail,
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail
} from "./email/helpers.js";
import { generateToken, verifyToken, extractBearerToken } from "./jwt";
import rateLimit from "express-rate-limit";
import { log } from "./index";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import * as notificationService from "./notifications";
import * as twoFactorAuth from "./two-factor-auth";

// Rate limiting for auth endpoints to prevent brute force attacks
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { message: "Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin." },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests if needed
  skipSuccessfulRequests: false,
});

// Stricter rate limiting for login attempts
const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (geçici olarak kısa tutuldu)
  max: 50, // Geçici olarak artırıldı
  message: { message: "Çok fazla başarısız giriş denemesi. Lütfen 1 dakika sonra tekrar deneyin." },
  standardHeaders: true,
  legacyHeaders: false,
});

function generateSecureJoinCode(appointmentId: string, secret: string = process.env.SESSION_SECRET || "khunjit-secret"): string {
  const timestamp = Date.now().toString();
  return createHash("sha256")
    .update(`${appointmentId}-${secret}-${timestamp}`)
    .digest("hex")
    .slice(0, 16);
}

function generateSecureMeetingRoom(appointmentId: string): string {
  const hash = createHash("sha256")
    .update(`${appointmentId}-${process.env.SESSION_SECRET || "khunjit-secret"}-${randomUUID()}`)
    .digest("hex")
    .slice(0, 12);
  return `mw-${hash}`;
}

/**
 * Payment calculation utility (Legacy - for backwards compatibility)
 *
 * IMPORTANT: This is the OLD calculation method that assumes VAT-based pricing.
 * The NEW system uses country-based withholding tax (see stripe-checkout.ts).
 *
 * For accurate calculations, use the payment data from the database which includes
 * the actual breakdown from Stripe Checkout.
 *
 * This function is only used as a FALLBACK when payment data is missing.
 */
function calculatePaymentBreakdown(grossAmount: number) {
  const PLATFORM_FEE_RATE = 0.30; // 30% Platform komisyonu

  // Basitleştirilmiş hesaplama (ülke bazlı vergi kullanmıyor)
  // Gerçek hesaplama stripe-checkout.ts'de ülke bazlı yapılıyor
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

// Audit Log Helper
async function createAuditLog(
  actorUserId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  beforeData: any = null,
  afterData: any = null,
  req?: Request
) {
  try {
    await db.insert(auditLogs).values({
      actorUserId,
      entityType,
      entityId,
      action,
      beforeData,
      afterData,
      ipAddress: req?.ip || req?.socket?.remoteAddress || null,
      userAgent: req?.get('user-agent') || null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Use 'any' for request type to avoid Express type conflicts with custom properties
type AuthenticatedRequest = any;

const requireRole = (...roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Support Bearer token auth (mobile), session-based auth (web), and Replit auth
      let userId = req.session?.userId || req.user?.claims?.sub;

      // If no userId from session/Replit, try Bearer token
      if (!userId) {
        const bearerToken = extractBearerToken(req.headers.authorization);
        if (bearerToken) {
          const payload = verifyToken(bearerToken);
          if (payload) {
            userId = payload.userId;
            // Populate req.user for downstream handlers
            req.user = { claims: { sub: userId } };
            req.session.userId = userId;
          }
        }
      }

      if (!userId) {
        console.log("requireRole: No userId found");
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      console.log("requireRole check:", { userId, profileRole: profile?.role, requiredRoles: roles });

      if (!profile || !roles.includes(profile.role)) {
        console.log("requireRole: Access denied -", profile ? `user has role: ${profile.role}` : "no profile found");
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (error) {
      console.error("Error checking role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint for monitoring and dev testing
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      stripe: {
        connected: !!process.env.STRIPE_SECRET_KEY,
        mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      },
    });
  });

  await setupAuth(app);
  registerAuthRoutes(app);

  // Email/Password Register (rate limited)
  app.post("/api/auth/register", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const {
        email, username, password, firstName, lastName, role,
        birthDate, gender, profession, bio,
        title, licenseNumber, yearsOfExperience, education,
        specialties, therapyApproaches, languages, pricePerSession,
        languageId, languageIds // NEW: language selection
      } = req.body;

      if (!email || !username || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, kullanıcı adı, şifre, ad ve soyad gereklidir" });
      }

      // Validate language selection based on role
      const selectedRole = role === "psychologist" ? "psychologist" : "patient";

      if (selectedRole === "patient") {
        if (!languageId) {
          return res.status(400).json({ message: "Lütfen bir dil seçiniz" });
        }
      } else if (selectedRole === "psychologist") {
        if (!languageIds || !Array.isArray(languageIds) || languageIds.length === 0) {
          return res.status(400).json({ message: "Lütfen en az bir dil seçiniz" });
        }
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Şifre en az 6 karakter olmalıdır" });
      }

      const [existingEmail] = await db.select().from(users).where(eq(users.email, email));
      if (existingEmail) {
        return res.status(400).json({ message: "Bu email zaten kullanılıyor" });
      }

      const [existingUsername] = await db.select().from(users).where(eq(users.username, username));
      if (existingUsername) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();

      const [newUser] = await db.insert(users).values({
        id: userId,
        email,
        username,
        passwordHash,
        firstName,
        lastName,
      }).returning();

      const profile = await storage.createUserProfile({
        userId,
        role: selectedRole,
        languageId: selectedRole === "patient" ? languageId : null, // Only patients have a single language
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        profession: profession || null,
        bio: bio || null,
      });

      if (selectedRole === "psychologist") {
        if (!title || !licenseNumber || !yearsOfExperience || !pricePerSession) {
          return res.status(400).json({ message: "Psikolog kaydı için unvan, lisans no, deneyim ve ücret bilgileri gereklidir" });
        }

        const psychProfile = await storage.createPsychologistProfile({
          userId,
          fullName: `${firstName} ${lastName}`,
          title,
          licenseNumber,
          bio: bio || null,
          specialties: specialties || [],
          therapyApproaches: therapyApproaches || [],
          languages: languages || ["Türkçe"], // Legacy field - keeping for backward compatibility
          pricePerSession: pricePerSession,
          yearsOfExperience: parseInt(yearsOfExperience),
          education: education || null,
          certifications: [],
          status: "pending",
        });

        // Save selected languages to the psychologist_languages pivot table
        if (languageIds && Array.isArray(languageIds) && languageIds.length > 0) {
          await db.insert(psychologistLanguages).values(
            languageIds.map((langId: string) => ({
              psychologistId: psychProfile.id,
              languageId: langId,
            }))
          );
        }
      }

      (req.session as any).userId = userId;

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "user",
        entityId: userId,
        action: "registered",
        afterData: { email, role: selectedRole },
      });

      // Send welcome email in user's language (non-blocking)
      (async () => {
        try {
          // Get user's language code
          let userLanguageCode = 'en';
          if (selectedRole === "patient" && languageId) {
            const [lang] = await db.select({ code: languages.code }).from(languages).where(eq(languages.id, languageId));
            userLanguageCode = lang?.code || 'en';
          } else if (selectedRole === "psychologist" && languageIds && languageIds.length > 0) {
            // For psychologists, use their first language
            const [lang] = await db.select({ code: languages.code }).from(languages).where(eq(languages.id, languageIds[0]));
            userLanguageCode = lang?.code || 'en';
          }

          console.log(`[Registration] Sending welcome email to ${email} (${firstName}) in language: ${userLanguageCode}`);
          const result = await sendWelcomeEmail({
            userId,
            email,
            firstName,
            language: userLanguageCode as any
          });
          if (result.success) {
            console.log(`[Registration] Welcome email sent successfully to ${email}`);
          } else {
            console.error(`[Registration] Failed to send welcome email to ${email}:`, result.error);
          }
        } catch (err) {
          console.error("Failed to send welcome email:", err);
          if (err instanceof Error) {
            console.error("Error stack:", err.stack);
          }
        }
      })();

      // Generate JWT token for mobile clients
      const token = generateToken(userId);

      res.json({
        user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName },
        profile,
        token, // JWT token for mobile authentication
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Kayıt sırasında bir hata oluştu" });
    }
  });

  // Email/Password Login (stricter rate limit)
  app.post("/api/auth/login", loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email ve şifre gereklidir" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Geçersiz email veya şifre" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Geçersiz email veya şifre" });
      }

      const profile = await storage.getUserProfile(user.id);

      // Check if 2FA is enabled
      if (profile?.twoFactorEnabled) {
        // Don't create session yet, require 2FA verification first
        // Store user info temporarily in session for 2FA verification
        (req.session as any).pending2FAUserId = user.id;
        console.log(`🔐 2FA required for ${user.email} - sending requires2FA response`);
        return res.json({
          requires2FA: true,
          email: user.email,
          profile,
          message: "Two-factor authentication required",
        });
      }

      // No 2FA required, proceed with normal login
      (req.session as any).userId = user.id;

      await storage.createAuditLog({
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "logged_in",
      });

      // Generate JWT token for mobile clients
      const token = generateToken(user.id);

      res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        profile,
        token, // JWT token for mobile authentication
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Giriş sırasında bir hata oluştu", error: error?.message || String(error) });
    }
  });

  // JWT-based auth check (for mobile clients)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token gerekli" });
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      const profile = await storage.getUserProfile(user.id);

      res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        profile,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Kimlik doğrulama hatası" });
    }
  });

  // Reset and create admin user (DEV ONLY - removes existing admins)
  app.post("/api/reset-admin", async (req: Request, res: Response) => {
    try {
      const adminEmail = "dev@khunjit.com";
      const adminPassword = "KhunJit2024";

      // Remove existing admin profiles
      await db.delete(userProfiles).where(eq(userProfiles.role, "admin"));

      // Check if email already exists
      const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail));
      if (existingUser) {
        await db.delete(users).where(eq(users.id, existingUser.id));
      }

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userId = randomUUID();

      await db.insert(users).values({
        id: userId,
        email: adminEmail,
        username: "admin",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
      });

      await storage.createUserProfile({
        userId,
        role: "admin",
        birthDate: null,
        gender: null,
        profession: "Platform Admin",
        bio: "KhunJit Platform Yöneticisi",
      });

      console.log(`[SETUP] Admin reset. Email: ${adminEmail}, Password: ${adminPassword}`);

      res.json({
        message: "Admin kullanıcı sıfırlandı ve yeniden oluşturuldu",
        email: adminEmail,
        password: adminPassword
      });
    } catch (error) {
      console.error("Reset admin error:", error);
      res.status(500).json({ message: "Admin sıfırlama sırasında bir hata oluştu" });
    }
  });

  // Seed admin user (only works if no admin exists)
  // This endpoint should only be called during initial setup
  app.post("/api/seed-admin", async (req: Request, res: Response) => {
    try {
      // Check if any admin already exists
      const existingAdmins = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.role, "admin"));

      if (existingAdmins.length > 0) {
        return res.status(400).json({
          message: "Admin kullanıcı zaten mevcut. Güvenlik nedeniyle yeni admin oluşturulamaz.",
          hint: "Yeni admin eklemek için mevcut bir admin ile giriş yapın."
        });
      }

      const adminEmail = "dev@khunjit.com";
      const adminPassword = "KhunJit2024";
      
      // Check if email already exists
      const [existingEmail] = await db.select().from(users).where(eq(users.email, adminEmail));
      if (existingEmail) {
        // Check if this user already has a profile
        const existingProfile = await storage.getUserProfile(existingEmail.id);
        if (existingProfile) {
          await db.update(userProfiles)
            .set({ role: "admin" })
            .where(eq(userProfiles.userId, existingEmail.id));
        } else {
          await storage.createUserProfile({
            userId: existingEmail.id,
            role: "admin",
                birthDate: null,
            gender: null,
                profession: "Platform Admin",
            bio: "KhunJit Platform Yöneticisi",
          });
        }
        
        await storage.createAuditLog({
          actorUserId: existingEmail.id,
          entityType: "user",
          entityId: existingEmail.id,
          action: "admin_promoted",
          afterData: { email: adminEmail },
        });
        
        return res.json({ 
          message: "Mevcut kullanıcı admin yapıldı",
          email: adminEmail,
          info: "Mevcut şifrenizi kullanarak giriş yapabilirsiniz"
        });
      }

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userId = randomUUID();

      await db.insert(users).values({
        id: userId,
        email: adminEmail,
        username: "admin",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
      });

      await storage.createUserProfile({
        userId,
        role: "admin",
        birthDate: null,
        gender: null,
        profession: "Platform Admin",
        bio: "KhunJit Platform Yöneticisi",
      });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "user",
        entityId: userId,
        action: "admin_seeded",
        afterData: { email: adminEmail },
      });

      // Don't return password in production - log it to console for initial setup only
      console.log(`[SETUP] Admin user created. Email: ${adminEmail}, Initial password: ${adminPassword}`);

      res.json({ 
        message: "Admin kullanıcı oluşturuldu",
        email: adminEmail,
        info: "Varsayılan şifre sunucu loglarında görüntülenebilir. İlk girişte şifrenizi değiştirin."
      });
    } catch (error) {
      console.error("Seed admin error:", error);
      res.status(500).json({ message: "Admin oluşturma sırasında bir hata oluştu" });
    }
  });

  // Get current user (supports both Replit Auth and Email/Password)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub || (req.session as any).userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const profile = await storage.getUserProfile(userId);

      res.json({
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          firstName: user.firstName, 
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
        profile,
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout for email/password users
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Çıkış yapılırken hata oluştu" });
      }
      res.json({ message: "Başarıyla çıkış yapıldı" });
    });
  });

  // ========== LANGUAGE ENDPOINTS ==========

  // Get all active languages
  app.get("/api/languages", async (req: Request, res: Response) => {
    try {
      const allLanguages = await db
        .select()
        .from(languages)
        .where(eq(languages.isActive, true))
        .orderBy(languages.name);

      res.json(allLanguages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get psychologist's supported languages
  app.get("/api/psychologists/:id/languages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const psychologistLangs = await db
        .select({
          id: languages.id,
          code: languages.code,
          name: languages.name,
          nativeName: languages.nativeName,
        })
        .from(psychologistLanguages)
        .innerJoin(languages, eq(psychologistLanguages.languageId, languages.id))
        .where(eq(psychologistLanguages.psychologistId, id))
        .orderBy(languages.name);

      res.json(psychologistLangs);
    } catch (error) {
      console.error("Error fetching psychologist languages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update psychologist's supported languages (psychologist only)
  app.put("/api/psychologist/languages", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { languageIds } = req.body;

      if (!languageIds || !Array.isArray(languageIds) || languageIds.length === 0) {
        return res.status(400).json({ message: "At least one language is required" });
      }

      // Get psychologist profile
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      // Delete existing language associations
      await db
        .delete(psychologistLanguages)
        .where(eq(psychologistLanguages.psychologistId, psychologist.id));

      // Insert new language associations
      await db.insert(psychologistLanguages).values(
        languageIds.map((languageId: string) => ({
          psychologistId: psychologist.id,
          languageId,
        }))
      );

      // Fetch updated languages
      const updatedLanguages = await db
        .select({
          id: languages.id,
          code: languages.code,
          name: languages.name,
          nativeName: languages.nativeName,
        })
        .from(psychologistLanguages)
        .innerJoin(languages, eq(psychologistLanguages.languageId, languages.id))
        .where(eq(psychologistLanguages.psychologistId, psychologist.id))
        .orderBy(languages.name);

      res.json({ success: true, languages: updatedLanguages });
    } catch (error) {
      console.error("Error updating psychologist languages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DB Health Check (dev only - disable in production)
  app.get("/api/debug/db-health", async (req: Request, res: Response) => {
    try {
      // Only enable in development
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ message: "Not found" });
      }

      // Get DB connection info
      const dbUrl = process.env.DATABASE_URL || "NOT_SET";
      let dbHost = "unknown";
      let dbName = "unknown";

      try {
        const url = new URL(dbUrl);
        dbHost = url.hostname;
        dbName = url.pathname.replace("/", "");
      } catch (e) {
        // Invalid URL
      }

      // Test DB connection with a simple query
      const [result] = await db.select({ now: sql`NOW()` }).from(users).limit(1);
      const [userCount] = await db.select({ count: count() }).from(users);
      const [psychCount] = await db.select({ count: count() }).from(psychologistProfiles);

      res.json({
        ok: true,
        dbHost,
        dbName,
        timestamp: new Date().toISOString(),
        dbTime: result ? new Date().toISOString() : null,
        stats: {
          totalUsers: userCount?.count || 0,
          totalPsychologists: psychCount?.count || 0,
        },
        env: {
          nodeEnv: process.env.NODE_ENV || "development",
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        }
      });
    } catch (error) {
      console.error("DB Health check failed:", error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        }
      });
    }
  });

  app.post("/api/auth/select-role", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { role } = req.body;
      if (!["patient", "psychologist"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      let profile = await storage.getUserProfile(userId);
      
      if (profile) {
        profile = await storage.updateUserProfile(userId, { role });
      } else {
        profile = await storage.createUserProfile({ userId, role });
      }

      if (role === "psychologist") {
        const existingPsychologist = await storage.getPsychologistByUserId(userId);
        if (!existingPsychologist) {
          const user = req.user?.claims;
          await storage.createPsychologistProfile({
            userId,
            fullName: user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : user?.email || "İsimsiz Psikolog",
            pricePerSession: "500.00",
            profileImageUrl: user?.profile_image_url,
            status: "pending",
          });
        }
      }

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "user_profile",
        entityId: profile?.id || userId,
        action: "role_selected",
        afterData: { role },
      });

      res.json(profile);
    } catch (error) {
      console.error("Error selecting role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get current profile to verify ownership
      const currentProfile = await storage.getUserProfile(userId);
      if (!currentProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const { birthDate, gender, profession, bio, timezone, notifyAppointmentReminders, notifyMessages, notifyNewAppointments } = req.body;

      // Validate birthDate if provided
      let parsedBirthDate = null;
      if (birthDate) {
        const date = new Date(birthDate);
        const minDate = new Date(1900, 0, 1);
        const maxDate = new Date();

        if (isNaN(date.getTime()) || date < minDate || date > maxDate) {
          return res.status(400).json({
            message: "Invalid birth date. Must be between 1900 and today."
          });
        }
        parsedBirthDate = date;
      }

      // Validate bio length
      if (bio && bio.length > 500) {
        return res.status(400).json({
          message: "Bio must be less than 500 characters"
        });
      }

      const updatedProfile = await storage.updateUserProfile(userId, {
        birthDate: parsedBirthDate,
        gender: gender || null,
        profession: profession || null,
        bio: bio || null,
        timezone: timezone || "Asia/Bangkok",
        ...(notifyAppointmentReminders !== undefined && { notifyAppointmentReminders }),
        ...(notifyMessages !== undefined && { notifyMessages }),
        ...(notifyNewAppointments !== undefined && { notifyNewAppointments }),
      });

      if (!updatedProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "user_profile",
        entityId: updatedProfile.id,
        action: "updated",
        afterData: { profession },
      });

      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change password endpoint with security validation
  app.post("/api/auth/change-password", authRateLimiter, isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Kimlik doğrulaması gerekli" });
      }

      const { currentPassword, newPassword } = req.body;

      // Validate inputs
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Mevcut şifre ve yeni şifre gereklidir" });
      }

      // Password strength validation
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalıdır" });
      }

      // Check if new password is different from current
      if (currentPassword === newPassword) {
        return res.status(400).json({ message: "Yeni şifre mevcut şifreden farklı olmalıdır" });
      }

      // Get user from database
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        await storage.createAuditLog({
          actorUserId: userId,
          entityType: "user",
          entityId: userId,
          action: "password_change_failed",
          afterData: { reason: "invalid_current_password" },
        });
        return res.status(401).json({ message: "Mevcut şifre hatalı" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, userId));

      // Create audit log
      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "user",
        entityId: userId,
        action: "password_changed",
      });

      res.json({ message: "Şifreniz başarıyla değiştirildi" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Şifre değiştirme sırasında bir hata oluştu" });
    }
  });

  app.get("/api/psychologists", async (req: Request, res: Response) => {
    try {
      const { search, specialty, language, priceRange, patientLanguageId } = req.query;

      // Get all verified psychologists first
      const psychologists = await storage.getAllPsychologists({
        search: search as string,
        specialty: specialty as string,
        verified: true,
      });

      // CRITICAL: Filter by language if patientLanguageId is provided
      // This ensures patients only see psychologists who support their language
      let filteredPsychologists = psychologists;

      if (patientLanguageId) {
        // Get psychologist IDs that support the patient's language
        const matchingPsychologists = await db
          .select({ psychologistId: psychologistLanguages.psychologistId })
          .from(psychologistLanguages)
          .where(eq(psychologistLanguages.languageId, patientLanguageId as string));

        const matchingIds = new Set(matchingPsychologists.map(p => p.psychologistId));

        // Filter psychologists to only include those who support the patient's language
        filteredPsychologists = psychologists.filter(p => matchingIds.has(p.id));
      }

      // Add no-cache headers to ensure fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json(filteredPsychologists);
    } catch (error) {
      console.error("Error fetching psychologists:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/psychologists/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const psychologist = await storage.getPsychologistProfile(id);

      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Only allow access to approved psychologists
      if (!psychologist.verified || psychologist.verificationStatus !== "approved" || psychologist.status !== "active" || psychologist.deletedAt) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      res.json(psychologist);
    } catch (error) {
      console.error("Error fetching psychologist:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get available days for a psychologist in a given month (for calendar display)
  app.get("/api/psychologists/:id/available-days", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { month } = req.query; // Expected format: "YYYY-MM"

      const psychologist = await storage.getPsychologistProfile(id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      if (!psychologist.verified || psychologist.verificationStatus !== "approved" || psychologist.status !== "active" || psychologist.deletedAt) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const rules = await storage.getAvailabilityRules(id);
      if (rules.length === 0) {
        return res.json({ days: [] });
      }

      // Parse month parameter or default to current month
      // Client sends month in Bangkok timezone context
      let targetMonth: Date;
      if (month && typeof month === 'string') {
        const [year, monthNum] = month.split('-').map(Number);
        // Create date at start of month in Bangkok timezone
        targetMonth = localTimeToUTC(`${year}-${monthNum.toString().padStart(2, '0')}-01`, "00:00", DEFAULT_TIMEZONE);
      } else {
        targetMonth = startOfMonth(new Date());
      }

      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);
      const now = new Date();

      const exceptions = await storage.getAvailabilityExceptions(id, monthStart, monthEnd);

      const existingAppointments = await db.select().from(appointments)
        .where(and(
          eq(appointments.psychologistId, id),
          gte(appointments.startAt, monthStart),
          lte(appointments.startAt, monthEnd),
          or(
            eq(appointments.status, "reserved"),
            eq(appointments.status, "confirmed"),
            eq(appointments.status, "payment_pending")
          )
        ));

      const availableDays: string[] = [];
      const slotDuration = psychologist.sessionDuration || 50;
      let currentDate = monthStart;

      while (currentDate <= monthEnd) {
        // Skip past dates
        if (isBefore(currentDate, startOfDay(now))) {
          currentDate = addDays(currentDate, 1);
          continue;
        }

        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
        const dayRule = rules.find(r => r.dayOfWeek === dayOfWeek && r.isActive);

        // Check if there's a rule for this day
        if (dayRule) {
          // Check for exceptions (days off)
          const exception = exceptions.find(e =>
            startOfDay(e.date).getTime() === startOfDay(currentDate).getTime()
          );

          if (!exception?.isOff) {
            // Check if there's at least one available slot
            // Create slots in Bangkok timezone
            const dateStr = currentDate.toISOString().split('T')[0];
            let slotStart = localTimeToUTC(dateStr, dayRule.startTime, DEFAULT_TIMEZONE);
            const dayEnd = localTimeToUTC(dateStr, dayRule.endTime, DEFAULT_TIMEZONE);

            let hasAvailableSlot = false;

            while (slotStart < dayEnd) {
              const slotEnd = addMinutesToUTC(slotStart, slotDuration);
              if (slotEnd > dayEnd) break;

              const isBooked = existingAppointments.some(apt => {
                const aptStart = new Date(apt.startAt);
                const aptEnd = new Date(apt.endAt);
                return (slotStart >= aptStart && slotStart < aptEnd) ||
                       (slotEnd > aptStart && slotEnd <= aptEnd);
              });

              const isPast = slotStart <= now;

              if (!isBooked && !isPast) {
                hasAvailableSlot = true;
                break;
              }

              slotStart = addMinutesToUTC(slotStart, slotDuration + 10);
            }

            if (hasAvailableSlot) {
              availableDays.push(currentDate.toISOString().split('T')[0]);
            }
          }
        }

        currentDate = addDays(currentDate, 1);
      }

      res.json({ days: availableDays });
    } catch (error) {
      console.error("Error fetching available days:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get available time slots for a specific date
  app.get("/api/psychologists/:id/slots", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { date } = req.query; // Expected format: "YYYY-MM-DD"

      console.log(`[Slots API] Request for psychologist ${id}, date: ${date}`);

      const psychologist = await storage.getPsychologistProfile(id);

      if (!psychologist) {
        console.log(`[Slots API] Psychologist not found: ${id}`);
        return res.status(404).json({ message: "Psychologist not found" });
      }

      console.log(`[Slots API] Psychologist found:`, {
        id: psychologist.id,
        verified: psychologist.verified,
        status: psychologist.status,
        verificationStatus: psychologist.verificationStatus,
      });

      // Only allow access to approved psychologists
      if (!psychologist.verified || psychologist.verificationStatus !== "approved" || psychologist.status !== "active" || psychologist.deletedAt) {
        console.log(`[Slots API] Psychologist not approved or active`);
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const rules = await storage.getAvailabilityRules(id);

      console.log(`[Slots API] Found ${rules.length} availability rules:`, rules);

      if (rules.length === 0) {
        console.log(`[Slots API] No availability rules found, returning empty slots`);
        // Return format based on whether date param is provided
        return res.json(date ? { slots: [] } : []);
      }

      const now = new Date();

      // If date param is provided, get slots for that specific date
      if (date && typeof date === 'string') {
        // Parse date in Bangkok timezone (date is in YYYY-MM-DD format from client)
        // Client sends date in Bangkok timezone, we need to work with it in Bangkok time
        const targetDate = localTimeToUTC(date, "00:00", DEFAULT_TIMEZONE);
        const targetDateStart = startOfDay(targetDate);

        // Check if date is in the past (compare in UTC)
        if (isBefore(targetDateStart, startOfDay(now))) {
          return res.json({ slots: [] });
        }

        const dayOfWeek = targetDateStart.getDay() === 0 ? 7 : targetDateStart.getDay();
        const dayRule = rules.find(r => r.dayOfWeek === dayOfWeek && r.isActive);

        if (!dayRule) {
          return res.json({ slots: [] });
        }

        // Check for exceptions
        const exception = await storage.getAvailabilityException(id, targetDateStart);
        if (exception?.isOff) {
          return res.json({ slots: [] });
        }

        // Get existing appointments for this date (in UTC)
        const dayEnd = endOfDay(targetDateStart);
        const existingAppointments = await db.select().from(appointments)
          .where(and(
            eq(appointments.psychologistId, id),
            gte(appointments.startAt, targetDateStart),
            lte(appointments.startAt, dayEnd),
            or(
              eq(appointments.status, "reserved"),
              eq(appointments.status, "confirmed"),
              eq(appointments.status, "payment_pending")
            )
          ));

        // Generate time slots for this specific date
        // Start and end times are in Bangkok timezone (09:00, 17:00, etc.)
        // We need to convert them to UTC for storage and comparison
        const timeSlots: string[] = [];
        const slotDuration = psychologist.sessionDuration || 50;
        const [startHour, startMin] = dayRule.startTime.split(":").map(Number);
        const [endHour, endMin] = dayRule.endTime.split(":").map(Number);

        // Create slot times in Bangkok timezone, then convert to UTC
        let slotStart = localTimeToUTC(date, dayRule.startTime, DEFAULT_TIMEZONE);
        const slotEnd = localTimeToUTC(date, dayRule.endTime, DEFAULT_TIMEZONE);

        while (slotStart < slotEnd) {
          const currentSlotEnd = addMinutesToUTC(slotStart, slotDuration);
          if (currentSlotEnd > slotEnd) break;

          const isBooked = existingAppointments.some(apt => {
            const aptStart = new Date(apt.startAt);
            const aptEnd = new Date(apt.endAt);
            return (slotStart >= aptStart && slotStart < aptEnd) ||
                   (currentSlotEnd > aptStart && currentSlotEnd <= aptEnd);
          });

          const isPast = slotStart <= now;

          if (!isBooked && !isPast) {
            // Convert UTC time back to Bangkok timezone for display
            // slotStart is in UTC, we need to show it as Bangkok time (HH:MM)
            const bangkokTime = new Date(slotStart.getTime() + 7 * 60 * 60 * 1000);
            const hours = bangkokTime.getUTCHours().toString().padStart(2, '0');
            const minutes = bangkokTime.getUTCMinutes().toString().padStart(2, '0');
            timeSlots.push(`${hours}:${minutes}`);
          }

          slotStart = addMinutesToUTC(slotStart, slotDuration + 10);
        }

        return res.json({ slots: timeSlots });
      }

      // Legacy behavior: return all slots for 28 days with ISO timestamps
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 28);

      console.log(`[Slots API] Generating slots from ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

      const exceptions = await storage.getAvailabilityExceptions(id, weekStart, weekEnd);

      const existingAppointments = await db.select().from(appointments)
        .where(and(
          eq(appointments.psychologistId, id),
          gte(appointments.startAt, now),
          lte(appointments.startAt, weekEnd),
          or(
            eq(appointments.status, "reserved"),
            eq(appointments.status, "confirmed"),
            eq(appointments.status, "payment_pending")
          )
        ));

      console.log(`[Slots API] Found ${existingAppointments.length} existing appointments`);

      const slots = [];
      const slotDuration = psychologist.sessionDuration || 50;

      for (let day = 0; day < 28; day++) {
        const currentDate = addDays(weekStart, day);
        if (isBefore(currentDate, startOfDay(now))) continue;

        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
        const dayRule = rules.find(r => r.dayOfWeek === dayOfWeek && r.isActive);

        if (!dayRule) {
          console.log(`[Slots API] No active rule for day ${dayOfWeek} (${format(currentDate, "yyyy-MM-dd")})`);
          continue;
        }

        const exception = exceptions.find(e =>
          startOfDay(e.date).getTime() === startOfDay(currentDate).getTime()
        );

        if (exception?.isOff) continue;

        const [startHour, startMin] = dayRule.startTime.split(":").map(Number);
        const [endHour, endMin] = dayRule.endTime.split(":").map(Number);

        let slotStart = new Date(currentDate);
        slotStart.setHours(startHour, startMin, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        while (slotStart < dayEnd) {
          const slotEnd = addMinutes(slotStart, slotDuration);
          if (slotEnd > dayEnd) break;

          const isBooked = existingAppointments.some(apt => {
            const aptStart = new Date(apt.startAt);
            const aptEnd = new Date(apt.endAt);
            return (slotStart >= aptStart && slotStart < aptEnd) ||
                   (slotEnd > aptStart && slotEnd <= aptEnd);
          });

          const isPast = slotStart <= now;

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            isAvailable: !isBooked && !isPast,
          });

          slotStart = addMinutes(slotStart, slotDuration + 10);
        }
      }

      console.log(`[Slots API] Generated ${slots.length} total slots`);
      console.log(`[Slots API] Available slots: ${slots.filter(s => s.isAvailable).length}`);

      res.json(slots);
    } catch (error) {
      console.error("Error generating slots:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments/reserve", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Support both old format (startAt, endAt) and new format (date, time, durationMin)
      let { psychologistId, startAt, endAt, date, time, durationMin } = req.body;

      const psychologist = await storage.getPsychologistProfile(psychologistId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Strict verification check
      if (!psychologist.verified || psychologist.verificationStatus !== "approved" || psychologist.status !== "active") {
        return res.status(403).json({ message: "Psikolog henüz onaylanmamış veya aktif değil" });
      }

      let slotStart: Date;
      let slotEnd: Date;

      // If using new format (date + time), convert to Date objects
      // IMPORTANT: Convert local time (Bangkok timezone) to UTC for storage
      if (date && time) {
        // Get timezone from request or use default (Asia/Bangkok)
        const timezone = req.body.timezone || DEFAULT_TIMEZONE;
        // Convert local time to UTC - this is the key fix for timezone issues
        slotStart = localTimeToUTC(date, time, timezone);
        const duration = durationMin || psychologist.sessionDuration || 50;
        slotEnd = addMinutesToUTC(slotStart, duration);
      } else if (startAt && endAt) {
        // Legacy format - assume ISO strings are already in UTC
        slotStart = new Date(startAt);
        slotEnd = new Date(endAt);
      } else {
        return res.status(400).json({ message: "Either (date + time) or (startAt + endAt) must be provided" });
      }

      const reservedUntil = addMinutes(new Date(), 10);
      const secureMeetingRoom = generateSecureMeetingRoom(`${psychologistId}-${slotStart.getTime()}`);

      const appointment = await storage.reserveAppointmentAtomic({
        patientId: userId,
        psychologistId,
        startAt: slotStart,
        endAt: slotEnd,
        reservedUntil,
        meetingRoom: secureMeetingRoom,
      });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: appointment.id,
        action: "reserved",
        afterData: { psychologistId, startAt: slotStart.toISOString(), endAt: slotEnd.toISOString() },
      });

      res.json(appointment);
    } catch (error: any) {
      console.error("Error reserving appointment:", error);
      if (error.message?.includes("SLOT_CONFLICT")) {
        return res.status(409).json({
          message: "Bu slot başka bir kullanıcı tarafından rezerve edilmiş",
          code: "SLOT_CONFLICT"
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Request appointment (pending approval flow)
  app.post("/api/appointments/request", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { psychologistId, notes } = req.body;

      const psychologist = await storage.getPsychologistProfile(psychologistId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Strict verification check
      if (!psychologist.verified || psychologist.verificationStatus !== "approved" || psychologist.status !== "active") {
        return res.status(403).json({ message: "Psikolog henüz onaylanmamış veya aktif değil" });
      }

      // Create pending appointment without specific time
      const appointment = await storage.createAppointment({
        patientId: userId,
        psychologistId,
        startAt: new Date(), // Placeholder, will be set by psychologist
        endAt: new Date(),   // Placeholder, will be set by psychologist
        status: "pending_approval",
        notes: notes || null,
      });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: appointment.id,
        action: "requested",
        afterData: { psychologistId, notes },
      });

      // Create notification for psychologist
      const patientProfile = await storage.getUserProfile(userId);
      await notificationService.createNotification({
        userId: psychologist.userId,
        type: "booking_received",
        title: "Yeni Randevu Talebi",
        message: `${patientProfile?.profession || "Bir danışan"} sizden randevu talep etti`,
        actionUrl: `/psychologist/appointments`,
        relatedAppointmentId: appointment.id,
        metadata: {
          patientId: userId,
          appointmentId: appointment.id,
        },
      });

      res.json(appointment);
    } catch (error: any) {
      console.error("Error requesting appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approve appointment request (psychologist only)
  app.post("/api/appointments/:id/approve", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const { startAt, endAt } = req.body;

      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.status !== "pending_approval") {
        return res.status(400).json({ message: "Appointment is not pending approval" });
      }

      // Verify psychologist owns this appointment
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist || psychologist.id !== appointment.psychologistId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!startAt || !endAt) {
        return res.status(400).json({ message: "Start and end time required" });
      }

      const slotStart = new Date(startAt);
      const slotEnd = new Date(endAt);
      const secureMeetingRoom = generateSecureMeetingRoom(`${appointment.psychologistId}-${slotStart.getTime()}`);

      const updated = await storage.updateAppointment(id, {
        startAt: slotStart,
        endAt: slotEnd,
        status: "payment_pending",
        meetingRoom: secureMeetingRoom,
      });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: id,
        action: "approved",
        afterData: { startAt, endAt },
      });

      // Create notification for patient
      await notificationService.createNotification({
        userId: appointment.patientId,
        type: "booking_confirmed",
        title: "Randevunuz Onaylandı",
        message: `${psychologist.fullName} randevunuzu onayladı. Ödeme yapabilirsiniz.`,
        actionUrl: `/dashboard/appointments`,
        relatedAppointmentId: id,
        metadata: {
          psychologistId: psychologist.id,
          appointmentId: id,
          startAt: slotStart.toISOString(),
        },
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error approving appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reject appointment request (psychologist only)
  app.post("/api/appointments/:id/reject", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.status !== "pending_approval") {
        return res.status(400).json({ message: "Appointment is not pending approval" });
      }

      // Verify psychologist owns this appointment
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist || psychologist.id !== appointment.psychologistId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updated = await storage.updateAppointment(id, {
        status: "rejected",
        cancelReason: reason || null,
        cancelledBy: userId,
      });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: id,
        action: "rejected",
        afterData: { reason },
      });

      // Send cancellation email to patient (psychologist rejected the appointment)
      (async () => {
        try {
          const { format } = await import('date-fns');

          // Get patient info
          const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId)).limit(1);
          const [patientProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, appointment.patientId)).limit(1);
          let patientLang = 'en';
          if (patientProfile?.languageId) {
            const [lang] = await db.select().from(languages).where(eq(languages.id, patientProfile.languageId)).limit(1);
            patientLang = lang?.code || 'en';
          }

          const appointmentDate = format(new Date(appointment.startAt), 'PPP');
          const appointmentTime = format(new Date(appointment.startAt), 'p');

          // Send email to patient
          if (patient?.email) {
            await sendAppointmentCancelledEmail({
              appointmentId: id,
              patientEmail: patient.email,
              patientName: patient.firstName,
              psychologistName: psychologist.fullName,
              appointmentDate: new Date(appointment.startAt),
              language: patientLang as any
            });
            console.log(`[Email] Sent cancellation notification to patient ${patient.email} (psychologist rejected)`);
          }
        } catch (emailError) {
          console.error('[Email] Failed to send cancellation email:', emailError);
        }
      })();

      res.json(updated);
    } catch (error: any) {
      console.error("Error rejecting appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * DEPRECATED: Bank transfer submission endpoint
   *
   * This endpoint redirects to the new PromptPay flow.
   * Manual bank transfers with admin approval are no longer supported.
   */
  /**
   * Bank transfer submission endpoint
   * User submits bank transfer notification after making payment
   */
  app.post("/api/appointments/bank-transfer/submit", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ message: "Randevu ID gereklidir" });
      }

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Randevu bulunamadı" });
      }

      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Bu randevuya erişim yetkiniz yok" });
      }

      if (appointment.status !== "reserved") {
        return res.status(400).json({ message: "Bu randevu havale ödemesi için uygun değil" });
      }

      const psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psikolog bulunamadı" });
      }

      // Check if bank transfer already exists
      const existingTransfer = await storage.getBankTransferByAppointment(appointmentId);
      if (existingTransfer) {
        return res.status(400).json({ message: "Bu randevu için zaten havale bildirimi yapılmış" });
      }

      // Generate reference code
      const referenceCode = `MW-${appointmentId.substring(0, 8).toUpperCase()}`;

      // Bank info (should be configurable in production)
      const bankInfo = {
        bankName: "İş Bankası",
        accountHolder: "KhunJit Teknoloji A.Ş.",
        iban: "TR33 0006 4000 0011 2345 6789 01",
      };

      // Create bank transfer record
      const bankTransfer = await storage.createBankTransfer({
        appointmentId,
        patientId: userId,
        psychologistId: appointment.psychologistId,
        referenceCode,
        bankName: bankInfo.bankName,
        accountHolder: bankInfo.accountHolder,
        iban: bankInfo.iban,
        amount: psychologist.pricePerSession,
        currency: "TRY",
        status: "pending_review",
        submittedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        adminNotes: null,
      });

      // Update appointment status to payment_review
      await storage.updateAppointment(appointmentId, {
        status: "payment_review",
      });

      // Create or get existing conversation between patient and psychologist
      let conversation = await storage.getConversationByParticipants(userId, appointment.psychologistId);
      if (!conversation) {
        conversation = await storage.createConversation({
          patientId: userId,
          psychologistId: appointment.psychologistId,
          lastMessageAt: new Date(),
        });
      }

      // Create audit log
      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "bank_transfer",
        entityId: bankTransfer.id,
        action: "submitted",
        afterData: { appointmentId, referenceCode },
      });

      res.json({
        success: true,
        message: "Havale bildirimi alındı",
        bankTransfer,
      });
    } catch (error: any) {
      console.error("Error submitting bank transfer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel appointment (patient only)
  app.post("/api/appointments/:id/cancel", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const appointmentId = req.params.id;
      if (!appointmentId) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Randevu bulunamadı" });
      }

      // Only patient can cancel their own appointments
      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Bu randevuyu iptal etme yetkiniz yok" });
      }

      // Can only cancel appointments that are in reserved or payment_review status
      if (!["reserved", "payment_review", "payment_page"].includes(appointment.status)) {
        return res.status(400).json({ message: "Bu randevu iptal edilemez" });
      }

      // Update appointment status to cancelled
      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        status: "cancelled",
      });

      // If there's a bank transfer, update its status to cancelled
      const bankTransfer = await storage.getBankTransferByAppointment(appointmentId);
      if (bankTransfer) {
        await storage.updateBankTransfer(bankTransfer.id, {
          status: "cancelled",
        });
      }

      // Create audit log
      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: appointmentId,
        action: "cancelled",
        beforeData: appointment,
        afterData: updatedAppointment,
      });

      // Send cancellation emails to both patient and psychologist
      (async () => {
        try {
          const { format } = await import('date-fns');

          // Get patient info
          const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId)).limit(1);
          const [patientProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, appointment.patientId)).limit(1);
          let patientLang = 'en';
          if (patientProfile?.languageId) {
            const [lang] = await db.select().from(languages).where(eq(languages.id, patientProfile.languageId)).limit(1);
            patientLang = lang?.code || 'en';
          }

          // Get psychologist info
          const [psychProfile] = await db.select().from(psychologistProfiles).where(eq(psychologistProfiles.id, appointment.psychologistId)).limit(1);
          if (!psychProfile) return;

          const [psychUser] = await db.select().from(users).where(eq(users.id, psychProfile.userId)).limit(1);
          const [psychUserProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, psychProfile.userId)).limit(1);
          let psychLang = 'en';
          if (psychUserProfile?.languageId) {
            const [lang] = await db.select().from(languages).where(eq(languages.id, psychUserProfile.languageId)).limit(1);
            psychLang = lang?.code || 'en';
          }

          const appointmentDate = format(new Date(appointment.startAt), 'PPP');
          const appointmentTime = format(new Date(appointment.startAt), 'p');

          // Send email to patient (confirmation)
          if (patient?.email) {
            await sendAppointmentCancelledEmail({
              appointmentId,
              patientEmail: patient.email,
              patientName: patient.firstName,
              psychologistName: psychProfile.fullName,
              appointmentDate: new Date(appointment.startAt),
              language: patientLang as any
            });
            console.log(`[Email] Sent cancellation confirmation to patient ${patient.email} (${patientLang})`);
          }

          // Send email to psychologist (notification)
          if (psychUser?.email) {
            await sendAppointmentCancelledEmail({
              appointmentId,
              psychologistEmail: psychUser.email,
              psychologistName: psychUser.firstName,
              patientName: `${patient?.firstName || 'Patient'}`,
              appointmentDate: new Date(appointment.startAt),
              language: psychLang as any
            });
            console.log(`[Email] Sent cancellation notification to psychologist ${psychUser.email} (${psychLang})`);
          }
        } catch (emailError) {
          console.error('[Email] Failed to send cancellation emails:', emailError);
        }
      })();

      res.json({
        success: true,
        message: "Randevu başarıyla iptal edildi",
        appointment: updatedAppointment,
      });
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending appointment requests (psychologist only)
  app.get("/api/appointments/pending", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(403).json({ message: "Not a psychologist" });
      }

      const allAppointments = await storage.getAppointmentsByPsychologist(psychologist.id);
      const pendingAppointments = allAppointments.filter(apt => apt.status === "pending_approval");

      // Enrich with patient info
      const enriched = await Promise.all(pendingAppointments.map(async (apt) => {
        const patient = await db.select().from(users).where(eq(users.id, apt.patientId)).limit(1);
        return {
          ...apt,
          patient: patient[0] ? {
            id: patient[0].id,
            firstName: patient[0].firstName,
            lastName: patient[0].lastName,
            email: patient[0].email
          } : null
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appointments/upcoming", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      const role = profile?.role || "patient";
      const now = new Date();

      let appointmentList;
      if (role === "psychologist") {
        const psychologist = await storage.getPsychologistByUserId(userId);
        if (psychologist) {
          appointmentList = await storage.getAppointmentsByPsychologist(psychologist.id);
        } else {
          appointmentList = [];
        }
      } else {
        appointmentList = await storage.getAppointmentsByPatient(userId);
      }

      const upcomingAppointments = appointmentList
        .filter(apt =>
          new Date(apt.startAt) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) &&
          ["confirmed", "ready", "payment_pending", "payment_review", "pending_approval"].includes(apt.status)
        )
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 5);

      const enriched = await Promise.all(upcomingAppointments.map(async (apt) => {
        const psychologist = await storage.getPsychologistProfile(apt.psychologistId);
        const patient = await storage.getUserProfile(apt.patientId);

        // Get patient name from users table
        let patientName = "Danışan";
        if (patient) {
          const [patientUser] = await db.select().from(users).where(eq(users.id, patient.userId)).limit(1);
          if (patientUser) {
            patientName = `${patientUser.firstName} ${patientUser.lastName}`;
          }
        }

        return { ...apt, psychologist, patient, patientName };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appointments", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      const role = profile?.role || "patient";

      let appointmentList;
      if (role === "psychologist") {
        const psychologist = await storage.getPsychologistByUserId(userId);
        if (psychologist) {
          appointmentList = await storage.getAppointmentsByPsychologist(psychologist.id);
        } else {
          appointmentList = [];
        }
      } else {
        appointmentList = await storage.getAppointmentsByPatient(userId);
      }

      const enriched = await Promise.all(appointmentList.map(async (apt) => {
        const psychologist = await storage.getPsychologistProfile(apt.psychologistId);
        const patient = await storage.getUserProfile(apt.patientId);

        // Get patient name from users table
        let patientName = "Danışan";
        if (patient) {
          const [patientUser] = await db.select().from(users).where(eq(users.id, patient.userId)).limit(1);
          if (patientUser) {
            patientName = `${patientUser.firstName} ${patientUser.lastName}`;
          }
        }

        // Get session note if it exists
        const sessionNote = await storage.getSessionNote(apt.id);

        return {
          ...apt,
          psychologist,
          patient: patient ? {
            id: patient.id,
            userId: patient.userId,
            role: patient.role,
            avatarUrl: patient.avatarUrl,
          } : null,
          patientName,
          sessionNote
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patient/stats", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get all patient appointments
      const appointments = await storage.getAppointmentsByPatient(userId);

      // Upcoming appointments (reserved, payment_review, confirmed, ready)
      const upcomingCount = appointments.filter(apt =>
        ["reserved", "payment_pending", "payment_review", "confirmed", "ready"].includes(apt.status)
      ).length;

      // Total sessions (completed)
      const totalSessions = appointments.filter(apt => apt.status === "completed").length;

      // Unread messages
      const conversations = await storage.getConversationsByUser(userId);
      let unreadMessages = 0;

      for (const conv of conversations) {
        const messages = await storage.getMessages(conv.id);
        unreadMessages += messages.filter(m =>
          m.senderUserId !== userId && !m.readAt
        ).length;
      }

      res.json({
        upcomingCount,
        totalSessions,
        unreadMessages
      });
    } catch (error) {
      console.error("Error fetching patient stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appointments/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const appointment = await storage.getAppointment(id);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologistProfile = await storage.getPsychologistByUserId(userId);
      const isPatient = appointment.patientId === userId;
      const isPsychologist = psychologistProfile && appointment.psychologistId === psychologistProfile.id;

      if (!isPatient && !isPsychologist) {
        return res.status(403).json({ message: "Access denied" });
      }

      const psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
      res.json({ ...appointment, psychologist });
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appointments/:id/session-info", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const appointment = await storage.getAppointment(id);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      const isPatient = appointment.patientId === userId;
      const isPsychologist = psychologist && appointment.psychologistId === psychologist.id;

      if (!isPatient && !isPsychologist) {
        return res.status(403).json({ message: "Access denied" });
      }

      const now = new Date();
      const startTime = new Date(appointment.startAt);
      const endTime = new Date(appointment.endAt);

      const blockedStatuses = ["cancelled", "refunded", "no_show", "expired"];
      if (blockedStatuses.includes(appointment.status)) {
        return res.json({
          canJoin: false,
          message: "Bu randevu iptal edilmiş veya geçersiz.",
          reason: "APPOINTMENT_BLOCKED",
          status: appointment.status,
          startsAt: appointment.startAt,
          endsAt: appointment.endAt,
        });
      }

      const validStatuses = ["confirmed", "ready", "in_session"];
      const isValidStatus = validStatuses.includes(appointment.status);
      const isWithinTimeWindow = isAfter(now, subMinutes(startTime, 10)) && isBefore(now, addMinutes(endTime, 15));

      const payment = await storage.getPaymentByAppointment(id);
      const isPaid = payment && payment.status === "paid";

      if (!isPaid) {
        return res.json({
          canJoin: false,
          message: "Ödeme bekleniyor. Seansa katılmak için önce ödeme yapmalısınız.",
          reason: "PAYMENT_REQUIRED",
          startsAt: appointment.startAt,
          endsAt: appointment.endAt,
        });
      }

      if (!isValidStatus) {
        return res.json({
          canJoin: false,
          message: "Seans durumu katılıma uygun değil.",
          reason: "INVALID_STATUS",
          startsAt: appointment.startAt,
          endsAt: appointment.endAt,
        });
      }

      if (!isWithinTimeWindow) {
        return res.json({
          canJoin: false,
          message: "Seans saatinden 10 dakika önce katılabilirsiniz.",
          reason: "NOT_IN_TIME_WINDOW",
          startsAt: appointment.startAt,
          endsAt: appointment.endAt,
        });
      }

      res.json({
        roomName: appointment.meetingRoom,
        joinCode: appointment.joinCode,
        canJoin: true,
        startsAt: appointment.startAt,
        endsAt: appointment.endAt,
      });
    } catch (error) {
      console.error("Error fetching session info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments/:id/join", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const appointment = await storage.getAppointment(id);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      const isPatient = appointment.patientId === userId;
      const isPsychologist = psychologist && appointment.psychologistId === psychologist.id;

      if (!isPatient && !isPsychologist) {
        return res.status(403).json({ message: "Access denied" });
      }

      const blockedStatuses = ["cancelled", "refunded", "no_show", "expired"];
      if (blockedStatuses.includes(appointment.status)) {
        return res.status(400).json({ message: "Bu randevu için seansa katılamazsınız" });
      }

      const payment = await storage.getPaymentByAppointment(id);
      if (!payment || payment.status !== "paid") {
        return res.status(400).json({ message: "Ödeme yapılmadan seansa katılamazsınız" });
      }

      const now = new Date();
      const startTime = new Date(appointment.startAt);
      const endTime = new Date(appointment.endAt);
      const isWithinTimeWindow = isAfter(now, subMinutes(startTime, 10)) && isBefore(now, addMinutes(endTime, 15));

      if (!isWithinTimeWindow) {
        return res.status(400).json({ message: "Seans zaman penceresi dışında" });
      }

      if (appointment.status === "confirmed") {
        await storage.updateAppointment(id, { status: "in_session" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error joining session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments/:id/leave", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const appointment = await storage.getAppointment(id);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      const isPatient = appointment.patientId === userId;
      const isPsychologist = psychologist && appointment.psychologistId === psychologist.id;

      if (!isPatient && !isPsychologist) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.updateAppointment(id, { status: "completed" });

      console.log(`[Session Complete] Appointment ${id} marked as completed`);

      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Complete appointment and create earning record (idempotent)
  app.post("/api/appointments/:id/complete", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const appointment = await storage.getAppointment(id);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Only psychologist or admin can complete
      const psychologist = await storage.getPsychologistByUserId(userId);
      const profile = await storage.getUserProfile(userId);
      const isPsychologist = psychologist && appointment.psychologistId === psychologist.id;
      const isAdmin = profile?.role === "admin";

      if (!isPsychologist && !isAdmin) {
        return res.status(403).json({ message: "Only psychologist or admin can complete appointments" });
      }

      // If already completed, return success (idempotent)
      if (appointment.status === "completed") {
        return res.json({ success: true, message: "Appointment already completed" });
      }

      // Check if appointment is in a completable state
      const completableStatuses = ["confirmed", "ready", "in_session"];
      if (!completableStatuses.includes(appointment.status)) {
        return res.status(400).json({
          message: `Cannot complete appointment with status: ${appointment.status}`
        });
      }

      // Get payment record to verify payment was made
      const payment = await storage.getPaymentByAppointment(id);
      if (!payment || (payment.status !== "completed" && payment.status !== "paid")) {
        return res.status(400).json({ message: "Payment not completed for this appointment" });
      }

      // Update appointment status to completed
      await storage.updateAppointment(id, { status: "completed" });

      console.log(`[Complete] Appointment ${id} marked as completed`);

      // Create earning record (idempotent - will not duplicate) - Legacy support
      const psychologistProfile = await storage.getPsychologistProfile(appointment.psychologistId);
      const earning = await storage.createEarningIfNotExists({
        psychologistId: appointment.psychologistId,
        appointmentId: id,
        paymentId: payment.id,
        amount: payment.providerPayout || "0",
        currency: payment.currency || "THB",
        status: "earned",
        sessionDate: appointment.startAt,
        patientId: appointment.patientId,
      });

      // Log the action
      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: id,
        action: "completed",
        afterData: {
          status: "completed",
          earningCreated: !!earning,
          earningId: earning?.id,
        },
      });

      // Send after-session email to patient (non-blocking)
      (async () => {
        try {
          const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId));
          if (patient?.email && psychologistProfile) {
            const appointmentDate = format(new Date(appointment.startAt), "d MMMM yyyy, EEEE", { locale: tr });
            const appointmentTime = format(new Date(appointment.startAt), "HH:mm");

            await emailService.sendAfterSession(
              appointment.patientId,
              id,
              patient.email,
              {
                firstName: patient.firstName || "Değerli Danışan",
                psychologistName: psychologistProfile.fullName,
                appointmentDate,
                appointmentTime,
              }
            );
          }
        } catch (err) {
          console.error("Failed to send after-session email:", err);
        }
      })();

      res.json({
        success: true,
        earning: earning ? {
          id: earning.id,
          amount: earning.amount,
          currency: earning.currency,
          status: earning.status,
        } : null
      });
    } catch (error) {
      console.error("Error completing appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Create Stripe Checkout Session for payment
   * POST /api/payments/checkout
   *
   * This is the primary payment flow:
   * 1. User books appointment -> status = reserved
   * 2. User clicks "Proceed to Payment" -> calls this endpoint
   * 3. Stripe Checkout Session is created with country-based tax breakdown
   * 4. User is redirected to Stripe Checkout
   * 5. After successful payment, Stripe webhook triggers booking confirmation
   */
  app.post("/api/payments/checkout", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user?.claims?.sub || req.session?.userId;

      if (!appointmentId) {
        return res.status(400).json({ message: "appointmentId is required" });
      }

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verify appointment belongs to user
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get platform URL for success/cancel redirects
      const platformUrl = process.env.PLATFORM_URL || process.env.BASE_URL || 'https://khunjit.com';
      const successUrl = `${platformUrl}/dashboard/booking-success`;
      const cancelUrl = `${platformUrl}/dashboard/payment/${appointmentId}`;

      // Create Stripe Checkout session
      const result = await paymentService.createCheckoutSession(
        appointmentId,
        successUrl,
        cancelUrl
      );

      if (!result.success) {
        console.error("[Stripe Checkout] Failed to create session:", result.error);
        return res.status(400).json({ message: result.error || "Failed to create checkout session" });
      }

      console.log(`[Stripe Checkout] Session created for appointment ${appointmentId}: ${result.sessionId}`);

      return res.json({
        success: true,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        paymentId: result.paymentId,
        breakdown: result.breakdown,
      });
    } catch (error) {
      console.error("[Stripe Checkout] Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Create Stripe Payment Intent for embedded Payment Element
   * POST /api/payments/create-intent
   *
   * This endpoint creates a Payment Intent for Stripe Payment Element integration.
   * The client uses the returned clientSecret to display card fields directly in the UI.
   *
   * Flow:
   * 1. Client calls this endpoint with appointmentId
   * 2. Server creates Payment Intent and returns clientSecret
   * 3. Client uses Stripe.js to display Payment Element with clientSecret
   * 4. User enters card details and submits
   * 5. Stripe processes payment and sends webhook (payment_intent.succeeded)
   * 6. Server confirms appointment via webhook handler
   */
  app.post("/api/payments/create-intent", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user?.claims?.sub || req.session?.userId;

      if (!appointmentId) {
        return res.status(400).json({ message: "appointmentId is required" });
      }

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verify appointment belongs to user
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create Payment Intent
      const result = await paymentService.createPaymentIntent(appointmentId);

      if (!result.success) {
        console.error("[Stripe PaymentIntent] Failed to create:", result.error);
        return res.status(400).json({ message: result.error || "Failed to create payment intent" });
      }

      console.log(`[Stripe PaymentIntent] Created for appointment ${appointmentId}: ${result.paymentIntentId}`);

      return res.json({
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        paymentId: result.paymentId,
        breakdown: result.breakdown,
      });
    } catch (error) {
      console.error("[Stripe PaymentIntent] Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get payment status
   * GET /api/payments/:paymentId/status
   *
   * Returns the current status of a payment and its associated payment intent
   */
  app.get("/api/payments/:paymentId/intent-status", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.claims?.sub || req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const result = await paymentService.getStripePaymentStatus(paymentId);

      if (!result.success) {
        return res.status(404).json({ message: result.error || "Payment not found" });
      }

      // Verify user has access to this payment
      const appointment = result.appointmentId
        ? await storage.getAppointment(result.appointmentId)
        : null;

      if (appointment && appointment.patientId !== userId && appointment.psychologistId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      return res.json({
        success: true,
        status: result.status,
        paymentIntentStatus: result.paymentIntentStatus,
        appointmentId: result.appointmentId,
      });
    } catch (error) {
      console.error("[Stripe Payment Status] Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Confirm payment after frontend success
   * POST /api/payments/confirm
   *
   * This endpoint is called by the frontend after Stripe confirms the payment.
   * It verifies the payment with Stripe and updates the appointment status.
   * This is useful when webhooks aren't available (e.g., local development).
   */
  app.post("/api/payments/confirm", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { paymentIntentId, appointmentId } = req.body;
      const userId = req.user?.claims?.sub || req.session?.userId;

      if (!paymentIntentId || !appointmentId) {
        return res.status(400).json({ message: "paymentIntentId and appointmentId are required" });
      }

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verify appointment belongs to user
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Already confirmed? Return success
      if (appointment.status === "confirmed" || appointment.status === "completed") {
        return res.json({ success: true, message: "Appointment already confirmed" });
      }

      // Import stripe from payment service
      const { stripe } = await import("./payments/stripe-checkout");

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Verify payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({
          message: `Payment not successful. Status: ${paymentIntent.status}`,
        });
      }

      // Verify the payment intent is for this appointment
      if (paymentIntent.metadata?.appointmentId !== appointmentId) {
        return res.status(400).json({ message: "Payment intent does not match appointment" });
      }

      // Call the same handler as the webhook
      const result = await paymentService.handlePaymentIntentSucceeded(paymentIntent);

      if (!result.success) {
        console.error("[Confirm Payment] Failed:", result.error);
        return res.status(500).json({ message: result.error || "Failed to confirm payment" });
      }

      console.log(`[Confirm Payment] ✓ Appointment ${appointmentId} confirmed via frontend callback`);

      return res.json({
        success: true,
        message: "Payment confirmed successfully",
        appointmentId,
      });
    } catch (error) {
      console.error("[Confirm Payment] Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Sync payment status from Stripe
   * POST /api/payments/sync
   *
   * This endpoint checks the actual payment status from Stripe and updates the database.
   * Use this when webhooks fail or frontend confirm doesn't work.
   */
  app.post("/api/payments/sync", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user?.claims?.sub || req.session?.userId;

      if (!appointmentId) {
        return res.status(400).json({ message: "appointmentId is required" });
      }

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get appointment
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Verify user owns this appointment
      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Already confirmed? Return success
      if (appointment.status === "confirmed" || appointment.status === "completed") {
        return res.json({ success: true, status: "confirmed", message: "Already confirmed" });
      }

      // Find payment for this appointment
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.appointmentId, appointmentId))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      if (!payment) {
        return res.json({ success: false, status: "no_payment", message: "No payment found" });
      }

      // Already paid? Update appointment
      if (payment.status === "paid") {
        // Update appointment if needed
        if (appointment.status !== "confirmed") {
          await db
            .update(appointments)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(eq(appointments.id, appointmentId));
        }
        return res.json({ success: true, status: "confirmed", message: "Payment confirmed" });
      }

      // Check Stripe if we have a payment intent
      if (payment.stripePaymentIntentId) {
        const { stripe } = await import("./payments/stripe-checkout");

        if (stripe) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
            console.log(`[Payment Sync] Stripe status for ${payment.stripePaymentIntentId}: ${paymentIntent.status}`);

            if (paymentIntent.status === "succeeded") {
              // Update via the handler to ensure all side effects (ledger, etc.)
              const result = await paymentService.handlePaymentIntentSucceeded(paymentIntent);

              if (result.success) {
                console.log(`[Payment Sync] ✓ Appointment ${appointmentId} confirmed via sync`);
                return res.json({ success: true, status: "confirmed", message: "Payment synced and confirmed" });
              } else {
                console.error(`[Payment Sync] Handler failed:`, result.error);
                return res.json({ success: false, status: "sync_error", message: result.error });
              }
            } else {
              return res.json({
                success: false,
                status: paymentIntent.status,
                message: `Stripe payment status: ${paymentIntent.status}`
              });
            }
          } catch (stripeError) {
            console.error("[Payment Sync] Stripe error:", stripeError);
            return res.json({ success: false, status: "stripe_error", message: "Could not verify with Stripe" });
          }
        }
      }

      return res.json({ success: false, status: payment.status, message: "Payment not yet completed" });
    } catch (error) {
      console.error("[Payment Sync] Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/payments/patient/history", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get completed payments
      const payments = await storage.getPaymentsByPatient(userId);

      const enrichedPayments = await Promise.all(payments.map(async (payment) => {
        const appointment = await storage.getAppointment(payment.appointmentId);
        const psychologist = appointment ? await storage.getPsychologistProfile(appointment.psychologistId) : null;
        const refunds = await storage.getRefundsByPayment(payment.id);
        const refund = refunds[0];

        return {
          id: payment.id,
          appointmentId: payment.appointmentId,
          psychologistName: psychologist?.fullName || "Bilinmiyor",
          sessionDate: appointment?.startAt,
          grossAmount: payment.grossAmount,
          vatRate: payment.vatRate,
          vatAmount: payment.vatAmount,
          netOfVat: payment.netOfVat,
          platformFee: payment.platformFee,
          platformFeeRate: payment.platformFeeRate,
          status: payment.status,
          paidAt: payment.paidAt,
          refund: refund ? {
            id: refund.id,
            status: refund.status,
            amount: refund.amount,
            percentage: refund.refundPercentage,
            type: refund.type,
            reason: refund.reason,
            processedAt: refund.processedAt,
          } : null,
          currency: payment.currency,
          appointmentStatus: appointment?.status,
        };
      }));

      // Get pending appointments (reserved, payment_pending, payment_review)
      const allAppointments = await storage.getAppointmentsByPatient(userId);
      console.log("🔍 All appointments for patient:", userId, "Count:", allAppointments.length);
      console.log("🔍 Appointment statuses:", allAppointments.map(a => ({ id: a.id, status: a.status })));

      const pendingAppointments = allAppointments.filter(apt =>
        ["reserved", "payment_pending", "payment_review"].includes(apt.status)
      );
      console.log("🔍 Pending appointments count:", pendingAppointments.length);

      const pendingItems = await Promise.all(pendingAppointments.map(async (appointment) => {
        const psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
        const bankTransfer = await storage.getBankTransferByAppointment(appointment.id);

        // Calculate amounts based on psychologist's session price
        const grossAmount = psychologist?.pricePerSession || "0";
        const vatRate = "20"; // Standard VAT rate in Turkey
        const netOfVat = (Number(grossAmount) / 1.2).toFixed(2);
        const vatAmount = (Number(grossAmount) - Number(netOfVat)).toFixed(2);
        const platformFeeRate = "30"; // Standard platform fee
        const platformFee = (Number(netOfVat) * 0.30).toFixed(2);

        return {
          id: appointment.id,
          appointmentId: appointment.id,
          psychologistName: psychologist?.fullName || "Bilinmiyor",
          sessionDate: appointment.startAt,
          grossAmount,
          vatRate,
          vatAmount,
          netOfVat,
          platformFee,
          platformFeeRate,
          status: appointment.status === "reserved" ? "reserved" :
                  appointment.status === "payment_pending" ? "payment_pending" : "payment_review",
          paidAt: null,
          refund: null,
          currency: "TRY",
          appointmentStatus: appointment.status,
          bankTransferStatus: bankTransfer?.status,
          reservedUntil: appointment.reservedUntil,
        };
      }));

      // Combine and sort by date (newest first)
      const allItems = [...enrichedPayments, ...pendingItems].sort((a, b) => {
        const dateA = new Date(a.sessionDate || 0).getTime();
        const dateB = new Date(b.sessionDate || 0).getTime();
        return dateB - dateA;
      });

      console.log("✅ Sending payment history items:", allItems.length);
      console.log("✅ Items:", allItems.map(i => ({
        psychologist: i.psychologistName,
        amount: i.grossAmount,
        status: i.appointmentStatus || i.status
      })));

      res.json(allItems);
    } catch (error) {
      console.error("Error fetching patient payment history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/payments/psychologist/history", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(403).json({ message: "Not a psychologist" });
      }

      const payments = await storage.getPaymentsByPsychologist(psychologist.id);
      
      let totalEarnings = 0;
      let pendingPayouts = 0;
      let completedPayouts = 0;

      const enrichedPayments = await Promise.all(payments.map(async (payment) => {
        const appointment = await storage.getAppointment(payment.appointmentId);
        const patientProfile = appointment ? await storage.getUserProfile(appointment.patientId) : null;
        const refunds = await storage.getRefundsByPayment(payment.id);
        const refund = refunds[0];
        
        const payout = Number(payment.providerPayout) || 0;
        
        if (payment.status === "paid" && !refund) {
          totalEarnings += payout;
          completedPayouts += payout;
        } else if (payment.status === "pending") {
          pendingPayouts += payout;
        }
        
        return {
          id: payment.id,
          appointmentId: payment.appointmentId,
          sessionDate: appointment?.startAt,
          sessionStatus: appointment?.status,
          grossAmount: payment.grossAmount,
          vatAmount: payment.vatAmount,
          platformFee: payment.platformFee,
          platformFeeRate: payment.platformFeeRate,
          providerPayout: payment.providerPayout,
          status: payment.status,
          paidAt: payment.paidAt,
          refund: refund ? {
            id: refund.id,
            status: refund.status,
            amount: refund.amount,
            percentage: refund.refundPercentage,
          } : null,
          currency: payment.currency,
        };
      }));

      res.json({
        payments: enrichedPayments,
        summary: {
          totalEarnings: totalEarnings.toFixed(2),
          pendingPayouts: pendingPayouts.toFixed(2),
          completedPayouts: completedPayouts.toFixed(2),
          totalSessions: payments.filter(p => p.status === "paid").length,
          currency: "TRY",
        },
      });
    } catch (error) {
      console.error("Error fetching psychologist payment history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Removed duplicate /api/admin/payments endpoint - using the one at line 3146

  app.get("/api/session-notes/:appointmentId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { appointmentId } = req.params;
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist || psychologist.id !== appointment.psychologistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const note = await storage.getSessionNote(appointmentId);
      res.json(note || null);
    } catch (error) {
      console.error("Error fetching session note:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/session-notes", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { appointmentId, content, isPrivate } = req.body;
      
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist || psychologist.id !== appointment.psychologistId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const existingNote = await storage.getSessionNote(appointmentId);

      let note;
      if (existingNote) {
        // Update existing note instead of throwing error
        note = await storage.updateSessionNote(existingNote.id, {
          content,
          isPrivate: isPrivate ?? true,
        });

        await storage.createAuditLog({
          actorUserId: userId,
          entityType: "session_note",
          entityId: existingNote.id,
          action: "updated",
          afterData: { appointmentId, content },
        });
      } else {
        // Create new note
        note = await storage.createSessionNote({
          appointmentId,
          psychologistId: psychologist.id,
          content,
          isPrivate: isPrivate ?? true,
        });

        await storage.createAuditLog({
          actorUserId: userId,
          entityType: "session_note",
          entityId: note.id,
          action: "created",
          afterData: { appointmentId },
        });
      }

      res.json(note);
    } catch (error: any) {
      console.error("Error creating session note:", error);
      // Check if it's a database constraint error
      if (error.code === '23505') { // PostgreSQL unique violation error code
        return res.status(400).json({ message: "Bu seans için zaten bir not mevcut" });
      }
      res.status(500).json({
        message: error.message || "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      });
    }
  });

  app.patch("/api/session-notes/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const { content, isPrivate } = req.body;

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(403).json({ message: "Not a psychologist" });
      }

      const existingNote = await storage.getSessionNoteById(id);
      if (!existingNote) {
        return res.status(404).json({ message: "Note not found" });
      }

      if (existingNote.psychologistId !== psychologist.id) {
        return res.status(403).json({ message: "Access denied - not your note" });
      }

      const updatedNote = await storage.updateSessionNote(id, {
        content,
        isPrivate,
      });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "session_note",
        entityId: id,
        action: "updated",
        afterData: { content: content?.substring(0, 100) },
      });

      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating session note:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      const conversations = await storage.getConversationsByUser(
        profile?.role === "psychologist" 
          ? (await storage.getPsychologistByUserId(userId))?.id || userId 
          : userId
      );

      const enriched = await Promise.all(conversations.map(async (conv) => {
        // Check if this is a system conversation
        const isSystemConversation = conv.patientId === 'system' || conv.psychologistId === 'system';

        let psychologist = null;
        let patientName = "Danışan";
        let patientAvatar = null;

        if (isSystemConversation) {
          // System conversation - show as "KhunJit" or "Sistem"
          if (profile?.role === "psychologist") {
            // Psychologist sees system as patient
            patientName = "KhunJit";
            patientAvatar = null;
          } else {
            // Patient sees system as psychologist
            psychologist = {
              fullName: "KhunJit",
              title: "Sistem Bildirimi",
              profileImageUrl: null
            };
          }
        } else {
          // Regular conversation
          psychologist = await storage.getPsychologistProfile(conv.psychologistId);

          // Get patient info for psychologist view
          if (profile?.role === "psychologist") {
            const patientProfile = await storage.getUserProfile(conv.patientId);
            if (patientProfile) {
              const [patientUser] = await db.select().from(users).where(eq(users.id, patientProfile.userId)).limit(1);
              if (patientUser) {
                patientName = `${patientUser.firstName} ${patientUser.lastName}`;
              }
              patientAvatar = patientProfile.avatarUrl;
            }
          }
        }

        const messages = await storage.getMessages(conv.id);
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m =>
          m.senderUserId !== userId && !m.readAt
        ).length;

        return {
          ...conv,
          psychologist,
          patientName,
          patientAvatar,
          lastMessage,
          unreadCount
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/conversations/find-or-create", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { psychologistId } = req.body;
      if (!psychologistId) {
        return res.status(400).json({ message: "Psychologist ID is required" });
      }

      const profile = await storage.getUserProfile(userId);

      // Determine patient and psychologist IDs based on user role
      let patientId: string;
      let finalPsychologistId: string;

      if (profile?.role === "psychologist") {
        // Psychologist is initiating conversation with a patient
        const psychologistProfile = await storage.getPsychologistByUserId(userId);
        if (!psychologistProfile) {
          return res.status(404).json({ message: "Psychologist profile not found" });
        }
        finalPsychologistId = psychologistProfile.id;
        patientId = psychologistId; // In this case, psychologistId param is actually the patient ID
      } else {
        // Patient is initiating conversation with a psychologist
        patientId = userId;
        finalPsychologistId = psychologistId;
      }

      // Try to find existing conversation
      let conversation = await storage.getConversationByParticipants(patientId, finalPsychologistId);

      // Create new conversation if it doesn't exist
      if (!conversation) {
        conversation = await storage.createConversation({
          patientId,
          psychologistId: finalPsychologistId,
          lastMessageAt: new Date(),
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error finding or creating conversation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const conversation = await storage.getConversation(id);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      const isPatient = conversation.patientId === userId;
      const isPsychologist = psychologist && conversation.psychologistId === psychologist.id;

      if (!isPatient && !isPsychologist) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getMessages(id);

      await storage.markMessagesAsRead(id, userId);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      const isPatient = conversation.patientId === userId;
      const isPsychologist = psychologist && conversation.psychologistId === psychologist.id;

      if (!isPatient && !isPsychologist) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { text } = req.body;

      const message = await storage.createMessage({
        conversationId: id,
        senderUserId: userId,
        text,
      });

      await createAuditLog(
        userId,
        "message",
        message.id,
        "created",
        null,
        { conversationId: id, text: text.substring(0, 100) },
        req
      );

      // Create notification for recipient
      const recipientUserId = isPatient ? psychologist?.userId : conversation.patientId;
      if (recipientUserId) {
        const senderProfile = await storage.getUserProfile(userId);
        const senderName = senderProfile?.profession || "Kullanıcı";

        await notificationService.createNotification({
          userId: recipientUserId,
          type: "message_received",
          title: "Yeni Mesaj",
          message: `${senderName} size bir mesaj gönderdi`,
          actionUrl: `/dashboard/messages`,
          relatedConversationId: id,
          metadata: {
            conversationId: id,
            senderUserId: userId,
          },
        });
      }

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/availability/rules", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const rules = await storage.getAvailabilityRules(psychologist.id);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching availability rules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/availability/rules", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const { rules, slotDuration } = req.body;

      const formattedRules = rules.map((r: any) => ({
        psychologistId: psychologist.id,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        slotDurationMin: slotDuration || 50,
      }));

      const created = await storage.setAvailabilityRules(psychologist.id, formattedRules);

      if (slotDuration) {
        await storage.updatePsychologistProfile(psychologist.id, { sessionDuration: slotDuration });
      }

      await createAuditLog(
        userId,
        "availability_rules",
        psychologist.id,
        "updated",
        null,
        { rulesCount: formattedRules.length, slotDuration },
        req
      );

      res.json(created);
    } catch (error) {
      console.error("Error setting availability rules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Availability Slots (Exceptions) - for specific date/time overrides
  app.get("/api/availability/slots", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const { startDate, endDate } = req.query;
      const exceptions = await storage.getAvailabilityExceptions(
        psychologist.id,
        startDate as string,
        endDate as string
      );
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching availability slots:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/availability/slots", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const { date, customSlots, isOff, reason } = req.body;

      const exception = await storage.createAvailabilityException({
        psychologistId: psychologist.id,
        date: new Date(date),
        customSlots,
        isOff: isOff || false,
        reason,
      });

      await createAuditLog(
        userId,
        "availability_exception",
        exception.id,
        "created",
        null,
        { date, customSlots },
        req
      );

      res.json(exception);
    } catch (error) {
      console.error("Error creating availability slot:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/availability/slots/:id", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const { id } = req.params;
      await storage.deleteAvailabilityException(id, psychologist.id);

      await createAuditLog(
        userId,
        "availability_exception",
        id,
        "deleted",
        null,
        null,
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting availability slot:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Configure multer for profile image uploads
  const uploadDir = path.join(process.cwd(), "uploads", "profiles");

  // Ensure upload directory exists
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
  }

  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Sadece JPG, PNG ve WEBP formatları desteklenir"));
      }
    }
  });

  // Profile image upload endpoint
  app.post("/api/upload/profile-image", isAuthenticated, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Dosya boyutu 5MB'dan büyük olamaz" });
          }
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message || "Dosya yüklenirken bir hata oluştu" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Dosya yüklenmedi" });
      }

      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      console.log("Image uploaded successfully:", imageUrl);
      res.json({ url: imageUrl });
    });
  });

  app.get("/api/psychologist/profile", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);

      // Add no-cache headers to ensure fresh data after admin approval
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json(psychologist || null);
    } catch (error) {
      console.error("Error fetching psychologist profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/psychologist/profile", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { specialties, therapyApproaches, profileImageUrl } = req.body;

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      // Remove duplicates from arrays before saving
      const cleanSpecialties = specialties !== undefined
        ? [...new Set(specialties)]
        : psychologist.specialties;
      const cleanTherapyApproaches = therapyApproaches !== undefined
        ? [...new Set(therapyApproaches)]
        : psychologist.therapyApproaches;

      // Update psychologist profile with new specialties and therapy approaches
      const [updatedProfile] = await db.update(psychologistProfiles)
        .set({
          specialties: cleanSpecialties,
          therapyApproaches: cleanTherapyApproaches,
          profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : psychologist.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(psychologistProfiles.userId, userId))
        .returning();

      await createAuditLog(
        userId,
        "psychologist_profile",
        psychologist.id,
        "updated_professional_info",
        { specialties: psychologist.specialties, therapyApproaches: psychologist.therapyApproaches },
        { specialties: cleanSpecialties, therapyApproaches: cleanTherapyApproaches, profileImageUrl },
        req
      );

      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating psychologist profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/psychologist/stats", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.json({ todaySessions: 0, weeklyEarnings: 0, totalPatients: 0, pendingAppointments: 0 });
      }

      const allAppointments = await storage.getAppointmentsByPsychologist(psychologist.id);
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      const todaySessions = allAppointments.filter(apt => {
        const startTime = new Date(apt.startAt);
        return startTime >= todayStart && startTime <= todayEnd && apt.status === "confirmed";
      }).length;

      const pendingAppointments = allAppointments.filter(apt =>
        apt.status === "pending_approval"
      ).length;

      const uniquePatients = new Set(allAppointments.map(apt => apt.patientId)).size;

      // Calculate weekly earnings - only completed sessions
      const weeklyCompletedAppointments = allAppointments.filter(apt => {
        const startTime = new Date(apt.startAt);
        return startTime >= weekStart && startTime <= weekEnd &&
               apt.status === "completed";
      });

      // Get payout ledger for accurate net earnings (after platform fee + tax)
      let weeklyEarningsGross = 0;
      let weeklyEarningsNet = 0;
      let totalPlatformFee = 0;
      let totalWithholdingTax = 0;
      let currency = psychologist.currency || 'USD';

      for (const apt of weeklyCompletedAppointments) {
        // Get payout ledger entry for accurate breakdown
        const [ledger] = await db.select()
          .from(payoutLedger)
          .where(eq(payoutLedger.appointmentId, apt.id))
          .limit(1);

        if (ledger) {
          weeklyEarningsGross += parseFloat(ledger.psychologistGross);
          weeklyEarningsNet += parseFloat(ledger.psychologistNet);
          totalPlatformFee += parseFloat(ledger.platformFee);
          totalWithholdingTax += parseFloat(ledger.withholdingAmount);
          currency = ledger.currency;
        } else {
          // Fallback to old payment data if no ledger
          const [payment] = await db.select()
            .from(payments)
            .where(and(
              eq(payments.appointmentId, apt.id),
              eq(payments.status, "paid")
            ))
            .limit(1);

          if (payment && payment.providerPayout) {
            weeklyEarningsNet += parseFloat(payment.providerPayout);
            weeklyEarningsGross += parseFloat(payment.providerPayout);
          }
        }
      }

      res.json({
        todaySessions,
        weeklyEarnings: weeklyEarningsNet, // Net amount after tax
        weeklyEarningsGross,
        weeklyEarningsNet,
        totalPlatformFee,
        totalWithholdingTax,
        currency,
        totalPatients: uniquePatients,
        pendingAppointments,
      });
    } catch (error) {
      console.error("Error fetching psychologist stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== PSYCHOLOGIST EARNINGS ==========

  app.get("/api/psychologist/earnings", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(403).json({ message: "Not a psychologist" });
      }

      // Get all payout ledger entries for this psychologist (with tax breakdown)
      const payoutEntries = await db
        .select()
        .from(payoutLedger)
        .where(eq(payoutLedger.psychologistId, psychologist.id))
        .orderBy(desc(payoutLedger.createdAt));

      // Enrich with appointment info
      const enrichedEarnings = await Promise.all(payoutEntries.map(async (ledger) => {
        const appointment = await storage.getAppointment(ledger.appointmentId);

        return {
          id: ledger.id,
          appointmentId: ledger.appointmentId,
          amount: ledger.psychologistNet, // NET amount after tax
          amountGross: ledger.psychologistGross, // GROSS before tax
          platformFee: ledger.platformFee,
          withholdingTax: ledger.withholdingAmount,
          withholdingRate: ledger.withholdingRate,
          currency: ledger.currency,
          countryCode: ledger.countryCode,
          status: ledger.payoutStatus === 'paid' ? 'earned' : ledger.payoutStatus === 'pending' ? 'pending_payout' : 'pending',
          sessionDate: appointment?.startAt,
          patientName: "Danışan",
          createdAt: ledger.createdAt,
          paidAt: ledger.transferredAt,
          stripeTransferId: ledger.stripeTransferId,
        };
      }));

      // Calculate summary from payout ledger (NET amounts after tax)
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });

      let totalEarnings = 0;
      let thisMonthEarnings = 0;
      let thisWeekEarnings = 0;
      let pendingPayout = 0;
      let paidOut = 0;
      let totalWithholdingTax = 0;
      let currency = psychologist.currency || 'USD';

      for (const earning of enrichedEarnings) {
        const amount = parseFloat(earning.amount || "0");
        const withholdingTax = parseFloat(earning.withholdingTax || "0");

        totalEarnings += amount;
        totalWithholdingTax += withholdingTax;

        if (earning.currency) {
          currency = earning.currency;
        }

        const sessionDate = earning.sessionDate ? new Date(earning.sessionDate) : null;
        if (sessionDate) {
          if (sessionDate >= thisMonthStart) {
            thisMonthEarnings += amount;
          }
          if (sessionDate >= thisWeekStart) {
            thisWeekEarnings += amount;
          }
        }

        if (earning.status === "earned" || earning.status === "pending_payout") {
          pendingPayout += amount;
        } else if (earning.status === "paid") {
          paidOut += amount;
        }
      }

      res.json({
        earnings: enrichedEarnings,
        summary: {
          totalEarnings: totalEarnings.toFixed(2),
          thisMonthEarnings: thisMonthEarnings.toFixed(2),
          thisWeekEarnings: thisWeekEarnings.toFixed(2),
          pendingPayout: pendingPayout.toFixed(2),
          paidOut: paidOut.toFixed(2),
          totalWithholdingTax: totalWithholdingTax.toFixed(2),
          totalSessions: enrichedEarnings.length,
          currency,
        },
      });
    } catch (error) {
      console.error("Error fetching psychologist earnings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patient/stats", isAuthenticated, requireRole("patient"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const allAppointments = await storage.getAppointmentsByPatient(userId);
      const now = new Date();

      const totalSessions = allAppointments.filter(apt => apt.status === "completed").length;
      const upcomingCount = allAppointments.filter(apt => 
        apt.status === "confirmed" && new Date(apt.startAt) > now
      ).length;

      res.json({
        totalSessions,
        upcomingCount,
        unreadMessages: 0,
      });
    } catch (error) {
      console.error("Error fetching patient stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [userCount] = await db.select({ count: count() }).from(users);
      const [psychologistCount] = await db.select({ count: count() }).from(psychologistProfiles).where(eq(psychologistProfiles.verified, true));
      const pendingPsychologists = await storage.getPendingPsychologists();
      
      const allPayments = await db.select().from(payments).where(eq(payments.status, "paid"));

      let totalGross = 0;
      let totalVat = 0;
      let totalPlatformFee = 0;
      let totalProviderPayout = 0;
      let refundedAmount = 0;

      for (const payment of allPayments) {
        // Calculate actual values from platformFee and providerPayout if available
        const platformFeeNum = parseFloat(payment.platformFee || "0");
        const providerPayoutNum = parseFloat(payment.providerPayout || "0");
        const grossAmountNum = parseFloat(payment.grossAmount || "0");

        // If grossAmount is 0 or missing, calculate from platform fee + provider payout
        const actualGross = grossAmountNum > 0 ? grossAmountNum : (platformFeeNum + providerPayoutNum);
        totalGross += actualGross;

        // If payment has calculated values, use them; otherwise calculate from gross
        if (payment.platformFee && payment.providerPayout) {
          if (payment.vatAmount) {
            totalVat += parseFloat(payment.vatAmount);
          }
          totalPlatformFee += platformFeeNum;
          totalProviderPayout += providerPayoutNum;
        } else {
          // Calculate using the standard breakdown
          const breakdown = calculatePaymentBreakdown(actualGross);
          totalVat += breakdown.vatAmount;
          totalPlatformFee += breakdown.platformFee;
          totalProviderPayout += breakdown.providerPayout;
        }
      }
      
      const refundedPayments = await db.select().from(payments).where(eq(payments.status, "refunded"));
      for (const refund of refundedPayments) {
        refundedAmount += parseFloat(refund.grossAmount || "0");
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAppointments = await db.select({ count: count() })
        .from(appointments)
        .where(and(
          gte(appointments.startAt, today),
          eq(appointments.status, "confirmed")
        ));
      
      res.json({
        totalUsers: userCount?.count || 0,
        totalPsychologists: psychologistCount?.count || 0,
        pendingVerifications: pendingPsychologists.length,
        todaySessions: todayAppointments[0]?.count || 0,
        monthlyRevenue: totalPlatformFee,
        reportedMessages: 0,
        financials: {
          totalGross,
          totalVat,
          totalPlatformFee,
          totalProviderPayout,
          refundedAmount,
        },
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/activity", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get recent audit logs
      const recentLogs = await db.select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(20);

      const getTimeAgo = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "az önce";
        if (diffMins < 60) return `${diffMins} dakika önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        return `${diffDays} gün önce`;
      };

      const activities = recentLogs.map((log) => {
        let message = "";
        let type = "info";

        if (log.entityType === "psychologist" && log.action === "verified") {
          message = `Psikolog doğrulandı: ${log.afterData?.firstName || "Bilinmeyen"}`;
          type = "success";
        } else if (log.entityType === "user" && log.action === "created") {
          message = `Yeni kullanıcı kaydı: ${log.afterData?.email || "Bilinmeyen"}`;
          type = "info";
        } else if (log.entityType === "bank_transfer" && log.action === "approved") {
          message = `Ödeme onaylandı`;
          type = "success";
        } else if (log.entityType === "bank_transfer" && log.action === "rejected") {
          message = `Ödeme reddedildi: ${log.afterData?.rejectionReason || "Bilinmeyen neden"}`;
          type = "warning";
        } else if (log.entityType === "appointment" && log.action === "cancelled") {
          message = `Randevu iptal edildi`;
          type = "warning";
        } else {
          message = `${log.entityType}: ${log.action}`;
        }

        return {
          type,
          message,
          time: getTimeAgo(log.createdAt),
          timestamp: log.createdAt,
        };
      });

      res.json(activities);
    } catch (error) {
      console.error("Error fetching admin activity:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get audit logs with filters and pagination
  app.get("/api/admin/audit", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entityType, action, page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

      // Apply filters
      const conditions = [];
      if (entityType) {
        conditions.push(eq(auditLogs.entityType, entityType as string));
      }
      if (action) {
        conditions.push(eq(auditLogs.action, action as string));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Get total count
      const countQuery = conditions.length > 0
        ? db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(and(...conditions))
        : db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);

      const [{ count: total }] = await countQuery;

      // Get paginated logs
      const logs = await query.limit(limitNum).offset(offset);

      // Enrich logs with user information
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        let actorName = "Sistema";
        if (log.actorUserId) {
          const [actor] = await db.select().from(users).where(eq(users.id, log.actorUserId)).limit(1);
          if (actor) {
            actorName = `${actor.firstName} ${actor.lastName}`;
          }
        }

        return {
          ...log,
          actorName,
        };
      }));

      res.json({
        logs: enrichedLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allUsers = await db.select().from(users);
      
      const enriched = await Promise.all(allUsers.map(async (user) => {
        const profile = await storage.getUserProfile(user.id);
        return { ...user, profile };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/users/:id/status", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;
      const { status } = req.body;

      const updated = await storage.updateUserProfile(id, { 
        status,
        deletedAt: status === "deleted" ? new Date() : null,
        deletedBy: status === "deleted" ? actorUserId : null,
      });

      await storage.createAuditLog({
        actorUserId,
        entityType: "user_profile",
        entityId: id,
        action: `status_changed_to_${status}`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/psychologists/pending", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pending = await storage.getPendingPsychologists();

      // Enrich with user information
      const enriched = await Promise.all(pending.map(async (psychologist) => {
        const [user] = await db.select().from(users).where(eq(users.id, psychologist.userId));
        const userProfile = await storage.getUserProfile(psychologist.userId);

        return {
          ...psychologist,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
          } : null,
          userProfile,
        };
      }));

      // Add no-cache headers to ensure fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending psychologists:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/psychologists/:id/approve", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;
      const { notes } = req.body;

      // Get psychologist to find userId
      const psychologist = await storage.getPsychologistProfile(id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Check if already approved
      if (psychologist.verified && psychologist.verificationStatus === "approved") {
        return res.status(400).json({ message: "Psychologist already approved" });
      }

      // Update psychologist profile
      console.log("[SERVER] Updating psychologist profile:", id, {
        verified: true,
        verificationStatus: "approved",
        status: "active",
      });

      const updated = await storage.updatePsychologistProfile(id, {
        verified: true,
        verificationStatus: "approved",
        verifiedAt: new Date(),
        verifiedBy: actorUserId,
        verificationNotes: notes || null,
        status: "active",
      });

      console.log("[SERVER] Update result:", updated ? "SUCCESS" : "FAILED");

      if (!updated) {
        console.error("[SERVER] CRITICAL: updatePsychologistProfile returned null/undefined!");
        return res.status(500).json({ message: "Failed to update psychologist profile" });
      }

      // Update user profile status
      const userUpdated = await storage.updateUserProfile(psychologist.userId, {
        status: "active",
      });

      if (!userUpdated) {
        return res.status(500).json({ message: "Failed to update user profile status" });
      }

      await storage.createAuditLog({
        actorUserId,
        entityType: "psychologist_profile",
        entityId: id,
        action: "approved",
        afterData: { notes, userId: psychologist.userId },
      });

      // CRITICAL: Fresh read from DB to verify the update actually happened
      const freshProfile = await storage.getPsychologistProfile(id);
      if (!freshProfile || !freshProfile.verified || freshProfile.verificationStatus !== "approved" || freshProfile.status !== "active") {
        console.error("CRITICAL: Approve DB update failed verification!", {
          id,
          expectedVerified: true,
          actualVerified: freshProfile?.verified,
          expectedStatus: "approved",
          actualStatus: freshProfile?.verificationStatus,
          expectedProfileStatus: "active",
          actualProfileStatus: freshProfile?.status
        });
        return res.status(500).json({
          message: "Database update verification failed",
          details: "Profile was not properly updated"
        });
      }

      // Send verification approved email
      try {
        const [userInfo] = await db
          .select({
            email: users.email,
            firstName: users.firstName,
            languageCode: languages.code,
          })
          .from(users)
          .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
          .leftJoin(languages, eq(languages.id, userProfiles.languageId))
          .where(eq(users.id, psychologist.userId));

        if (userInfo?.email) {
          const userLanguage = (userInfo.languageCode || 'en') as any;
          await sendVerificationApprovedEmail({
            psychologistEmail: userInfo.email,
            psychologistName: userInfo.firstName || psychologist.fullName,
            language: userLanguage
          });
          console.log(`[Email] Sent verification approved email to ${userInfo.email} (${userLanguage})`);
        }
      } catch (emailError) {
        console.error("[Email] Failed to send verification approved email:", emailError);
        // Don't fail the request if email fails
      }

      // Return proven verified state from DB
      res.json({
        ok: true,
        updatedProfile: {
          id: freshProfile.id,
          userId: freshProfile.userId,
          verified: freshProfile.verified,
          verificationStatus: freshProfile.verificationStatus,
          status: freshProfile.status,
          verifiedAt: freshProfile.verifiedAt,
        },
        updatedUserStatus: userUpdated.status,
      });
    } catch (error) {
      console.error("Error approving psychologist:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/psychologists/:id/reject", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;
      const { reason } = req.body;

      // Get psychologist to find userId
      const psychologist = await storage.getPsychologistProfile(id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Check if already rejected
      if (psychologist.verificationStatus === "rejected") {
        return res.status(400).json({ message: "Psychologist already rejected" });
      }

      // Update psychologist profile
      const updated = await storage.updatePsychologistProfile(id, {
        verified: false,
        verificationStatus: "rejected",
        rejectionReason: reason || "Admin tarafından reddedildi",
        status: "rejected",
      });

      if (!updated) {
        return res.status(500).json({ message: "Failed to update psychologist profile" });
      }

      // Update user profile status
      const userUpdated = await storage.updateUserProfile(psychologist.userId, {
        status: "blocked",
      });

      if (!userUpdated) {
        return res.status(500).json({ message: "Failed to update user profile status" });
      }

      await storage.createAuditLog({
        actorUserId,
        entityType: "psychologist_profile",
        entityId: id,
        action: "rejected",
        afterData: { reason, userId: psychologist.userId },
      });

      // CRITICAL: Fresh read from DB to verify the update actually happened
      const freshProfile = await storage.getPsychologistProfile(id);
      if (!freshProfile || freshProfile.verified !== false || freshProfile.verificationStatus !== "rejected" || freshProfile.status !== "rejected") {
        console.error("CRITICAL: Reject DB update failed verification!", {
          id,
          expectedVerified: false,
          actualVerified: freshProfile?.verified,
          expectedStatus: "rejected",
          actualStatus: freshProfile?.verificationStatus,
          expectedProfileStatus: "rejected",
          actualProfileStatus: freshProfile?.status
        });
        return res.status(500).json({
          message: "Database update verification failed",
          details: "Profile was not properly rejected"
        });
      }

      // Send verification rejected email
      try {
        const [userInfo] = await db
          .select({
            email: users.email,
            firstName: users.firstName,
            languageCode: languages.code,
          })
          .from(users)
          .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
          .leftJoin(languages, eq(languages.id, userProfiles.languageId))
          .where(eq(users.id, psychologist.userId));

        if (userInfo?.email) {
          const userLanguage = (userInfo.languageCode || 'en') as any;
          await sendVerificationRejectedEmail({
            psychologistEmail: userInfo.email,
            psychologistName: userInfo.firstName || psychologist.fullName,
            language: userLanguage
          });
          console.log(`[Email] Sent verification rejected email to ${userInfo.email} (${userLanguage})`);
        }
      } catch (emailError) {
        console.error("[Email] Failed to send verification rejected email:", emailError);
        // Don't fail the request if email fails
      }

      // Return proven rejected state from DB
      res.json({
        ok: true,
        updatedProfile: {
          id: freshProfile.id,
          userId: freshProfile.userId,
          verified: freshProfile.verified,
          verificationStatus: freshProfile.verificationStatus,
          status: freshProfile.status,
          rejectionReason: freshProfile.rejectionReason,
        },
        updatedUserStatus: userUpdated.status,
      });
    } catch (error) {
      console.error("Error rejecting psychologist:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/appointments", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, psychologistId, patientId } = req.query;
      const appointmentList = await storage.getAllAppointments({
        status: status as string,
        psychologistId: psychologistId as string,
        patientId: patientId as string,
      });

      const enriched = await Promise.all(appointmentList.map(async (apt) => {
        const psychologist = await storage.getPsychologistProfile(apt.psychologistId);
        const payment = await storage.getPaymentByAppointment(apt.id);
        return { ...apt, psychologist, payment };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching admin appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all bank transfers with filters (new dynamic endpoint)
  app.get("/api/admin/bank-transfers", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        search,
        startDate,
        endDate,
        sortBy = 'date',
        sortOrder = 'desc',
        page = '1',
        limit = '10'
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        status: status as string,
        search: search as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        limit: limitNum,
        offset,
      };

      const { transfers, total } = await storage.getAllBankTransfers(filters);

      // Enrich with appointment and patient/psychologist info
      const enriched = await Promise.all(transfers.map(async (transfer) => {
        const appointment = await storage.getAppointment(transfer.appointmentId);
        let psychologist = null;
        let patientName = null;

        if (appointment) {
          psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
          const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId));
          patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Danışan";
        }

        return {
          ...transfer,
          appointment: appointment ? {
            ...appointment,
            psychologist,
          } : null,
          patientName,
        };
      }));

      res.json({
        transfers: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error("Error fetching bank transfers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending bank transfers for admin review (legacy endpoint - kept for compatibility)
  app.get("/api/admin/bank-transfers/pending", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transfers = await storage.getAllPendingBankTransfers();

      // Enrich with appointment and patient/psychologist info
      const enriched = await Promise.all(transfers.map(async (transfer) => {
        const appointment = await storage.getAppointment(transfer.appointmentId);
        let psychologist = null;
        let patientName = null;

        if (appointment) {
          psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
          const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId));
          patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Danışan";
        }

        return {
          ...transfer,
          appointment: appointment ? {
            ...appointment,
            psychologist,
          } : null,
          patientName,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending bank transfers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * DEPRECATED: Manual bank transfer review
   *
   * This endpoint is DISABLED. Manual payment approval is no longer supported.
   * Booking activation now happens ONLY via payment gateway webhook confirmation.
   *
   * The endpoint returns 410 Gone to indicate it's no longer available.
   * Legacy bank transfer records can still be viewed in read-only mode via GET endpoints.
   */
  app.post("/api/admin/bank-transfers/:id/review", isAuthenticated, requireRole("admin"), async (_req: AuthenticatedRequest, res: Response) => {
    return res.status(410).json({
      message: "Manual payment approval is deprecated. Bookings are now activated automatically via PromptPay webhook confirmation.",
      deprecated: true,
      newFlow: "Use /api/payments/promptpay/create for new payments. Payments are confirmed automatically via webhook.",
    });
  });

  app.get("/api/admin/payments", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, patientId, psychologistId, startDate, endDate } = req.query;

      // Build query with date filtering
      let query = db.select().from(payments);
      const conditions = [];

      if (status && status !== "all") {
        conditions.push(eq(payments.status, status as string));
      }
      if (patientId) {
        conditions.push(eq(payments.patientId, patientId as string));
      }
      if (psychologistId) {
        conditions.push(eq(payments.psychologistId, psychologistId as string));
      }
      if (startDate) {
        conditions.push(gte(payments.paidAt, new Date(startDate as string)));
      }
      if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        conditions.push(lte(payments.paidAt, endDateTime));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const paymentList = await query.orderBy(desc(payments.paidAt));

      // Enrich with related data
      const enriched = await Promise.all(paymentList.map(async (payment) => {
        const psychologist = await storage.getPsychologistProfile(payment.psychologistId);
        const appointment = await storage.getAppointment(payment.appointmentId);
        const refundList = await db.select().from(refunds).where(eq(refunds.paymentId, payment.id));

        // Get patient info
        const [patient] = await db.select().from(users).where(eq(users.id, payment.patientId)).limit(1);

        // Get payout ledger for tax breakdown
        const [ledger] = await db
          .select()
          .from(payoutLedger)
          .where(eq(payoutLedger.paymentId, payment.id))
          .limit(1);

        // Calculate gross amount if missing (grossAmount should be platformFee + providerPayout)
        const platformFeeNum = parseFloat(payment.platformFee || "0");
        const providerPayoutNum = parseFloat(payment.providerPayout || "0");
        const grossAmountNum = parseFloat(payment.amount || payment.grossAmount || "0");

        // If grossAmount is 0 or missing, calculate from platform fee + provider payout
        const calculatedGross = grossAmountNum > 0 ? grossAmountNum : (platformFeeNum + providerPayoutNum);

        // Get tax info from ledger if available
        const withholdingTax = ledger ? parseFloat(ledger.withholdingAmount) : 0;
        const withholdingRate = ledger ? parseFloat(ledger.withholdingRate) : 0;
        const psychologistGross = ledger ? parseFloat(ledger.psychologistGross) : providerPayoutNum;
        const psychologistNet = ledger ? parseFloat(ledger.psychologistNet) : providerPayoutNum;
        const platformNet = ledger ? parseFloat(ledger.platformNet) : platformFeeNum;

        return {
          id: payment.id,
          appointmentId: payment.appointmentId,
          psychologistName: psychologist?.fullName || "Bilinmiyor",
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Bilinmiyor",
          patientId: payment.patientId,
          sessionDate: appointment?.startAt,
          sessionStatus: appointment?.status,
          grossAmount: calculatedGross.toFixed(2),
          platformFee: payment.platformFee,
          providerPayout: payment.providerPayout,
          // New tax breakdown fields
          withholdingTax: withholdingTax.toFixed(2),
          withholdingRate: (withholdingRate * 100).toFixed(2), // percentage
          psychologistGross: psychologistGross.toFixed(2),
          psychologistNet: psychologistNet.toFixed(2),
          platformNet: platformNet.toFixed(2),
          countryCode: ledger?.countryCode || psychologist?.countryCode || 'US',
          status: payment.status,
          paidAt: payment.paidAt,
          currency: payment.currency,
          refunds: refundList.map(r => ({
            id: r.id,
            status: r.status,
            amount: r.amount,
            type: r.type,
          })),
        };
      }));

      // Calculate summary
      let totalGross = 0;
      let totalVat = 0;
      let totalPlatformFee = 0;
      let totalProviderPayout = 0;
      let totalWithholdingTax = 0;
      let totalPsychologistNet = 0;
      let totalPlatformNet = 0;
      let completedCount = 0;

      for (const enrichedPayment of enriched) {
        const gross = parseFloat(enrichedPayment.grossAmount || "0");
        totalGross += gross;
        totalPlatformFee += parseFloat(enrichedPayment.platformFee || "0");
        totalProviderPayout += parseFloat(enrichedPayment.providerPayout || "0");
        totalWithholdingTax += parseFloat(enrichedPayment.withholdingTax || "0");
        totalPsychologistNet += parseFloat(enrichedPayment.psychologistNet || enrichedPayment.providerPayout || "0");
        totalPlatformNet += parseFloat(enrichedPayment.platformNet || enrichedPayment.platformFee || "0");

        if (enrichedPayment.status === "paid") {
          completedCount++;
        }
      }

      res.json({
        payments: enriched,
        summary: {
          totalPayments: paymentList.length,
          totalGross: totalGross.toFixed(2),
          totalVat: totalVat.toFixed(2),
          totalPlatformFee: totalPlatformFee.toFixed(2),
          totalProviderPayout: totalProviderPayout.toFixed(2),
          totalWithholdingTax: totalWithholdingTax.toFixed(2),
          totalPsychologistNet: totalPsychologistNet.toFixed(2),
          totalPlatformNet: totalPlatformNet.toFixed(2),
          completedCount,
          refundedCount: paymentList.filter(p => p.status === "refunded").length,
          currency: "TRY",
        },
      });
    } catch (error) {
      console.error("Error fetching admin payments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/refunds", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refundList = await storage.getAllRefunds();

      const enriched = await Promise.all(refundList.map(async (refund) => {
        const appointment = await storage.getAppointment(refund.appointmentId);
        const payment = await storage.getPayment(refund.paymentId);
        const psychologist = appointment ? await storage.getPsychologistProfile(appointment.psychologistId) : null;
        return { ...refund, appointment, payment, psychologist };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching admin refunds:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/refunds", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { appointmentId, type, reason, refundPercentage } = req.body;

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const payment = await storage.getPaymentByAppointment(appointmentId);
      if (!payment) {
        return res.status(400).json({ message: "No payment found for this appointment" });
      }

      const existingRefund = await storage.getRefundByAppointment(appointmentId);
      if (existingRefund) {
        return res.status(400).json({ message: "Refund already exists for this appointment" });
      }

      const percentage = parseFloat(refundPercentage || "100");
      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({ message: "Refund percentage must be between 0 and 100" });
      }

      if (payment.status === "refunded") {
        return res.status(400).json({ message: "Payment already refunded" });
      }

      const refundAmount = parseFloat(payment.grossAmount) * (percentage / 100);

      const refund = await storage.createRefund({
        appointmentId,
        paymentId: payment.id,
        type: type || "admin_decision",
        requestedBy: actorUserId!,
        amount: refundAmount.toFixed(2),
        refundPercentage: percentage.toFixed(2),
        reason,
        status: "pending",
      });

      await storage.createAuditLog({
        actorUserId,
        entityType: "refund",
        entityId: refund.id,
        action: "created",
        afterData: { appointmentId, type, refundAmount, reason },
      });

      res.json(refund);
    } catch (error) {
      console.error("Error creating refund:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/refunds/:id", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const refund = await storage.getRefund(id);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      if (refund.status === "processed" || refund.status === "rejected") {
        return res.status(400).json({ message: `Refund already ${refund.status}` });
      }

      const validStatuses = ["pending", "approved", "processed", "rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateRefund(id, {
        status,
        adminNotes,
        processedBy: actorUserId,
        processedAt: status === "processed" ? new Date() : undefined,
      });

      if (status === "processed") {
        await storage.updatePayment(refund.paymentId, {
          status: "refunded",
          refundedAt: new Date(),
          refundReason: refund.reason,
        });

        await storage.updateAppointment(refund.appointmentId, {
          status: "refunded",
        });
      }

      await storage.createAuditLog({
        actorUserId,
        entityType: "refund",
        entityId: id,
        action: `status_changed_to_${status}`,
        afterData: { status, adminNotes },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating refund:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments/:id/no-show", isAuthenticated, requireRole("psychologist", "admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;

      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const invalidStatuses = ["cancelled", "refunded", "no_show"];
      if (invalidStatuses.includes(appointment.status)) {
        return res.status(400).json({ message: `Cannot report no-show for ${appointment.status} appointment` });
      }

      const profile = await storage.getUserProfile(actorUserId!);
      if (profile?.role === "psychologist") {
        const psychologist = await storage.getPsychologistByUserId(actorUserId!);
        if (!psychologist || appointment.psychologistId !== psychologist.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const updated = await storage.updateAppointment(id, {
        status: "no_show",
        noShowReportedBy: actorUserId,
        noShowAt: new Date(),
      });

      await storage.createAuditLog({
        actorUserId,
        entityType: "appointment",
        entityId: id,
        action: "no_show_reported",
      });

      res.json(updated);
    } catch (error) {
      console.error("Error reporting no-show:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patient/payment-history", isAuthenticated, requireRole("patient"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const paymentList = await storage.getPaymentsByPatient(userId);

      const enriched = await Promise.all(paymentList.map(async (payment) => {
        const psychologist = await storage.getPsychologistProfile(payment.psychologistId);
        const appointment = await storage.getAppointment(payment.appointmentId);
        const refund = await storage.getRefundByAppointment(payment.appointmentId);
        return { ...payment, psychologist, appointment, refund };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching patient payment history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/psychologist/session-history", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const paymentList = await storage.getPaymentsByPsychologist(psychologist.id);

      const enriched = await Promise.all(paymentList.map(async (payment) => {
        const appointment = await storage.getAppointment(payment.appointmentId);
        return { 
          ...payment, 
          appointment,
          earnings: {
            gross: payment.grossAmount,
            vatAmount: payment.vatAmount,
            netOfVat: payment.netOfVat,
            platformFee: payment.platformFee,
            processorFee: payment.processorFee,
            payout: payment.providerPayout,
          }
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching psychologist session history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== PROMPTPAY PAYMENT SYSTEM (Thailand) ==========

  /**
   * Create payment with PromptPay QR code
   * POST /api/payments/promptpay/create
   *
   * This is the NEW payment flow:
   * 1. User books appointment -> status = pending_payment
   * 2. User initiates payment -> system generates PromptPay QR
   * 3. User scans QR and pays via Thai banking app
   * 4. Payment gateway sends webhook -> booking becomes confirmed automatically
   * NO ADMIN APPROVAL REQUIRED
   */
  app.post("/api/payments/promptpay/create", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }

      // Get appointment
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Verify ownership
      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Not authorized to pay for this appointment" });
      }

      // Get psychologist for price
      const psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const amount = parseFloat(psychologist.pricePerSession || "500"); // Default 500 THB

      // Create payment with QR code
      const result = await paymentService.createPayment({
        appointmentId,
        patientId: userId,
        psychologistId: psychologist.id,
        amount,
        currency: "THB",
        description: `Session with ${psychologist.fullName || "Therapist"}`,
        expiryMinutes: 15,
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to create payment" });
      }

      console.log(`[PromptPay] Payment created: ${result.payment?.id}, QR payload length: ${result.payment?.qrPayload?.length || 0}`);

      res.json({
        success: true,
        payment: {
          id: result.payment?.id,
          amount,
          currency: "THB",
          status: result.payment?.status,
          qrImageUrl: result.qrImageUrl,
          qrPayload: result.payment?.qrPayload, // EMVCo payload for Thai QR
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      console.error("Error creating PromptPay payment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get payment status (for client polling)
   * GET /api/payments/:id/status
   */
  app.get("/api/payments/:id/status", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const status = await paymentService.getPaymentStatus(id);
      if (!status) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json(status);
    } catch (error) {
      console.error("Error fetching payment status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Regenerate QR code for expired payment
   * POST /api/payments/:appointmentId/regenerate-qr
   */
  app.post("/api/payments/:appointmentId/regenerate-qr", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      const { appointmentId } = req.params;

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (appointment.status !== "pending_payment" && appointment.status !== "pending") {
        return res.status(400).json({ message: "Appointment is not awaiting payment" });
      }

      const psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const amount = parseFloat(psychologist.pricePerSession || "500");

      // Create new payment (old one will be marked as expired)
      const result = await paymentService.createPayment({
        appointmentId,
        patientId: userId,
        psychologistId: psychologist.id,
        amount,
        currency: "THB",
        description: `Session with ${psychologist.fullName || "Therapist"}`,
        expiryMinutes: 15,
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to regenerate QR" });
      }

      res.json({
        success: true,
        payment: {
          id: result.payment?.id,
          amount,
          currency: "THB",
          status: result.payment?.status,
          qrImageUrl: result.qrImageUrl,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      console.error("Error regenerating QR:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Simulate payment completion (DEVELOPMENT ONLY)
   * POST /api/payments/:id/simulate-complete
   *
   * Manually mark a payment as complete for testing without real payment
   */
  app.post("/api/payments/:id/simulate-complete", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: paymentId } = req.params;

      console.log(`[Simulate] Simulating payment completion for payment: ${paymentId}`);

      // Get payment
      const payment = await paymentService.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      // Verify payment is pending
      if (payment.status !== 'pending') {
        return res.status(400).json({ message: `Payment already ${payment.status}` });
      }

      // Update payment to paid
      await db
        .update(payments)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      // Update appointment to confirmed
      await db
        .update(appointments)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, payment.appointmentId));

      console.log(`[Simulate] Payment ${paymentId} marked as complete. Appointment ${payment.appointmentId} status updated.`);

      // Create notification for psychologist about payment
      const [appointment] = await db.select().from(appointments).where(eq(appointments.id, payment.appointmentId));
      if (appointment) {
        const psychProfile = await storage.getPsychologistProfile(payment.psychologistId);
        if (psychProfile) {
          await notificationService.createNotification({
            userId: psychProfile.userId,
            type: "payment_received",
            title: "Ödeme Alındı",
            message: `Randevunuz için ödeme alındı. Seans ${format(new Date(appointment.startAt), "d MMMM HH:mm")} tarihinde başlayacak.`,
            actionUrl: `/dashboard/appointments`,
            relatedAppointmentId: payment.appointmentId,
            metadata: {
              paymentId: payment.id,
              amount: payment.amount,
              appointmentId: payment.appointmentId,
            },
          });
        }
      }

      // Send booking confirmation emails (non-blocking)
      (async () => {
        try {
          const [appointment] = await db.select().from(appointments).where(eq(appointments.id, payment.appointmentId));
          if (!appointment) return;

          // Get patient info with language
          const [patientResult] = await db
            .select({
              email: users.email,
              firstName: users.firstName,
              languageCode: languages.code,
            })
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .leftJoin(languages, eq(languages.id, userProfiles.languageId))
            .where(eq(users.id, payment.patientId));

          // Get psychologist info with language
          const psychProfile = await storage.getPsychologistProfile(payment.psychologistId);
          if (!psychProfile) return;

          const [psychologistResult] = await db
            .select({
              email: users.email,
              firstName: users.firstName,
              languageCode: languages.code,
            })
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .leftJoin(languages, eq(languages.id, userProfiles.languageId))
            .where(eq(users.id, psychProfile.userId));

          const appointmentDate = format(new Date(appointment.startAt), "d MMMM yyyy, EEEE");
          const appointmentTime = format(new Date(appointment.startAt), "HH:mm");
          const joinLink = `${process.env.PLATFORM_URL || 'https://khunjit.com'}/video-call?room=${appointment.meetingRoom}`;

          // Send email to patient
          if (patientResult?.email) {
            const patientLanguage = (patientResult.languageCode || 'en') as any;
            await sendAppointmentConfirmedToPatient(
              payment.patientId,
              patientResult.email,
              payment.appointmentId,
              {
                firstName: patientResult.firstName || "User",
                psychologistName: psychProfile.fullName,
                appointmentDate,
                appointmentTime,
                joinLink,
              },
              patientLanguage
            );
            console.log(`[Email] Sent booking confirmation to patient ${patientResult.email} (${patientLanguage})`);
          }

          // Send email to psychologist
          if (psychologistResult?.email) {
            const psychLanguage = (psychologistResult.languageCode || 'en') as any;
            await sendAppointmentConfirmedToPsychologist(
              psychProfile.userId,
              psychologistResult.email,
              payment.appointmentId,
              {
                firstName: psychologistResult.firstName || psychProfile.fullName,
                patientName: patientResult?.firstName || "Client",
                appointmentDate,
                appointmentTime,
              },
              psychLanguage
            );
            console.log(`[Email] Sent booking confirmation to psychologist ${psychologistResult.email} (${psychLanguage})`);
          }
        } catch (err) {
          console.error("[Email] Failed to send booking confirmation emails:", err);
        }
      })();

      res.json({
        success: true,
        paymentId: paymentId,
        appointmentId: payment.appointmentId,
        message: "Payment confirmed successfully. Appointment status updated to confirmed.",
      });
    } catch (error) {
      console.error("Error simulating payment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // ========== STRIPE CONNECT ENDPOINTS ==========

  /**
   * POST /api/stripe/connect/start
   *
   * Start Stripe Connect onboarding for a psychologist
   * Creates a Stripe Express account if needed and returns onboarding link
   */
  app.post("/api/stripe/connect/start", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if Stripe Connect is enabled
      if (!stripeConnect.isStripeConnectEnabled()) {
        return res.status(503).json({
          message: "Stripe Connect is not configured. Please contact support.",
          enabled: false
        });
      }

      // Get psychologist profile
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      // Get user email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      // Get or create Stripe account
      // Use psychologist's country code, but fallback to US if TH (not supported by Stripe Connect)
      // Stripe Thailand doesn't support loss-liable platforms yet
      const stripeCountry = psychologist.countryCode === 'TH' ? 'US' : (psychologist.countryCode || 'US');
      const accountResult = await stripeConnect.getOrCreateStripeAccount(
        psychologist.id,
        user.email,
        stripeCountry
      );

      if (!accountResult.success || !accountResult.accountId) {
        return res.status(500).json({
          message: accountResult.error || "Failed to create Stripe account"
        });
      }

      // Generate onboarding link
      const platformUrl = process.env.PLATFORM_URL || 'http://localhost:5055';
      const refreshUrl = `${platformUrl}/profile?stripe_refresh=true`;
      const returnUrl = `${platformUrl}/profile?stripe_return=true`;

      const linkResult = await stripeConnect.createAccountLink(
        accountResult.accountId,
        refreshUrl,
        returnUrl
      );

      if (!linkResult.success || !linkResult.url) {
        return res.status(500).json({
          message: linkResult.error || "Failed to create onboarding link"
        });
      }

      res.json({
        url: linkResult.url,
        accountId: accountResult.accountId,
      });
    } catch (error) {
      console.error("Error starting Stripe Connect onboarding:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * POST /api/stripe/connect/refresh
   *
   * Generate a new onboarding link for incomplete accounts
   */
  app.post("/api/stripe/connect/refresh", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if Stripe Connect is enabled
      if (!stripeConnect.isStripeConnectEnabled()) {
        return res.status(503).json({
          message: "Stripe Connect is not configured. Please contact support.",
          enabled: false
        });
      }

      // Get psychologist profile
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      if (!psychologist.stripeAccountId) {
        return res.status(400).json({
          message: "No Stripe account found. Please use /api/stripe/connect/start first."
        });
      }

      // Generate new onboarding link
      const platformUrl = process.env.PLATFORM_URL || 'http://localhost:5055';
      const refreshUrl = `${platformUrl}/profile?stripe_refresh=true`;
      const returnUrl = `${platformUrl}/profile?stripe_return=true`;

      const linkResult = await stripeConnect.createAccountLink(
        psychologist.stripeAccountId,
        refreshUrl,
        returnUrl
      );

      if (!linkResult.success || !linkResult.url) {
        return res.status(500).json({
          message: linkResult.error || "Failed to create onboarding link"
        });
      }

      res.json({
        url: linkResult.url,
      });
    } catch (error) {
      console.error("Error refreshing Stripe Connect link:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * GET /api/stripe/connect/status
   *
   * Get current Stripe Connect account status
   */
  app.get("/api/stripe/connect/status", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if Stripe Connect is enabled
      if (!stripeConnect.isStripeConnectEnabled()) {
        return res.json({
          enabled: false,
          status: 'NOT_CONNECTED',
          message: "Stripe Connect is not configured"
        });
      }

      // Get psychologist profile
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      // If no Stripe account, return NOT_CONNECTED
      if (!psychologist.stripeAccountId) {
        return res.json({
          enabled: true,
          stripeAccountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          currentlyDue: [],
          status: 'NOT_CONNECTED',
        });
      }

      // Sync and get current status from Stripe
      const statusResult = await stripeConnect.syncAccountStatus(psychologist.id);

      if (!statusResult.success || !statusResult.status) {
        return res.status(500).json({
          message: statusResult.error || "Failed to get account status"
        });
      }

      res.json({
        enabled: true,
        ...statusResult.status,
      });
    } catch (error) {
      console.error("Error getting Stripe Connect status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * GET /api/stripe/connect/dashboard
   *
   * Get Stripe Express Dashboard login link
   */
  app.get("/api/stripe/connect/dashboard", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if Stripe Connect is enabled
      if (!stripeConnect.isStripeConnectEnabled()) {
        return res.status(503).json({
          message: "Stripe Connect is not configured. Please contact support."
        });
      }

      // Get psychologist profile
      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      if (!psychologist.stripeAccountId) {
        return res.status(400).json({
          message: "No Stripe account found. Please complete onboarding first."
        });
      }

      // Create login link
      const loginResult = await stripeConnect.createLoginLink(psychologist.stripeAccountId);

      if (!loginResult.success || !loginResult.url) {
        return res.status(500).json({
          message: loginResult.error || "Failed to create dashboard link"
        });
      }

      res.json({
        url: loginResult.url,
      });
    } catch (error) {
      console.error("Error creating Stripe dashboard link:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // NOTE: Stripe webhook handler (/webhooks/stripe) is defined in server/index.ts
  // It MUST be defined BEFORE express.json() middleware for signature verification to work

  /**
   * Admin: View webhook events (for debugging)
   * GET /api/admin/webhook-events
   */
  app.get("/api/admin/webhook-events", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const events = await db
        .select()
        .from(webhookEvents)
        .orderBy(desc(webhookEvents.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      res.json(events);
    } catch (error) {
      console.error("Error fetching webhook events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Admin: View ledger entries (revenue tracking)
   * GET /api/admin/ledgers
   */
  app.get("/api/admin/ledgers", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = db.select().from(ledgers);

      if (status && status !== "all") {
        query = query.where(eq(ledgers.status, status as string)) as any;
      }

      const ledgerList = await query
        .orderBy(desc(ledgers.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      // Calculate totals
      const totals = ledgerList.reduce(
        (acc, l) => ({
          grossTotal: acc.grossTotal + parseFloat(l.grossAmount || "0"),
          platformTotal: acc.platformTotal + parseFloat(l.platformFeeAmount || "0"),
          therapistTotal: acc.therapistTotal + parseFloat(l.therapistEarningAmount || "0"),
        }),
        { grossTotal: 0, platformTotal: 0, therapistTotal: 0 }
      );

      res.json({
        ledgers: ledgerList,
        totals,
      });
    } catch (error) {
      console.error("Error fetching ledgers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Admin: View pending payouts
   * GET /api/admin/payouts
   */
  app.get("/api/admin/payouts", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status = "queued", limit = 50, offset = 0 } = req.query;

      let query = db.select().from(payouts);

      if (status && status !== "all") {
        query = query.where(eq(payouts.status, status as string)) as any;
      }

      const payoutList = await query
        .orderBy(desc(payouts.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      // Enrich with therapist info
      const enriched = await Promise.all(
        payoutList.map(async (payout) => {
          const therapist = await storage.getPsychologistProfile(payout.therapistId);
          const appointment = await storage.getAppointment(payout.appointmentId);
          return {
            ...payout,
            therapistName: therapist?.fullName || "Unknown",
            therapistPromptPayId: therapist?.promptpayId || null,
            appointmentDate: appointment?.startAt,
          };
        })
      );

      // Calculate total pending
      const pendingTotal = payoutList
        .filter((p) => p.status === "queued")
        .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

      res.json({
        payouts: enriched,
        pendingTotal,
        currency: "THB",
      });
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Admin: Mark payout as paid (manual processing)
   * POST /api/admin/payouts/:id/mark-paid
   *
   * CRITICAL VALIDATION:
   * - Requires valid provider reference (transaction ID)
   * - Cross-checks amount with ledger therapist_earning
   * - Verifies therapist has payout destination configured
   * - Creates audit trail for compliance
   */
  app.post("/api/admin/payouts/:id/mark-paid", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;
      const { providerReference, notes } = req.body;

      // 1. VALIDATE: Require provider reference (transaction ID from bank)
      if (!providerReference || typeof providerReference !== 'string' || providerReference.trim().length === 0) {
        return res.status(400).json({
          message: "Provider reference (transaction ID) is required for audit trail"
        });
      }

      // 2. GET PAYOUT: Verify it exists and is not already paid
      const [payout] = await db
        .select()
        .from(payouts)
        .where(eq(payouts.id, id))
        .limit(1);

      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }

      if (payout.status === "paid") {
        return res.status(400).json({
          message: "Payout already marked as paid",
          paidAt: payout.paidAt,
          providerReference: payout.providerReference
        });
      }

      // 3. CROSS-CHECK AMOUNT: Verify payout amount matches ledger exactly
      if (payout.ledgerId) {
        const [ledger] = await db
          .select()
          .from(ledgers)
          .where(eq(ledgers.id, payout.ledgerId))
          .limit(1);

        if (ledger) {
          const payoutAmount = parseFloat(payout.amount);
          const ledgerEarning = parseFloat(ledger.therapistEarningAmount);
          const diff = Math.abs(payoutAmount - ledgerEarning);

          // Allow 0.01 THB difference for floating point precision
          if (diff > 0.01) {
            return res.status(400).json({
              message: "Payout amount does not match ledger therapist earning",
              payoutAmount: payoutAmount.toFixed(2),
              ledgerEarning: ledgerEarning.toFixed(2),
              difference: diff.toFixed(2)
            });
          }
        }
      }

      // 4. VERIFY DESTINATION: Check therapist has payout destination configured
      if (payout.therapistId) {
        const therapist = await storage.getPsychologistProfile(payout.therapistId);

        if (therapist) {
          const destination = payout.destination || therapist.promptpayId || therapist.bankAccountNumber;

          if (!destination || destination.trim().length === 0) {
            return res.status(400).json({
              message: "Therapist has no payout destination configured",
              therapistId: payout.therapistId,
              hint: "Therapist must add PromptPay ID or bank account before payout"
            });
          }

          // Validate PromptPay ID format (Thailand phone: 10 digits, Tax ID: 13 digits)
          if (therapist.promptpayId) {
            const cleaned = therapist.promptpayId.replace(/\D/g, '');
            if (cleaned.length !== 10 && cleaned.length !== 13) {
              return res.status(400).json({
                message: "Invalid PromptPay ID format",
                hint: "Must be 10-digit phone or 13-digit tax ID"
              });
            }
          }
        }
      }

      // 5. UPDATE PAYOUT: Mark as paid with provider reference
      await db
        .update(payouts)
        .set({
          status: "paid",
          providerReference: providerReference.trim(),
          paidAt: new Date(),
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payouts.id, id));

      // 6. AUDIT TRAIL: Log the manual payout action
      log(`Admin ${actorUserId} marked payout ${id} as paid (ref: ${providerReference})`, "payout");

      res.json({
        success: true,
        message: "Payout marked as paid",
        providerReference: providerReference.trim(),
        paidAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking payout as paid:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== NOTIFICATION ENDPOINTS ==========

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await notificationService.getUserNotifications(userId, limit);

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const count = await notificationService.getUnreadCount(userId);

      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, userId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/read-all", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      await notificationService.markAllAsRead(userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      await notificationService.deleteNotification(id, userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== COUNTRY TAX RULES ENDPOINTS ==========

  /**
   * Get all country tax rules
   * GET /api/admin/tax-rules
   */
  app.get("/api/admin/tax-rules", isAuthenticated, requireRole("admin"), async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const rules = await db
        .select()
        .from(countryTaxRules)
        .orderBy(countryTaxRules.countryCode);

      res.json(rules);
    } catch (error) {
      console.error("Error fetching tax rules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Create or update country tax rule
   * POST /api/admin/tax-rules
   */
  app.post("/api/admin/tax-rules", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { countryCode, countryName, withholdingRate, platformTaxRate, taxIncludedInPrice, notes } = req.body;

      if (!countryCode || !countryName) {
        return res.status(400).json({ message: "countryCode and countryName are required" });
      }

      // Check if rule already exists for this country
      const [existing] = await db
        .select()
        .from(countryTaxRules)
        .where(eq(countryTaxRules.countryCode, countryCode.toUpperCase()))
        .limit(1);

      if (existing) {
        // Update existing rule
        const [updated] = await db
          .update(countryTaxRules)
          .set({
            countryName,
            withholdingRate: withholdingRate?.toString() || "0",
            platformTaxRate: platformTaxRate?.toString() || "0",
            taxIncludedInPrice: taxIncludedInPrice || false,
            notes,
            updatedAt: new Date(),
          })
          .where(eq(countryTaxRules.id, existing.id))
          .returning();

        return res.json(updated);
      }

      // Create new rule
      const [newRule] = await db
        .insert(countryTaxRules)
        .values({
          countryCode: countryCode.toUpperCase(),
          countryName,
          withholdingRate: withholdingRate?.toString() || "0",
          platformTaxRate: platformTaxRate?.toString() || "0",
          taxIncludedInPrice: taxIncludedInPrice || false,
          notes,
        })
        .returning();

      res.status(201).json(newRule);
    } catch (error) {
      console.error("Error creating/updating tax rule:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Delete country tax rule
   * DELETE /api/admin/tax-rules/:countryCode
   */
  app.delete("/api/admin/tax-rules/:countryCode", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { countryCode } = req.params;

      await db
        .delete(countryTaxRules)
        .where(eq(countryTaxRules.countryCode, countryCode.toUpperCase()));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tax rule:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get payout ledger entries
   * GET /api/admin/payout-ledger
   */
  app.get("/api/admin/payout-ledger", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = db.select().from(payoutLedger);

      if (status && status !== "all") {
        query = query.where(eq(payoutLedger.payoutStatus, status as string)) as any;
      }

      const entries = await query
        .orderBy(desc(payoutLedger.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      // Enrich with psychologist info
      const enriched = await Promise.all(
        entries.map(async (entry) => {
          const psychologist = await storage.getPsychologistProfile(entry.psychologistId);
          const appointment = await storage.getAppointment(entry.appointmentId);
          return {
            ...entry,
            psychologistName: psychologist?.fullName || "Unknown",
            appointmentDate: appointment?.startAt,
          };
        })
      );

      // Calculate totals
      const totals = {
        totalGross: entries.reduce((sum, e) => sum + parseFloat(e.amountGross || "0"), 0),
        totalPlatformFee: entries.reduce((sum, e) => sum + parseFloat(e.platformFee || "0"), 0),
        totalWithholding: entries.reduce((sum, e) => sum + parseFloat(e.withholdingAmount || "0"), 0),
        totalPsychologistNet: entries.reduce((sum, e) => sum + parseFloat(e.psychologistNet || "0"), 0),
        pendingPayouts: entries.filter(e => e.payoutStatus === "pending").length,
      };

      res.json({
        entries: enriched,
        totals,
      });
    } catch (error) {
      console.error("Error fetching payout ledger:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Retry failed payout
   * POST /api/admin/payout-ledger/:appointmentId/retry
   */
  app.post("/api/admin/payout-ledger/:appointmentId/retry", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const { retryPayout } = await import("./payments/payout-service.js");

      const result = await retryPayout(appointmentId);

      if (result.success) {
        res.json({ success: true, message: "Payout retried successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error retrying payout:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get payout stats for psychologist
   * GET /api/psychologist/payout-stats
   */
  app.get("/api/psychologist/payout-stats", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const { getPayoutStats } = await import("./payments/payout-ledger.js");
      const stats = await getPayoutStats(psychologist.id);

      res.json(stats);
    } catch (error) {
      console.error("Error fetching payout stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get pending payouts for psychologist
   * GET /api/psychologist/pending-payouts
   */
  app.get("/api/psychologist/pending-payouts", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      const { getPendingPayouts } = await import("./payments/payout-ledger.js");
      const pendingPayouts = await getPendingPayouts(psychologist.id);

      // Enrich with appointment info
      const enriched = await Promise.all(
        pendingPayouts.map(async (payout) => {
          const appointment = await storage.getAppointment(payout.appointmentId);
          return {
            ...payout,
            appointmentDate: appointment?.startAt,
            appointmentStatus: appointment?.status,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending payouts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Update psychologist country code
   * PATCH /api/psychologist/profile/country
   */
  app.patch("/api/psychologist/profile/country", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { countryCode } = req.body;

      if (!countryCode || countryCode.length !== 2) {
        return res.status(400).json({ message: "Valid 2-letter country code is required" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      await db
        .update(psychologistProfiles)
        .set({
          countryCode: countryCode.toUpperCase(),
          updatedAt: new Date(),
        })
        .where(eq(psychologistProfiles.id, psychologist.id));

      res.json({ success: true, countryCode: countryCode.toUpperCase() });
    } catch (error) {
      console.error("Error updating country code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Get list of countries with tax rules (for dropdown)
   * GET /api/countries
   */
  app.get("/api/countries", async (_req: Request, res: Response) => {
    try {
      const countries = await db
        .select({
          code: countryTaxRules.countryCode,
          name: countryTaxRules.countryName,
          currency: countryTaxRules.currency,
          withholdingRate: countryTaxRules.withholdingRate,
        })
        .from(countryTaxRules)
        .orderBy(countryTaxRules.countryName);

      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Update psychologist currency and country
   * PATCH /api/psychologist/currency
   *
   * This endpoint allows psychologists to update their session pricing currency.
   * Currency changes only affect NEW appointments - existing payments remain unchanged.
   *
   * Request body:
   * - currency: ISO 4217 currency code (USD, THB, EUR, etc.)
   * - countryCode: ISO 3166-1 alpha-2 country code (US, TH, TR, etc.)
   *
   * Business rules:
   * - Currency must be one of the 11 supported currencies
   * - CountryCode must match a valid tax rule in the system
   * - Changes are audited for compliance
   * - Stripe Connect account currency must match (validated separately)
   */
  app.patch("/api/psychologist/currency", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currency, countryCode } = req.body;

      // Validation
      if (!currency || !countryCode) {
        return res.status(400).json({
          message: "Both currency and countryCode are required"
        });
      }

      // Validate currency format (ISO 4217 - 3 letters)
      if (typeof currency !== 'string' || currency.length !== 3 || !/^[A-Z]+$/.test(currency)) {
        return res.status(400).json({
          message: "Currency must be a valid 3-letter ISO 4217 code (e.g., USD, THB, EUR)"
        });
      }

      // Validate country code format (ISO 3166-1 alpha-2 - 2 letters)
      if (typeof countryCode !== 'string' || countryCode.length !== 2 || !/^[A-Z]+$/.test(countryCode)) {
        return res.status(400).json({
          message: "Country code must be a valid 2-letter ISO 3166-1 code (e.g., US, TH, TR)"
        });
      }

      // Verify country exists in tax rules
      const [taxRule] = await db
        .select()
        .from(countryTaxRules)
        .where(eq(countryTaxRules.countryCode, countryCode))
        .limit(1);

      if (!taxRule) {
        return res.status(400).json({
          message: `Country code ${countryCode} is not supported. Please select from available countries.`
        });
      }

      // Verify currency matches country's expected currency
      if (taxRule.currency !== currency) {
        return res.status(400).json({
          message: `Currency mismatch: Country ${countryCode} (${taxRule.countryName}) uses ${taxRule.currency}, but ${currency} was provided. Please select the correct currency for this country.`
        });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist profile not found" });
      }

      // Store old values for audit log
      const oldValues = {
        currency: psychologist.currency,
        countryCode: psychologist.countryCode,
      };

      // Update psychologist profile
      const [updatedProfile] = await db
        .update(psychologistProfiles)
        .set({
          currency: currency.toUpperCase(),
          countryCode: countryCode.toUpperCase(),
          updatedAt: new Date(),
        })
        .where(eq(psychologistProfiles.id, psychologist.id))
        .returning();

      // Create audit log for compliance
      await createAuditLog(
        userId,
        "psychologist_profile",
        psychologist.id,
        "currency_updated",
        oldValues,
        { currency, countryCode },
        req
      );

      res.json({
        success: true,
        currency: currency.toUpperCase(),
        countryCode: countryCode.toUpperCase(),
        countryName: taxRule.countryName,
        withholdingRate: taxRule.withholdingRate,
        message: "Currency updated successfully. This will apply to all new appointments.",
      });
    } catch (error) {
      console.error("Error updating currency:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  /**
   * Get 2FA status for current user
   * GET /api/2fa/status
   */
  app.get("/api/2fa/status", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json({ enabled: profile.twoFactorEnabled || false });
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Setup 2FA - Generate QR code
   * POST /api/2fa/setup
   */
  app.post("/api/2fa/setup", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Check if 2FA is already enabled
      if (profile.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }

      // Generate new secret
      const secret = twoFactorAuth.generateSecret();
      const qrCodeUrl = await twoFactorAuth.generateQRCode(user.email, secret);

      // Store secret in session temporarily (not in DB yet)
      (req.session as any).tempTwoFactorSecret = secret;

      res.json({
        qrCode: qrCodeUrl,
        secret, // Also send plain secret for manual entry
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Enable 2FA - Verify token and save secret
   * POST /api/2fa/enable
   */
  app.post("/api/2fa/enable", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const tempSecret = (req.session as any).tempTwoFactorSecret;
      if (!tempSecret) {
        return res.status(400).json({ message: "Please setup 2FA first" });
      }

      // Verify the token
      const isValid = twoFactorAuth.verifyToken(token, tempSecret);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Save to database
      await db.update(userProfiles)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: tempSecret, // Store plain secret (consider encrypting in production)
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));

      // Clear temp secret from session
      delete (req.session as any).tempTwoFactorSecret;

      await createAuditLog(
        userId,
        "user_profile",
        userId,
        "enabled_2fa",
        null,
        { twoFactorEnabled: true },
        req
      );

      res.json({ success: true, message: "Two-factor authentication enabled successfully" });
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Disable 2FA
   * POST /api/2fa/disable
   */
  app.post("/api/2fa/disable", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Verification code and password are required" });
      }

      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (!profile.twoFactorEnabled || !profile.twoFactorSecret) {
        return res.status(400).json({ message: "2FA is not enabled" });
      }

      // Verify password
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      // Verify 2FA token
      const isValid = twoFactorAuth.verifyToken(token, profile.twoFactorSecret);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Disable 2FA
      await db.update(userProfiles)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));

      await createAuditLog(
        userId,
        "user_profile",
        userId,
        "disabled_2fa",
        { twoFactorEnabled: true },
        { twoFactorEnabled: false },
        req
      );

      res.json({ success: true, message: "Two-factor authentication disabled successfully" });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * Verify 2FA token during login
   * POST /api/2fa/verify
   */
  app.post("/api/2fa/verify", async (req: Request, res: Response) => {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ message: "Email and verification code are required" });
      }

      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const profile = await storage.getUserProfile(user.id);
      if (!profile || !profile.twoFactorEnabled || !profile.twoFactorSecret) {
        return res.status(400).json({ message: "2FA is not enabled for this account" });
      }

      // Verify token
      const isValid = twoFactorAuth.verifyToken(token, profile.twoFactorSecret);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // 2FA verified! Create session and log in user
      (req.session as any).userId = user.id;
      delete (req.session as any).pending2FAUserId;

      await storage.createAuditLog({
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "logged_in_with_2fa",
      });

      // Generate JWT token for mobile clients
      const jwtToken = generateToken(user.id);

      res.json({
        success: true,
        verified: true,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        profile,
        token: jwtToken,
      });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== TEST EMAIL ENDPOINT (ADMIN ONLY) ==========
  app.post("/api/test/send-welcome-email", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, email, firstName } = req.body;

      if (!userId || !email || !firstName) {
        return res.status(400).json({ message: "userId, email, and firstName are required" });
      }

      console.log(`[Test Email] Manually sending welcome email to ${email} (${firstName})`);

      const result = await sendWelcomeEmail({ userId, email, firstName, language: 'en' });

      if (result.success) {
        console.log(`[Test Email] Welcome email sent successfully to ${email}`);
        return res.json({ success: true, message: "Email sent successfully", emailLogId: result.emailLogId });
      } else {
        console.error(`[Test Email] Failed to send email:`, result.error);
        return res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      console.error("[Test Email] Error:", error);
      if (error instanceof Error) {
        console.error("[Test Email] Stack:", error.stack);
      }
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  return httpServer;
}

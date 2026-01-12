import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { psychologistProfiles, appointments, userProfiles, users } from "@shared/schema";
import { eq, and, gte, lte, or, count, sql } from "drizzle-orm";
import { addMinutes, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, isAfter, isBefore, subMinutes } from "date-fns";
import { randomUUID, createHash } from "crypto";

function generateSecureJoinCode(appointmentId: string, secret: string = process.env.SESSION_SECRET || "mindwell-secret"): string {
  const timestamp = Date.now().toString();
  return createHash("sha256")
    .update(`${appointmentId}-${secret}-${timestamp}`)
    .digest("hex")
    .slice(0, 16);
}

function generateSecureMeetingRoom(appointmentId: string): string {
  const hash = createHash("sha256")
    .update(`${appointmentId}-${process.env.SESSION_SECRET || "mindwell-secret"}-${randomUUID()}`)
    .digest("hex")
    .slice(0, 12);
  return `mw-${hash}`;
}

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
  };
}

const requireRole = (...roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const profile = await storage.getUserProfile(userId);
      if (!profile || !roles.includes(profile.role)) {
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
  await setupAuth(app);
  registerAuthRoutes(app);

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
      const userId = req.user?.claims?.sub;
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

  app.get("/api/psychologists", async (req: Request, res: Response) => {
    try {
      const { search, specialty, language, priceRange } = req.query;
      
      const psychologists = await storage.getAllPsychologists({
        search: search as string,
        specialty: specialty as string,
        verified: true,
      });

      res.json(psychologists);
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

      res.json(psychologist);
    } catch (error) {
      console.error("Error fetching psychologist:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/psychologists/:id/slots", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const psychologist = await storage.getPsychologistProfile(id);
      
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const rules = await storage.getAvailabilityRules(id);
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 28);

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

      const slots = [];
      const slotDuration = psychologist.sessionDuration || 50;

      for (let day = 0; day < 28; day++) {
        const currentDate = addDays(weekStart, day);
        if (isBefore(currentDate, startOfDay(now))) continue;

        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
        const dayRule = rules.find(r => r.dayOfWeek === dayOfWeek);

        if (!dayRule) continue;

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
            available: !isBooked && !isPast,
          });

          slotStart = addMinutes(slotStart, slotDuration + 10);
        }
      }

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

      const { psychologistId, startAt, endAt } = req.body;

      const psychologist = await storage.getPsychologistProfile(psychologistId);
      if (!psychologist || !psychologist.verified) {
        return res.status(404).json({ message: "Psychologist not found or not verified" });
      }

      const slotStart = new Date(startAt);
      const slotEnd = new Date(endAt);

      await db.update(appointments)
        .set({ status: "expired" })
        .where(and(
          eq(appointments.status, "reserved"),
          sql`${appointments.reservedUntil} < NOW()`
        ));

      const existingAppointments = await db.select().from(appointments)
        .where(and(
          eq(appointments.psychologistId, psychologistId),
          or(
            eq(appointments.status, "reserved"),
            eq(appointments.status, "payment_pending"),
            eq(appointments.status, "confirmed"),
            eq(appointments.status, "ready"),
            eq(appointments.status, "in_session")
          ),
          or(
            and(lte(appointments.startAt, slotStart), gte(appointments.endAt, slotStart)),
            and(lte(appointments.startAt, slotEnd), gte(appointments.endAt, slotEnd)),
            and(gte(appointments.startAt, slotStart), lte(appointments.endAt, slotEnd))
          )
        ));

      const validConflicts = existingAppointments.filter(apt => {
        if (apt.status === "reserved" && apt.reservedUntil) {
          return new Date(apt.reservedUntil) > new Date();
        }
        return true;
      });

      if (validConflicts.length > 0) {
        return res.status(409).json({ 
          message: "Bu slot başka bir kullanıcı tarafından rezerve edilmiş", 
          code: "SLOT_CONFLICT" 
        });
      }

      const reservedUntil = addMinutes(new Date(), 10);

      const appointment = await storage.createAppointment({
        patientId: userId,
        psychologistId,
        startAt: slotStart,
        endAt: slotEnd,
        status: "reserved",
        reservedUntil,
      });

      const secureMeetingRoom = generateSecureMeetingRoom(appointment.id);
      await storage.updateAppointment(appointment.id, { meetingRoom: secureMeetingRoom });

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "appointment",
        entityId: appointment.id,
        action: "reserved",
        afterData: { psychologistId, startAt, endAt },
      });

      res.json(appointment);
    } catch (error) {
      console.error("Error reserving appointment:", error);
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
          new Date(apt.startAt) > now && 
          ["confirmed", "ready", "payment_pending"].includes(apt.status)
        )
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 5);

      const enriched = await Promise.all(upcomingAppointments.map(async (apt) => {
        const psychologist = await storage.getPsychologistProfile(apt.psychologistId);
        return { ...apt, psychologist };
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
        return { ...apt, psychologist };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching appointments:", error);
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
      const isPaid = payment && payment.status === "completed";

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
      if (!payment || payment.status !== "completed") {
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
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payments/checkout", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { appointmentId } = req.body;
      const appointment = await storage.getAppointment(appointmentId);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (appointment.patientId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const psychologist = await storage.getPsychologistProfile(appointment.psychologistId);
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const grossAmount = parseFloat(psychologist.pricePerSession || "0");
      const vatRate = 0.20;
      const vatAmount = grossAmount * vatRate;
      const netOfVat = grossAmount - vatAmount;
      const platformFeeRate = 0.15;
      const platformFee = netOfVat * platformFeeRate;
      const platformVatAmount = platformFee * vatRate;
      const processorFee = grossAmount * 0.029 + 0.30;
      const providerPayout = netOfVat - platformFee - processorFee;

      const payment = await storage.createPayment({
        appointmentId,
        patientId: userId,
        psychologistId: psychologist.id,
        grossAmount: grossAmount.toFixed(2),
        vatRate: (vatRate * 100).toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        netOfVat: netOfVat.toFixed(2),
        platformFee: platformFee.toFixed(2),
        platformFeeRate: (platformFeeRate * 100).toFixed(2),
        platformVatAmount: platformVatAmount.toFixed(2),
        processorFee: processorFee.toFixed(2),
        providerPayout: providerPayout.toFixed(2),
        status: "completed",
        paidAt: new Date(),
      });

      const joinCode = generateSecureJoinCode(appointmentId);
      const joinCodeExpiresAt = addMinutes(new Date(appointment.endAt), 30);

      await storage.updateAppointment(appointmentId, { 
        status: "confirmed",
        joinCode,
        joinCodeExpiresAt,
      });

      const conversation = await storage.getConversationByParticipants(userId, psychologist.id);
      if (!conversation) {
        await storage.createConversation({
          patientId: userId,
          psychologistId: psychologist.id,
        });
      }

      await storage.createAuditLog({
        actorUserId: userId,
        entityType: "payment",
        entityId: payment.id,
        action: "completed",
        afterData: { appointmentId, grossAmount },
      });

      res.json(payment);
    } catch (error) {
      console.error("Error processing payment:", error);
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
        const psychologist = await storage.getPsychologistProfile(conv.psychologistId);
        const messages = await storage.getMessages(conv.id);
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m => 
          m.senderUserId !== userId && !m.readAt
        ).length;

        return { ...conv, psychologist, lastMessage, unreadCount };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching conversations:", error);
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

      res.json(created);
    } catch (error) {
      console.error("Error setting availability rules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/psychologist/profile", isAuthenticated, requireRole("psychologist"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const psychologist = await storage.getPsychologistByUserId(userId);
      res.json(psychologist || null);
    } catch (error) {
      console.error("Error fetching psychologist profile:", error);
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

      const todaySessions = allAppointments.filter(apt => {
        const startTime = new Date(apt.startAt);
        return startTime >= todayStart && startTime <= todayEnd && apt.status === "confirmed";
      }).length;

      const pendingAppointments = allAppointments.filter(apt => 
        apt.status === "confirmed" && new Date(apt.startAt) > now
      ).length;

      const uniquePatients = new Set(allAppointments.map(apt => apt.patientId)).size;

      res.json({
        todaySessions,
        weeklyEarnings: 0,
        totalPatients: uniquePatients,
        pendingAppointments,
      });
    } catch (error) {
      console.error("Error fetching psychologist stats:", error);
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
      
      res.json({
        totalUsers: userCount?.count || 0,
        totalPsychologists: psychologistCount?.count || 0,
        pendingVerifications: pendingPsychologists.length,
        todaySessions: 0,
        monthlyRevenue: 0,
        reportedMessages: 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/activity", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json([
        { type: "success", message: "Yeni psikolog doğrulandı: Dr. Ayşe Yılmaz", time: "5 dakika önce" },
        { type: "info", message: "Yeni hasta kaydı: user@example.com", time: "15 dakika önce" },
        { type: "warning", message: "Mesaj şikayeti alındı", time: "1 saat önce" },
        { type: "success", message: "Ödeme tamamlandı: 500 TL", time: "2 saat önce" },
      ]);
    } catch (error) {
      console.error("Error fetching admin activity:", error);
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
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending psychologists:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/psychologists/:id/verify", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.claims?.sub;
      const { id } = req.params;
      const { verified, notes } = req.body;

      const updated = await storage.updatePsychologistProfile(id, {
        verified,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? actorUserId : null,
        verificationNotes: notes,
        status: verified ? "active" : "rejected",
      });

      await storage.createAuditLog({
        actorUserId,
        entityType: "psychologist_profile",
        entityId: id,
        action: verified ? "verified" : "rejected",
        afterData: { verified, notes },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error verifying psychologist:", error);
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

  app.get("/api/admin/payments", isAuthenticated, requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, patientId, psychologistId } = req.query;
      const paymentList = await storage.getAllPayments({
        status: status as string,
        patientId: patientId as string,
        psychologistId: psychologistId as string,
      });

      const enriched = await Promise.all(paymentList.map(async (payment) => {
        const psychologist = await storage.getPsychologistProfile(payment.psychologistId);
        const appointment = await storage.getAppointment(payment.appointmentId);
        const refund = await storage.getRefundByAppointment(payment.appointmentId);
        return { ...payment, psychologist, appointment, refund };
      }));

      res.json(enriched);
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

  return httpServer;
}

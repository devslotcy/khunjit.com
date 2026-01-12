import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { psychologistProfiles, appointments, userProfiles, users } from "@shared/schema";
import { eq, and, gte, lte, or, count, sql } from "drizzle-orm";
import { addMinutes, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, isAfter, isBefore, subMinutes } from "date-fns";
import { randomUUID } from "crypto";

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

      const reservedUntil = addMinutes(new Date(), 10);

      const appointment = await storage.createAppointment({
        patientId: userId,
        psychologistId,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: "reserved",
        reservedUntil,
        meetingRoom: `mindwell-${randomUUID().slice(0, 8)}`,
      });

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

      const canJoin = appointment.status === "confirmed" &&
        isAfter(now, subMinutes(startTime, 10)) &&
        isBefore(now, addMinutes(endTime, 15));

      res.json({
        roomName: appointment.meetingRoom,
        canJoin,
        message: canJoin ? undefined : "Seans saatinden 10 dakika önce katılabilirsiniz",
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

      await storage.updateAppointment(appointmentId, { status: "confirmed" });

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

  return httpServer;
}

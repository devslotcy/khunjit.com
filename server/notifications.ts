import { db } from "./db";
import { notifications, type InsertNotification, type NotificationType } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Server } from "socket.io";

let ioInstance: Server | null = null;

/**
 * Set Socket.io instance for real-time notifications
 */
export function setSocketIO(io: Server) {
  ioInstance = io;
}

export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  relatedAppointmentId?: string;
  relatedConversationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(options: CreateNotificationOptions) {
  const notification: InsertNotification = {
    userId: options.userId,
    type: options.type,
    title: options.title,
    message: options.message,
    actionUrl: options.actionUrl || null,
    relatedAppointmentId: options.relatedAppointmentId || null,
    relatedConversationId: options.relatedConversationId || null,
    metadata: options.metadata || null,
    isRead: false,
    readAt: null,
  };

  const [created] = await db.insert(notifications).values(notification).returning();

  // Emit real-time notification via Socket.io
  if (ioInstance) {
    ioInstance.to(`user:${options.userId}`).emit("notification", {
      id: created.id,
      type: created.type,
      title: created.title,
      message: created.message,
      actionUrl: created.actionUrl,
      relatedAppointmentId: created.relatedAppointmentId,
      relatedConversationId: created.relatedConversationId,
      isRead: created.isRead,
      metadata: created.metadata,
      createdAt: created.createdAt,
    });
  }

  return created;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result.length;
}

/**
 * Get recent notifications for a user
 */
export async function getUserNotifications(userId: string, limit = 20) {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();

  return updated;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  return await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

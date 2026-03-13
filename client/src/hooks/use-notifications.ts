import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useEffect, useRef, useState } from "react";
import { useToast } from "./use-toast";
import { io, Socket } from "socket.io-client";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedAppointmentId?: string;
  relatedConversationId?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Browser notification permission state
let notificationPermission: NotificationPermission = "default";

// Request browser notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Browser does not support notifications");
    return "denied";
  }

  if (Notification.permission === "granted") {
    notificationPermission = "granted";
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    return permission;
  }

  notificationPermission = "denied";
  return "denied";
}

// Show browser notification
function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (notificationPermission === "granted" && "Notification" in window) {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options?.data?.actionUrl) {
        window.location.href = options.data.actionUrl;
      }
    };
  }
}

// Play notification sound
export function playNotificationSound() {
  try {
    // Use Web Audio API to generate a pleasant notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create a two-tone notification sound (ding-dong)
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      // Envelope for smooth attack and release
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const currentTime = audioContext.currentTime;

    // First tone (higher pitch)
    playTone(880, currentTime, 0.15);

    // Second tone (lower pitch) - slightly delayed
    playTone(660, currentTime + 0.1, 0.2);
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(true);
  const previousCountRef = useRef<number>(0);
  const socketRef = useRef<Socket | null>(null);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: isPolling ? 10000 : false, // Poll every 10 seconds
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: isPolling ? 10000 : false,
  });

  const unreadCount = unreadData?.count || 0;

  // Setup Socket.io for real-time notifications
  useEffect(() => {
    if (!user) return;

    // Connect to Socket.io server
    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Notifications] Socket.io connected");
      // Authenticate and join user room
      socket.emit("authenticate", user.id);
    });

    socket.on("disconnect", () => {
      console.log("[Notifications] Socket.io disconnected");
    });

    // Listen for real-time notifications
    socket.on("notification", (notification: Notification) => {
      console.log("[Notifications] Received real-time notification:", notification);

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });

      // Show browser notification
      showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.id,
        data: {
          actionUrl: notification.actionUrl,
        },
      });

      // Play sound
      playNotificationSound();

      // Refresh notification list
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, toast, queryClient]);

  // Detect new notifications (fallback for polling)
  useEffect(() => {
    if (previousCountRef.current > 0 && unreadCount > previousCountRef.current) {
      const newNotificationsCount = unreadCount - previousCountRef.current;
      const latestNotification = notifications.find((n) => !n.isRead);

      if (latestNotification) {
        // Show toast notification
        toast({
          title: latestNotification.title,
          description: latestNotification.message,
          duration: 5000,
        });

        // Show browser notification
        showBrowserNotification(latestNotification.title, {
          body: latestNotification.message,
          tag: latestNotification.id,
          data: {
            actionUrl: latestNotification.actionUrl,
          },
        });

        // Play sound
        playNotificationSound();
      }
    }

    previousCountRef.current = unreadCount;
  }, [unreadCount, notifications, toast]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    requestPermission: requestNotificationPermission,
    isPolling,
    setIsPolling,
  };
}

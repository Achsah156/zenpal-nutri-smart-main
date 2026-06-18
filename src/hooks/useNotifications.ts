import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  type: "bowl_status" | "meal_reminder" | "ai_suggestion" | "alert";
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch existing notifications
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map((n) => ({
        ...n,
        type: n.type as "bowl_status" | "meal_reminder" | "ai_suggestion" | "alert",
        data: n.data as Record<string, unknown>,
      }));

      setNotifications(typedData);
      setUnreadCount(typedData.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create a notification
  const createNotification = async (
    type: "bowl_status" | "meal_reminder" | "ai_suggestion" | "alert",
    title: string,
    message: string,
    data: Record<string, unknown> = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: notification, error } = await supabase
        .from("notifications")
        .insert([{
          user_id: user.id,
          type,
          title,
          message,
          data: data as unknown as Record<string, never>,
        }])
        .select()
        .single();

      if (error) throw error;
      return notification as Notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    fetchNotifications();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user found, skipping notifications subscription");
          return;
        }

        console.log("Subscribing to realtime notifications for user", user.id);

        channel = supabase
          .channel("notifications-realtime")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification;
              console.log("Realtime notification received", newNotification);

              setNotifications((prev) => [newNotification, ...prev]);
              setUnreadCount((prev) => prev + 1);

              // Show toast for new notification - destructive for alerts
              toast({
                title: newNotification.title,
                description: newNotification.message,
                variant: newNotification.type === "alert" ? "destructive" : "default",
              });
            }
          )
          .subscribe((status) => {
            console.log("Notifications channel status:", status);
          });
      } catch (error) {
        console.error("Error setting up realtime notifications:", error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        console.log("Removing notifications realtime channel");
        supabase.removeChannel(channel);
      }
    };
  }, [toast]);

  return {
    notifications,
    unreadCount,
    loading,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}

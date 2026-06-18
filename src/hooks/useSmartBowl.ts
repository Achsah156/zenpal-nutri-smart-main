import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WEBSOCKET_URL, WS_RECONNECT_DELAY } from "@/config/websocket";

export interface BowlTelemetry {
  id: string;
  user_id: string;
  bowl_id: string;
  current_weight: number;
  target_weight: number;
  lid_status: "open" | "closed" | "moving";
  battery_level: number;
  connectivity_status: "connected" | "disconnected" | "weak";
  last_dispense_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BowlCommand {
  action: "set_target" | "open_lid" | "close_lid" | "get_status" | "start_dispense" | "stop_dispense";
  targetWeight?: number;
  foodName?: string;
}

export function useSmartBowl() {
  const [telemetry, setTelemetry] = useState<BowlTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Fetch initial status via REST API
  const fetchStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("bowl-api/command", {
        body: { action: "get_status" },
      });

      if (response.data?.status) {
        setTelemetry(response.data.status);
      }
    } catch (err) {
      console.error("Failed to fetch bowl status:", err);
    }
  }, []);

  // Connect to Node.js WebSocket server for real-time updates
  const connectWebSocket = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No session, skipping WebSocket connection");
        return;
      }

      // Check if WebSocket URL is configured
      if (!WEBSOCKET_URL || WEBSOCKET_URL.includes("YOUR_APP_NAME")) {
        console.warn("WebSocket URL not configured.");
        return;
      }

      console.log("Connecting to bowl WebSocket:", WEBSOCKET_URL);
      wsRef.current = new WebSocket(WEBSOCKET_URL);

      wsRef.current.onopen = () => {
        console.log("Bowl WebSocket connected");
        setIsConnected(true);
        setError(null);

        // Authenticate with the server
        wsRef.current?.send(JSON.stringify({
          type: "auth",
          token: session.access_token,
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Bowl WebSocket message:", message.type);

          switch (message.type) {
            case "auth_success":
              console.log("Bowl auth successful:", message.bowlId);
              if (message.status) {
                setTelemetry(message.status);
              }
              // Subscribe to status updates
              wsRef.current?.send(JSON.stringify({ type: "subscribe_status" }));
              break;

            case "auth_error":
              console.error("Bowl auth failed:", message.error);
              setError(message.error);
              break;

            case "status_update":
            case "telemetry_update":
              if (message.status) {
                setTelemetry(message.status);
              }
              break;

            case "weight_update":
              setTelemetry(prev => prev ? {
                ...prev,
                current_weight: message.currentWeight,
              } : null);
              break;

            case "weight_ack":
              setTelemetry(prev => prev ? {
                ...prev,
                current_weight: message.currentWeight,
              } : null);
              break;

            case "target_reached":
              toast({
                title: "Target Weight Reached!",
                description: `Your meal has reached ${message.currentWeight}g. Lid closing automatically.`,
              });
              setTelemetry(prev => prev ? {
                ...prev,
                current_weight: message.currentWeight,
                lid_status: "closed",
              } : null);
              break;

            case "bowl_online":
              toast({
                title: "Bowl Connected",
                description: "Your smart bowl is now online.",
              });
              setTelemetry(prev => prev ? {
                ...prev,
                connectivity_status: "connected",
              } : null);
              break;

            case "bowl_offline":
              toast({
                title: "Bowl Disconnected",
                description: "Your smart bowl has gone offline.",
                variant: "destructive",
              });
              setTelemetry(prev => prev ? {
                ...prev,
                connectivity_status: "disconnected",
              } : null);
              break;

            case "heartbeat":
              wsRef.current?.send(JSON.stringify({ type: "heartbeat_response" }));
              break;

            case "error":
              console.error("Bowl WebSocket error:", message.error);
              setError(message.error);
              break;
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      wsRef.current.onclose = () => {
        console.log("Bowl WebSocket closed");
        setIsConnected(false);
        
        // Attempt reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting WebSocket reconnect...");
          connectWebSocket();
        }, WS_RECONNECT_DELAY);
      };

      wsRef.current.onerror = (error) => {
        console.error("Bowl WebSocket error:", error);
        setError("Connection error");
      };
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);
      setError("Failed to connect");
    }
  }, [toast]);

  // Send command to bowl via REST API
  const sendCommand = useCallback(async (command: BowlCommand) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke("bowl-api/command", {
        body: command,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "Command Sent",
          description: response.data.message,
        });

        // Refresh status
        await fetchStatus();
        return response.data;
      } else {
        throw new Error(response.data?.error || "Command failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send command";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus, toast]);

  // Set target weight
  const setTargetWeight = useCallback(async (targetWeight: number, foodName?: string) => {
    return sendCommand({ action: "set_target", targetWeight, foodName });
  }, [sendCommand]);

  // Open lid
  const openLid = useCallback(async () => {
    return sendCommand({ action: "open_lid" });
  }, [sendCommand]);

  // Close lid
  const closeLid = useCallback(async () => {
    return sendCommand({ action: "close_lid" });
  }, [sendCommand]);

  // Subscribe to realtime database updates as fallback
  useEffect(() => {
    fetchStatus();

    const channel = supabase
      .channel("bowl-telemetry-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bowl_telemetry",
        },
        (payload) => {
          console.log("Bowl telemetry changed:", payload);
          if (payload.new) {
            setTelemetry(payload.new as BowlTelemetry);
          }
        }
      )
      .subscribe((status) => {
        console.log("Bowl telemetry subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatus]);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Calculate progress
  const progress = telemetry?.target_weight 
    ? Math.min(100, (telemetry.current_weight / telemetry.target_weight) * 100)
    : 0;

  return {
    telemetry,
    isConnected,
    isLoading,
    error,
    progress,
    setTargetWeight,
    openLid,
    closeLid,
    sendCommand,
    refreshStatus: fetchStatus,
  };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bowl-id, x-device-token",
};

// Generate a random 6-digit pairing code
const generatePairingCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a secure device token
const generateDeviceToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

interface BowlCommand {
  action: "set_target" | "open_lid" | "close_lid" | "get_status" | "start_dispense" | "stop_dispense";
  targetWeight?: number;
  foodName?: string;
  bowlId?: string;
}

interface TelemetryUpdate {
  bowlId: string;
  currentWeight?: number;
  targetWeight?: number;
  lidStatus?: "open" | "closed" | "moving";
  batteryLevel?: number;
  connectivityStatus?: "connected" | "disconnected" | "weak";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Get user from auth header for user-facing endpoints
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Handle different endpoints
    switch (path) {
      case "command": {
        // User sends command to bowl
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const command: BowlCommand = await req.json();
        console.log("Bowl command received:", command);

        // Get or create bowl telemetry record
        const { data: existingBowl } = await supabase
          .from("bowl_telemetry")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        const bowlId = existingBowl?.bowl_id || `bowl_${userId.substring(0, 8)}`;

        switch (command.action) {
          case "set_target":
            const updateData = {
              user_id: userId,
              bowl_id: bowlId,
              target_weight: command.targetWeight || 0,
              lid_status: "open" as const,
              updated_at: new Date().toISOString(),
            };

            if (existingBowl) {
              await supabase
                .from("bowl_telemetry")
                .update(updateData)
                .eq("id", existingBowl.id);
            } else {
              await supabase.from("bowl_telemetry").insert(updateData);
            }

            // Create notification
            await supabase.from("notifications").insert({
              user_id: userId,
              type: "bowl_command",
              title: "Target Weight Set",
              message: `Smart Bowl target set to ${command.targetWeight}g for ${command.foodName || "food"}.`,
              data: { targetWeight: command.targetWeight, foodName: command.foodName },
            });

            return new Response(JSON.stringify({
              success: true,
              message: "Target weight set",
              bowlId,
              targetWeight: command.targetWeight,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

          case "open_lid":
            await supabase
              .from("bowl_telemetry")
              .update({ lid_status: "moving" })
              .eq("user_id", userId);

            // Simulate lid opening
            setTimeout(async () => {
              await supabase
                .from("bowl_telemetry")
                .update({ lid_status: "open" })
                .eq("user_id", userId);
            }, 1000);

            return new Response(JSON.stringify({ success: true, message: "Opening lid" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

          case "close_lid":
            await supabase
              .from("bowl_telemetry")
              .update({ lid_status: "moving" })
              .eq("user_id", userId);

            setTimeout(async () => {
              await supabase
                .from("bowl_telemetry")
                .update({ lid_status: "closed", last_dispense_at: new Date().toISOString() })
                .eq("user_id", userId);
            }, 1000);

            return new Response(JSON.stringify({ success: true, message: "Closing lid" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

          case "get_status":
            const { data: status } = await supabase
              .from("bowl_telemetry")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle();

            return new Response(JSON.stringify({ success: true, status }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

          default:
            return new Response(JSON.stringify({ error: "Unknown command" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
      }

      case "telemetry": {
        // Bowl device sends telemetry update - requires device token authentication
        const deviceToken = req.headers.get("x-device-token");
        const bowlIdHeader = req.headers.get("x-bowl-id");
        const telemetry: TelemetryUpdate = await req.json();
        const targetBowlId = telemetry.bowlId || bowlIdHeader;

        console.log("Telemetry update from bowl:", targetBowlId);

        if (!targetBowlId) {
          return new Response(JSON.stringify({ error: "Bowl ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!deviceToken) {
          console.error("Missing device token for telemetry request");
          return new Response(JSON.stringify({ error: "Device token required" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate device token against the device_tokens table
        const { data: validDevice, error: tokenError } = await supabase
          .from("device_tokens")
          .select("bowl_id, user_id, is_paired")
          .eq("device_token", deviceToken)
          .eq("is_paired", true)
          .maybeSingle();

        if (tokenError) {
          console.error("Device token validation error:", tokenError);
          return new Response(JSON.stringify({ error: "Token validation failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!validDevice) {
          console.error("Invalid or unpaired device token");
          return new Response(JSON.stringify({ error: "Invalid or unpaired device" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Ensure the device token's bowl_id matches the request
        if (validDevice.bowl_id !== targetBowlId) {
          console.error("Bowl ID mismatch: token for", validDevice.bowl_id, "but request for", targetBowlId);
          return new Response(JSON.stringify({ error: "Bowl ID mismatch" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update last_seen_at for the device
        await supabase
          .from("device_tokens")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("device_token", deviceToken);

        // Update telemetry
        const { data: bowl, error } = await supabase
          .from("bowl_telemetry")
          .update({
            current_weight: telemetry.currentWeight,
            lid_status: telemetry.lidStatus,
            battery_level: telemetry.batteryLevel,
            connectivity_status: telemetry.connectivityStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("bowl_id", targetBowlId)
          .select()
          .maybeSingle();

        if (error) {
          console.error("Telemetry update error:", error);
        }

        // Check if target weight reached
        if (bowl && telemetry.currentWeight && bowl.target_weight) {
          if (telemetry.currentWeight >= bowl.target_weight && bowl.lid_status !== "closed") {
            // Auto-close lid when target reached
            await supabase
              .from("bowl_telemetry")
              .update({ lid_status: "closed", last_dispense_at: new Date().toISOString() })
              .eq("bowl_id", targetBowlId);

            // Notify user
            await supabase.from("notifications").insert({
              user_id: bowl.user_id,
              type: "bowl_status",
              title: "Target Weight Reached!",
              message: `Your Smart Bowl has dispensed ${telemetry.currentWeight}g. Lid closed automatically.`,
              data: { 
                currentWeight: telemetry.currentWeight, 
                targetWeight: bowl.target_weight,
                status: "complete"
              },
            });
          }
        }

        return new Response(JSON.stringify({ success: true, bowl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate-pairing-code": {
        // User generates a pairing code for their bowl (requires auth)
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json().catch(() => ({}));
        const deviceName = body.deviceName || "Smart Bowl";

        // Get or create bowl for user
        const { data: existingBowl } = await supabase
          .from("bowl_telemetry")
          .select("bowl_id")
          .eq("user_id", userId)
          .maybeSingle();

        const bowlId = existingBowl?.bowl_id || `bowl_${userId.substring(0, 8)}`;

        // Generate pairing code with 10-minute expiry
        const pairingCode = generatePairingCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Create or update device token record with pending pairing
        const { data: existingToken } = await supabase
          .from("device_tokens")
          .select("id")
          .eq("user_id", userId)
          .eq("bowl_id", bowlId)
          .maybeSingle();

        if (existingToken) {
          await supabase
            .from("device_tokens")
            .update({
              pairing_code: pairingCode,
              pairing_code_expires_at: expiresAt,
              device_name: deviceName,
              is_paired: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingToken.id);
        } else {
          // Generate a placeholder token that will be replaced on pairing
          await supabase.from("device_tokens").insert({
            user_id: userId,
            bowl_id: bowlId,
            device_token: `pending_${generateDeviceToken()}`,
            pairing_code: pairingCode,
            pairing_code_expires_at: expiresAt,
            device_name: deviceName,
            is_paired: false,
          });
        }

        // Ensure bowl telemetry record exists
        if (!existingBowl) {
          await supabase.from("bowl_telemetry").insert({
            user_id: userId,
            bowl_id: bowlId,
            current_weight: 0,
            target_weight: 0,
            lid_status: "closed",
            battery_level: 100,
            connectivity_status: "disconnected",
          });
        }

        console.log("Pairing code generated for user:", userId, "code:", pairingCode);

        return new Response(JSON.stringify({
          success: true,
          pairingCode,
          expiresAt,
          bowlId,
          message: "Enter this code on your ESP32 device within 10 minutes",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "pair-device": {
        // ESP32 device submits pairing code to get device token (no auth required)
        const body = await req.json();
        const { pairingCode, deviceId } = body;

        if (!pairingCode || !deviceId) {
          return new Response(JSON.stringify({ error: "Pairing code and device ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate pairing code length
        if (pairingCode.length !== 6 || !/^\d+$/.test(pairingCode)) {
          return new Response(JSON.stringify({ error: "Invalid pairing code format" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Pairing attempt with code:", pairingCode, "deviceId:", deviceId);

        // Find matching pairing code that hasn't expired
        const { data: tokenRecord, error: findError } = await supabase
          .from("device_tokens")
          .select("*")
          .eq("pairing_code", pairingCode)
          .eq("is_paired", false)
          .gt("pairing_code_expires_at", new Date().toISOString())
          .maybeSingle();

        if (findError) {
          console.error("Error finding pairing code:", findError);
          return new Response(JSON.stringify({ error: "Database error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!tokenRecord) {
          console.error("Invalid or expired pairing code:", pairingCode);
          return new Response(JSON.stringify({ error: "Invalid or expired pairing code" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate new device token and complete pairing
        const newDeviceToken = generateDeviceToken();

        const { error: updateError } = await supabase
          .from("device_tokens")
          .update({
            device_token: newDeviceToken,
            is_paired: true,
            pairing_code: null,
            pairing_code_expires_at: null,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", tokenRecord.id);

        if (updateError) {
          console.error("Error completing pairing:", updateError);
          return new Response(JSON.stringify({ error: "Failed to complete pairing" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update bowl connectivity status
        await supabase
          .from("bowl_telemetry")
          .update({ connectivity_status: "connected", updated_at: new Date().toISOString() })
          .eq("bowl_id", tokenRecord.bowl_id);

        // Notify user of successful pairing
        await supabase.from("notifications").insert({
          user_id: tokenRecord.user_id,
          type: "device_paired",
          title: "Device Paired Successfully!",
          message: `Your Smart Bowl (${tokenRecord.device_name}) is now connected and ready to use.`,
          data: { bowlId: tokenRecord.bowl_id, deviceId },
        });

        console.log("Device paired successfully:", tokenRecord.bowl_id);

        return new Response(JSON.stringify({
          success: true,
          deviceToken: newDeviceToken,
          bowlId: tokenRecord.bowl_id,
          message: "Device paired successfully! Store this token securely.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "unpair-device": {
        // User unpairs their device (requires auth)
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: tokenRecord } = await supabase
          .from("device_tokens")
          .select("id, bowl_id")
          .eq("user_id", userId)
          .eq("is_paired", true)
          .maybeSingle();

        if (!tokenRecord) {
          return new Response(JSON.stringify({ error: "No paired device found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete the token record
        await supabase
          .from("device_tokens")
          .delete()
          .eq("id", tokenRecord.id);

        // Update bowl connectivity status
        await supabase
          .from("bowl_telemetry")
          .update({ connectivity_status: "disconnected", updated_at: new Date().toISOString() })
          .eq("bowl_id", tokenRecord.bowl_id);

        console.log("Device unpaired for user:", userId);

        return new Response(JSON.stringify({
          success: true,
          message: "Device unpaired successfully",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "pairing-status": {
        // Check pairing status (requires auth)
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: tokenRecord } = await supabase
          .from("device_tokens")
          .select("bowl_id, device_name, is_paired, last_seen_at, created_at")
          .eq("user_id", userId)
          .maybeSingle();

        return new Response(JSON.stringify({
          success: true,
          isPaired: tokenRecord?.is_paired || false,
          device: tokenRecord ? {
            bowlId: tokenRecord.bowl_id,
            deviceName: tokenRecord.device_name,
            lastSeen: tokenRecord.last_seen_at,
            pairedAt: tokenRecord.created_at,
          } : null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Bowl API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

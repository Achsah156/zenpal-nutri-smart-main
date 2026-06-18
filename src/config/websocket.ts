// WebSocket Server Configuration
// Using Supabase Edge Function for WebSocket communication

// Supabase Edge Function WebSocket URL (bowl-realtime)
export const WEBSOCKET_URL = "wss://dplyoysaqbhhwicoyvwk.supabase.co/functions/v1/bowl-realtime";

// Supabase Edge Functions URL (for REST API - pairing, commands)
export const SUPABASE_FUNCTIONS_URL = "https://dplyoysaqbhhwicoyvwk.supabase.co/functions/v1";

// Connection settings
export const WS_RECONNECT_DELAY = 5000; // 5 seconds
export const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds

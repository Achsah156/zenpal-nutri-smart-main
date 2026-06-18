import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wifi, WifiOff, RefreshCw, Copy, Check } from "lucide-react";
interface DeviceToken {
  id: string;
  bowl_id: string;
  device_name: string | null;
  is_paired: boolean;
  last_seen_at: string | null;
  created_at: string;
}
export function BowlPairing() {
  const [deviceName, setDeviceName] = useState("Smart Bowl");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const {
    toast
  } = useToast();

  // Fetch existing devices
  useEffect(() => {
    fetchDevices();
    const channel = supabase.channel("device-tokens-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "device_tokens"
    }, () => {
      fetchDevices();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      if (new Date() >= expiresAt) {
        setPairingCode(null);
        setExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  const fetchDevices = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("device_tokens").select("id, bowl_id, device_name, is_paired, last_seen_at, created_at").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const generatePairingCode = async () => {
    setIsGenerating(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please log in to pair a device.",
          variant: "destructive"
        });
        return;
      }
      const response = await supabase.functions.invoke("bowl-pairing/generate-code", {
        body: {
          deviceName
        }
      });
      if (response.error) throw response.error;
      const {
        pairingCode: code,
        expiresAt: expires
      } = response.data;
      setPairingCode(code);
      setExpiresAt(new Date(expires));
      toast({
        title: "Pairing Code Generated",
        description: "Enter this code on your ESP32 device within 10 minutes."
      });
    } catch (err) {
      console.error("Failed to generate pairing code:", err);
      toast({
        title: "Error",
        description: "Failed to generate pairing code.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const deleteDevice = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("device_tokens").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Device Removed",
        description: "The device has been unpaired."
      });
      fetchDevices();
    } catch (err) {
      console.error("Failed to delete device:", err);
      toast({
        title: "Error",
        description: "Failed to remove device.",
        variant: "destructive"
      });
    }
  };
  const getTimeRemaining = () => {
    if (!expiresAt) return "";
    const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const isRecentlyActive = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000; // 5 minutes
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Pair New Bowl
          </CardTitle>
          <CardDescription>
            Generate a pairing code to connect your ESP32 smart bowl
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Device name" value={deviceName} onChange={e => setDeviceName(e.target.value)} className="max-w-xs" />
            <Button onClick={generatePairingCode} disabled={isGenerating}>
              {isGenerating ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </> : <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Code
                </>}
            </Button>
          </div>

          {pairingCode && <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pairing Code:</span>
                <Badge variant="outline">Expires in {getTimeRemaining()}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <code className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {pairingCode}
                </code>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter this code on your ESP32 device to complete pairing.
              </p>
            </div>}

          
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paired Devices</CardTitle>
          <CardDescription>
            Manage your connected smart bowl devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div> : devices.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No devices paired yet</p>
              <p className="text-sm">Generate a pairing code to connect your first bowl</p>
            </div> : <div className="space-y-3">
              {devices.map(device => <div key={device.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${device.is_paired && isRecentlyActive(device.last_seen_at) ? "bg-green-500" : device.is_paired ? "bg-yellow-500" : "bg-gray-400"}`} />
                    <div>
                      <p className="font-medium">{device.device_name || device.bowl_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.is_paired ? device.last_seen_at ? `Last seen: ${new Date(device.last_seen_at).toLocaleString()}` : "Paired, awaiting connection" : "Pairing in progress..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={device.is_paired ? "default" : "secondary"}>
                      {device.is_paired ? "Paired" : "Pending"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => deleteDevice(device.id)}>
                      Remove
                    </Button>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
}
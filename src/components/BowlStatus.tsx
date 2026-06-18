import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSmartBowl } from "@/hooks/useSmartBowl";
import { Scale, Battery, Wifi, WifiOff, ChevronUp, ChevronDown, RefreshCw, Loader2 } from "lucide-react";
interface BowlStatusProps {
  className?: string;
}
export function BowlStatus({
  className
}: BowlStatusProps) {
  const {
    telemetry,
    isConnected,
    isLoading,
    progress,
    openLid,
    closeLid,
    refreshStatus
  } = useSmartBowl();
  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-500";
    if (level > 20) return "text-yellow-500";
    return "text-red-500";
  };
  const getLidStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "closed":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "moving":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const getConnectivityIcon = () => {
    if (!telemetry) return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    switch (telemetry.connectivity_status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "weak":
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };
  return <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Smart Bowl Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {getConnectivityIcon()}
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? "Live" : "Offline"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshStatus} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        
        {/* WebSocket Connection Status Indicator */}
        <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-sm ${isConnected ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="relative flex h-3 w-3">
            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
          </div>
          <span className={isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {isConnected ? "WebSocket Connected" : "WebSocket Disconnected - Reconnecting..."}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {telemetry ? <>
            {/* Weight Progress */}
            

            {/* Status Indicators */}
            <div className="grid grid-cols-3 gap-3">
              {/* Lid Status */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                <Badge variant="outline" className={`${getLidStatusColor(telemetry.lid_status)} capitalize`}>
                  {telemetry.lid_status}
                </Badge>
                <span className="text-xs text-muted-foreground">Lid</span>
              </div>

              {/* Battery */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1">
                  <Battery className={`h-4 w-4 ${getBatteryColor(telemetry.battery_level)}`} />
                  <span className={`text-sm font-semibold ${getBatteryColor(telemetry.battery_level)}`}>
                    {telemetry.battery_level}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Battery</span>
              </div>

              {/* Connection */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                <Badge variant="outline" className={telemetry.connectivity_status === "connected" ? "bg-green-500/20 text-green-500 border-green-500/30" : telemetry.connectivity_status === "weak" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"}>
                  {telemetry.connectivity_status}
                </Badge>
                <span className="text-xs text-muted-foreground">Signal</span>
              </div>
            </div>

            {/* Lid Controls */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={openLid} disabled={isLoading || telemetry.lid_status === "open"}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronUp className="h-4 w-4 mr-2" />}
                Open Lid
              </Button>
              <Button variant="outline" className="flex-1" onClick={closeLid} disabled={isLoading || telemetry.lid_status === "closed"}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                Close Lid
              </Button>
            </div>

            {/* Last Dispense */}
            {telemetry.last_dispense_at && <p className="text-xs text-muted-foreground text-center">
                Last dispense: {new Date(telemetry.last_dispense_at).toLocaleString()}
              </p>}
          </> : <div className="text-center py-6 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No bowl connected</p>
            <p className="text-xs mt-1">Send food to bowl to initialize</p>
          </div>}
      </CardContent>
    </Card>;
}
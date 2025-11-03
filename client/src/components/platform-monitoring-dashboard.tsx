/**
 * 🎯 Platform Monitoring Dashboard
 * 
 * Real-time monitoring for 12 external Replit platforms
 * Displays health status, heartbeats, SIDE verification, and alerts
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Server,
  Eye,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface PlatformHealth {
  id: string;
  platformId: string;
  platformName: string;
  platformUrl?: string;
  platformType?: string;
  priority?: string;
  currentStatus: string;
  sideInstalled?: number;
  sideVersion?: string;
  sideActive?: number;
  complianceScore?: number;
  lastHeartbeat?: string;
  lastVerification?: string;
  lastOnline?: string;
  totalHeartbeats?: number;
  totalVerifications?: number;
  failedVerifications?: number;
  uptime?: number;
  avgResponseTime?: number;
}

interface PlatformAlert {
  id: string;
  platformId: string;
  platformName: string;
  alertType: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

const COLORS = {
  online: '#10b981',
  degraded: '#f59e0b',
  offline: '#ef4444',
  unknown: '#6b7280'
};

// Sub-component: Platform Heartbeats History
function PlatformHeartbeats({ platformId }: { platformId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/monitor/heartbeats/${platformId}`, { limit: 50 }],
    refetchInterval: 15000,
  });

  const heartbeats: any[] = (data as any)?.heartbeats || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading heartbeats...</span>
      </div>
    );
  }

  if (heartbeats.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No heartbeat history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {heartbeats.map((heartbeat: any, index: number) => (
        <div
          key={heartbeat.id || index}
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border"
          data-testid={`heartbeat-${index}`}
        >
          <Activity className={cn(
            "w-5 h-5 mt-0.5 shrink-0",
            heartbeat.status === 'online' && "text-green-500",
            heartbeat.status === 'degraded' && "text-yellow-500",
            heartbeat.status === 'offline' && "text-red-500"
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={heartbeat.status === 'online' ? 'default' : 'secondary'}>
                  {heartbeat.status}
                </Badge>
                {heartbeat.responseTime && (
                  <span className="text-xs text-muted-foreground">
                    {heartbeat.responseTime}ms
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(heartbeat.receivedAt), 'PPp')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {heartbeat.cpuUsage !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">CPU:</span>
                  <span>{heartbeat.cpuUsage}%</span>
                </div>
              )}
              {heartbeat.memoryUsage !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Memory:</span>
                  <span>{heartbeat.memoryUsage}%</span>
                </div>
              )}
              {heartbeat.complianceScore !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Compliance:</span>
                  <span>{heartbeat.complianceScore}%</span>
                </div>
              )}
              {heartbeat.sideVersion && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">SIDE:</span>
                  <span>{heartbeat.sideVersion}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Sub-component: Platform Verifications History
function PlatformVerifications({ platformId }: { platformId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/monitor/verifications/${platformId}`, { limit: 50 }],
    refetchInterval: 15000,
  });

  const verifications: any[] = (data as any)?.verifications || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading verifications...</span>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No verification history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {verifications.map((verification: any, index: number) => (
        <div
          key={verification.id || index}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            verification.success ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
          )}
          data-testid={`verification-${index}`}
        >
          {verification.success ? (
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-500 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 mt-0.5 text-red-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={verification.success ? 'default' : 'destructive'}>
                  {verification.success ? 'Success' : 'Failed'}
                </Badge>
                {verification.sideDetected && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    SIDE Detected
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(verification.verifiedAt), 'PPp')}
              </span>
            </div>
            
            {verification.sideVersion && (
              <div className="text-xs mb-2">
                <span className="text-muted-foreground">SIDE Version: </span>
                <span className="font-medium">{verification.sideVersion}</span>
              </div>
            )}
            
            {verification.errorMessage && (
              <div className="text-xs text-red-500 mt-2 font-mono bg-red-500/10 p-2 rounded">
                {verification.errorMessage}
              </div>
            )}
            
            {verification.responseTime !== undefined && (
              <div className="text-xs text-muted-foreground mt-2">
                Response time: {verification.responseTime}ms
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Sub-component: Platform Metrics & Stats
function PlatformMetrics({ platform }: { platform: PlatformHealth }) {
  const metrics = [
    {
      label: 'Total Heartbeats',
      value: platform.totalHeartbeats || 0,
      icon: Activity,
      color: 'text-green-500',
    },
    {
      label: 'Total Verifications',
      value: platform.totalVerifications || 0,
      icon: Eye,
      color: 'text-blue-500',
    },
    {
      label: 'Failed Verifications',
      value: platform.failedVerifications || 0,
      icon: XCircle,
      color: 'text-red-500',
    },
    {
      label: 'Uptime',
      value: platform.uptime !== undefined ? `${platform.uptime}%` : 'N/A',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Avg Response Time',
      value: platform.avgResponseTime !== undefined ? `${platform.avgResponseTime}ms` : 'N/A',
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      label: 'Compliance Score',
      value: platform.complianceScore !== undefined ? `${platform.complianceScore}%` : 'N/A',
      icon: Shield,
      color: platform.complianceScore && platform.complianceScore >= 80 ? 'text-green-500' : 'text-yellow-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Icon className={cn("h-4 w-4", metric.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Performance Gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Compliance Progress */}
            {platform.complianceScore !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Compliance</span>
                  <span className="font-medium">{platform.complianceScore}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      platform.complianceScore >= 80 ? "bg-green-500" :
                      platform.complianceScore >= 50 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${platform.complianceScore}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Uptime Progress */}
            {platform.uptime !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">{platform.uptime}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${platform.uptime}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlatformMonitoringDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformHealth | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch platform health
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['/api/monitor/platforms'],
    refetchInterval: 10000, // 10s
  });

  // Fetch platform alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/monitor/alerts'],
    refetchInterval: 5000, // 5s
  });

  // Fetch heartbeat history
  const { data: heartbeatsData } = useQuery({
    queryKey: ['/api/monitor/heartbeats'],
    refetchInterval: 15000, // 15s
  });

  // Fetch verification logs
  const { data: verificationData } = useQuery({
    queryKey: ['/api/monitor/verifications'],
    refetchInterval: 15000, // 15s
  });

  // Fetch statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/monitor/stats'],
    refetchInterval: 30000, // 30s
  });

  const platforms: PlatformHealth[] = (healthData as any)?.platforms || [];
  const alerts: PlatformAlert[] = (alertsData as any)?.alerts || [];
  const stats: any = (statsData as any) || {};

  // Platform statistics
  const onlinePlatforms = platforms.filter(p => p.currentStatus === 'online');
  const degradedPlatforms = platforms.filter(p => p.currentStatus === 'degraded');
  const offlinePlatforms = platforms.filter(p => p.currentStatus === 'offline');
  const sideInstalledPlatforms = platforms.filter(p => p.sideInstalled === 1);
  const activeAlerts = alerts.filter(a => a.status === 'active');

  // Status distribution for chart
  const statusDistribution = [
    { status: 'Online', count: onlinePlatforms.length, color: COLORS.online },
    { status: 'Degraded', count: degradedPlatforms.length, color: COLORS.degraded },
    { status: 'Offline', count: offlinePlatforms.length, color: COLORS.offline },
  ];

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return Wifi;
      case 'degraded': return AlertTriangle;
      case 'offline': return WifiOff;
      default: return Activity;
    }
  };

  // Get priority variant
  const getPriorityVariant = (priority?: string): "default" | "secondary" | "destructive" => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      default: return 'default';
    }
  };

  // Get severity variant
  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  // Refresh all data
  const handleRefresh = () => {
    refetchHealth();
    refetchAlerts();
  };

  // Time ago helper
  const timeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Platform Monitoring Header */}
      <Card data-testid="card-platform-monitoring">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" />
                Platform Monitoring Dashboard
              </CardTitle>
              <CardDescription>
                Real-time monitoring of 12 external Replit platforms with SIDE verification
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline"
              size="sm"
              data-testid="button-refresh-monitoring"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Platform Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card data-testid="card-total-platforms">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platforms</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platforms.length}</div>
            <p className="text-xs text-muted-foreground">External platforms</p>
          </CardContent>
        </Card>

        <Card data-testid="card-online-platforms">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{onlinePlatforms.length}</div>
            <p className="text-xs text-muted-foreground">
              {degradedPlatforms.length > 0 && `${degradedPlatforms.length} degraded`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-offline-platforms">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{offlinePlatforms.length}</div>
            <p className="text-xs text-muted-foreground">Unreachable</p>
          </CardContent>
        </Card>

        <Card data-testid="card-side-installed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SIDE Installed</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sideInstalledPlatforms.length}</div>
            <p className="text-xs text-muted-foreground">
              of {platforms.length} platforms
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Status Grid */}
      <Card data-testid="card-platforms-grid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Platform Status
          </CardTitle>
          <CardDescription>Live status of all monitored platforms</CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading platforms...</span>
            </div>
          ) : platforms.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No platforms registered</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {platforms.map((platform) => {
                const StatusIcon = getStatusIcon(platform.currentStatus);
                const platformAlerts = alerts.filter(a => a.platformId === platform.platformId && a.status === 'active');
                
                return (
                  <div
                    key={platform.id}
                    className={cn(
                      "flex flex-col p-4 rounded-lg border hover-elevate cursor-pointer transition-all",
                      platform.currentStatus === 'online' && "bg-green-500/5 border-green-500/20",
                      platform.currentStatus === 'degraded' && "bg-yellow-500/5 border-yellow-500/20",
                      platform.currentStatus === 'offline' && "bg-red-500/5 border-red-500/20"
                    )}
                    data-testid={`platform-card-${platform.platformId}`}
                    onClick={() => setSelectedPlatform(platform)}
                  >
                    {/* Platform Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate flex items-center gap-2">
                          <StatusIcon className={cn("w-4 h-4 shrink-0", getStatusColor(platform.currentStatus))} />
                          {platform.platformName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {platform.platformId}
                        </div>
                      </div>
                      {platformAlerts.length > 0 && (
                        <Badge variant="destructive" className="ml-2 shrink-0">
                          {platformAlerts.length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Platform Metrics */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <Badge 
                          variant={platform.currentStatus === 'online' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {platform.currentStatus}
                        </Badge>
                      </div>
                      
                      {platform.sideInstalled !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">SIDE</span>
                          {platform.sideInstalled === 1 ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{platform.sideVersion || 'Installed'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-3 h-3" />
                              <span>Not installed</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {platform.complianceScore !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Compliance</span>
                          <Badge 
                            variant={platform.complianceScore >= 80 ? 'default' : platform.complianceScore >= 50 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {platform.complianceScore}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Last Activity */}
                    <div className="pt-2 border-t space-y-1">
                      {platform.lastHeartbeat && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Activity className="w-3 h-3" />
                          <span>Heartbeat: {timeAgo(platform.lastHeartbeat)}</span>
                        </div>
                      )}
                      {platform.lastVerification && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          <span>Verified: {timeAgo(platform.lastVerification)}</span>
                        </div>
                      )}
                      {platform.totalHeartbeats !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>{platform.totalHeartbeats} heartbeats</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card data-testid="card-active-platform-alerts">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Active Platform Alerts
                </CardTitle>
                <CardDescription>Issues requiring attention</CardDescription>
              </div>
              <Badge variant="destructive">{activeAlerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    data-testid={`alert-${alert.id}`}
                  >
                    <AlertTriangle className={cn(
                      "w-5 h-5 mt-0.5 shrink-0",
                      alert.severity === 'critical' && "text-red-500",
                      alert.severity === 'warning' && "text-yellow-500",
                      alert.severity === 'info' && "text-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold text-sm">{alert.platformName}</div>
                        <Badge variant={getSeverityVariant(alert.severity)} className="shrink-0">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {alert.alertType}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(alert.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Platform Details Dialog */}
      <Dialog open={!!selectedPlatform} onOpenChange={(open) => !open && setSelectedPlatform(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]" data-testid="dialog-platform-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-platform-name">
              {selectedPlatform && (
                <>
                  {(() => {
                    const StatusIcon = getStatusIcon(selectedPlatform.currentStatus);
                    return <StatusIcon className={cn("w-5 h-5", getStatusColor(selectedPlatform.currentStatus))} />;
                  })()}
                  {selectedPlatform.platformName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Platform ID: {selectedPlatform?.platformId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlatform && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="heartbeats" data-testid="tab-heartbeats">Heartbeats</TabsTrigger>
                <TabsTrigger value="verifications" data-testid="tab-verifications">Verifications</TabsTrigger>
                <TabsTrigger value="metrics" data-testid="tab-metrics">Metrics</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[500px] mt-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Platform Metrics Grid */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Current Status</div>
                      <Badge variant={selectedPlatform.currentStatus === 'online' ? 'default' : 'secondary'}>
                        {selectedPlatform.currentStatus}
                      </Badge>
                    </div>
                    
                    {selectedPlatform.platformType && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Platform Type</div>
                        <div className="text-sm">{selectedPlatform.platformType}</div>
                      </div>
                    )}
                    
                    {selectedPlatform.priority && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Priority</div>
                        <Badge variant={getPriorityVariant(selectedPlatform.priority)}>
                          {selectedPlatform.priority}
                        </Badge>
                      </div>
                    )}
                    
                    {selectedPlatform.sideVersion && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">SIDE Version</div>
                        <div className="text-sm flex items-center gap-2">
                          {selectedPlatform.sideInstalled === 1 ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              {selectedPlatform.sideVersion}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              Not installed
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedPlatform.complianceScore !== undefined && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Compliance Score</div>
                        <Badge 
                          variant={selectedPlatform.complianceScore >= 80 ? 'default' : selectedPlatform.complianceScore >= 50 ? 'secondary' : 'destructive'}
                        >
                          {selectedPlatform.complianceScore}%
                        </Badge>
                      </div>
                    )}
                    
                    {selectedPlatform.totalHeartbeats !== undefined && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Total Heartbeats</div>
                        <div className="text-sm">{selectedPlatform.totalHeartbeats}</div>
                      </div>
                    )}
                    
                    {selectedPlatform.totalVerifications !== undefined && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Verifications</div>
                        <div className="text-sm">
                          {selectedPlatform.totalVerifications} total
                          {selectedPlatform.failedVerifications !== undefined && selectedPlatform.failedVerifications > 0 && (
                            <span className="text-red-500"> ({selectedPlatform.failedVerifications} failed)</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedPlatform.avgResponseTime !== undefined && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Avg Response Time</div>
                        <div className="text-sm">{selectedPlatform.avgResponseTime}ms</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Activity Timeline */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Activity Timeline</div>
                    <div className="space-y-2">
                      {selectedPlatform.lastHeartbeat && (
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="w-4 h-4 text-green-500" />
                          <span className="text-muted-foreground">Last Heartbeat:</span>
                          <span>{format(new Date(selectedPlatform.lastHeartbeat), 'PPpp')}</span>
                        </div>
                      )}
                      {selectedPlatform.lastVerification && (
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="w-4 h-4 text-blue-500" />
                          <span className="text-muted-foreground">Last Verification:</span>
                          <span>{format(new Date(selectedPlatform.lastVerification), 'PPpp')}</span>
                        </div>
                      )}
                      {selectedPlatform.lastOnline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Wifi className="w-4 h-4 text-green-500" />
                          <span className="text-muted-foreground">Last Online:</span>
                          <span>{format(new Date(selectedPlatform.lastOnline), 'PPpp')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedPlatform.platformUrl && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Platform URL</div>
                      <a 
                        href={selectedPlatform.platformUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline break-all"
                      >
                        {selectedPlatform.platformUrl}
                      </a>
                    </div>
                  )}
                </TabsContent>
                
                {/* Heartbeats Tab */}
                <TabsContent value="heartbeats">
                  <PlatformHeartbeats platformId={selectedPlatform.platformId} />
                </TabsContent>
                
                {/* Verifications Tab */}
                <TabsContent value="verifications">
                  <PlatformVerifications platformId={selectedPlatform.platformId} />
                </TabsContent>
                
                {/* Metrics Tab */}
                <TabsContent value="metrics">
                  <PlatformMetrics platform={selectedPlatform} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

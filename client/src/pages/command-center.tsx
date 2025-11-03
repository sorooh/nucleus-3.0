/**
 * 👑 Supreme Command Center
 * 
 * Nicholas's Imperial Dashboard - Monitor and control all 21 nuclei
 * Real-time overview of the entire Surooh Empire
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Shield, 
  RefreshCw,
  TrendingUp,
  Server,
  Database,
  Eye,
  Bell,
  Clock,
  TrendingDown,
  AlertCircle,
  Crown,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { PlatformMonitoringDashboard } from '@/components/platform-monitoring-dashboard';
import { SideDistributionDashboard } from '@/components/side-distribution-dashboard';
import { AlertSystemDashboard } from '@/components/alert-system-dashboard';
import { PlatformAnalyticsDashboard } from '@/components/platform-analytics-dashboard';
import { ExecutiveCommandConsole } from '@/components/executive-command-console';

interface Nucleus {
  id: string;
  nucleusId: string;
  nucleusName: string;
  arabicName: string;
  nucleusType: string;
  category: string;
  status: string;
  health: number;
  phaseOmegaActive: number;
  sideIntegrated: number;
  priority: string;
  description: string;
  lastHealthCheck: string | null;
  lastHeartbeat: string | null;
  evolutionCycles?: number;
  lastEvolution?: string | null;
  fitnessScore?: number;
}

interface CommandCenterStatus {
  status: string;
  totalNuclei: number;
  activeNuclei: number;
  criticalNuclei: number;
  phaseOmegaDeployed: number;
  sideCompliant: number;
  activeAlerts: number;
}

interface Alert {
  id: string;
  nucleusId: string;
  severity: string;
  alertType: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

const COLORS = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  offline: '#6b7280'
};

export default function CommandCenter() {
  const [selectedNucleus, setSelectedNucleus] = useState<Nucleus | null>(null);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  // Fetch Command Center status
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/command-center/status'],
    refetchInterval: 5000,
  });

  // Fetch all nuclei
  const { data: nucleiData, isLoading: nucleiLoading, refetch: refetchNuclei } = useQuery({
    queryKey: ['/api/command-center/nuclei'],
    refetchInterval: 10000,
  });

  // Fetch alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/command-center/alerts'],
    refetchInterval: 5000,
  });

  // Fetch SIDE compliance
  const { data: complianceData, refetch: refetchCompliance } = useQuery({
    queryKey: ['/api/command-center/side-enforcement/compliance'],
    refetchInterval: 30000, // 30s
  });

  // Fetch external platforms
  const { data: platformsData, refetch: refetchPlatforms } = useQuery({
    queryKey: ['/api/command-center/external-platforms'],
    refetchInterval: 15000, // 15s
  });

  // Fetch Phase Ω status
  const { data: phaseOmegaData, refetch: refetchPhaseOmega } = useQuery({
    queryKey: ['/api/phase-omega/status'],
    refetchInterval: 30000, // 30s - Phase Ω status changes slowly
  });

  // Unified refresh function
  const handleRefresh = () => {
    refetchStatus();
    refetchNuclei();
    refetchAlerts();
    refetchCompliance();
    refetchPlatforms();
    refetchPhaseOmega();
  };

  const status: CommandCenterStatus | undefined = (statusData as any)?.commandCenter;
  const nuclei: Nucleus[] = (nucleiData as any)?.nuclei || [];
  const alerts: Alert[] = (alertsData as any)?.alerts || [];
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const complianceRecords: any[] = (complianceData as any)?.data || [];
  const externalPlatforms: any[] = (platformsData as any)?.platforms || [];
  
  // Phase Ω data
  const phaseOmegaNuclei: any[] = (phaseOmegaData as any)?.nuclei || [];
  const phaseOmegaStats = (phaseOmegaData as any) || { total: 0, fullAutonomy: 0, supervised: 0 };
  
  // Debug logging
  console.log('[Command Center] Compliance Data:', complianceData);
  console.log('[Command Center] Compliance Records:', complianceRecords);
  console.log('[Command Center] External Platforms:', externalPlatforms);
  
  // SIDE Compliance stats
  const nonCompliantNuclei = complianceRecords.filter(c => c.complianceStatus !== 'compliant');
  const criticalCompliance = complianceRecords.filter(c => c.complianceScore < 50);
  const warningCompliance = complianceRecords.filter(c => c.complianceScore >= 50 && c.complianceScore < 80);
  
  console.log('[Command Center] Non-compliant:', nonCompliantNuclei.length);
  
  // External Platforms stats
  const activePlatforms = externalPlatforms.filter(p => p.status === 'active');
  const healthyPlatforms = externalPlatforms.filter(p => p.health >= 80);
  const warningPlatforms = externalPlatforms.filter(p => p.health >= 50 && p.health < 80);
  const criticalPlatforms = externalPlatforms.filter(p => p.health < 50);

  // Group nuclei by type
  const groupedNuclei = nuclei.reduce((acc, nucleus) => {
    if (!acc[nucleus.nucleusType]) {
      acc[nucleus.nucleusType] = [];
    }
    acc[nucleus.nucleusType].push(nucleus);
    return acc;
  }, {} as Record<string, Nucleus[]>);

  // Health distribution data for pie chart
  const healthDistribution = [
    { name: 'Healthy', value: nuclei.filter(n => n.health >= 80).length, color: COLORS.healthy },
    { name: 'Warning', value: nuclei.filter(n => n.health >= 50 && n.health < 80).length, color: COLORS.warning },
    { name: 'Critical', value: nuclei.filter(n => n.health < 50).length, color: COLORS.critical },
  ].filter(d => d.value > 0);

  // Status distribution for bar chart
  const statusDistribution = [
    { status: 'Active', count: nuclei.filter(n => n.status === 'active').length },
    { status: 'Warning', count: nuclei.filter(n => n.status === 'warning').length },
    { status: 'Critical', count: nuclei.filter(n => n.status === 'critical').length },
    { status: 'Offline', count: nuclei.filter(n => n.status === 'offline').length },
  ];

  // Top performing nuclei
  const topPerformers = [...nuclei]
    .sort((a, b) => b.health - a.health)
    .slice(0, 5);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle2;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return Activity;
    }
  };

  // Get health badge variant
  const getHealthVariant = (health: number): "default" | "secondary" | "destructive" => {
    if (health >= 80) return 'default';
    if (health >= 50) return 'secondary';
    return 'destructive';
  };

  // Get severity badge variant
  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-background bg-cyber-grid p-6 space-y-6 relative">
      {/* Ambient Glow Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Living Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className={`particle particle-${(i % 3) + 1}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative">
        <div className="glass-strong rounded-2xl p-6 border-hologram scan-lines">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className="text-4xl font-heading font-bold flex items-center gap-3 text-glow-cyan" data-testid="text-page-title">
                <Crown className="w-10 h-10 text-primary heartbeat" />
                <span className="font-cyber">NICHOLAS 3.2</span>
              </h1>
              <p className="text-foreground/80 mt-2 text-lg font-data flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent living-glow" />
                Supreme Command & Control System
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
                <p className="text-accent/80 text-xs font-mono tracking-wide">
                  SYSTEM CONSCIOUS & AWARE
                </p>
              </div>
              <p className="text-primary/60 mt-1 text-sm font-mono tracking-wide">
                {'>>'} Imperial oversight of 21 nuclei + 12 external platforms
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeAlerts.length > 0 && (
                <Button 
                  onClick={() => setShowAlertsPanel(true)}
                  variant="outline"
                  size="sm"
                  className="glass glow-pink font-data"
                  data-testid="button-view-alerts"
                >
                  <Bell className="w-4 h-4 mr-2 animate-pulse" />
                  ALERTS
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 glow-pink">
                    {activeAlerts.length}
                  </Badge>
                </Button>
              )}
              <Button 
                onClick={handleRefresh} 
                variant="outline"
                size="sm"
                className="glass glow-cyan font-data"
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                REFRESH
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview Cards - Futuristic Metrics */}
      {!statusLoading && status && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          <Card className="glass glow-cyan hover-elevate transition-all breathing" data-testid="card-total-nuclei">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-data text-foreground/90">TOTAL NUCLEI</CardTitle>
              <Server className="h-5 w-5 text-primary living-glow" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-mono font-bold text-primary text-glow-cyan data-pulse">
                {status.totalNuclei}
              </div>
              <p className="text-xs text-foreground/60 font-mono mt-2">
                {'>>'} Across entire empire
              </p>
            </CardContent>
          </Card>

          <Card className="glass glow-green hover-elevate transition-all breathing" data-testid="card-active-nuclei">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-data text-foreground/90">ACTIVE STATUS</CardTitle>
              <Activity className="h-5 w-5 text-accent living-glow" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-mono font-bold text-accent data-pulse">
                {status.activeNuclei}
              </div>
              <p className="text-xs text-foreground/60 font-mono mt-2">
                {'>>'} {status.criticalNuclei} critical
              </p>
            </CardContent>
          </Card>

          <Card className="glass glow-purple hover-elevate transition-all breathing" data-testid="card-phase-omega">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-data text-foreground/90">PHASE Ω</CardTitle>
              <Zap className="h-5 w-5 text-secondary living-glow" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-mono font-bold text-secondary text-glow-purple data-pulse">
                {status.phaseOmegaDeployed}
              </div>
              <p className="text-xs text-foreground/60 font-mono mt-2">
                {'>>'} Evolution active
              </p>
            </CardContent>
          </Card>

          <Card className="glass glow-cyan hover-elevate transition-all breathing" data-testid="card-side-compliance">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-data text-foreground/90">SIDE COMPLIANT</CardTitle>
              <Shield className="h-5 w-5 text-primary living-glow" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-mono font-bold text-primary text-glow-cyan data-pulse">
                {status.sideCompliant}
              </div>
              <p className="text-xs text-foreground/60 font-mono mt-2">
                {'>>'} Integrated successfully
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Health Distribution Chart */}
        <Card data-testid="card-health-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Health Distribution
            </CardTitle>
            <CardDescription>Empire-wide health status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card data-testid="card-status-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Status Overview
            </CardTitle>
            <CardDescription>Current operational status across empire</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0078D4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card data-testid="card-top-performers">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Top Performing Nuclei
          </CardTitle>
          <CardDescription>Highest health scores across the empire</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((nucleus, index) => (
              <div 
                key={nucleus.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                data-testid={`top-performer-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{nucleus.nucleusName}</div>
                    <div className="text-xs text-muted-foreground">{nucleus.arabicName}</div>
                  </div>
                </div>
                <Badge variant={getHealthVariant(nucleus.health)}>
                  {nucleus.health}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SIDE Compliance Enforcement */}
      {nonCompliantNuclei.length > 0 && (
        <Card data-testid="card-side-compliance">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  SIDE Compliance Enforcement
                </CardTitle>
                <CardDescription>Non-compliant nuclei requiring mandatory SIDE integration</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="destructive">{criticalCompliance.length} Critical</Badge>
                <Badge variant="secondary">{warningCompliance.length} Warning</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {nonCompliantNuclei
                  .sort((a, b) => a.complianceScore - b.complianceScore)
                  .map((record) => {
                    const nucleus = nuclei.find(n => n.nucleusId === record.nucleusId);
                    const issuseCount = Array.isArray(record.issues) ? record.issues.length : 0;
                    
                    return (
                      <div 
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover-elevate"
                        data-testid={`compliance-record-${record.nucleusId}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{nucleus?.nucleusName || record.nucleusId}</span>
                            <Badge variant={record.complianceScore < 50 ? 'destructive' : 'secondary'}>
                              {record.complianceScore}% compliance
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {issuseCount} {issuseCount === 1 ? 'issue' : 'issues'}
                            </span>
                            <span>SIDE: {record.sideVersion}</span>
                            <span className="text-xs">
                              Last audit: {record.lastAudit ? format(new Date(record.lastAudit), 'MMM d, HH:mm') : 'Never'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {record.complianceStatus}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Phase Ω Intelligence - Evolutionary Nuclei */}
      {phaseOmegaNuclei.length > 0 && (
        <Card data-testid="card-phase-omega-intelligence">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Phase Ω Intelligence
                </CardTitle>
                <CardDescription>Nuclei with autonomous evolutionary capabilities</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">{phaseOmegaStats.fullAutonomy} Full Autonomy</Badge>
                <Badge variant="secondary">{phaseOmegaStats.supervised} Supervised</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-3">
              {phaseOmegaNuclei.map((nucleus: any) => {
                const isFullAutonomy = nucleus.supervision?.requiresApproval === false;
                const capabilities = nucleus.capabilities || {};
                const activeCapabilities = Object.entries(capabilities)
                  .filter(([key, value]) => value === true)
                  .map(([key]) => key);
                
                return (
                  <div
                    key={nucleus.nucleusId}
                    className="flex flex-col p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 hover-elevate"
                    data-testid={`phase-omega-${nucleus.nucleusId}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {nucleus.nucleusId === 'nicholas' && <Crown className="w-4 h-4 text-yellow-500" />}
                          {nucleus.nucleusName}
                        </div>
                        <div className="text-xs text-muted-foreground">{nucleus.arabicName}</div>
                      </div>
                      <Badge 
                        variant={isFullAutonomy ? 'default' : 'secondary'}
                        className="ml-2 shrink-0"
                      >
                        {isFullAutonomy ? 'Supreme' : 'Supervised'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="shrink-0">
                          {nucleus.category}
                        </Badge>
                        {nucleus.supervision?.supervisedBy && (
                          <span className="text-muted-foreground text-xs">
                            Supervised by: {nucleus.supervision.supervisedBy}
                          </span>
                        )}
                      </div>
                      
                      {nucleus.supervision && (
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline">
                            {nucleus.supervision.maxMutationsPerCycle} mutations/cycle
                          </Badge>
                          {nucleus.supervision.approvalThreshold > 0 && (
                            <Badge variant="outline">
                              {nucleus.supervision.approvalThreshold}% threshold
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="text-xs font-medium text-muted-foreground">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {activeCapabilities.slice(0, 3).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {activeCapabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{activeCapabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
                      <Badge 
                        variant={nucleus.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {nucleus.health}% health
                      </Badge>
                      {nucleus.lastHealthCheck && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(nucleus.lastHealthCheck), 'MMM d, HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supreme Command & Control Tabs */}
      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="command" data-testid="tab-command">
            <Crown className="h-4 w-4 mr-2" />
            Executive Control
          </TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">
            <Zap className="h-4 w-4 mr-2" />
            SIDE Distribution
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4 mt-4">
          <PlatformMonitoringDashboard />
        </TabsContent>

        <TabsContent value="command" className="space-y-4 mt-4">
          <ExecutiveCommandConsole />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4 mt-4">
          <SideDistributionDashboard />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          <AlertSystemDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <PlatformAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Nuclei Grid - Grouped by Type */}
      {nucleiLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading nuclei...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNuclei).map(([type, typeNuclei]) => (
            <div key={type} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize flex items-center gap-2">
                <Database className="w-5 h-5" />
                {type} Nuclei ({typeNuclei.length})
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeNuclei.map((nucleus) => {
                  const StatusIcon = getStatusIcon(nucleus.status);
                  
                  return (
                    <Card 
                      key={nucleus.id} 
                      className={cn(
                        "hover-elevate transition-all cursor-pointer",
                        nucleus.status === 'critical' && "border-red-500/50"
                      )}
                      data-testid={`card-nucleus-${nucleus.nucleusId}`}
                      onClick={() => setSelectedNucleus(nucleus)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <StatusIcon className={cn("w-4 h-4", getStatusColor(nucleus.status))} />
                              {nucleus.nucleusName}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {nucleus.arabicName}
                            </p>
                          </div>
                          
                          <Badge 
                            variant={getHealthVariant(nucleus.health)}
                            className="text-xs"
                          >
                            {nucleus.health}%
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {nucleus.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {nucleus.category}
                          </Badge>
                          
                          {nucleus.priority && (
                            <Badge 
                              variant={nucleus.priority === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {nucleus.priority}
                            </Badge>
                          )}
                          
                          {nucleus.phaseOmegaActive === 1 && (
                            <Badge variant="default" className="text-xs">
                              <Zap className="w-3 h-3 mr-1" />
                              Phase Ω
                            </Badge>
                          )}
                          
                          {nucleus.sideIntegrated === 1 && (
                            <Badge variant="default" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              SIDE
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground capitalize">
                            {nucleus.status}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 text-xs"
                            data-testid={`button-view-${nucleus.nucleusId}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!nucleiLoading && nuclei.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Nuclei Registered</h3>
            <p className="text-muted-foreground">
              Waiting for nuclei to be registered in the empire...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Nucleus Details Modal */}
      <Dialog open={!!selectedNucleus} onOpenChange={(open) => !open && setSelectedNucleus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" data-testid="dialog-nucleus-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-nucleus-name">
              {selectedNucleus && (
                <>
                  {(() => {
                    const StatusIcon = getStatusIcon(selectedNucleus.status);
                    return <StatusIcon className={cn("w-5 h-5", getStatusColor(selectedNucleus.status))} />;
                  })()}
                  {selectedNucleus.nucleusName}
                </>
              )}
            </DialogTitle>
            <DialogDescription data-testid="text-nucleus-arabic-name">
              {selectedNucleus?.arabicName}
            </DialogDescription>
          </DialogHeader>

          {selectedNucleus && (
            <div className="space-y-4">
              {/* Health Overview */}
              <Card data-testid="card-nucleus-health">
                <CardHeader>
                  <CardTitle className="text-sm">Health Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overall Health</span>
                    <Badge variant={getHealthVariant(selectedNucleus.health)} data-testid="badge-health-score">
                      {selectedNucleus.health}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize" data-testid="badge-nucleus-status">
                      {selectedNucleus.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <Badge 
                      variant={selectedNucleus.priority === 'critical' ? 'destructive' : 'secondary'}
                      data-testid="badge-nucleus-priority"
                    >
                      {selectedNucleus.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card data-testid="card-nucleus-features">
                <CardHeader>
                  <CardTitle className="text-sm">Active Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between" data-testid="row-phase-omega">
                    <span className="text-sm text-muted-foreground">Phase Ω Evolution</span>
                    <Badge variant={selectedNucleus.phaseOmegaActive === 1 ? 'default' : 'outline'}>
                      {selectedNucleus.phaseOmegaActive === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between" data-testid="row-side-integration">
                    <span className="text-sm text-muted-foreground">SIDE Integration</span>
                    <Badge variant={selectedNucleus.sideIntegrated === 1 ? 'default' : 'outline'}>
                      {selectedNucleus.sideIntegrated === 1 ? 'Integrated' : 'Not Integrated'}
                    </Badge>
                  </div>
                  {selectedNucleus.evolutionCycles !== undefined && (
                    <div className="flex items-center justify-between" data-testid="row-evolution-cycles">
                      <span className="text-sm text-muted-foreground">Evolution Cycles</span>
                      <span className="text-sm font-semibold">{selectedNucleus.evolutionCycles}</span>
                    </div>
                  )}
                  {selectedNucleus.fitnessScore !== undefined && (
                    <div className="flex items-center justify-between" data-testid="row-fitness-score">
                      <span className="text-sm text-muted-foreground">Fitness Score</span>
                      <span className="text-sm font-semibold">{selectedNucleus.fitnessScore}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Info */}
              <Card data-testid="card-nucleus-system-info">
                <CardHeader>
                  <CardTitle className="text-sm">System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1" data-testid="row-nucleus-type">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <div className="text-sm font-medium capitalize">{selectedNucleus.nucleusType}</div>
                  </div>
                  <div className="space-y-1" data-testid="row-nucleus-category">
                    <span className="text-xs text-muted-foreground">Category</span>
                    <div className="text-sm font-medium">{selectedNucleus.category}</div>
                  </div>
                  <div className="space-y-1" data-testid="row-nucleus-description">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <div className="text-sm">{selectedNucleus.description}</div>
                  </div>
                  {selectedNucleus.lastHealthCheck && (
                    <div className="space-y-1" data-testid="row-last-health-check">
                      <span className="text-xs text-muted-foreground">Last Health Check</span>
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(selectedNucleus.lastHealthCheck), 'PPp')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alerts Panel */}
      <Dialog open={showAlertsPanel} onOpenChange={setShowAlertsPanel}>
        <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="dialog-alerts-panel">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-alerts-title">
              <Bell className="w-5 h-5" />
              Active Alerts ({activeAlerts.length})
            </DialogTitle>
            <DialogDescription data-testid="text-alerts-description">
              Real-time alerts from all nuclei across the empire
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4" data-testid="scroll-alerts-list">
            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-alerts-state">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                  <p className="text-muted-foreground">
                    No active alerts at this time
                  </p>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={cn(
                      "hover-elevate",
                      alert.severity === 'critical' && "border-red-500/50"
                    )}
                    data-testid={`alert-card-${alert.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-sm flex items-center gap-2" data-testid={`alert-title-${alert.id}`}>
                            <AlertCircle className={cn(
                              "w-4 h-4",
                              alert.severity === 'critical' && "text-red-500",
                              alert.severity === 'warning' && "text-yellow-500"
                            )} />
                            {alert.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`alert-nucleus-${alert.id}`}>
                            {alert.nucleusId}
                          </p>
                        </div>
                        <Badge variant={getSeverityVariant(alert.severity)} data-testid={`alert-severity-${alert.id}`}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm" data-testid={`alert-message-${alert.id}`}>{alert.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`alert-time-${alert.id}`}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(alert.createdAt), 'PPp')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs" data-testid={`alert-type-${alert.id}`}>
                          {alert.alertType}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

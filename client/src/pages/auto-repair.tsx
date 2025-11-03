import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Shield, AlertTriangle, CheckCircle, Clock, Wrench, Zap, Database, TrendingUp, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Type definitions
interface AutoRepairStatus {
  success: boolean;
  data: {
    isActive: boolean;
    activeAgents: number;
    timestamp: string;
    history: any[];
  };
}

interface HealthCheck {
  id: string;
  nucleusId: string;
  checkType: string;
  status: string;
  healthScore: number;
  responseTime: number;
  details: any;
  checkedAt: string;
}

interface HealthChecksResponse {
  success: boolean;
  data: {
    checks: HealthCheck[];
    total: number;
  };
}

interface Anomaly {
  id: string;
  nucleusId: string;
  component: string;
  anomalyType: string;
  severity: string;
  description: string;
  detectedMetrics: any;
  resolvedAt?: string;
  detectedAt: string;
}

interface AnomaliesResponse {
  success: boolean;
  data: {
    anomalies: Anomaly[];
    total: number;
  };
}

interface RepairAgent {
  id: string;
  anomalyId: string;
  agentType: string;
  status: string;
  repairStrategy: string;
  progress: number;
  startedAt: string;
  completedAt?: string;
}

interface AgentsResponse {
  success: boolean;
  data: {
    agents: RepairAgent[];
    total: number;
  };
}

interface RepairAction {
  id: string;
  agentId: string;
  actionType: string;
  actionDetails: any;
  status: string;
  executedAt?: string;
  createdAt: string;
}

interface ActionsResponse {
  success: boolean;
  data: {
    actions: RepairAction[];
    total: number;
  };
}

export default function AutoRepairPage() {
  // PHASE 10.9: Data Purity Enforcement
  // NO fallback data, NO mock values - database-only queries
  
  // Fetch Auto-Repair status
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery<AutoRepairStatus>({
    queryKey: ['/api/auto-repair/status'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Fetch health checks
  const { data: healthData, isLoading: healthLoading } = useQuery<HealthChecksResponse>({
    queryKey: ['/api/auto-repair/health-checks'],
    refetchInterval: 10000,
  });

  // Fetch anomalies
  const { data: anomaliesData, isLoading: anomaliesLoading } = useQuery<AnomaliesResponse>({
    queryKey: ['/api/auto-repair/anomalies'],
    refetchInterval: 10000,
  });

  // Fetch repair agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery<AgentsResponse>({
    queryKey: ['/api/auto-repair/agents'],
    refetchInterval: 10000,
  });

  // Fetch repair actions
  const { data: actionsData, isLoading: actionsLoading } = useQuery<ActionsResponse>({
    queryKey: ['/api/auto-repair/actions'],
    refetchInterval: 10000,
  });

  const isLoading = statusLoading || healthLoading || anomaliesLoading;

  // PHASE 10.9: Fail-fast on database errors (no mock fallback)
  if (statusError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="glass border-hot-pink/30 max-w-md">
          <CardHeader>
            <CardTitle className="text-hot-pink">❌ Database Connection Error</CardTitle>
            <CardDescription>
              Auto-Repair system requires real database connection.
              Mock data is not permitted (Phase 10.9).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Error: {(statusError as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalHealthChecks = healthData?.data?.total || 0;
  const healthyChecks = healthData?.data?.checks?.filter((c: HealthCheck) => c.status === 'healthy').length || 0;
  const criticalChecks = healthData?.data?.checks?.filter((c: HealthCheck) => c.status === 'critical').length || 0;
  
  const totalAnomalies = anomaliesData?.data?.total || 0;
  const unresolvedAnomalies = anomaliesData?.data?.anomalies?.filter((a: Anomaly) => !a.resolvedAt).length || 0;
  const criticalAnomalies = anomaliesData?.data?.anomalies?.filter((a: Anomaly) => a.severity === 'critical' && !a.resolvedAt).length || 0;
  
  const activeAgents = agentsData?.data?.agents?.filter((a: RepairAgent) => a.status === 'active').length || 0;
  const totalActions = actionsData?.data?.total || 0;
  const successfulActions = actionsData?.data?.actions?.filter((a: RepairAction) => a.status === 'success').length || 0;

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      healthy: 'bg-neon-green/20 text-neon-green border-neon-green/50',
      degraded: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
      critical: 'bg-hot-pink/20 text-hot-pink border-hot-pink/50',
      active: 'bg-electric-blue/20 text-electric-blue border-electric-blue/50',
      completed: 'bg-neon-green/20 text-neon-green border-neon-green/50',
      failed: 'bg-hot-pink/20 text-hot-pink border-hot-pink/50',
    };
    
    return (
      <Badge 
        data-testid={`badge-status-${status}`}
        className={`${statusColors[status] || 'bg-gray-500/20 text-gray-500 border-gray-500/50'} border`}
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityColors: Record<string, string> = {
      low: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
      medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
      high: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
      critical: 'bg-hot-pink/20 text-hot-pink border-hot-pink/50',
    };
    
    return (
      <Badge 
        data-testid={`badge-severity-${severity}`}
        className={`${severityColors[severity] || 'bg-gray-500/20 text-gray-500 border-gray-500/50'} border`}
      >
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 
          className="text-3xl font-bold tracking-wider text-electric-blue glow-text"
          data-testid="heading-auto-repair"
        >
          🔧 AUTO-REPAIR SYSTEM
        </h1>
        <p className="text-muted-foreground">
          Phase 9.7 → 10.3: Self-Healing Infrastructure
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-electric-blue/30">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engine Status</CardTitle>
            <Shield className={`h-4 w-4 ${statusData?.data?.isActive ? 'text-neon-green' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {statusData?.data?.isActive ? (
                <span className="text-neon-green" data-testid="text-engine-active">ACTIVE</span>
              ) : (
                <span className="text-muted-foreground" data-testid="text-engine-inactive">INACTIVE</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Self-healing system
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-neon-green/30">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Checks</CardTitle>
            <Activity className="h-4 w-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-neon-green" data-testid="text-health-checks">
              {healthyChecks}/{totalHealthChecks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalChecks > 0 && (
                <span className="text-hot-pink">{criticalChecks} critical</span>
              )}
              {criticalChecks === 0 && <span>All systems healthy</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-hot-pink/30">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-hot-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-hot-pink" data-testid="text-anomalies">
              {unresolvedAnomalies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalAnomalies > 0 && (
                <span className="text-hot-pink">{criticalAnomalies} critical</span>
              )}
              {criticalAnomalies === 0 && unresolvedAnomalies > 0 && <span>No critical issues</span>}
              {unresolvedAnomalies === 0 && <span>No active anomalies</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-cyber-purple/30">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repair Agents</CardTitle>
            <Wrench className="h-4 w-4 text-cyber-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-cyber-purple" data-testid="text-active-agents">
              {activeAgents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalActions} total actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="bg-background/50 backdrop-blur-sm border border-electric-blue/30">
          <TabsTrigger value="health" data-testid="tab-health">
            <Activity className="h-4 w-4 mr-2" />
            Health Checks
          </TabsTrigger>
          <TabsTrigger value="anomalies" data-testid="tab-anomalies">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Wrench className="h-4 w-4 mr-2" />
            Repair Agents
          </TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">
            <Zap className="h-4 w-4 mr-2" />
            Repair Actions
          </TabsTrigger>
        </TabsList>

        {/* Health Checks Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent Health Checks</CardTitle>
              <CardDescription>System component health monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              {healthData?.data?.checks && healthData.data.checks.length > 0 ? (
                <div className="space-y-4">
                  {healthData.data.checks.map((check: HealthCheck) => (
                    <div 
                      key={check.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-electric-blue/20 hover-elevate"
                      data-testid={`health-check-${check.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium font-mono text-electric-blue">
                            {check.nucleusId} / {check.checkType}
                          </h4>
                          {getStatusBadge(check.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Health Score: <span className="font-mono text-neon-green">{check.healthScore}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {check.responseTime}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(() => {
                              const dateObj = new Date(check.checkedAt);
                              return !isNaN(dateObj.getTime()) 
                                ? formatDistanceToNow(dateObj, { addSuffix: true })
                                : 'Recently';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No health checks recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Detected Anomalies</CardTitle>
              <CardDescription>System anomalies and issues</CardDescription>
            </CardHeader>
            <CardContent>
              {anomaliesData?.data?.anomalies && anomaliesData.data.anomalies.length > 0 ? (
                <div className="space-y-4">
                  {anomaliesData.data.anomalies.map((anomaly: Anomaly) => (
                    <div 
                      key={anomaly.id} 
                      className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-hot-pink/20 hover-elevate"
                      data-testid={`anomaly-${anomaly.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-hot-pink" />
                            <h4 className="font-medium font-mono text-electric-blue">
                              {anomaly.nucleusId} / {anomaly.component}
                            </h4>
                            {getSeverityBadge(anomaly.severity)}
                            {anomaly.resolvedAt && (
                              <Badge className="bg-neon-green/20 text-neon-green border-neon-green/50 border">
                                RESOLVED
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Type: <span className="font-mono text-cyber-purple">{anomaly.anomalyType}</span></span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(() => {
                                const dateObj = new Date(anomaly.detectedAt);
                                return !isNaN(dateObj.getTime()) 
                                  ? formatDistanceToNow(dateObj, { addSuffix: true })
                                  : 'Recently';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-neon-green opacity-50" />
                  <p>No anomalies detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repair Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Repair Agents</CardTitle>
              <CardDescription>Autonomous repair agents deployed to fix issues</CardDescription>
            </CardHeader>
            <CardContent>
              {agentsData?.data?.agents && agentsData.data.agents.length > 0 ? (
                <div className="space-y-4">
                  {agentsData.data.agents.map((agent: RepairAgent) => (
                    <div 
                      key={agent.id} 
                      className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-cyber-purple/20 hover-elevate"
                      data-testid={`agent-${agent.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4 text-cyber-purple" />
                            <h4 className="font-medium font-mono text-electric-blue">
                              {agent.agentType}
                            </h4>
                            {getStatusBadge(agent.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Strategy: <span className="font-mono text-cyan-400">{agent.repairStrategy}</span>
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Progress: <span className="font-mono text-neon-green">{agent.progress}%</span></span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started {(() => {
                                const dateObj = new Date(agent.startedAt);
                                return !isNaN(dateObj.getTime()) 
                                  ? formatDistanceToNow(dateObj, { addSuffix: true })
                                  : 'recently';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No repair agents deployed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repair Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Repair Actions</CardTitle>
              <CardDescription>Automated repair actions executed by agents</CardDescription>
            </CardHeader>
            <CardContent>
              {actionsData?.data?.actions && actionsData.data.actions.length > 0 ? (
                <div className="space-y-4">
                  {actionsData.data.actions.map((action: RepairAction) => (
                    <div 
                      key={action.id} 
                      className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-electric-blue/20 hover-elevate"
                      data-testid={`action-${action.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-electric-blue" />
                            <h4 className="font-medium font-mono text-electric-blue">
                              {action.actionType}
                            </h4>
                            {getStatusBadge(action.status)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Agent: <span className="font-mono text-cyber-purple">{action.agentId}</span></span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(() => {
                                const dateToFormat = action.executedAt || action.createdAt;
                                const dateObj = new Date(dateToFormat);
                                const isValidDate = !isNaN(dateObj.getTime());
                                
                                if (!isValidDate) return 'Recently';
                                
                                return action.executedAt 
                                  ? `Executed ${formatDistanceToNow(dateObj, { addSuffix: true })}`
                                  : `Created ${formatDistanceToNow(dateObj, { addSuffix: true })}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No repair actions executed yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

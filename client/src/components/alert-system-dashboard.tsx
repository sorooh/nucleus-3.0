/**
 * 🔔 Alert System Dashboard
 * =========================
 * Real-time alert monitoring and management
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle, 
  CheckCircle2, 
  Bell,
  BellOff,
  Trash2,
  RefreshCw,
  Shield,
  Activity,
  TrendingUp,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
type AlertCategory = 'health' | 'compliance' | 'performance' | 'security';

interface Alert {
  id: number;
  nucleusId: string;
  severity: AlertSeverity;
  alertType: string;
  title: string;
  message: string;
  category: AlertCategory;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

interface AlertStats {
  totalPlatforms: number;
  platformsWithAlerts: number;
  platformsHealthy: number;
  alertBreakdown: {
    critical: number;
    error: number;
    warning: number;
  };
}

export function AlertSystemDashboard() {
  const { toast } = useToast();

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{
    success: boolean;
    alerts: Alert[];
  }>({
    queryKey: ['/api/monitor/alerts'],
    refetchInterval: 5000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    stats: AlertStats;
  }>({
    queryKey: ['/api/monitor/alerts/stats'],
    refetchInterval: 5000,
  });

  const checkAlertsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/monitor/alerts/check', 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Alert Check Complete',
        description: 'All platforms have been checked for alert conditions',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/alerts/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Alert Check Failed',
        description: error.message || 'Failed to check alerts',
        variant: 'destructive',
      });
    },
  });

  const clearOldAlertsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/monitor/alerts/clear-old', 'DELETE');
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Old Alerts Cleared',
        description: 'Alerts older than 24 hours have been removed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/alerts/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Clear Failed',
        description: error.message || 'Failed to clear old alerts',
        variant: 'destructive',
      });
    },
  });

  const stats = statsData?.stats;
  const alerts = alertsData?.alerts || [];

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" data-testid="icon-critical" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-orange-500" data-testid="icon-error" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" data-testid="icon-warning" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" data-testid="icon-info" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" data-testid={`badge-critical`}>Critical</Badge>;
      case 'error':
        return <Badge variant="destructive" data-testid={`badge-error`}>Error</Badge>;
      case 'warning':
        return <Badge variant="secondary" data-testid={`badge-warning`}>Warning</Badge>;
      case 'info':
        return <Badge variant="outline" data-testid={`badge-info`}>Info</Badge>;
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'health':
        return <Activity className="w-4 h-4" />;
      case 'compliance':
        return <Shield className="w-4 h-4" />;
      case 'performance':
        return <TrendingUp className="w-4 h-4" />;
      case 'security':
        return <Lock className="w-4 h-4" />;
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const errorAlerts = activeAlerts.filter(a => a.severity === 'error');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-active-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-alerts">
              {alertsLoading ? '...' : activeAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="text-critical-alerts">
              {statsLoading ? '...' : stats?.alertBreakdown.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">Platforms affected</p>
          </CardContent>
        </Card>

        <Card data-testid="card-error-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500" data-testid="text-error-alerts">
              {statsLoading ? '...' : stats?.alertBreakdown.error || 0}
            </div>
            <p className="text-xs text-muted-foreground">Platforms affected</p>
          </CardContent>
        </Card>

        <Card data-testid="card-warning-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-warning-alerts">
              {statsLoading ? '...' : stats?.alertBreakdown.warning || 0}
            </div>
            <p className="text-xs text-muted-foreground">Platforms affected</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card data-testid="card-actions">
        <CardHeader>
          <CardTitle>Alert Actions</CardTitle>
          <CardDescription>Manage platform alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => checkAlertsMutation.mutate()}
              disabled={checkAlertsMutation.isPending}
              data-testid="button-check-alerts"
            >
              {checkAlertsMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Check All Platforms
            </Button>
            <Button
              variant="outline"
              onClick={() => clearOldAlertsMutation.mutate()}
              disabled={clearOldAlertsMutation.isPending}
              data-testid="button-clear-old"
            >
              {clearOldAlertsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Clear Old Alerts
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/monitor/alerts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/monitor/alerts/stats'] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card data-testid="card-alerts-list">
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>All alerts from platform monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" data-testid="tabs-alerts">
            <TabsList>
              <TabsTrigger value="active" data-testid="tab-active">
                Active ({activeAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="critical" data-testid="tab-critical">
                Critical ({criticalAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="error" data-testid="tab-error">
                Error ({errorAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="warning" data-testid="tab-warning">
                Warning ({warningAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({alerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <AlertsList alerts={activeAlerts} isLoading={alertsLoading} getSeverityIcon={getSeverityIcon} getSeverityBadge={getSeverityBadge} getCategoryIcon={getCategoryIcon} />
            </TabsContent>

            <TabsContent value="critical">
              <AlertsList alerts={criticalAlerts} isLoading={alertsLoading} getSeverityIcon={getSeverityIcon} getSeverityBadge={getSeverityBadge} getCategoryIcon={getCategoryIcon} />
            </TabsContent>

            <TabsContent value="error">
              <AlertsList alerts={errorAlerts} isLoading={alertsLoading} getSeverityIcon={getSeverityIcon} getSeverityBadge={getSeverityBadge} getCategoryIcon={getCategoryIcon} />
            </TabsContent>

            <TabsContent value="warning">
              <AlertsList alerts={warningAlerts} isLoading={alertsLoading} getSeverityIcon={getSeverityIcon} getSeverityBadge={getSeverityBadge} getCategoryIcon={getCategoryIcon} />
            </TabsContent>

            <TabsContent value="all">
              <AlertsList alerts={alerts} isLoading={alertsLoading} getSeverityIcon={getSeverityIcon} getSeverityBadge={getSeverityBadge} getCategoryIcon={getCategoryIcon} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface AlertsListProps {
  alerts: Alert[];
  isLoading: boolean;
  getSeverityIcon: (severity: AlertSeverity) => JSX.Element;
  getSeverityBadge: (severity: AlertSeverity) => JSX.Element;
  getCategoryIcon: (category: AlertCategory) => JSX.Element;
}

function AlertsList({ alerts, isLoading, getSeverityIcon, getSeverityBadge, getCategoryIcon }: AlertsListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No alerts found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2 pr-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="hover-elevate" data-testid={`card-alert-${alert.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold" data-testid={`text-alert-title-${alert.id}`}>
                          {alert.title}
                        </h4>
                        {getSeverityBadge(alert.severity)}
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getCategoryIcon(alert.category)}
                          <span className="capitalize">{alert.category}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-alert-message-${alert.id}`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Platform: <span className="font-mono">{alert.nucleusId}</span></span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                        {alert.status === 'acknowledged' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Acknowledged
                            </span>
                          </>
                        )}
                        {alert.status === 'resolved' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

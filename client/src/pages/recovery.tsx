import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, AlertTriangle, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { Loader2 } from "lucide-react";

interface RecoveryAction {
  id: string;
  timestamp: number;
  type: string;
  component: string;
  success: boolean;
  duration?: number;
}

interface ErrorLog {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  message: string;
  stack?: string;
}

interface HealthStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  message?: string;
}

interface RecoveryAnalytics {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  successRate: number;
  avgRecoveryTime: number;
}

export default function RecoveryPage() {
  const { data: recoveriesData, isLoading: recoveriesLoading } = useQuery<{
    success: boolean;
    data: { count: number; recoveries: RecoveryAction[] };
  }>({
    queryKey: ['/api/recovery/recoveries'],
    refetchInterval: 10000,
  });

  const { data: errorsData, isLoading: errorsLoading } = useQuery<{
    success: boolean;
    data: { count: number; errors: ErrorLog[] };
  }>({
    queryKey: ['/api/recovery/errors'],
    refetchInterval: 10000,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery<{
    success: boolean;
    data: { count: number; statuses: HealthStatus[] };
  }>({
    queryKey: ['/api/recovery/health'],
    refetchInterval: 5000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    success: boolean;
    data: RecoveryAnalytics;
  }>({
    queryKey: ['/api/recovery/analytics'],
    refetchInterval: 10000,
  });

  if (recoveriesLoading || errorsLoading || healthLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'default';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'unhealthy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Amsterdam'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-recovery">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-recovery">
            <RefreshCcw className="h-8 w-8 text-primary" />
            الاسترداد والإعادات
          </h1>
          <p className="text-muted-foreground mt-1">
            مراقبة عمليات الاسترداد وحالة المكونات
          </p>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-recoveries">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاسترداد</CardTitle>
            <RefreshCcw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-recoveries">
              {analyticsData?.data?.totalRecoveries || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total Recovery Attempts
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-success-rate">
              {analyticsData?.data?.successRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Success Rate
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-time">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الوقت</CardTitle>
            <Clock className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-time">
              {analyticsData?.data?.avgRecoveryTime?.toFixed(0) || 0}ms
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average Recovery Time
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-errors">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأخطاء</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-errors">
              {errorsData?.data?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total Error Logs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Health Status */}
      <Card data-testid="card-health-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            حالة المكونات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthData?.data?.statuses && healthData.data.statuses.length > 0 ? (
            <div className="space-y-3">
              {healthData.data.statuses.map((status, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`health-${status.component}`}>
                  <div className="flex items-center gap-3">
                    {status.status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {status.status === 'degraded' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                    {status.status === 'unhealthy' && <XCircle className="h-5 w-5 text-red-500" />}
                    <div>
                      <div className="font-medium">{status.component}</div>
                      <div className="text-sm text-muted-foreground">
                        {status.message || 'No message'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        آخر فحص: {formatTimestamp(status.lastCheck)}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getHealthColor(status.status)} data-testid={`badge-health-${status.component}`}>
                    {status.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد بيانات صحة متاحة
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recovery Actions History */}
      <Card data-testid="card-recovery-history">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            سجل عمليات الاسترداد
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recoveriesData?.data?.recoveries && recoveriesData.data.recoveries.length > 0 ? (
            <div className="space-y-3">
              {recoveriesData.data.recoveries.map((recovery) => (
                <div key={recovery.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`recovery-${recovery.id}`}>
                  <div className="flex items-center gap-3">
                    {recovery.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{recovery.component}</div>
                      <div className="text-sm text-muted-foreground">
                        النوع: {recovery.type} • المدة: {recovery.duration || 0}ms
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(recovery.timestamp)}
                      </div>
                    </div>
                  </div>
                  <Badge variant={recovery.success ? 'default' : 'destructive'} data-testid={`badge-recovery-${recovery.id}`}>
                    {recovery.success ? 'نجح' : 'فشل'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد عمليات استرداد مسجلة
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Card data-testid="card-error-logs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            سجل الأخطاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorsData?.data?.errors && errorsData.data.errors.length > 0 ? (
            <div className="space-y-3">
              {errorsData.data.errors.slice(0, 20).map((error) => (
                <div key={error.id} className="flex items-start justify-between p-3 rounded-md bg-muted/50" data-testid={`error-${error.id}`}>
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${error.severity === 'critical' || error.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{error.source}</div>
                      <div className="text-sm text-muted-foreground break-words">
                        {error.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(error.timestamp)}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getSeverityColor(error.severity)} className="shrink-0" data-testid={`badge-error-${error.id}`}>
                    {error.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد أخطاء مسجلة
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

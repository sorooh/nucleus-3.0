import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, Zap, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";

interface PulseAnalytics {
  currentMood: string;
  currentLoadIndex: number;
  avgLoadIndex: number;
  moodDistribution: Record<string, number>;
  stressDistribution: Record<string, number>;
  totalDataPoints: number;
}

interface DashboardStats {
  success: boolean;
  data: {
    brain: {
      status: string;
      avgPerformance: number;
      totalProcessed: number;
    };
    bots: {
      active: number;
      total: number;
      performance: number;
    };
    cache: {
      enabled: boolean;
    };
    memory: {
      enabled: boolean;
    };
  };
}

export default function PerformancePage() {
  const { data: pulseData, isLoading: pulseLoading } = useQuery<PulseAnalytics>({
    queryKey: ['/api/pulse/analytics'],
    refetchInterval: 5000,
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 5000,
  });

  if (pulseLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getMoodColor = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'stable':
      case 'healthy':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'stressed':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStressColor = (stress: string) => {
    switch (stress.toLowerCase()) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-performance">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-performance">
            <Activity className="h-8 w-8 text-primary" />
            الأداء والمراقبة
          </h1>
          <p className="text-muted-foreground mt-1">
            مراقبة أداء النظام في الوقت الفعلي
          </p>
        </div>
      </div>

      {/* System Pulse Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-current-mood">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالة النظام</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-mood">
              {pulseData?.currentMood || 'Unknown'}
            </div>
            <Badge variant={getMoodColor(pulseData?.currentMood || '')} className="mt-2">
              System Mood
            </Badge>
          </CardContent>
        </Card>

        <Card data-testid="card-load-index">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مؤشر الحمل</CardTitle>
            <Cpu className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-load">
              {pulseData?.currentLoadIndex?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              متوسط: {pulseData?.avgLoadIndex?.toFixed(1) || '0.0'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-brain-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أداء Brain Core</CardTitle>
            <Zap className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-brain-performance">
              {dashboardData?.data?.brain?.avgPerformance || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData?.data?.brain?.totalProcessed || 0} معالج
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-bot-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أداء البوتات</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-bot-performance">
              {dashboardData?.data?.bots?.performance || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData?.data?.bots?.active || 0} / {dashboardData?.data?.bots?.total || 0} نشط
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mood Distribution */}
      <Card data-testid="card-mood-distribution">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            توزيع حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            {Object.entries(pulseData?.moodDistribution || {}).map(([mood, count]) => (
              <div key={mood} className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted/50">
                <Badge variant={getMoodColor(mood)} data-testid={`badge-mood-${mood.toLowerCase()}`}>
                  {mood}
                </Badge>
                <div className="text-2xl font-bold" data-testid={`text-mood-count-${mood.toLowerCase()}`}>
                  {count}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((count / (pulseData?.totalDataPoints || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stress Distribution */}
      <Card data-testid="card-stress-distribution">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            توزيع مستوى الضغط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(pulseData?.stressDistribution || {}).map(([stress, count]) => (
              <div key={stress} className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted/50">
                <Badge variant={getStressColor(stress)} data-testid={`badge-stress-${stress.toLowerCase()}`}>
                  {stress}
                </Badge>
                <div className="text-2xl font-bold" data-testid={`text-stress-count-${stress.toLowerCase()}`}>
                  {count}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((count / (pulseData?.totalDataPoints || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Services Status */}
      <Card data-testid="card-system-services">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            حالة الخدمات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Brain Core</div>
                  <div className="text-sm text-muted-foreground">
                    {dashboardData?.data?.brain?.status === 'active' ? 'نشط' : 'معطل'}
                  </div>
                </div>
              </div>
              <Badge 
                variant={dashboardData?.data?.brain?.status === 'active' ? 'default' : 'destructive'}
                data-testid="badge-brain-status"
              >
                {dashboardData?.data?.brain?.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-chart-3" />
                <div>
                  <div className="font-medium">Redis Cache</div>
                  <div className="text-sm text-muted-foreground">
                    {dashboardData?.data?.cache?.enabled ? 'مفعل' : 'معطل'}
                  </div>
                </div>
              </div>
              <Badge 
                variant={dashboardData?.data?.cache?.enabled ? 'default' : 'secondary'}
                data-testid="badge-cache-status"
              >
                {dashboardData?.data?.cache?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-chart-4" />
                <div>
                  <div className="font-medium">Memory Hub</div>
                  <div className="text-sm text-muted-foreground">
                    {dashboardData?.data?.memory?.enabled ? 'مفعل' : 'معطل'}
                  </div>
                </div>
              </div>
              <Badge 
                variant={dashboardData?.data?.memory?.enabled ? 'default' : 'secondary'}
                data-testid="badge-memory-status"
              >
                {dashboardData?.data?.memory?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Points Summary */}
      <Card data-testid="card-data-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ملخص البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold" data-testid="text-total-datapoints">
              {pulseData?.totalDataPoints?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              إجمالي نقاط البيانات المسجلة
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

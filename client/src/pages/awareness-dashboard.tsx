import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Brain, Network, AlertTriangle, CheckCircle2, XCircle, Zap, TrendingUp, Database } from 'lucide-react';

export default function AwarenessDashboard() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/awareness/status'],
    refetchInterval: 5000
  });

  const { data: report } = useQuery({
    queryKey: ['/api/awareness/report'],
    refetchInterval: 10000
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/awareness/activate', { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/awareness/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awareness/report'] });
    }
  });

  const cycleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/awareness/cycle', { method: 'POST' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/awareness/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awareness/report'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-spin mx-auto text-primary consciousness-pulse" />
          <p className="mt-4 text-muted-foreground font-mono">جاري تحميل نظام الوعي...</p>
        </div>
      </div>
    );
  }

  const overallProgress = (status as any)?.status?.overallProgress || 0;
  const components = (status as any)?.status?.components || {};
  const discoveries = (status as any)?.status?.discoveries || {};

  return (
    <div className="p-6 space-y-6 relative bg-cyber-grid">
      {/* Ambient Glow Background + Living Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Living Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
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
      <div className="space-y-2 relative z-10">
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-3" data-testid="text-dashboard-title">
          <Brain className="w-8 h-8 text-primary heartbeat" />
          <span className="font-cyber text-glow-cyan">طبقة الوعي - Conscious Awareness Layer</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
          <p className="text-muted-foreground font-mono">
            Phase 3.2 → 5.0: Nicholas Self-Awareness System
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
            data-testid="button-activate"
            className="hover-elevate active-elevate-2"
          >
            <Zap className="w-4 h-4 mr-2 living-glow" />
            تفعيل النظام
          </Button>
          <Button
            onClick={() => cycleMutation.mutate()}
            disabled={cycleMutation.isPending}
            variant="outline"
            data-testid="button-cycle"
            className="hover-elevate active-elevate-2"
          >
            <Activity className="w-4 h-4 mr-2" />
            دورة جديدة
          </Button>
        </div>
      </div>

      {/* Overall Progress Card */}
      <Card data-testid="card-progress" className="glass breathing hover-elevate transition-all relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 w-5 text-primary living-glow" />
            <span className="font-cyber">مستوى الوعي الكلي</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-data">Nicholas Consciousness Level</span>
              <span className="text-2xl font-mono font-bold text-primary data-pulse" data-testid="text-progress">
                {overallProgress}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {(report as any)?.summary?.consciousness || 'System initializing...'}
          </p>
        </CardContent>
      </Card>

      {/* Components Grid */}
      <div className="grid gap-4 md:grid-cols-3 relative z-10">
        {/* Log Processor */}
        <Card data-testid="card-logprocessor" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">قارئ السجلات</CardTitle>
            <Database className="h-5 w-5 text-chart-4 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse mb-2" data-testid="text-logs-collected">
              {components.logProcessor?.totalLogsCollected || 0}
            </div>
            <div className="flex items-center gap-2 mb-3">
              {components.logProcessor?.isActive ? (
                <Badge variant="default" data-testid="badge-logprocessor-status">
                  <Activity className="w-3 h-3 mr-1 heartbeat" />
                  نشط
                </Badge>
              ) : (
                <Badge variant="outline" data-testid="badge-logprocessor-status">غير نشط</Badge>
              )}
            </div>
            <Progress value={components.logProcessor?.progress || 0} className="h-2 mb-2" data-testid="progress-logprocessor" />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>الأنظمة المراقبة</span>
              <span data-testid="text-nuclei-count">{components.logProcessor?.nucleiCount || 21}</span>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Graph */}
        <Card data-testid="card-knowledgegraph" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">خريطة المعرفة</CardTitle>
            <Network className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse mb-2" data-testid="text-relationships">
              {components.knowledgeGraph?.relationshipsCount || 0}
            </div>
            <div className="flex items-center gap-2 mb-3">
              {components.knowledgeGraph?.isBuilt ? (
                <Badge variant="default" data-testid="badge-knowledgegraph-status">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  جاهز
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-knowledgegraph-status">قيد البناء</Badge>
              )}
            </div>
            <Progress value={components.knowledgeGraph?.progress || 0} className="h-2 mb-2" data-testid="progress-knowledgegraph" />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>المسارات الحرجة</span>
              <span data-testid="text-critical-paths">{discoveries.criticalPaths || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Problem Diagnoser */}
        <Card data-testid="card-diagnoser" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">محرك التشخيص</CardTitle>
            <AlertTriangle className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse mb-2" data-testid="text-issues">
              {discoveries.issues || 0}
            </div>
            <div className="flex items-center gap-2 mb-3">
              {components.problemDiagnoser?.isActive ? (
                <Badge variant="default" data-testid="badge-diagnoser-status">
                  <Activity className="w-3 h-3 mr-1 heartbeat" />
                  نشط
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-diagnoser-status">غير نشط</Badge>
              )}
            </div>
            <Progress value={components.problemDiagnoser?.progress || 0} className="h-2 mb-2" data-testid="progress-diagnoser" />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>المشاكل الحرجة</span>
              <span className="text-destructive" data-testid="text-critical-issues">{components.problemDiagnoser?.criticalIssues || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      {(report as any)?.summary?.healthStatus && (
        <Card className="glass relative z-10" data-testid="card-health">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(report as any).summary.healthStatus.includes('CRITICAL') ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : (report as any).summary.healthStatus.includes('HEALTHY') ? (
                <CheckCircle2 className="w-5 h-5 text-chart-3 living-glow" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-chart-2" />
              )}
              <span className="font-cyber">حالة النظام الصحية</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold mb-4 font-mono" data-testid="text-health-status">
              {(report as any).summary.healthStatus}
            </p>
            {(report as any).summary.recommendations && (report as any).summary.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground font-data">التوصيات:</h4>
                <ul className="space-y-1">
                  {(report as any).summary.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2 font-mono">
                      <span className="text-primary mt-0.5 consciousness-pulse">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Discoveries */}
      <Card className="glass relative z-10" data-testid="card-discoveries">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary heartbeat" />
            <span className="font-cyber">الاكتشافات الحية</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-md bg-muted/50 hover-elevate transition-all">
              <div className="text-xs text-muted-foreground mb-1 font-data">الأنماط المكتشفة</div>
              <div className="text-2xl font-bold font-mono text-primary data-pulse" data-testid="text-patterns-count">
                {discoveries.patterns?.length || 0}
              </div>
            </div>
            <div className="p-4 rounded-md bg-muted/50 hover-elevate transition-all">
              <div className="text-xs text-muted-foreground mb-1 font-data">المسارات الحرجة</div>
              <div className="text-2xl font-bold font-mono text-primary data-pulse" data-testid="text-critical-paths-count">
                {discoveries.criticalPaths || 0}
              </div>
            </div>
            <div className="p-4 rounded-md bg-muted/50 hover-elevate transition-all">
              <div className="text-xs text-muted-foreground mb-1 font-data">المشاكل النشطة</div>
              <div className="text-2xl font-bold font-mono text-primary data-pulse" data-testid="text-active-issues">
                {discoveries.issues || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

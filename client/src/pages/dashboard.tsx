import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Cpu, Database, Server, Activity, Zap, Network, Bot, Plug, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  brain: {
    status: string;
    totalProcessed: number;
    avgPerformance: number;
  };
  cache: {
    enabled: boolean;
  };
  memory: {
    enabled: boolean;
  };
  bots: {
    total: number;
    active: number;
    performance: number;
  };
  platforms: {
    total: number;
    healthy: number;
    avgHealth: number;
  };
}

interface ConnectorStats {
  id: string;
  name: string;
  lastSync: string | null;
  itemsAdded: number;
  status: 'active' | 'paused' | 'error' | 'disabled';
  duration: number;
  lastError: string | null;
}

interface ConnectorStatus {
  active: boolean;
  totalConnectors: number;
  enabledConnectors: number;
  stats: ConnectorStats[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: connectorData } = useQuery<ConnectorStatus>({
    queryKey: ['/api/connectors/status'],
    refetchInterval: 30000, // Refresh every 30s
  });


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'disabled': return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      error: 'destructive',
      disabled: 'outline',
      paused: 'secondary',
    };
    return variants[status] || 'outline';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Cpu className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const dashboardData = stats?.data;

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
          <span className="font-cyber text-glow-cyan">👑 EMPEROR NICHOLAS - Phase Ω</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
          <p className="text-muted-foreground font-mono">
            Phase 12.0 - Genesis Factory / Replication System
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        {/* Brain Core Status */}
        <Card data-testid="card-brain-core" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Brain Core</CardTitle>
            <Brain className="h-5 w-5 text-primary living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-brain-status">
              {dashboardData?.brain.status === 'active' ? 'نشط' : 'معطل'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" data-testid="badge-brain-performance">
                أداء: {dashboardData?.brain.avgPerformance}%
              </Badge>
              <Badge variant="outline" data-testid="badge-brain-processed">
                {dashboardData?.brain.totalProcessed} معالج
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cache Layer */}
        <Card data-testid="card-cache" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Redis Cache</CardTitle>
            <Zap className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-cache-status">
              {dashboardData?.cache.enabled ? 'مفعل' : 'معطل'}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              تسريع الردود من 12-30s إلى 2-3s
            </p>
          </CardContent>
        </Card>

        {/* Vector Memory */}
        <Card data-testid="card-memory" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Vector Memory</CardTitle>
            <Database className="h-5 w-5 text-chart-4 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-memory-status">
              {dashboardData?.memory.enabled ? 'مفعل' : 'معطل'}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              ذاكرة طويلة المدى بـ Embeddings
            </p>
          </CardContent>
        </Card>

        {/* Bots */}
        <Card data-testid="card-bots" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">البوتات النشطة</CardTitle>
            <Bot className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-bots-count">
              {dashboardData?.bots.active} / {dashboardData?.bots.total}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" data-testid="badge-bots-performance">
                أداء: {dashboardData?.bots.performance}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brain Layers Info */}
      <Card data-testid="card-brain-layers" className="glass relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 heartbeat" />
            <span className="font-cyber">الطبقات السبعة للذكاء الاصطناعي</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Language Understanding", nameAr: "فهم اللغة", Icon: Brain },
              { name: "Context Analysis", nameAr: "تحليل السياق", Icon: Activity },
              { name: "Intent Recognition", nameAr: "تمييز النوايا", Icon: Zap },
              { name: "Knowledge Retrieval", nameAr: "استرجاع المعرفة", Icon: Database },
              { name: "Response Generation", nameAr: "توليد الردود", Icon: Cpu },
              { name: "Quality Assurance", nameAr: "ضمان الجودة", Icon: Server },
              { name: "Learning Layer", nameAr: "طبقة التعلم", Icon: Network },
            ].map((layer, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate transition-all">
                <layer.Icon className="h-5 w-5 text-primary consciousness-pulse" />
                <div>
                  <div className="font-medium text-sm font-data">{layer.nameAr}</div>
                  <div className="text-xs text-muted-foreground font-mono">{layer.name}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* External Intelligence Feed System */}
      <Card data-testid="card-connectors" className="glass relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 living-glow" />
            <span className="font-cyber">نظام التغذية الخارجي - External Intelligence Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Connector Status Summary */}
          <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={connectorData?.active ? 'default' : 'outline'} data-testid="badge-connector-status">
                  {connectorData?.active ? 'نشط' : 'معطل'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {connectorData?.enabledConnectors || 0} / {connectorData?.totalConnectors || 0} موصل
                </span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              data-testid="button-refresh-connectors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>

          {/* Connector Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectorData?.stats.map((connector) => (
              <Card key={connector.id} data-testid={`card-connector-${connector.id}`} className="glass breathing hover-elevate transition-all">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="consciousness-pulse">{getStatusIcon(connector.status)}</span>
                    <CardTitle className="text-sm font-data">{connector.name}</CardTitle>
                  </div>
                  <Badge variant={getStatusBadge(connector.status)} data-testid={`badge-connector-status-${connector.id}`}>
                    {connector.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">آخر مزامنة:</span>
                    <span className="font-medium" data-testid={`text-connector-lastsync-${connector.id}`}>
                      {connector.lastSync 
                        ? new Date(connector.lastSync).toLocaleString('en-US', { 
                            dateStyle: 'short', 
                            timeStyle: 'short',
                            timeZone: 'Europe/Amsterdam'
                          })
                        : 'لم يتم بعد'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">العناصر المضافة:</span>
                    <Badge variant="secondary" data-testid={`badge-connector-items-${connector.id}`}>
                      {connector.itemsAdded}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">المدة:</span>
                    <span className="font-medium">{connector.duration}ms</span>
                  </div>
                  {connector.lastError && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      {connector.lastError}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {(!connectorData || connectorData.stats.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد موصلات خارجية</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

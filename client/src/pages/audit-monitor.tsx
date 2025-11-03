import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Search, Shield, Play, Wrench, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AuditFailure {
  id: string;
  nucleusName: string;
  fileName: string;
  failureType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  failureReason: string;
  stackTrace: string | null;
  detectedAt: string;
  fixedAt: string | null;
  evidenceSnapshot: any;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

interface AuditStats {
  total: number;
  openIssues: number;
  resolvedIssues: number;
  criticalIssues: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byNucleus: Record<string, number>;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export default function AuditMonitor() {
  const [selectedIssue, setSelectedIssue] = useState<AuditFailure | null>(null);
  const [filterNucleus, setFilterNucleus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; data: AuditStats }>({
    queryKey: ['/api/audit/failures/stats'],
  });

  const { data: failures, isLoading: failuresLoading } = useQuery<{ success: boolean; data: AuditFailure[] }>({
    queryKey: ['/api/audit/failures?limit=100'],
  });

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/audit/run', 'POST', {});
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "✅ تم تشغيل الفحص بنجاح",
        description: data?.message || "جاري فحص جميع الأنظمة...",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/audit/failures/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit/failures?limit=100'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ فشل تشغيل الفحص",
        description: error.message || "حدث خطأ أثناء تشغيل الفحص",
      });
    }
  });

  const repairMutation = useMutation({
    mutationFn: async (failureId: string) => {
      const res = await apiRequest(`/api/audit/repair/${failureId}`, 'POST', {});
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "✅ تم الإصلاح بنجاح" : "⚠️ فشل الإصلاح",
        description: data.message || (data.success ? "تم إصلاح المشكلة تلقائياً" : "يتطلب مراجعة يدوية"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/audit/failures/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit/failures?limit=100'] });
      setSelectedIssue(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ فشل الإصلاح",
        description: error.message || "حدث خطأ أثناء محاولة الإصلاح",
      });
    }
  });

  if (!stats?.success || !failures?.success || statsLoading || failuresLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">جاري تحميل محرك المراجعة...</p>
        </div>
      </div>
    );
  }

  const statsData = stats.data;
  const failuresData = failures.data || [];

  const filteredFailures = failuresData.filter(failure => {
    const matchesNucleus = filterNucleus === "all" || failure.nucleusName === filterNucleus;
    const matchesSeverity = filterSeverity === "all" || failure.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || failure.status === filterStatus;
    const matchesSearch = searchTerm === "" || 
      failure.failureReason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      failure.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      failure.nucleusName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesNucleus && matchesSeverity && matchesStatus && matchesSearch;
  });

  const uniqueNuclei = Array.from(new Set(failuresData.map(f => f.nucleusName).filter(Boolean)));

  const complianceScore = ((statsData.resolvedIssues / Math.max(statsData.total, 1)) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6 relative bg-cyber-grid">
      {/* Ambient Glow Background + Living Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary heartbeat" />
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight font-cyber text-glow-cyan" data-testid="text-audit-title">
                محرك المراجعة المتقدم
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
                <p className="text-muted-foreground font-mono text-sm">
                  نظام احترافي لتتبع المشاكل والإصلاح التلقائي
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => runAuditMutation.mutate()}
            disabled={runAuditMutation.isPending}
            size="lg"
            data-testid="button-run-audit"
          >
            <Play className="w-4 h-4 mr-2" />
            {runAuditMutation.isPending ? 'جاري الفحص...' : 'اختبار النظام'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        <Card data-testid="card-compliance" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">نسبة الامتثال</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-compliance">
              {parseFloat(complianceScore).toFixed(1)}/100
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              معدل حل المشاكل المكتشفة
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">مشاكل حرجة</CardTitle>
            <AlertCircle className="h-5 w-5 text-destructive living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-critical">
              {statsData.criticalIssues}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              تتطلب إصلاح فوري
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-open" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">مشاكل مفتوحة</CardTitle>
            <Clock className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-open">
              {statsData.openIssues}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              قيد المعالجة حالياً
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-resolved" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">مشاكل محلولة</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-resolved">
              {statsData.resolvedIssues}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              تم إصلاحها بنجاح
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 consciousness-pulse" />
            <span className="font-cyber">فلترة وبحث</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في المشاكل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Select value={filterNucleus} onValueChange={setFilterNucleus}>
              <SelectTrigger className="w-full lg:w-48" data-testid="select-nucleus">
                <SelectValue placeholder="النواة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-nucleus-all">جميع النوى</SelectItem>
                {uniqueNuclei.map(nucleus => (
                  <SelectItem key={nucleus} value={nucleus}>{nucleus}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-full lg:w-48" data-testid="select-severity">
                <SelectValue placeholder="الخطورة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                <SelectItem value="critical">حرجة</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48" data-testid="select-status">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="detected">مكتشفة</SelectItem>
                <SelectItem value="acknowledged">معترف بها</SelectItem>
                <SelectItem value="fixing">قيد الإصلاح</SelectItem>
                <SelectItem value="fixed">محلولة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Failures Grid */}
      <Card className="glass relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 heartbeat" />
              <span className="font-cyber">المشاكل المكتشفة</span>
            </CardTitle>
            <Badge variant="secondary" data-testid="badge-count">
              {filteredFailures.length} مشكلة
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFailures.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-chart-2 consciousness-pulse" />
              <p className="text-xl font-bold mb-2">لا توجد مشاكل!</p>
              <p className="text-muted-foreground">جميع الأنظمة تعمل بشكل سليم</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFailures.map((failure) => (
                <Card 
                  key={failure.id}
                  className="glass breathing hover-elevate transition-all cursor-pointer"
                  onClick={() => setSelectedIssue(failure)}
                  data-testid={`failure-card-${failure.id}`}
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive consciousness-pulse" />
                      <CardTitle className="text-sm font-data line-clamp-1">
                        {failure.nucleusName || 'Unknown'}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant={failure.severity === 'critical' ? 'destructive' : 'secondary'}
                      data-testid={`badge-severity-${failure.id}`}
                    >
                      {failure.severity}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">نوع المشكلة:</p>
                      <p className="text-sm font-medium">{failure.failureType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">السبب:</p>
                      <p className="text-sm line-clamp-2">{failure.failureReason}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge variant="outline" data-testid={`badge-status-${failure.id}`}>
                        {failure.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(failure.detectedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Dialog */}
      {selectedIssue && (
        <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <DialogTitle className="text-2xl mb-2">تفاصيل المشكلة</DialogTitle>
                  <DialogDescription>
                    {selectedIssue.nucleusName} - {selectedIssue.failureType}
                  </DialogDescription>
                </div>
                <Badge 
                  variant={selectedIssue.severity === 'critical' ? 'destructive' : 'secondary'}
                >
                  {selectedIssue.severity.toUpperCase()}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">الحالة</p>
                      <Badge variant="outline">{selectedIssue.status}</Badge>
                    </div>
                    <Button
                      onClick={() => repairMutation.mutate(selectedIssue.id)}
                      disabled={repairMutation.isPending || selectedIssue.status === 'fixed'}
                      data-testid="button-auto-repair"
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      {repairMutation.isPending ? 'جاري الإصلاح...' : 'إصلاح تلقائي'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">اكتشف بتاريخ</p>
                      <p>{formatDate(selectedIssue.detectedAt)}</p>
                    </div>
                    {selectedIssue.fixedAt && (
                      <div>
                        <p className="text-muted-foreground mb-1">تم الإصلاح بتاريخ</p>
                        <p>{formatDate(selectedIssue.fixedAt)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">وصف المشكلة</p>
                  <p className="mb-4">{selectedIssue.failureReason}</p>
                  
                  {selectedIssue.fileName && (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">الملف المتأثر</p>
                      <code className="block bg-muted p-2 rounded text-sm font-mono">
                        {selectedIssue.fileName}
                      </code>
                    </>
                  )}
                </CardContent>
              </Card>

              {selectedIssue.stackTrace && (
                <Card className="glass">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-2">Stack Trace</p>
                    <pre className="bg-muted p-4 rounded text-xs overflow-x-auto font-mono">
                      {selectedIssue.stackTrace}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {selectedIssue.evidenceSnapshot && (
                <Card className="glass">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-2">Evidence Snapshot</p>
                    <pre className="bg-muted p-4 rounded text-xs overflow-x-auto font-mono">
                      {JSON.stringify(selectedIssue.evidenceSnapshot, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

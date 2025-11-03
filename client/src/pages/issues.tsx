import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
} from "lucide-react";

interface AuditFailure {
  id: string;
  nucleusName?: string;
  fileName?: string;
  moduleType?: string;
  endpoint: string;
  method: string;
  pageUrl?: string;
  failureType: string;
  failureReason: string;
  stackTrace?: string;
  severity: string;
  status: string;
  assignedTo?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  evidenceSnapshot?: any;
  requestPayload?: any;
  responsePayload?: any;
  detectedAt: string;
  fixedAt?: string;
  testedBy: string;
}

interface IssueStats {
  total: number;
  openIssues: number;
  resolvedIssues: number;
  criticalIssues: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byNucleus: Record<string, number>;
}

export default function IssuesPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [nucleusFilter, setNucleusFilter] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<AuditFailure | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch statistics
  const { data: stats } = useQuery<{ success: boolean; data: IssueStats }>({
    queryKey: ["/api/audit/failures/stats"],
  });

  // Fetch failures
  const { data: failuresResponse, isLoading } = useQuery<{
    success: boolean;
    data: AuditFailure[];
  }>({
    queryKey: ["/api/audit/failures", { limit: 1000 }],
    queryFn: async () => {
      const res = await fetch('/api/audit/failures?limit=1000');
      if (!res.ok) throw new Error('Failed to fetch failures');
      return res.json();
    },
  });

  const failures = failuresResponse?.data || [];
  const statistics = stats?.data;

  // Filter failures
  const filteredFailures = failures.filter((f) => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (nucleusFilter !== "all" && f.nucleusName !== nucleusFilter) return false;
    return true;
  });

  // Update issue status mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      resolvedBy,
      resolutionNotes,
    }: {
      id: string;
      status: string;
      resolvedBy?: string;
      resolutionNotes?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/audit/failures/${id}`, { 
        status, 
        resolvedBy, 
        resolutionNotes 
      });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all queries that start with /api/audit/failures
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/audit/failures');
        }
      });
      toast({
        title: "✅ تم التحديث بنجاح",
        description: "تم تحديث حالة المشكلة",
      });
      setSelectedIssue(null);
      setResolutionNotes("");
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل تحديث حالة المشكلة",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsFixed = () => {
    if (!selectedIssue) return;
    updateMutation.mutate({
      id: selectedIssue.id,
      status: "fixed",
      resolvedBy: "nicholas-admin",
      resolutionNotes,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "fixed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "fixing":
        return <Clock className="h-4 w-4" />;
      case "ignored":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fixed":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "fixing":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "acknowledged":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "ignored":
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
      default:
        return "bg-red-500/10 text-red-600 dark:text-red-400";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "high":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
    toast({
      title: "تم النسخ ✅",
      description: `تم نسخ ${label} إلى الحافظة`,
    });
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "تم التحميل ✅",
      description: `تم تحميل ${filename}`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <AlertTriangle className="h-8 w-8 text-primary" />
          مراقبة المشاكل / Issues Management
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          نظام تتبع ذكي متكامل لإدارة الأخطاء والمشاكل في جميع الأنوية
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-issues">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشاكل</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{statistics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">جميع المشاكل المسجلة</p>
          </CardContent>
        </Card>

        <Card data-testid="card-open-issues">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المشاكل المفتوحة</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-open-count">
              {statistics?.openIssues || 0}
            </div>
            <p className="text-xs text-muted-foreground">تحتاج إلى معالجة</p>
          </CardContent>
        </Card>

        <Card data-testid="card-resolved-issues">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المشاكل المحلولة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-resolved-count">
              {statistics?.resolvedIssues || 0}
            </div>
            <p className="text-xs text-muted-foreground">تم حلها بنجاح</p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-issues">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حرجة / Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-critical-count">
              {statistics?.criticalIssues || 0}
            </div>
            <p className="text-xs text-muted-foreground">مشاكل عالية الأولوية</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            الفلاتر / Filters
          </CardTitle>
          <CardDescription>تصفية المشاكل حسب الحالة والأولوية والنواة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">الحالة / Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="detected">مكتشفة (Detected)</SelectItem>
                  <SelectItem value="acknowledged">معتمدة (Acknowledged)</SelectItem>
                  <SelectItem value="fixing">قيد الإصلاح (Fixing)</SelectItem>
                  <SelectItem value="fixed">محلولة (Fixed)</SelectItem>
                  <SelectItem value="ignored">متجاهلة (Ignored)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الأولوية / Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger data-testid="select-severity-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="critical">حرجة (Critical)</SelectItem>
                  <SelectItem value="high">عالية (High)</SelectItem>
                  <SelectItem value="medium">متوسطة (Medium)</SelectItem>
                  <SelectItem value="low">منخفضة (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">النواة / Nucleus</label>
              <Select value={nucleusFilter} onValueChange={setNucleusFilter}>
                <SelectTrigger data-testid="select-nucleus-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنوية</SelectItem>
                  {statistics?.byNucleus &&
                    Object.keys(statistics.byNucleus).map((nucleus) => (
                      <SelectItem key={nucleus} value={nucleus}>
                        {nucleus} ({statistics.byNucleus[nucleus]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المشاكل ({filteredFailures.length})</CardTitle>
          <CardDescription>اضغط على أي مشكلة لعرض التفاصيل الكاملة</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : filteredFailures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد مشاكل تطابق الفلاتر المحددة
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFailures.map((failure) => (
                <div
                  key={failure.id}
                  className="border rounded-lg p-4 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setSelectedIssue(failure)}
                  data-testid={`issue-row-${failure.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(failure.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(failure.status)}
                            {failure.status}
                          </span>
                        </Badge>
                        <Badge className={getSeverityColor(failure.severity)}>
                          {failure.severity}
                        </Badge>
                        {failure.nucleusName && (
                          <Badge variant="outline">{failure.nucleusName}</Badge>
                        )}
                        {failure.moduleType && (
                          <Badge variant="secondary">{failure.moduleType}</Badge>
                        )}
                      </div>
                      
                      <div>
                        <div className="font-medium">{failure.endpoint}</div>
                        <div className="text-sm text-muted-foreground">
                          {failure.failureReason}
                        </div>
                        {failure.fileName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            📁 {failure.fileName}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {new Date(failure.detectedAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIssue(failure);
                      }}
                      data-testid={`button-view-${failure.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Details Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              تفاصيل المشكلة / Issue Details
            </DialogTitle>
            <DialogDescription>
              {selectedIssue?.endpoint} - {selectedIssue?.method}
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">الحالة / Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedIssue.status)}>
                      {selectedIssue.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">الأولوية / Severity</label>
                  <div className="mt-1">
                    <Badge className={getSeverityColor(selectedIssue.severity)}>
                      {selectedIssue.severity}
                    </Badge>
                  </div>
                </div>
                {selectedIssue.nucleusName && (
                  <div>
                    <label className="text-sm font-medium">النواة / Nucleus</label>
                    <div className="mt-1 text-sm">{selectedIssue.nucleusName}</div>
                  </div>
                )}
                {selectedIssue.fileName && (
                  <div>
                    <label className="text-sm font-medium">الملف / File</label>
                    <div className="mt-1 text-sm font-mono text-xs bg-muted p-2 rounded">
                      {selectedIssue.fileName}
                    </div>
                  </div>
                )}
              </div>

              {/* Failure Reason */}
              <div>
                <label className="text-sm font-medium flex items-center justify-between">
                  سبب الفشل / Failure Reason
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(selectedIssue.failureReason, "سبب الفشل")
                    }
                  >
                    {copiedText === "سبب الفشل" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </label>
                <div className="mt-1 bg-muted p-3 rounded text-sm">
                  {selectedIssue.failureReason}
                </div>
              </div>

              {/* Stack Trace */}
              {selectedIssue.stackTrace && (
                <div>
                  <label className="text-sm font-medium flex items-center justify-between">
                    Stack Trace
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(selectedIssue.stackTrace!, "Stack Trace")
                        }
                      >
                        {copiedText === "Stack Trace" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadAsFile(
                            selectedIssue.stackTrace!,
                            `error-${selectedIssue.id}.log`
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </label>
                  <pre className="mt-1 bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-60">
                    {selectedIssue.stackTrace}
                  </pre>
                </div>
              )}

              {/* Evidence Snapshot */}
              {selectedIssue.evidenceSnapshot && (
                <div>
                  <label className="text-sm font-medium flex items-center justify-between">
                    Evidence Snapshot
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(selectedIssue.evidenceSnapshot, null, 2),
                          "Evidence"
                        )
                      }
                    >
                      {copiedText === "Evidence" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </label>
                  <pre className="mt-1 bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedIssue.evidenceSnapshot, null, 2)}
                  </pre>
                </div>
              )}

              {/* Resolution Section */}
              {selectedIssue.status !== "fixed" && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium">ملاحظات الحل / Resolution Notes</label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="اكتب ملاحظات حول كيفية حل المشكلة..."
                    className="mt-2"
                    rows={3}
                    data-testid="textarea-resolution-notes"
                  />
                </div>
              )}

              {selectedIssue.resolutionNotes && (
                <div>
                  <label className="text-sm font-medium">ملاحظات الحل السابقة</label>
                  <div className="mt-1 bg-green-500/10 p-3 rounded text-sm">
                    {selectedIssue.resolutionNotes}
                  </div>
                  {selectedIssue.resolvedBy && (
                    <div className="text-xs text-muted-foreground mt-1">
                      تم الحل بواسطة: {selectedIssue.resolvedBy}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIssue(null)}>
              إغلاق
            </Button>
            {selectedIssue?.status !== "fixed" && (
              <Button
                onClick={handleMarkAsFixed}
                disabled={updateMutation.isPending}
                data-testid="button-mark-fixed"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "جاري التحديث..." : "تم الحل ✅"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

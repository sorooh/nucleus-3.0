import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface KnowledgeFeed {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploaderName: string;
  status: "queued" | "processing" | "completed" | "error";
  chunksCount: number;
  summary: string | null;
  errorMessage: string | null;
  processingTime: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface Analytics {
  totalFeeds: number;
  completed: number;
  errors: number;
  processing: number;
  totalChunks: number;
  avgChunksPerFeed: number;
}

export default function KnowledgeFeed() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch feed history
  const { data: history, isLoading: historyLoading } = useQuery<{ history: KnowledgeFeed[] }>({
    queryKey: ['/api/knowledge/history'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch analytics
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['/api/knowledge/analytics'],
    refetchInterval: 5000,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      setUploading(true);
      setUploadProgress(30);

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(60);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل رفع الملف');
      }

      setUploadProgress(100);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ تم الرفع بنجاح",
        description: `جاري تحليل: ${data.fileName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge/analytics'] });
      setUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ خطأ في الرفع",
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "الأنواع المقبولة: txt, md, pdf, docx",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى: 20 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      processing: "secondary",
      error: "destructive",
      queued: "outline",
    };
    return variants[status] || "outline";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-knowledge-feed-title">
          📚 تغذية المعرفة - Knowledge Feed
        </h1>
        <p className="text-muted-foreground">
          رفع الملفات وتحويلها إلى معرفة قابلة للبحث والاستخدام
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-feeds">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الملفات</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-feeds">
                {analytics.totalFeeds}
              </div>
              <p className="text-xs text-muted-foreground">
                مكتملة: {analytics.completed} | أخطاء: {analytics.errors}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-chunks">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المقاطع</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-chunks">
                {analytics.totalChunks}
              </div>
              <p className="text-xs text-muted-foreground">
                معدل: {analytics.avgChunksPerFeed} لكل ملف
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-processing">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد المعالجة</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-processing">
                {analytics.processing}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-success-rate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-success-rate">
                {analytics.totalFeeds > 0
                  ? Math.round((analytics.completed / analytics.totalFeeds) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <Card data-testid="card-upload">
        <CardHeader>
          <CardTitle>🔄 تغذية معرفة جديدة</CardTitle>
          <CardDescription>
            رفع ملف (txt, md, pdf, docx) - حتى 20 ميجابايت
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".txt,.md,.pdf,.docx"
                onChange={handleFileSelect}
                disabled={uploading}
                data-testid="input-file-upload"
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
                data-testid="button-upload"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'جاري الرفع...' : 'اختر ملف للرفع'}
              </Button>
              <p className="text-sm text-muted-foreground">
                الأنواع المدعومة: txt, md, pdf, docx
              </p>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>جاري التحليل...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} data-testid="progress-upload" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card data-testid="card-history">
        <CardHeader>
          <CardTitle>سجل التغذية - آخر 20 عملية</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : history?.history.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-2 text-muted-foreground">لا توجد عمليات تغذية بعد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحالة</TableHead>
                  <TableHead>اسم الملف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المقاطع</TableHead>
                  <TableHead>الرافع</TableHead>
                  <TableHead>الوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.history.map((feed) => (
                  <TableRow key={feed.id} data-testid={`row-feed-${feed.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(feed.status)}
                        <Badge variant={getStatusBadge(feed.status)} data-testid={`badge-status-${feed.id}`}>
                          {feed.status === 'completed' && 'مكتمل'}
                          {feed.status === 'processing' && 'جاري المعالجة'}
                          {feed.status === 'error' && 'خطأ'}
                          {feed.status === 'queued' && 'في الانتظار'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-filename-${feed.id}`}>
                      {feed.originalName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-type-${feed.id}`}>
                        {feed.fileType}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-chunks-${feed.id}`}>
                      {feed.chunksCount > 0 ? feed.chunksCount : '-'}
                    </TableCell>
                    <TableCell data-testid={`text-uploader-${feed.id}`}>
                      {feed.uploaderName}
                    </TableCell>
                    <TableCell data-testid={`text-time-${feed.id}`}>
                      {formatDistanceToNow(new Date(feed.createdAt), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

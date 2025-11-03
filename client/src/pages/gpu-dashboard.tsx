import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Power, PowerOff, Activity, Server, Zap, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GPUDashboard() {
  const { toast } = useToast();

  const { data: gpuInfo, isLoading: infoLoading } = useQuery({
    queryKey: ['/api/gpu/info'],
    refetchInterval: 5000
  });

  const { data: gpuStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/gpu/status'],
    refetchInterval: 5000
  });

  const { data: gpuHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/gpu/health'],
    refetchInterval: 10000
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/gpu/start', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'نجاح ✅',
        description: 'تم تشغيل GPU Pod بنجاح',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gpu/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ ❌',
        description: error.message || 'فشل تشغيل GPU Pod',
        variant: 'destructive'
      });
    }
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/gpu/stop', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'نجاح ✅',
        description: 'تم إيقاف GPU Pod بنجاح',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gpu/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ ❌',
        description: error.message || 'فشل إيقاف GPU Pod',
        variant: 'destructive'
      });
    }
  });

  const configured = (gpuInfo as any)?.data?.gpu?.configured;
  const status = (gpuStatus as any)?.data?.status || 'UNKNOWN';
  const healthy = (gpuHealth as any)?.data?.healthy || false;

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            GPU Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            التحكم بخادم Ollama على RunPod GPU
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/gpu/info'] });
              queryClient.invalidateQueries({ queryKey: ['/api/gpu/status'] });
              queryClient.invalidateQueries({ queryKey: ['/api/gpu/health'] });
            }}
            data-testid="button-refresh-gpu"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-gpu-configuration">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالة الإعداد</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {configured ? (
              <div className="flex items-center gap-2" data-testid="status-configured">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-500">مُعد</span>
              </div>
            ) : (
              <div className="flex items-center gap-2" data-testid="status-not-configured">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-500">غير مُعد</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {configured ? 'جميع المفاتيح موجودة' : 'تحقق من المفاتيح السرية'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-gpu-pod-status">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالة GPU Pod</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2" data-testid={`status-pod-${status.toLowerCase()}`}>
              {status === 'RUNNING' ? (
                <Badge variant="default" className="bg-green-500">
                  <Zap className="h-3 w-3 ml-1" />
                  يعمل
                </Badge>
              ) : status === 'STOPPED' ? (
                <Badge variant="secondary">
                  <PowerOff className="h-3 w-3 ml-1" />
                  متوقف
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  {status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-pod-id">
              Pod ID: {(gpuStatus as any)?.data?.id || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-ollama-health">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالة Ollama</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2" data-testid={healthy ? "status-healthy" : "status-unhealthy"}>
              {healthy ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-500">نشط</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-500">غير متاح</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {healthy ? 'جاهز للاستخدام' : 'تحقق من الاتصال'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GPU Configuration */}
      <Card data-testid="card-gpu-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            إعدادات GPU
          </CardTitle>
          <CardDescription>معلومات RunPod Pod</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pod ID</p>
              <p className="font-mono text-sm" data-testid="text-gpu-pod-id">{(gpuInfo as any)?.data?.gpu?.podId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API Endpoint</p>
              <p className="font-mono text-sm truncate" data-testid="text-gpu-endpoint">{(gpuInfo as any)?.data?.gpu?.endpoint || 'N/A'}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => startMutation.mutate()}
              disabled={!configured || status === 'RUNNING' || startMutation.isPending}
              data-testid="button-start-gpu"
            >
              <Power className="h-4 w-4 ml-2" />
              تشغيل GPU
            </Button>
            <Button
              variant="destructive"
              onClick={() => stopMutation.mutate()}
              disabled={!configured || status !== 'RUNNING' || stopMutation.isPending}
              data-testid="button-stop-gpu"
            >
              <PowerOff className="h-4 w-4 ml-2" />
              إيقاف GPU
            </Button>
          </div>

          {!configured && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4" data-testid="alert-missing-secrets">
              <p className="text-sm text-yellow-500">
                يجب إضافة المفاتيح التالية في Secrets:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-500 mt-2 space-y-1">
                <li>RUNPOD_API_KEY - مفتاح API من RunPod</li>
                <li>POD_ID - معرف GPU Pod</li>
                <li>OLLAMA_BASE_URL - رابط Ollama HTTPS</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ollama Configuration */}
      <Card data-testid="card-ollama-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            إعدادات Ollama
          </CardTitle>
          <CardDescription>نموذج Llama 3.3 70B</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">النموذج</p>
              <p className="font-mono text-sm" data-testid="text-ollama-model">{(gpuInfo as any)?.data?.ollama?.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base URL</p>
              <p className="font-mono text-sm truncate" data-testid="text-ollama-url">{(gpuInfo as any)?.data?.ollama?.baseURL || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2" data-testid="list-model-features">
            <p className="font-semibold text-sm">مميزات النموذج:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {(gpuInfo as any)?.data?.ollama?.info?.features?.map((feature: string, idx: number) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
          </div>

          {(gpuHealth as any)?.data?.models && (gpuHealth as any).data.models.length > 0 && (
            <div data-testid="list-available-models">
              <p className="text-sm text-muted-foreground mb-2">النماذج المتاحة:</p>
              <div className="flex flex-wrap gap-2">
                {(gpuHealth as any).data.models.map((model: any, idx: number) => (
                  <Badge key={idx} variant="outline">{model.name || model}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Details */}
      {gpuStatus && (
        <Card data-testid="card-status-details">
          <CardHeader>
            <CardTitle>تفاصيل الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto" dir="ltr" data-testid="pre-status-json">
              {JSON.stringify((gpuStatus as any).data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

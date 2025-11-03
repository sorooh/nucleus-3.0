import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, CheckCircle2, XCircle, ArrowDownUp } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  mode: string;
  lastSync?: string;
  messageCount: number;
}

interface Exchange {
  id: string;
  platform: string;
  direction: string;
  dataType: string;
  status: string;
  processedAt: string;
}

export default function PlatformsPage() {
  const { data: platformsData, isLoading: platformsLoading } = useQuery<{ platforms: Platform[] }>({
    queryKey: ['/api/integration/platforms'],
  });

  const { data: exchangesData, isLoading: exchangesLoading } = useQuery<{ exchanges: Exchange[] }>({
    queryKey: ['/api/integration/exchanges'],
  });

  const { data: statusData } = useQuery<{ active: boolean; totalPlatforms: number }>({
    queryKey: ['/api/integration/status'],
  });

  if (platformsLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-platforms">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const platforms = platformsData?.platforms || [];
  const exchanges = exchangesData?.exchanges || [];

  return (
    <div className="h-full overflow-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="heading-platforms">
          نواقل المعرفة الموحدة 🚌
        </h1>
        <p className="text-muted-foreground">
          ربط جميع منصات سروح (B2B، B2C، CE، Accounting) مع Memory Hub
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={statusData?.active ? "default" : "destructive"} data-testid="badge-system-status">
              {statusData?.active ? "نشط" : "معطل"}
            </Badge>
            <span className="text-muted-foreground" data-testid="text-platform-count">
              {statusData?.totalPlatforms || 0} منصة مسجلة
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Platforms Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">المنصات المتصلة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <Card key={platform.id} data-testid={`card-platform-${platform.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{platform.name}</span>
                  {platform.status === 'connected' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" data-testid={`icon-connected-${platform.id}`} />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" data-testid={`icon-disconnected-${platform.id}`} />
                  )}
                </CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الحالة:</span>
                    <Badge 
                      variant={platform.status === 'connected' ? "default" : "outline"}
                      data-testid={`badge-status-${platform.id}`}
                    >
                      {platform.status === 'connected' ? 'متصل' : 'غير متصل'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الوضع:</span>
                    <span data-testid={`text-mode-${platform.id}`}>{platform.mode}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الرسائل:</span>
                    <span data-testid={`text-messages-${platform.id}`}>{platform.messageCount}</span>
                  </div>
                  {platform.lastSync && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">آخر مزامنة:</span>
                      <span className="text-xs" data-testid={`text-sync-${platform.id}`}>
                        {new Date(platform.lastSync).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Knowledge Exchanges */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5" />
          سجل التبادلات المعرفية
        </h2>
        {exchangesLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : exchanges.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لا توجد تبادلات معرفية حتى الآن
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {exchanges.map((exchange) => (
              <Card key={exchange.id} data-testid={`card-exchange-${exchange.id}`}>
                <CardContent className="py-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">المنصة:</span>
                      <Badge variant="outline" className="mr-2" data-testid={`badge-platform-${exchange.id}`}>
                        {exchange.platform}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الاتجاه:</span>
                      <span className="mr-2" data-testid={`text-direction-${exchange.id}`}>
                        {exchange.direction === 'INBOUND' ? '⬇️ وارد' : '⬆️ صادر'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">النوع:</span>
                      <span className="mr-2" data-testid={`text-type-${exchange.id}`}>
                        {exchange.dataType}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحالة:</span>
                      <Badge 
                        variant={exchange.status === 'completed' ? 'default' : 'outline'}
                        className="mr-2"
                        data-testid={`badge-exchange-status-${exchange.id}`}
                      >
                        {exchange.status === 'completed' ? 'مكتمل' : exchange.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التوقيت:</span>
                      <span className="text-xs mr-2" data-testid={`text-timestamp-${exchange.id}`}>
                        {new Date(exchange.processedAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

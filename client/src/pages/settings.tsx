import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Shield, Database, Zap, Clock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-settings">
            <SettingsIcon className="h-8 w-8 text-primary" />
            الإعدادات
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة إعدادات النظام والتكوينات
          </p>
        </div>
      </div>

      {/* System Configuration */}
      <Card data-testid="card-system-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            تكوين النظام
          </CardTitle>
          <CardDescription>
            الإعدادات الأساسية للنواة المركزية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">وضع التشغيل</div>
                <div className="text-sm text-muted-foreground">
                  البيئة الحالية للنظام
                </div>
              </div>
              <Badge variant="default" data-testid="badge-environment">
                {import.meta.env.DEV ? 'Development' : 'Production'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">API Endpoint</div>
                <div className="text-sm text-muted-foreground">
                  عنوان الـ API الرئيسي
                </div>
              </div>
              <Badge variant="secondary" data-testid="badge-api-endpoint">
                /api/*
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card data-testid="card-security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            الأمان
          </CardTitle>
          <CardDescription>
            إعدادات الأمان والحماية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">HMAC Authentication</div>
                <div className="text-sm text-muted-foreground">
                  التحقق من التوقيع الرقمي
                </div>
              </div>
              <Badge variant="default" data-testid="badge-hmac">
                مفعل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">JWT Tokens</div>
                <div className="text-sm text-muted-foreground">
                  رموز المصادقة الآمنة
                </div>
              </div>
              <Badge variant="default" data-testid="badge-jwt">
                مفعل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">Rate Limiting</div>
                <div className="text-sm text-muted-foreground">
                  حماية من الهجمات
                </div>
              </div>
              <Badge variant="default" data-testid="badge-rate-limit">
                مفعل
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card data-testid="card-data-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            إدارة البيانات
          </CardTitle>
          <CardDescription>
            إعدادات قاعدة البيانات والذاكرة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">PostgreSQL Database</div>
                <div className="text-sm text-muted-foreground">
                  قاعدة البيانات الرئيسية
                </div>
              </div>
              <Badge variant="default" data-testid="badge-postgres">
                متصل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">Redis Cache</div>
                <div className="text-sm text-muted-foreground">
                  ذاكرة التخزين المؤقت
                </div>
              </div>
              <Badge variant="default" data-testid="badge-redis">
                مفعل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">Vector Embeddings</div>
                <div className="text-sm text-muted-foreground">
                  تضمينات المتجهات للذاكرة
                </div>
              </div>
              <Badge variant="default" data-testid="badge-vectors">
                مفعل
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card data-testid="card-performance-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            الأداء
          </CardTitle>
          <CardDescription>
            إعدادات تحسين الأداء
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">Auto-Recovery</div>
                <div className="text-sm text-muted-foreground">
                  الاسترداد التلقائي من الأخطاء
                </div>
              </div>
              <Badge variant="default" data-testid="badge-auto-recovery">
                مفعل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">Health Checks</div>
                <div className="text-sm text-muted-foreground">
                  فحص صحة المكونات (كل 30 ثانية)
                </div>
              </div>
              <Badge variant="default" data-testid="badge-health-checks">
                مفعل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">System Pulse</div>
                <div className="text-sm text-muted-foreground">
                  مراقبة النبض (كل 5 دقائق)
                </div>
              </div>
              <Badge variant="default" data-testid="badge-pulse">
                مفعل
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card data-testid="card-integrations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            التكاملات الخارجية
          </CardTitle>
          <CardDescription>
            إعدادات التكامل مع المنصات الخارجية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">OpenAI Integration</div>
                <div className="text-sm text-muted-foreground">
                  ذكاء اصطناعي متقدم
                </div>
              </div>
              <Badge variant="default" data-testid="badge-openai">
                متصل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">Anthropic Integration</div>
                <div className="text-sm text-muted-foreground">
                  Claude AI
                </div>
              </div>
              <Badge variant="default" data-testid="badge-anthropic">
                متصل
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div>
                <div className="font-medium">External Connectors</div>
                <div className="text-sm text-muted-foreground">
                  أخبار، طقس، عملات رقمية
                </div>
              </div>
              <Badge variant="default" data-testid="badge-connectors">
                5 مفعل
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

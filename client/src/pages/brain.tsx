import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, Zap, Database, Cpu, Server, Network } from "lucide-react";
import { Loader2 } from "lucide-react";

interface DashboardStats {
  success: boolean;
  data: {
    brain: {
      status: string;
      avgPerformance: number;
      totalProcessed: number;
    };
  };
}

const brainLayers = [
  {
    id: 1,
    name: "Language Understanding",
    nameAr: "فهم اللغة",
    description: "تحليل وفهم اللغة الطبيعية بدقة عالية",
    icon: Brain,
    color: "text-chart-1"
  },
  {
    id: 2,
    name: "Context Analysis",
    nameAr: "تحليل السياق",
    description: "فهم السياق والعلاقات بين المعلومات",
    icon: Activity,
    color: "text-chart-2"
  },
  {
    id: 3,
    name: "Intent Recognition",
    nameAr: "تمييز النوايا",
    description: "التعرف على نوايا المستخدم وأهدافه",
    icon: Zap,
    color: "text-chart-3"
  },
  {
    id: 4,
    name: "Knowledge Retrieval",
    nameAr: "استرجاع المعرفة",
    description: "البحث واسترجاع المعلومات ذات الصلة",
    icon: Database,
    color: "text-chart-4"
  },
  {
    id: 5,
    name: "Response Generation",
    nameAr: "توليد الردود",
    description: "إنشاء ردود ذكية ومناسبة للسياق",
    icon: Cpu,
    color: "text-chart-5"
  },
  {
    id: 6,
    name: "Quality Assurance",
    nameAr: "ضمان الجودة",
    description: "التحقق من جودة ودقة الردود",
    icon: Server,
    color: "text-primary"
  },
  {
    id: 7,
    name: "Learning Layer",
    nameAr: "طبقة التعلم",
    description: "التعلم المستمر من التفاعلات",
    icon: Network,
    color: "text-chart-1"
  }
];

export default function BrainPage() {
  const { data: dashboardData, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-brain">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-brain">
            <Brain className="h-8 w-8 text-primary" />
            Brain Core - النواة الذكية
          </h1>
          <p className="text-muted-foreground mt-1">
            الطبقات السبعة للذكاء الاصطناعي
          </p>
        </div>
        <Badge 
          variant={dashboardData?.data?.brain?.status === 'active' ? 'default' : 'destructive'}
          data-testid="badge-brain-status"
          className="text-lg px-4 py-2"
        >
          {dashboardData?.data?.brain?.status === 'active' ? 'نشط' : 'معطل'}
        </Badge>
      </div>

      {/* Brain Core Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-brain-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الأداء</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-avg-performance">
              {dashboardData?.data?.brain?.avgPerformance || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average Performance Index
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-processed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المعالج</CardTitle>
            <Cpu className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-total-processed">
              {dashboardData?.data?.brain?.totalProcessed?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total Processed Requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Brain Architecture */}
      <Card data-testid="card-brain-architecture">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            معمارية النواة الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            نظام ذكاء اصطناعي متقدم يتكون من سبع طبقات معرفية تعمل بشكل متكامل لتقديم أفضل تجربة ذكية.
          </p>

          <div className="space-y-4">
            {brainLayers.map((layer) => (
              <Card key={layer.id} data-testid={`card-layer-${layer.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${layer.color}`}>
                      <layer.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg" data-testid={`text-layer-${layer.id}-name`}>
                          {layer.nameAr}
                        </h3>
                        <Badge variant="outline" data-testid={`badge-layer-${layer.id}`}>
                          Layer {layer.id}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {layer.name}
                      </p>
                      <p className="text-sm">
                        {layer.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Flow */}
      <Card data-testid="card-processing-flow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            مسار المعالجة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div>
                <div className="font-medium">استقبال الطلب</div>
                <div className="text-sm text-muted-foreground">تحليل اللغة والسياق</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div>
                <div className="font-medium">فهم النوايا</div>
                <div className="text-sm text-muted-foreground">تحديد الهدف من الطلب</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div>
                <div className="font-medium">استرجاع المعرفة</div>
                <div className="text-sm text-muted-foreground">البحث في قاعدة المعرفة</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                4
              </div>
              <div>
                <div className="font-medium">توليد الرد</div>
                <div className="text-sm text-muted-foreground">إنشاء رد ذكي ومناسب</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                5
              </div>
              <div>
                <div className="font-medium">ضمان الجودة</div>
                <div className="text-sm text-muted-foreground">التحقق والتحسين</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                6
              </div>
              <div>
                <div className="font-medium">التعلم</div>
                <div className="text-sm text-muted-foreground">تحديث المعرفة والتحسين المستمر</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

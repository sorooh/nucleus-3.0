import { useQuery } from "@tanstack/react-query";
import { Activity, Zap, Shield, Sparkles, Brain, Store, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface Nucleus {
  nucleusId: string;
  nucleusName: string;
  arabicName: string;
  nucleusType: string;
  category: string;
  description: string;
  priority: string;
  phaseOmegaActive: number;
  sideIntegrated: number;
  status?: string;
  health?: number;
  lastUpdated?: string | Date;
}

const categoryIcons = {
  intelligence: Brain,
  education: Sparkles,
  development: Zap,
  commerce: Store,
  finance: Shield,
  support: Activity,
  communication: Activity,
  logistics: Wrench,
  management: Shield,
  compliance: Shield,
  business: Store,
  creative: Sparkles,
  healthcare: Activity,
  default: Activity
};

function formatAmsterdamTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const amsterdamTime = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  return format(amsterdamTime, "MMM dd, yyyy HH:mm", { locale: enUS });
}

export default function NucleiDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; nuclei: Nucleus[] }>({
    queryKey: ["/api/command-center/nuclei"],
  });

  const nuclei = data?.nuclei || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">جاري تحميل منظومة سروح...</p>
        </div>
      </div>
    );
  }

  const coreNuclei = nuclei.filter(n => n.nucleusType === 'core' || n.nucleusType === 'intelligence');
  const businessNuclei = nuclei.filter(n => n.nucleusType === 'business');
  const serviceNuclei = nuclei.filter(n => n.nucleusType === 'service');
  const specializedNuclei = nuclei.filter(n => n.nucleusType === 'specialized');

  const stats = {
    total: nuclei.length,
    online: nuclei.filter(n => n.status === 'online' || n.status === 'healthy').length,
    phaseOmega: nuclei.filter(n => n.phaseOmegaActive === 1).length,
    sideIntegrated: nuclei.filter(n => n.sideIntegrated === 1).length
  };

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
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-3" data-testid="text-nuclei-title">
          <Brain className="w-8 h-8 text-primary heartbeat" />
          <span className="font-cyber text-glow-cyan">Surooh Empire Nuclei</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
          <p className="text-muted-foreground font-mono">منظومة سروح النووية الموحدة - {stats.total} Platforms</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        <Card data-testid="card-total" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Total Platforms</CardTitle>
            <Activity className="h-5 w-5 text-primary living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              عدد الأنظمة المتصلة
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-online" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Online</CardTitle>
            <Zap className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-online">
              {stats.online}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              نشط الآن
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-phase-omega" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Phase Ω Active</CardTitle>
            <Sparkles className="h-5 w-5 text-chart-4 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-phase-omega">
              {stats.phaseOmega}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              التطور الذاتي نشط
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-side" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">SIDE Integrated</CardTitle>
            <Shield className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-side">
              {stats.sideIntegrated}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              متكامل مع SIDE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Core Intelligence */}
      {coreNuclei.length > 0 && (
        <NucleiSection 
          title="Core Intelligence" 
          arabicTitle="الذكاء المركزي"
          nuclei={coreNuclei}
        />
      )}

      {/* Business Platforms */}
      {businessNuclei.length > 0 && (
        <NucleiSection 
          title="Business Platforms" 
          arabicTitle="المنصات التجارية"
          nuclei={businessNuclei}
        />
      )}

      {/* Core Services */}
      {serviceNuclei.length > 0 && (
        <NucleiSection 
          title="Core Services" 
          arabicTitle="الخدمات الأساسية"
          nuclei={serviceNuclei}
        />
      )}

      {/* Specialized Systems */}
      {specializedNuclei.length > 0 && (
        <NucleiSection 
          title="Specialized Systems" 
          arabicTitle="الأنظمة المتخصصة"
          nuclei={specializedNuclei}
        />
      )}
    </div>
  );
}

function NucleiSection({ 
  title, 
  arabicTitle, 
  nuclei 
}: { 
  title: string; 
  arabicTitle: string; 
  nuclei: Nucleus[]; 
}) {
  return (
    <Card className="glass relative z-10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 heartbeat" />
          <span className="font-cyber">{title}</span>
          <Badge variant="secondary">{arabicTitle}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nuclei.map((nucleus) => (
            <NucleusCard key={nucleus.nucleusId} nucleus={nucleus} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NucleusCard({ nucleus }: { nucleus: Nucleus }) {
  const IconComponent = categoryIcons[nucleus.category as keyof typeof categoryIcons] || categoryIcons.default;

  return (
    <Card 
      className="glass breathing hover-elevate transition-all"
      data-testid={`nucleus-card-${nucleus.nucleusId}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-primary consciousness-pulse" />
          <CardTitle className="text-sm font-data line-clamp-1" data-testid={`text-nucleus-name-${nucleus.nucleusId}`}>
            {nucleus.nucleusName}
          </CardTitle>
        </div>
        <Badge 
          variant={nucleus.priority === 'critical' ? 'destructive' : 'secondary'}
          data-testid={`badge-priority-${nucleus.nucleusId}`}
        >
          {nucleus.priority}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">الاسم العربي:</p>
          <p className="text-sm font-medium">{nucleus.arabicName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">الوصف:</p>
          <p className="text-sm line-clamp-2">{nucleus.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nucleus.phaseOmegaActive === 1 && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Phase Ω
            </Badge>
          )}
          {nucleus.sideIntegrated === 1 && (
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              SIDE
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {nucleus.category}
          </Badge>
        </div>
        {nucleus.health !== undefined && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Health</span>
              <span>{nucleus.health}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${nucleus.health}%` }}
              />
            </div>
          </div>
        )}
        {nucleus.lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Last update: {formatAmsterdamTime(nucleus.lastUpdated)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

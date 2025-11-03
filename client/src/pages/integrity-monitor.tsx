import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle, CheckCircle2, Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface IntegrityReport {
  id: string;
  cycleNumber: number;
  cycleTimestamp: string;
  fakeModulesCount: number;
  fakeModules: string[];
  criticalFailuresCount: number;
  criticalFailures: string[];
  isolatedModulesCount: number;
  isolatedModules: string[];
  autonomyScore: string;
  totalModules: number;
  overallStatus: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
  executionTime: number;
  createdAt: string;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/20 text-emerald-400';
    case 'warning': return 'bg-amber-500/20 text-amber-400';
    case 'critical': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle2 className="h-4 w-4" />;
    case 'warning': return <AlertTriangle className="h-4 w-4" />;
    case 'critical': return <AlertCircle className="h-4 w-4" />;
    default: return <Shield className="h-4 w-4" />;
  }
};

export default function IntegrityMonitor() {
  const { data: report, isLoading } = useQuery<{ success: boolean; data: IntegrityReport | null; message?: string }>({
    queryKey: ['/api/integrity/latest'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Integrity Monitor</h1>
            <p className="text-muted-foreground">Loading integrity reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report?.data) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Integrity Monitor</h1>
            <p className="text-muted-foreground">مراقبة النزاهة والصدق</p>
          </div>
        </div>
        
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Waiting for First Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {report?.message || 'No integrity reports available yet. The first cycle will run soon.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const autonomyScore = parseFloat(report.data.autonomyScore);
  const overallStatus = report.data.overallStatus;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Integrity Monitor</h1>
            <p className="text-muted-foreground">مراقبة النزاهة والصدق - Phase Ω.4</p>
          </div>
        </div>
        <Badge className={`${getStatusColor(overallStatus)} text-lg py-1 px-4`}>
          <span className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            {overallStatus.toUpperCase()}
          </span>
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Autonomy Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Autonomy Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">
                {autonomyScore.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>{report.data.totalModules} total modules</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fake Modules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fake Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${report.data.fakeModulesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {report.data.fakeModulesCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Detected fake implementations
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Failures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${report.data.criticalFailuresCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {report.data.criticalFailuresCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Failed reality checks
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-bold text-primary">
                Cycle #{report.data.cycleNumber}
              </div>
              <div className="text-xs text-muted-foreground">
                {report.data.executionTime}ms execution
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {report.data.recommendations.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.data.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Critical Failures List */}
      {report.data.criticalFailures.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              Critical Modules Failing Reality Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.data.criticalFailures.map((module, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-background/50 rounded-md border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <code className="text-xs text-red-400 break-all">{module}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fake Modules List */}
      {report.data.fakeModules.length > 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              All Fake Modules Detected ({report.data.fakeModules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-auto">
              {report.data.fakeModules.map((module, idx) => (
                <div key={idx} className="text-xs text-muted-foreground font-mono p-1 hover:bg-background/50 rounded">
                  {module}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Cycle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cycle Number:</span>
                <span className="ml-2 font-medium">#{report.data.cycleNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="ml-2 font-medium">{formatDate(report.data.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Execution Time:</span>
                <span className="ml-2 font-medium">{report.data.executionTime}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Next Cycle:</span>
                <span className="ml-2 font-medium">In ~6 hours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
}

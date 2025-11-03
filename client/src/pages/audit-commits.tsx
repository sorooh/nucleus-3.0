import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCommit, TrendingUp, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface AuditCommit {
  id: string;
  commitHash: string;
  commitMessage: string;
  commitDate: string;
  author: string;
  filesChanged: string[];
  auditStatus: 'passed' | 'failed' | 'warning';
  complianceScore: number;
  issuesFound: string[];
  mockDataDetected: boolean;
}

interface CommitStats {
  total: number;
  passed: number;
  failed: number;
  warning: number;
  qualityScore: number;
}

export default function AuditCommits() {
  const { data: stats } = useQuery<{ success: boolean; data: CommitStats }>({
    queryKey: ['/api/audit/commits/stats'],
  });

  const { data: commits } = useQuery<{ success: boolean; data: AuditCommit[] }>({
    queryKey: ['/api/audit/commits?limit=50'],
  });

  const statsData = stats?.data;
  const commitsData = commits?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'passed': return 'نجح';
      case 'failed': return 'فشل';
      case 'warning': return 'تحذير';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-2 h-8 bg-cyan-400 rounded-full animate-pulse" />
              محرك المراجعة المتحدثة
            </h1>
            <p className="text-gray-400">نظام تتبع جودة الكود والامتثال في الإمبراطورية</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Empire Core</div>
            <div className="text-lg font-bold text-cyan-400">Surooh Empire</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-cyan-950/50 to-cyan-900/20 border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-cyan-500/20 hover:shadow-lg" data-testid="card-quality">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-300 flex items-center justify-between">
                <span>معدل الجودة</span>
                <TrendingUp className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2" data-testid="text-quality-score">
                {statsData?.qualityScore.toFixed(1) || '0.0'}<span className="text-2xl text-cyan-400">/100</span>
              </div>
              <p className="text-xs text-cyan-300/70">
                {statsData?.passed || 0} من {statsData?.total || 0} نجحت
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-950/50 to-red-900/20 border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:shadow-red-500/20 hover:shadow-lg" data-testid="card-failed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-300 flex items-center justify-between">
                <span>Commits معطلة</span>
                <XCircle className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2" data-testid="text-failed-count">
                {statsData?.failed || 0}
                {statsData && statsData.failed > 0 && (
                  <Badge className="ml-2 bg-red-500/30 text-red-200 border-red-500/50 text-xs">
                    معطلة
                  </Badge>
                )}
              </div>
              <p className="text-xs text-red-300/70">
                فشلت في الامتثال
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-950/50 to-green-900/20 border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-green-500/20 hover:shadow-lg" data-testid="card-passed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-300 flex items-center justify-between">
                <span>معدل النجاح</span>
                <CheckCircle2 className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2" data-testid="text-passed-count">
                {statsData?.passed || 0}
              </div>
              <p className="text-xs text-green-300/70">
                Commits ناجحة
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-950/50 to-yellow-900/20 border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-yellow-500/20 hover:shadow-lg" data-testid="card-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-300 flex items-center justify-between">
                <span>تحذيرات</span>
                <AlertTriangle className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2" data-testid="text-warning-count">
                {statsData?.warning || 0}
              </div>
              <p className="text-xs text-yellow-300/70">
                تحتاج مراجعة
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Commits Table */}
        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-cyan-400" />
              المحصلة آخر Commits
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                {commitsData.length} commits
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commitsData.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <GitCommit className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>لا توجد commits حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commitsData.map((commit) => (
                  <div
                    key={commit.id}
                    className="group bg-gradient-to-r from-gray-950/50 to-gray-900/30 border border-gray-700/50 rounded-lg p-4 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
                    data-testid={`commit-${commit.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded border border-cyan-500/30">
                            {commit.commitHash.slice(0, 8)}
                          </code>
                          <Badge className={getStatusColor(commit.auditStatus)}>
                            {getStatusLabel(commit.auditStatus)}
                          </Badge>
                          {commit.mockDataDetected && (
                            <Badge className="bg-red-500/30 text-red-200 border-red-500/50 text-xs">
                              Mock Data
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-white font-medium group-hover:text-cyan-300 transition-colors">
                          {commit.commitMessage || 'Commit message not available'}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{commit.author}</span>
                          <span>{new Date(commit.commitDate).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}</span>
                          {commit.filesChanged && commit.filesChanged.length > 0 && (
                            <span>{commit.filesChanged.length} ملفات</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-3xl font-bold ${commit.auditStatus === 'passed' ? 'text-green-400' : commit.auditStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {commit.complianceScore}
                        </div>
                        <div className="text-xs text-gray-400">نقاط</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

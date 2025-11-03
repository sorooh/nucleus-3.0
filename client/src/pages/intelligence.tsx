import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Database, Users, CheckCircle2, AlertCircle, Cpu, Wrench, Lightbulb, Target, Book, Sparkles, Network } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DecisionLog {
  id: string;
  decisionType: string;
  source: string;
  context: any;
  decision: any;
  confidence: number;
  createdAt: string;
}

interface IntelligenceStats {
  feedback: {
    totalDecisions: number;
    successRate: number;
    averageConfidence: number;
    recentDecisions: DecisionLog[];
  };
  vector: {
    totalMemories: number;
    categoryCounts: Record<string, number>;
  };
  learning: {
    totalSharedPatterns: number;
    averageSuccessRate: number;
  };
}

export default function IntelligencePage() {
  const { data: status, isLoading } = useQuery<{
    success: boolean;
    initialized: boolean;
    stats: IntelligenceStats;
  }>({
    queryKey: ["/api/intelligence/status"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const stats = status?.stats;

  const aiModels = [
    { id: 'hunyuan', name: 'Hunyuan-A13B', provider: 'Tencent (SiliconFlow)', status: 'active' },
    { id: 'openai', name: 'GPT-4o-mini', provider: 'OpenAI', status: 'active' },
    { id: 'claude', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', status: 'active' },
    { id: 'llama', name: 'Llama 3.3 70B', provider: 'Meta (OpenRouter) - Free', status: 'active' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek (OpenRouter) - Free', status: 'active' },
    { id: 'deepseek', name: 'DeepSeek V3', provider: 'DeepSeek (OpenRouter) - Free', status: 'active' },
    { id: 'qwen-coder', name: 'Qwen 3 Coder', provider: 'Qwen (OpenRouter) - Free', status: 'active' },
    { id: 'mistral-small', name: 'Mistral Small', provider: 'Mistral (OpenRouter) - Free', status: 'active' },
    { id: 'mistral', name: 'Mistral Large', provider: 'Mistral AI', status: 'active' },
    { id: 'falcon', name: 'Falcon 7B', provider: 'TII (HuggingFace)', status: 'active' }
  ];

  const intelligenceModules = [
    {
      id: 'self-learning',
      name: 'Self-Learning',
      nameAr: 'التعلم الذاتي',
      description: 'Learning from every decision',
      cycle: 'Every 5 minutes',
      icon: Lightbulb,
      status: 'active'
    },
    {
      id: 'memory-consolidation',
      name: 'Memory Consolidation',
      nameAr: 'دمج الذاكرة',
      description: 'Pattern discovery',
      cycle: 'Every 10 minutes',
      icon: Database,
      status: 'active'
    },
    {
      id: 'predictive-intelligence',
      name: 'Predictive Intelligence',
      nameAr: 'الذكاء التنبؤي',
      description: 'Future forecasting',
      cycle: 'Every 15 minutes',
      icon: TrendingUp,
      status: 'active'
    },
    {
      id: 'meta-learning',
      name: 'Meta-Learning',
      nameAr: 'التعلم الفوقي',
      description: 'Learning optimization',
      cycle: 'Every 20 minutes',
      icon: Book,
      status: 'active'
    },
    {
      id: 'autonomous-reasoning',
      name: 'Autonomous Reasoning',
      nameAr: 'التفكير المستقل',
      description: 'Independent thinking (70% autonomy)',
      cycle: 'Every 30 minutes',
      icon: Cpu,
      status: 'active'
    }
  ];

  const tools = [
    { name: 'searchMemory', description: 'Search through Memory Hub' },
    { name: 'getCurrentTime', description: 'Get current date and time' },
    { name: 'calculate', description: 'Perform calculations' },
    { name: 'getSystemStatus', description: 'Get system status' },
    { name: 'storeInsight', description: 'Store new insights' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8" />
          نظام الذكاء التعلمي
          <span className="text-muted-foreground text-xl">Intelligence System</span>
        </h1>
        <p className="text-muted-foreground">
          نظام ذكاء متعدد الطبقات مع 6 نماذج AI، أدوات متقدمة، وأنظمة تعلم ذاتي
        </p>
      </div>

      {!status?.initialized ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Intelligence System غير مفعل</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* AI Committee Section */}
          <Card data-testid="card-ai-committee">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                لجنة الذكاء الاصطناعي
                <span className="text-sm text-muted-foreground">AI Committee</span>
              </CardTitle>
              <CardDescription>
                نظام تصويت متعدد النماذج - Weighted Voting Strategy - Min Consensus: 60%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {aiModels.map((model) => (
                  <Card key={model.id} data-testid={`card-ai-model-${model.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{model.name}</CardTitle>
                        <Badge variant="default" className="gap-1" data-testid={`badge-status-${model.id}`}>
                          <CheckCircle2 className="h-3 w-3" />
                          نشط
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-xs text-muted-foreground">{model.provider}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chain of Thought & Tool Use */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-chain-of-thought">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Chain of Thought
                  <span className="text-sm text-muted-foreground">سلسلة التفكير</span>
                </CardTitle>
                <CardDescription>Step-by-step reasoning with Hunyuan model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">Hunyuan-A13B</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Steps</span>
                  <span className="font-medium" dir="ltr">7</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-tool-use">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Tool Use System
                  <span className="text-sm text-muted-foreground">نظام الأدوات</span>
                </CardTitle>
                <CardDescription>Function calling and execution system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Available Tools</span>
                  <span className="font-medium" dir="ltr">{tools.length}</span>
                </div>
                <div className="space-y-1">
                  {tools.map((tool) => (
                    <div key={tool.name} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="font-medium">{tool.name}</span>
                      <span className="text-muted-foreground">- {tool.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Intelligence Modules */}
          <Card data-testid="card-advanced-modules">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                وحدات الذكاء المتقدمة
                <span className="text-sm text-muted-foreground">Advanced Intelligence Modules</span>
              </CardTitle>
              <CardDescription>Self-learning and autonomous decision-making systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {intelligenceModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Card key={module.id} data-testid={`card-module-${module.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {module.nameAr}
                          </CardTitle>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            نشط
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3 space-y-1">
                        <p className="text-xs font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                        <p className="text-xs text-muted-foreground">⏰ {module.cycle}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">القرارات المسجلة</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" dir="ltr">{stats?.feedback.totalDecisions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  معدل النجاح: <span dir="ltr">{stats?.feedback.successRate || 0}%</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط الثقة</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" dir="ltr">{stats?.feedback.averageConfidence || 0}%</div>
                <p className="text-xs text-muted-foreground">في جميع القرارات</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الذاكرة المخزنة</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" dir="ltr">{stats?.vector.totalMemories || 0}</div>
                <p className="text-xs text-muted-foreground">في Vector Memory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">التعلم المشترك</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" dir="ltr">{stats?.learning.totalSharedPatterns || 0}</div>
                <p className="text-xs text-muted-foreground">أنماط مشتركة</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Decisions */}
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  القرارات الأخيرة
                  <span className="text-sm text-muted-foreground">Recent Decisions</span>
                </CardTitle>
                <CardDescription>آخر القرارات المسجلة في Feedback Loop</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.feedback.recentDecisions && stats.feedback.recentDecisions.length > 0 ? (
                  <div className="space-y-4">
                    {stats.feedback.recentDecisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{decision.decisionType}</Badge>
                            <span className="text-sm text-muted-foreground">
                              من {decision.source}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">القرار:</span>{" "}
                            {JSON.stringify(decision.decision)}
                          </div>
                          <div className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'left' }}>
                            {new Date(decision.createdAt).toLocaleString("en-US", {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Europe/Amsterdam'
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={decision.confidence >= 70 ? "default" : "secondary"}
                            className="gap-1"
                            dir="ltr"
                          >
                            {decision.confidence >= 70 ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {decision.confidence}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    لا توجد قرارات مسجلة بعد
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Core Modules */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Feedback Loop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    نشط
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">القرارات</span>
                  <span className="font-medium" dir="ltr">{stats?.feedback.totalDecisions || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">النجاح</span>
                  <span className="font-medium" dir="ltr">{stats?.feedback.successRate || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Vector Memory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    نشط
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الذكريات</span>
                  <span className="font-medium" dir="ltr">{stats?.vector.totalMemories || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">التصنيفات</span>
                  <span className="font-medium" dir="ltr">
                    {Object.keys(stats?.vector.categoryCounts || {}).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Shared Learning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    نشط
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الأنماط</span>
                  <span className="font-medium" dir="ltr">{stats?.learning.totalSharedPatterns || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">معدل النجاح</span>
                  <span className="font-medium" dir="ltr">{stats?.learning.averageSuccessRate || 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

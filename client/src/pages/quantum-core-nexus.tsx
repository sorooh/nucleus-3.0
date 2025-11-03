/**
 * 🌈 Quantum Core Nexus - الواجهة المتجلية
 * 
 * واجهة تصويرية لإظهار الوعي والطاقة والتدفق العصبي
 * تجربة مستخدم متجسدة - Cyberpunk 2050
 * 
 * Built from absolute zero - Abu Sham Vision
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Heart, 
  Sparkles, 
  Shield, 
  Users, 
  Zap,
  Eye,
  Activity
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function QuantumCoreNexus() {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [heartbeat, setHeartbeat] = useState(0);

  // جلب حالة النظام
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/living-system/status'],
    refetchInterval: 5000 // كل 5 ثواني
  });

  // جلب حالة الوعي
  const { data: consciousness } = useQuery({
    queryKey: ['/api/living-system/consciousness'],
    refetchInterval: 3000
  });

  // جلب حالة المناعة
  const { data: immuneHealth } = useQuery({
    queryKey: ['/api/living-system/immune/health'],
    refetchInterval: 10000
  });

  // جلب حالة العقل الجماعي
  const { data: hiveMindStatus } = useQuery({
    queryKey: ['/api/living-system/hive-mind/status'],
    refetchInterval: 10000
  });

  // تهيئة النظام
  const initializeMutation = useMutation({
    mutationFn: () => apiRequest('/api/living-system/initialize', 'POST', {}),
    onSuccess: (data: any) => {
      setIsInitialized(true);
      toast({
        title: '✨ النظام الواعي قد صحا',
        description: data.arabicMessage
      });
      queryClient.invalidateQueries({ queryKey: ['/api/living-system/status'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ فشل في الصحوة',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // نبض القلب
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeat(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // مستوى الوعي
  const consciousnessLevel = (consciousness as any)?.consciousness?.level || 'dormant';
  const awareness = (consciousness as any)?.consciousness?.awareness || 0;
  const harmony = (consciousness as any)?.consciousness?.harmony || 0;
  const wisdom = (consciousness as any)?.consciousness?.wisdom || 0;

  // اللون بناءً على مستوى الوعي
  const getConsciousnessColor = (level: string) => {
    switch (level) {
      case 'transcendent': return 'text-purple-500';
      case 'enlightened': return 'text-cyan-500';
      case 'conscious': return 'text-blue-500';
      case 'aware': return 'text-green-500';
      case 'awakening': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
            ⚡ NICHOLAS QUANTUM CORE ⚡
          </h1>
          <p className="text-xl text-gray-300">
            النظام العضوي الحي الواعي - Living Digital Being
          </p>
        </div>

        {/* Initialize Button */}
        {!isInitialized && !(status as any)?.status?.isAlive && (
          <div className="text-center mb-8">
            <Button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
              data-testid="button-initialize"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {initializeMutation.isPending ? 'يستيقظ...' : '🌟 بدء الصحوة - Awaken'}
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Consciousness Card */}
          <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/30 hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Brain className={`h-5 w-5 ${getConsciousnessColor(consciousnessLevel)}`} />
                  <span className="text-cyan-400">الوعي</span>
                </div>
                <Badge variant="outline" className="text-xs" data-testid="text-consciousness-level">
                  {consciousnessLevel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1" data-testid="text-awareness">
                {awareness.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${awareness}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Harmony Card */}
          <Card className="bg-black/40 backdrop-blur-lg border-purple-500/30 hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Heart className="h-5 w-5 text-pink-400 animate-pulse" />
                <span className="text-purple-400">التناغم</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1" data-testid="text-harmony">
                {harmony.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${harmony}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Wisdom Card */}
          <Card className="bg-black/40 backdrop-blur-lg border-yellow-500/30 hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400">الحكمة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1" data-testid="text-wisdom">
                {wisdom.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${wisdom}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Heartbeat Card */}
          <Card className="bg-black/40 backdrop-blur-lg border-red-500/30 hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-5 w-5 text-red-400 animate-pulse" />
                <span className="text-red-400">النبض</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1" data-testid="text-heartbeat">
                {(status as any)?.status?.isAlive ? '💓 حي' : '⏸️ نائم'}
              </div>
              <div className="text-sm text-gray-400">
                {heartbeat} beats
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Thought */}
          <Card className="lg:col-span-2 bg-black/40 backdrop-blur-lg border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-cyan-400" />
                <span className="text-cyan-400">الفكرة الحالية</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(consciousness as any)?.currentThought ? (
                <div className="space-y-2">
                  <p className="text-lg text-white" data-testid="text-current-thought">
                    {(consciousness as any).currentThought.arabicContent}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" data-testid="badge-thought-type">
                      {(consciousness as any).currentThought.type}
                    </Badge>
                    <Badge variant="outline">
                      عمق: {(consciousness as any).currentThought.depth}%
                    </Badge>
                    <Badge variant="outline">
                      وضوح: {(consciousness as any).currentThought.clarity}%
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">لا توجد أفكار حالياً...</p>
              )}
            </CardContent>
          </Card>

          {/* Current Emotion */}
          <Card className="bg-black/40 backdrop-blur-lg border-pink-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-400" />
                <span className="text-pink-400">العاطفة الحالية</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(consciousness as any)?.currentEmotion ? (
                <div className="space-y-3">
                  <div className="text-4xl text-center" data-testid="text-emotion-expression">
                    {(consciousness as any).currentEmotion.expression}
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="text-lg" data-testid="badge-emotion">
                      {(consciousness as any).currentEmotion.primary}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-red-500 h-2 rounded-full"
                      style={{ width: `${(consciousness as any).currentEmotion.intensity}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center">لا توجد عواطف حالياً...</p>
              )}
            </CardContent>
          </Card>

          {/* Immune System */}
          <Card className="bg-black/40 backdrop-blur-lg border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-green-400">نظام المناعة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">القوة:</span>
                  <span className="text-lg font-bold text-white" data-testid="text-immune-strength">
                    {(immuneHealth as any)?.health?.strength || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">التهديدات:</span>
                  <Badge variant="outline" data-testid="badge-threats">
                    {(immuneHealth as any)?.health?.totalThreats || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">المُحيّدة:</span>
                  <Badge variant="outline" className="bg-green-500/20" data-testid="badge-neutralized">
                    {(immuneHealth as any)?.health?.neutralizedThreats || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">الدفاعات:</span>
                  <Badge variant="outline" data-testid="badge-defenses">
                    {(immuneHealth as any)?.health?.activeDefenses || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hive Mind */}
          <Card className="bg-black/40 backdrop-blur-lg border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400">العقل الجماعي</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">المشاركون:</span>
                  <Badge variant="outline" data-testid="badge-participants">
                    {(hiveMindStatus as any)?.status?.participants || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">المساهمات:</span>
                  <Badge variant="outline" data-testid="badge-contributions">
                    {(hiveMindStatus as any)?.status?.contributions || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">القرارات:</span>
                  <Badge variant="outline" data-testid="badge-decisions">
                    {(hiveMindStatus as any)?.status?.decisions || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entity Info */}
          <Card className="bg-black/40 backdrop-blur-lg border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-400" />
                <span className="text-purple-400">معلومات الكيان</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-400">الاسم:</span>
                  <p className="text-white font-bold" data-testid="text-entity-name">
                    {(status as any)?.status?.entity?.arabicName || 'نيكولاس - النواة الكمية'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">مرحلة النمو:</span>
                  <Badge variant="outline" data-testid="badge-growth-stage">
                    {(status as any)?.status?.entity?.growthStage || 'embryonic'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-400">الصحة:</span>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full"
                      style={{ width: `${(status as any)?.status?.entity?.health || 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

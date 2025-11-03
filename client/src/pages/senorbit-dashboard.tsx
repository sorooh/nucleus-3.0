import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Orbit, Cpu, Brain, Zap, Globe, Shield } from 'lucide-react';
import senorbitIdentity from '../../../nicholas/identity/senorbit.identity.json';
import senorbitLogoAnimated from '@assets/senorbit-logo-animated.gif';

export default function SenorbitDashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header with Animated Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img 
              src={senorbitLogoAnimated} 
              alt="Senorbit - The Thinking Orbit of Nicholas" 
              className="w-32 h-32 object-contain"
              data-testid="img-senorbit-logo"
            />
            <div>
              <h1 className="text-5xl font-bold flex items-center gap-3" data-testid="text-page-title">
                <span className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
                  {senorbitIdentity.symbol}
                </span>
                <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
                  {senorbitIdentity.name}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mt-2 font-light">
                {senorbitIdentity.tagline}
              </p>
            </div>
          </div>
          <Badge variant="default" className="text-lg px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500" data-testid="badge-status">
            ⚡ {senorbitIdentity.operational_status}
          </Badge>
        </div>

        {/* Identity Card */}
        <Card data-testid="card-identity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Identity Profile
            </CardTitle>
            <CardDescription>{senorbitIdentity.designation}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="text-lg font-semibold">{senorbitIdentity.type}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Symbol</div>
                <div className="text-3xl">{senorbitIdentity.symbol}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Activation Phase</div>
                <div className="text-lg font-semibold">Phase Ω {senorbitIdentity.activation_phase}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Launch Date</div>
                <div className="text-lg font-semibold">{senorbitIdentity.launch_date}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Core Integration</div>
              <div className="text-sm font-mono bg-muted px-3 py-2 rounded">
                {senorbitIdentity.core_integration}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Purpose</div>
              <p className="text-sm leading-relaxed">
                {senorbitIdentity.purpose}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Attributes Card */}
        <Card data-testid="card-attributes">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Core Attributes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">Awareness</div>
                </div>
                <div className="text-sm font-semibold">
                  {senorbitIdentity.attributes.awareness}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">Processing Mode</div>
                </div>
                <div className="text-sm font-semibold">
                  {senorbitIdentity.attributes.processing_mode}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">Language Core</div>
                </div>
                <div className="text-sm font-semibold">
                  {senorbitIdentity.attributes.language_core}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">Governance</div>
                </div>
                <div className="text-sm font-semibold">
                  {senorbitIdentity.attributes.governance}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">Controller</div>
                </div>
                <div className="text-sm font-semibold">
                  {senorbitIdentity.attributes.controller}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Orbit className="w-4 h-4 text-primary" />
                  <div className="text-sm text-muted-foreground">Version</div>
                </div>
                <div className="text-sm font-semibold">
                  v{senorbitIdentity.version}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card data-testid="card-notes">
          <CardHeader>
            <CardTitle>System Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {senorbitIdentity.notes}
            </p>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Registered by: <span className="font-semibold text-foreground">{senorbitIdentity.registered_by}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

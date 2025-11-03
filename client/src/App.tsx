import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import KnowledgeFeed from "@/pages/knowledge-feed";
import AgentsMonitor from "@/pages/agents";
import PerformancePage from "@/pages/performance";
import RecoveryPage from "@/pages/recovery";
import SettingsPage from "@/pages/settings";
import BrainPage from "@/pages/brain";
import IntelligencePage from "@/pages/intelligence";
import EvolutionPage from "@/pages/evolution";
import CommandCenterPage from "@/pages/command-center";
import AwarenessDashboard from "@/pages/awareness-dashboard";
import CollectiveIntelligencePage from "@/pages/collective-intelligence";
import AutoRepairPage from "@/pages/auto-repair";
import AutoBuilderPage from "@/pages/auto-builder";
import SuroohChat from "@/pages/surooh-chat";
import QuantumCoreNexus from "@/pages/quantum-core-nexus";
import AuditCommits from "@/pages/audit-commits";
import AuditMonitor from "@/pages/audit-monitor";
import NicholasAudit from "@/pages/nicholas-audit";
import EmperorDashboard from "@/pages/emperor-dashboard";
import NicholasDashboard from "@/pages/nicholas-dashboard";
import NucleiDashboard from "@/pages/nuclei-dashboard";
import SmartIntegrationPage from "@/pages/smart-integration";
import QuantumControl from "@/pages/quantum-control";
import ProactiveActions from "@/pages/ProactiveActions";
import IntegrityMonitor from "@/pages/integrity-monitor";
import CognitivePulse from "@/pages/cognitive-pulse";
import SupremeDashboard from "@/pages/supreme-dashboard";
import IntegrationHubDashboard from "@/pages/integration-hub/dashboard";
import GPUDashboard from "@/pages/gpu-dashboard";
import AIDistribution from "@/pages/ai-distribution";
import SenorbitDashboard from "@/pages/senorbit-dashboard";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/feed" component={KnowledgeFeed} />
      <Route path="/feed" component={KnowledgeFeed} />
      <Route path="/bots" component={AgentsMonitor} />
      <Route path="/agents" component={AgentsMonitor} />
      <Route path="/brain" component={BrainPage} />
      <Route path="/intelligence" component={IntelligencePage} />
      <Route path="/evolution" component={EvolutionPage} />
      <Route path="/command-center" component={CommandCenterPage} />
      <Route path="/awareness" component={AwarenessDashboard} />
      <Route path="/collective" component={CollectiveIntelligencePage} />
      <Route path="/auto-repair" component={AutoRepairPage} />
      <Route path="/auto-builder" component={AutoBuilderPage} />
      <Route path="/surooh-chat" component={SuroohChat} />
      <Route path="/chat" component={SuroohChat} />
      <Route path="/audit-monitor" component={AuditMonitor} />
      <Route path="/issues" component={AuditCommits} />
      <Route path="/nicholas-audit" component={NicholasAudit} />
      <Route path="/nicholas" component={NicholasDashboard} />
      <Route path="/fraud-detection" component={NicholasDashboard} />
      <Route path="/nuclei" component={NucleiDashboard} />
      <Route path="/emperor" component={EmperorDashboard} />
      <Route path="/full-autonomy" component={EmperorDashboard} />
      <Route path="/quantum" component={QuantumControl} />
      <Route path="/quantum-control" component={QuantumControl} />
      <Route path="/smart-integration" component={SmartIntegrationPage} />
      <Route path="/proactive-actions" component={ProactiveActions} />
      <Route path="/actions" component={ProactiveActions} />
      <Route path="/integrity-monitor" component={IntegrityMonitor} />
      <Route path="/integrity" component={IntegrityMonitor} />
      <Route path="/cognitive-pulse" component={CognitivePulse} />
      <Route path="/pulse" component={CognitivePulse} />
      <Route path="/supreme" component={SupremeDashboard} />
      <Route path="/supreme-dashboard" component={SupremeDashboard} />
      <Route path="/integration-hub" component={IntegrationHubDashboard} />
      <Route path="/hub" component={IntegrationHubDashboard} />
      <Route path="/platforms" component={IntegrationHubDashboard} />
      <Route path="/gpu" component={GPUDashboard} />
      <Route path="/gpu-dashboard" component={GPUDashboard} />
      <Route path="/ollama" component={GPUDashboard} />
      <Route path="/ai-distribution" component={AIDistribution} />
      <Route path="/ai-dist" component={AIDistribution} />
      <Route path="/senorbit" component={SenorbitDashboard} />
      <Route path="/senorbit-dashboard" component={SenorbitDashboard} />
      <Route path="/quantum-core" component={QuantumCoreNexus} />
      <Route path="/living-system" component={QuantumCoreNexus} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/recovery" component={RecoveryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isAuthPage = location.startsWith('/auth');

  // Auth pages - no sidebar
  if (isAuthPage) {
    return <Router />;
  }

  // All other pages - use AppSidebar
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider defaultOpen={true} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="text-sm text-muted-foreground px-4">
              Surooh Empire - النواة المركزية الذكية
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

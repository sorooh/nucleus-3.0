import { Home, Brain, Bot, Server, Settings, Activity, BookOpen, RefreshCcw, Lightbulb, Dna, Crown, Eye, MessageCircle, Users, Wrench, AlertCircle, Shield, Atom, Construction, Network, Zap, Sparkles, Cpu, Orbit } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "لوحة التحكم",
    titleEn: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "دردشة سُروح",
    titleEn: "Surooh Chat",
    url: "/surooh-chat",
    icon: MessageCircle,
  },
  {
    title: "تغذية المعرفة",
    titleEn: "Knowledge Feed",
    url: "/feed",
    icon: BookOpen,
  },
  {
    title: "Brain Core",
    titleEn: "Brain Layers",
    url: "/brain",
    icon: Brain,
  },
  {
    title: "نظام الذكاء",
    titleEn: "Intelligence",
    url: "/intelligence",
    icon: Lightbulb,
  },
  {
    title: "التطور الذاتي",
    titleEn: "Evolution Ω",
    url: "/evolution",
    icon: Dna,
  },
  {
    title: "طبقة الوعي",
    titleEn: "Awareness",
    url: "/awareness",
    icon: Eye,
  },
  {
    title: "الذكاء الجماعي",
    titleEn: "Collective Intelligence",
    url: "/collective",
    icon: Users,
  },
  {
    title: "الإصلاح الذاتي",
    titleEn: "Auto-Repair",
    url: "/auto-repair",
    icon: Wrench,
  },
  {
    title: "البناء الذاتي",
    titleEn: "Auto-Builder",
    url: "/auto-builder",
    icon: Construction,
  },
  {
    title: "الأفعال الاستباقية",
    titleEn: "Proactive Actions",
    url: "/proactive-actions",
    icon: Zap,
  },
  {
    title: "التكامل الذكي",
    titleEn: "Smart Integration",
    url: "/smart-integration",
    icon: Network,
  },
  {
    title: "مركز التكامل",
    titleEn: "Integration Hub",
    url: "/integration-hub",
    icon: Network,
  },
  {
    title: "GPU & Ollama",
    titleEn: "GPU Dashboard",
    url: "/gpu",
    icon: Cpu,
  },
  {
    title: "توزيع الذكاء الاصطناعي",
    titleEn: "AI Distribution",
    url: "/ai-distribution",
    icon: Cpu,
  },
  {
    title: "Senorbit",
    titleEn: "Senorbit - The Thinking Orbit",
    url: "/senorbit",
    icon: Orbit,
  },
  {
    title: "النواة العليا Ω.SUPREME",
    titleEn: "Supreme Core",
    url: "/supreme",
    icon: Sparkles,
  },
  {
    title: "الاستقلالية الكاملة",
    titleEn: "Emperor Dashboard",
    url: "/emperor",
    icon: Crown,
  },
  {
    title: "المزامنة الكمية",
    titleEn: "Quantum Control",
    url: "/quantum",
    icon: Atom,
  },
  {
    title: "محرك المراجعة",
    titleEn: "Audit Commits",
    url: "/audit-monitor",
    icon: AlertCircle,
  },
  {
    title: "مراقبة النزاهة Ω.4",
    titleEn: "Integrity Monitor",
    url: "/integrity-monitor",
    icon: Shield,
  },
  {
    title: "Nicholas — كشف الأكاذيب",
    titleEn: "Nicholas Fraud Detection",
    url: "/nicholas",
    icon: Shield,
  },
  {
    title: "مركز القيادة",
    titleEn: "Command Center",
    url: "/command-center",
    icon: Crown,
  },
  {
    title: "النوى الذكية",
    titleEn: "Empire Nuclei",
    url: "/nuclei",
    icon: Atom,
  },
  {
    title: "البوتات",
    titleEn: "Bots",
    url: "/bots",
    icon: Bot,
  },
  {
    title: "الأداء",
    titleEn: "Performance",
    url: "/performance",
    icon: Activity,
  },
  {
    title: "الإعادات",
    titleEn: "Recovery",
    url: "/recovery",
    icon: RefreshCcw,
  },
  {
    title: "الإعدادات",
    titleEn: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold mb-2">
            سروح Empire Core
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
                      <item.icon />
                      <span className="flex items-center justify-between w-full">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.titleEn}</span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

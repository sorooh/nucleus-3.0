import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink, Activity, Clock } from "lucide-react";

/**
 * Side Analysis Panel - Opens when clicking EX button
 * Based on Abu Sham's specifications
 */

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleAr: string;
  description: string;
  status: "active" | "idle" | "pending";
  progress: number;
  lastUpdate: string;
  tools: string[];
  onEnter: () => void;
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  titleAr,
  description,
  status,
  progress,
  lastUpdate,
  tools,
  onEnter
}: SidePanelProps) {
  const statusConfig = {
    active: { label: "نشطة", color: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300" },
    idle: { label: "خاملة", color: "bg-gray-400/10 border-gray-400/30 text-gray-300" },
    pending: { label: "قيد الانتظار", color: "bg-amber-400/10 border-amber-400/30 text-amber-300" }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 p-6 overflow-y-auto"
          >
            <Card className="rounded-[2rem] border-2 border-cyan-500/30 bg-gradient-to-br from-slate-950/98 via-cyan-950/30 to-slate-950/98 shadow-[0_0_80px_rgba(6,182,212,0.25)] backdrop-blur-xl">
              <CardHeader className="relative pt-6 pb-4">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-6 left-6 p-2 rounded-full bg-cyan-400/10 border border-cyan-300/30 hover:bg-cyan-400/20 transition"
                  data-testid="button-close-panel"
                >
                  <X className="w-5 h-5 text-cyan-300" />
                </button>

                {/* Title */}
                <div className="text-right pr-12">
                  <CardTitle className="text-2xl text-cyan-100 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                    {titleAr}
                  </CardTitle>
                  <p className="text-sm text-cyan-300/80 mt-1">{title}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pb-6">
                {/* Description */}
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20">
                  <p className="text-sm text-cyan-100/80 leading-relaxed text-right">
                    {description}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={statusConfig[status].color}>
                    {statusConfig[status].label}
                  </Badge>
                  <span className="text-xs text-cyan-100/60">الحالة</span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-cyan-300">{progress}%</span>
                    <span className="text-xs text-cyan-100/60">نسبة التقدم</span>
                  </div>
                  <div className="h-3 bg-cyan-950/50 rounded-full overflow-hidden border border-cyan-500/20">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Last Update */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-300" />
                    <span className="text-sm text-cyan-100">{lastUpdate}</span>
                  </div>
                  <span className="text-xs text-cyan-100/60">آخر تحديث</span>
                </div>

                {/* Tools */}
                <div>
                  <div className="text-xs text-cyan-100/60 mb-2 text-right">الأدوات</div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {tools.map((tool, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="border-cyan-400/30 text-cyan-200 bg-cyan-400/5"
                      >
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Enter Button */}
                <Button
                  onClick={onEnter}
                  size="lg"
                  className="w-full bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
                  data-testid="button-enter-detail"
                >
                  <span>الدخول</span>
                  <ExternalLink className="w-5 h-5 mr-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

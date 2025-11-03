import { useQuery } from "@tanstack/react-query";

type DevRow = {
  programmerId: string;
  trustScore: number;
  totalRepairs: number;
  successfulRepairs: number;
  failedRepairs: number;
  successRate: number;
  enforcement: {
    allowed: boolean;
    action: string;
    reason: string;
  };
};

type DevMetricsResponse = {
  success: boolean;
  metrics: DevRow[];
  totalProgrammers: number;
  timestamp: string;
};

export const ProgrammerStats = () => {
  const { data, isLoading } = useQuery<DevMetricsResponse>({
    queryKey: ["/api/dev-metrics"],
  });

  const getTrustLevel = (score: number): "HIGH" | "MEDIUM" | "LOW" => {
    if (score >= 70) return "HIGH";
    if (score >= 50) return "MEDIUM";
    return "LOW";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Programmer Trust & Performance</h2>
        <div className="text-sm opacity-70">Loading programmer stats...</div>
      </div>
    );
  }

  const rows = data?.metrics || [];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Programmer Trust & Performance</h2>
      {rows.length === 0 ? (
        <div className="text-sm opacity-70">No programmer data available yet.</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {rows.map((r, i) => {
            const trustLevel = getTrustLevel(r.trustScore);
            return (
              <div key={i} className="rounded border p-4" data-testid={`card-programmer-${r.programmerId}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium" data-testid={`text-programmer-name-${r.programmerId}`}>
                    {r.programmerId}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      trustLevel === "HIGH"
                        ? "bg-green-600 text-white"
                        : trustLevel === "MEDIUM"
                        ? "bg-yellow-500 text-black"
                        : "bg-red-600 text-white"
                    }`}
                    data-testid={`badge-trust-level-${r.programmerId}`}
                  >
                    {trustLevel}
                  </span>
                </div>
                <div className="text-sm mt-1" data-testid={`text-trust-score-${r.programmerId}`}>
                  Trust Score: {r.trustScore}%
                </div>
                <div className="text-xs opacity-70 mt-1" data-testid={`text-stats-${r.programmerId}`}>
                  Repairs: {r.totalRepairs} · Success: {r.successfulRepairs}
                </div>
                <div className="text-xs opacity-70 mt-1" data-testid={`text-enforcement-${r.programmerId}`}>
                  Status: {r.enforcement.action}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

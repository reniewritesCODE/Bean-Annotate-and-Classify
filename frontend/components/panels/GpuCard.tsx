"use client";
import { useEffect, useState } from "react";

interface GpuData {
  gpu: string;
  vram: string;
  computeCapability: string;
  driverVersion: string;
  suitable: boolean;
  type?: string;
  warning?: string;
  checks: {
    vram: boolean;
    compute: boolean;
    driver: boolean;
  };
  error?: string;
}

interface GpuCheckerCardProps {
  onClose: () => void;
}

export function GpuCheckerCard({ onClose }: GpuCheckerCardProps) {
  const [data, setData] = useState<GpuData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gpu")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setData({ error: err.message } as GpuData))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-semibold text-foreground">GPU Information</p>
          <div className="flex items-center gap-3">
            {!loading && data && !data.error && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                  data.suitable
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    data.suitable ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                {data.suitable ? "Suitable for ML" : "Not Suitable"}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
            <svg
              className="animate-spin w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Detecting GPU...
          </div>
        )}

        {/* Error State */}
        {!loading && data?.error && (
          <p className="text-sm text-red-400 py-8 text-center">{data.error}</p>
        )}

        {/* GPU Info */}
        {!loading && data && !data.error && (
          <>
            {/* GPU Details */}
            {[
              { label: "GPU", value: data.gpu },
              { label: "VRAM", value: data.vram },
              { label: "Compute Capability", value: data.computeCapability },
              { label: "Driver Version", value: data.driverVersion },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center py-3 border-b border-border/50 last:border-0"
              >
                <span className="text-sm font-medium text-foreground w-44 shrink-0">
                  {label}:
                </span>
                <span className="text-sm text-muted-foreground flex-1 text-right break-words">
                  {value}
                </span>
              </div>
            ))}

            {/* Suitability Checks */}
            <div className="pt-5 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Suitability Checks
              </p>

              {[
                { 
                  label: "VRAM meets minimum requirement (≥ 8 GB)", 
                  pass: data.checks.vram 
                },
                { 
                  label: "CUDA Compute Capability supported (≥ 6.0)", 
                  pass: data.checks.compute 
                },
                { 
                  label: "Compatible driver detected", 
                  pass: data.checks.driver 
                },
              ].map(({ label, pass }) => (
                <div key={label} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 ${pass ? "text-green-500" : "text-red-500"}`}>
                    {pass ? "✓" : "✗"}
                  </span>
                  <span className={pass ? "text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Warning Message */}
            {data.warning && (
              <div className="mt-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-sm">
                {data.warning}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
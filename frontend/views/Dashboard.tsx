'use client';

import { StatCard, Panel } from '@/components/panels';
import { FileImage, CheckCircle, Database } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectSummaryResponse } from '@/lib/types';
import { DEFECT_CLASSES } from '@/lib/constants';

function getDefectClassMeta(classId: number) {
  const cls = DEFECT_CLASSES.find((c) => c.id === classId);
  return {
    name: cls?.name ?? `Class ${classId}`,
    color: cls?.color ?? '#888',
  };
}

export function Dashboard() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const [summary, setSummary] = useState<ProjectSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const ctrl = new AbortController();

    async function run() {
      if (!projectId) return;
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/projects/${projectId}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed (${res.status})`);
        }

        const data = (await res.json()) as ProjectSummaryResponse;
        if (isMounted) setSummary(data);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (isMounted) setError(e?.message || 'Failed to load dashboard summary');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    run();
    return () => {
      isMounted = false;
      ctrl.abort();
    };
  }, [projectId]);

  const classDistribution = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of summary?.class_distribution ?? []) {
      counts.set(row.class_id, row.count);
    }

    // Always show all known defect classes (including zeros) in a stable order.
    return DEFECT_CLASSES.map((cls) => ({
      class_id: cls.id,
      count: counts.get(cls.id) ?? 0,
    }));
  }, [summary]);

  const maxClassCount = useMemo(() => {
    const max = Math.max(0, ...classDistribution.map((d) => d.count));
    return max || 1;
  }, [classDistribution]);

  const defectsAvg = useMemo(() => {
    if (!summary) return 0;
    if (summary.annotated_images <= 0) return 0;
    return summary.total_annotations / summary.annotated_images;
  }, [summary]);

  return (
    <div className="p-4 flex flex-col space-y-4 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Images"
          value={summary?.total_images ?? 0}
          subtext={isLoading ? 'Loading…' : `${summary?.annotated_images ?? 0} annotated`}
          icon={<FileImage className="w-6 h-6" />}
        />
        <StatCard
          label="Annotations"
          value={summary?.total_annotations ?? 0}
          subtext={isLoading ? 'Loading…' : `${defectsAvg.toFixed(2)} defects avg`}
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatCard
          label="Models Trained"
          value={0}
          subtext="None in registry"
          icon={<Database className="w-6 h-6" />}
        />
        <StatCard
          label="Best mAP@50"
          value={0.00}
          subtext="No model yet"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <Panel title="Class distribution" className="flex flex-col h-full overflow-hidden font-headline">
          <div className="flex flex-col gap-1.5 py-1 pr-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {isLoading ? (
              <div className="text-xs text-white/30 font-sans py-2">Loading…</div>
            ) : error ? (
              <div className="text-xs text-red-400 font-sans py-2">{error}</div>
            ) : (
              classDistribution.map((item) => {
                const widthPct = (item.count / maxClassCount) * 100;
                const meta = getDefectClassMeta(item.class_id);
                const label = meta.name;
                const color = meta.color;

                return (
                  <div key={item.class_id} className="flex items-center gap-2 font-sans">
                    <span className="w-36 text-right text-[10px] text-white/50 truncate uppercase tracking-wide" title={label}>
                      {label}
                    </span>
                    <div className="flex-1 h-3 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full absolute left-0 top-0 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${widthPct}%`, backgroundColor: color }}
                      >
                        <span className="text-[9px] font-bold text-black/60">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Activity Log */}
        <Panel title="Recent Activity" className="flex flex-col h-full overflow-hidden font-headline">
          <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-4 custom-scrollbar font-sans">
            {isLoading ? (
              <div className="text-xs text-white/30 py-2">Loading…</div>
            ) : error ? (
              <div className="text-xs text-red-400 py-2">{error}</div>
            ) : (summary?.recent_activity?.length ?? 0) === 0 ? (
              <div className="text-xs text-white/30 py-2">No activity yet.</div>
            ) : (
              summary!.recent_activity.map((log, idx) => (
                <div
                  key={`${log.timestamp}-${idx}`}
                  className="flex gap-3 pb-3 last:pb-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-white/80">{log.action}</p>
                    <p className="text-xs text-white/30 mt-0.5">{log.details}</p>
                  </div>
                  <p className="text-[10px] text-white/25 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

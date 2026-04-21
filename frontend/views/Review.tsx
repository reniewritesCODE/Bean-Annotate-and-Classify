'use client';

import { Panel, StatCard } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type ModelRecord = {
  id: string;
  project_id: string;
  name: string;
  is_base?: boolean;
  is_production?: boolean;
  map50?: number;
  map75?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  speed?: number;
  per_class_ap?: Record<string, number> | null;
  created_at?: string;
};

const CHART_COLORS: Record<string, string> = {
  'Full Black': '#ef4444',
  'Full Sour': '#ea580c',
  'Fungus Damage': '#d97706',
  'Severe Insect': '#be185d',
  'Foreign Matter': '#3a86ff',
  'Dried Cherry': '#8338ec',
  'Partial Black': '#8b5cf6',
  'Partial Sour': '#3b82f6',
  'Hull/Husk': '#06d6a0',
  'Parchment': '#ef476f',
  'Slight Insect Damage': '#118ab2',
  'Floater': '#f72585',
  'Immature': '#10b981',
  'Withered': '#7209b7',
  'Shell': '#4cc9f0',
  'Broken/Cut': '#65a30d'
};

export function ReviewView() {
  const { addToast, currentProject } = useApp();
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      if (!currentProject?.id) {
        setModels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/models/');
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = (await res.json()) as ModelRecord[];
        const projectModels = data.filter(
          (m) => m.is_base || m.project_id === currentProject.id
        );
        setModels(projectModels);
      } catch (err: any) {
        addToast(err.message || 'Failed to load models', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [addToast, currentProject?.id]);

  const sortedByNewest = [...models].sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
  const baseline = sortedByNewest.find((m) => m.is_base) || null;
  const proposed =
    sortedByNewest.find((m) => !m.is_base && !m.is_production) ||
    sortedByNewest.find((m) => !m.is_base) ||
    null;
  const apData = Object.entries(proposed?.per_class_ap || {}).map(([name, value]) => ({
    name,
    value: Math.max(0, Math.min(100, Math.round(Number(value) * 100))),
  }));

  const handleApprove = async () => {
    if (!proposed) return;
    try {
      // Example: POST to /api/models/{id}/approve or /deploy
      const res = await fetch(`/models/${proposed.id || proposed.name}/deploy`, { method: 'POST' });
      if (!res.ok) throw new Error('Approval failed');
      addToast('Model approved and deployed to registry', 'success');
    } catch (err: any) {
      addToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleReject = async () => {
    addToast('Model rejected, not added to registry', 'info');
    // Optionally, call a backend endpoint to mark as rejected
  };

  const map50Improvement = baseline && proposed ? (proposed.map50 ?? 0) - (baseline.map50 ?? 0) : 0;
  const precisionImprovement = baseline && proposed ? (proposed.precision ?? 0) - (baseline.precision ?? 0) : 0;
  const baselineSpeed = baseline?.speed ?? 0;
  const proposedSpeed = proposed?.speed ?? 0;
  const hasSpeedComparison = baselineSpeed > 0 && proposedSpeed > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baseline */}
        {loading ? (
          <Panel title="Baseline Model" className='font-headline'>
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          </Panel>
        ) : baseline && (
          <Panel title="Baseline Model" className='font-headline'>
            <div className="space-y-4 font-sans">
              <div className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-serif text-lg font-bold">{baseline.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Reference for comparison
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="mAP@50" value={(baseline.map50 ?? 0).toFixed(3)} />
                <StatCard label="mAP@75" value={(baseline.map75 ?? 0).toFixed(3)} />
                <StatCard label="Precision" value={(baseline.precision ?? 0).toFixed(3)} />
                <StatCard label="Recall" value={(baseline.recall ?? 0).toFixed(3)} />
                <StatCard label="F1 Score" value={(baseline.f1 ?? 0).toFixed(3)} />
                <StatCard label="Speed (ms)" value={(baseline.speed ?? 0).toFixed(1)} />
              </div>
            </div>
          </Panel>
        )}

        {/* Proposed */}
        {loading ? (
          <Panel title="Proposed Model" className='font-headline'>
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          </Panel>
        ) : proposed && (
          <Panel title="Proposed Model" className='font-headline'> 
            <div className="space-y-4 font-sans">
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/50">
                <h4 className="font-serif text-lg font-bold text-primary">
                  {proposed.name}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Candidate for approval
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="mAP@50" value={(proposed.map50 ?? 0).toFixed(3)} />
                <StatCard label="mAP@75" value={(proposed.map75 ?? 0).toFixed(3)} />
                <StatCard label="Precision" value={(proposed.precision ?? 0).toFixed(3)} />
                <StatCard label="Recall" value={(proposed.recall ?? 0).toFixed(3)} />
                <StatCard label="F1 Score" value={(proposed.f1 ?? 0).toFixed(3)} />
                <StatCard label="Speed (ms)" value={(proposed.speed ?? 0).toFixed(1)} />
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleApprove}
                  disabled={!proposed}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Model
                </Button>
                <Button
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  variant="outline"
                  onClick={handleReject}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Panel>
        )}
      </div>

      <Panel title="Per-class AP — trained model" className='font-headline'>
        <div className="flex flex-col gap-3 py-4 pr-6 font-sans">
          {apData.length === 0 && (
            <p className="text-sm text-muted-foreground">No per-class AP data available for this model.</p>
          )}
          {apData.map((item) => {
            const widthPct = item.value;
            const color = CHART_COLORS[item.name] || '#888';

            return (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-32 text-right text-sm text-zinc-300">
                  {item.name}
                </span>
                <div className="flex-1 h-5 bg-[#262626] rounded-sm relative overflow-hidden">
                  <div
                    className="h-full absolute left-0 top-0 rounded-sm flex items-center justify-end pr-3"
                    style={{ width: `${widthPct}%`, backgroundColor: color }}
                  >
                    <span className="text-xs font-semibold text-black/40 drop-shadow-sm">
                      {item.value}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Summary */}
      <Panel title="Review Summary" className='font-headline'>
        <div className="space-y-3 text-sm font-sans">
          {proposed && baseline && (
            <>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-foreground">
                  mAP@50 Improvement:
                </span>
                <span className="font-bold text-primary">
                  {map50Improvement >= 0 ? '+' : ''}
                  {(map50Improvement * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-foreground">
                  Precision Improvement:
                </span>
                <span className="font-bold text-primary">
                  {precisionImprovement >= 0 ? '+' : ''}
                  {(precisionImprovement * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Speed Trade-off:</span>
                <span className="font-bold">
                  {!hasSpeedComparison
                    ? 'N/A'
                    : proposedSpeed < baselineSpeed
                      ? `+${(((baselineSpeed - proposedSpeed) / baselineSpeed) * 100).toFixed(0)}% faster`
                      : `-${(((proposedSpeed - baselineSpeed) / baselineSpeed) * 100).toFixed(0)}% slower`}
                </span>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

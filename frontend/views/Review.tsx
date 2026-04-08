'use client';

import { Panel, StatCard } from '@/components/panels';
import { MODELS, DEFECT_CLASSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CheckCircle, Zap } from 'lucide-react';
const AP_DATA_STATIC = [
  { name: 'Full Black', value: 93 },
  { name: 'Full Sour', value: 89 },
  { name: 'Fungus Damage', value: 86 },
  { name: 'Severe Insect', value: 80 },
  { name: 'Partial Black', value: 87 },
  { name: 'Partial Sour', value: 84 },
  { name: 'Immature', value: 79 },
  { name: 'Broken/Cut', value: 75 },
];

const CHART_COLORS: Record<string, string> = {
  'Full Black': '#ef4444',
  'Full Sour': '#ea580c',
  'Fungus Damage': '#d97706',
  'Severe Insect': '#be185d',
  'Partial Black': '#8b5cf6',
  'Partial Sour': '#3b82f6',
  'Immature': '#10b981',
  'Broken/Cut': '#65a30d'
};
export function ReviewView() {
  const { addToast } = useApp();
  const baseline = MODELS.find((m) => m.type === 'baseline');
  const proposed = MODELS.find((m) => m.type === 'proposed');

  const handleApprove = () => {
    addToast('Model approved and deployed to registry', 'success');
  };

  const handleReject = () => {
    addToast('Model rejected, not added to registry', 'info');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baseline */}
        {baseline && (
          <Panel title="Baseline Model" className='font-headline'>
            <div className="space-y-4 font-sans">
              <div className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-serif text-lg font-bold">{baseline.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Reference for comparison
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="mAP@50" value={baseline.map50.toFixed(3)} />
                <StatCard label="mAP@75" value={baseline.map75.toFixed(3)} />
                <StatCard label="Precision" value={baseline.prec.toFixed(3)} />
                <StatCard label="Recall" value={baseline.rec.toFixed(3)} />
                <StatCard label="F1 Score" value={baseline.f1.toFixed(3)} />
                <StatCard label="Speed (ms)" value={baseline.spd.toFixed(1)} />
              </div>
            </div>
          </Panel>
        )}

        {/* Proposed */}
        {proposed && (
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
                <StatCard label="mAP@50" value={proposed.map50.toFixed(3)} />
                <StatCard label="mAP@75" value={proposed.map75.toFixed(3)} />
                <StatCard label="Precision" value={proposed.prec.toFixed(3)} />
                <StatCard label="Recall" value={proposed.rec.toFixed(3)} />
                <StatCard label="F1 Score" value={proposed.f1.toFixed(3)} />
                <StatCard label="Speed (ms)" value={proposed.spd.toFixed(1)} />
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleApprove}
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
          {AP_DATA_STATIC.map((item) => {
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
                  +{((proposed.map50 - baseline.map50) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-foreground">
                  Precision Improvement:
                </span>
                <span className="font-bold text-primary">
                  +{((proposed.prec - baseline.prec) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Speed Trade-off:</span>
                <span className="font-bold">
                  {proposed.spd < baseline.spd
                    ? `+${((baseline.spd - proposed.spd) / baseline.spd * 100).toFixed(0)}% faster`
                    : `-${((proposed.spd - baseline.spd) / baseline.spd * 100).toFixed(0)}% slower`}
                </span>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

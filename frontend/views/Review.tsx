'use client';

import { Panel, StatCard } from '@/components/panels';
import { MODELS, DEFECT_CLASSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CheckCircle, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const AP_DATA = DEFECT_CLASSES.map((cls) => ({
  class: cls.name,
  Baseline: Math.random() * 0.3 + 0.4,
  Proposed: Math.random() * 0.3 + 0.6,
}));

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
    <div className="p-8 space-y-8">
      {/* Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Baseline */}
        {baseline && (
          <Panel title="Baseline Model">
            <div className="space-y-4">
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
          <Panel title="Proposed Model">
            <div className="space-y-4">
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

      {/* Performance Comparison */}
      <Panel title="Per-Class Average Precision (AP)">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={AP_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="class"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
            />
            <Legend />
            <Bar dataKey="Baseline" fill="var(--chart-3)" />
            <Bar dataKey="Proposed" fill="var(--chart-1)" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Summary */}
      <Panel title="Review Summary">
        <div className="space-y-3 text-sm">
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

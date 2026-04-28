'use client';

import { Panel, StatCard } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CheckCircle, AlertCircle, Loader2, Trophy, Cpu, Eye, Zap } from 'lucide-react';
import { ModelPreview } from '@/components/ModelPreview';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface ModelData {
  id: string;
  name: string;
  is_base: boolean;
  is_production: boolean;
  is_approved: boolean;
  map50: number | null;
  precision: number | null;
  recall: number | null;
  per_class_ap: Record<string, number> | null;
  created_at: string;
  training_job_id: string | null;
}

interface TrainingHistoryEntry {
  job_id: string;
  status: string;
  created_at: string;
  final_metrics: { map50?: number; precision?: number; recall?: number };
  model: {
    id: string;
    name: string;
    s3_key_pt: string | null;
    is_production: boolean;
  } | null;
}

const DEFECT_CLASSES = [
  'Full Black', 'Full Sour', 'Fungus Damage', 'Severe Insect',
  'Partial Black', 'Partial Sour', 'Immature', 'Broken/Cut',
];

const CHART_COLORS: Record<string, string> = {
  'Full Black': '#ef4444',
  'Full Sour': '#ea580c',
  'Fungus Damage': '#d97706',
  'Severe Insect': '#be185d',
  'Partial Black': '#8b5cf6',
  'Partial Sour': '#3b82f6',
  'Immature': '#10b981',
  'Broken/Cut': '#65a30d',
};

export function ReviewView() {
  const { addToast, currentProject } = useApp();
  const searchParams = useSearchParams();
  const modelIdFromUrl = searchParams.get('model');

  const [baseline, setBaseline] = useState<ModelData | null>(null);
  const [proposed, setProposed] = useState<ModelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [perClassAP, setPerClassAP] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!currentProject?.id) return;
    loadReviewData();
  }, [currentProject?.id]);

  const loadReviewData = async () => {
    if (!currentProject?.id) return;
    setIsLoading(true);
    const token = localStorage.getItem('access_token');

    try {
      // Fetch all models for this project
      const modelsRes = await fetch(`/api/projects/${currentProject.id}/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch training history to get the latest completed job's model
      const historyRes = await fetch(`/api/projects/${currentProject.id}/train/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!modelsRes.ok || !historyRes.ok) {
        addToast('Failed to load review data', 'error');
        return;
      }

      const models: ModelData[] = await modelsRes.json();
      const historyData = await historyRes.json();
      const history: TrainingHistoryEntry[] = historyData.history ?? [];

      // Baseline = always use the base model as the reference (admin-set)
      const productionModel =
        models.find((m) => m.is_base) ??
        models.find((m) => m.is_production) ??
        null;

      // Proposed = if modelId from URL, use that
      let proposedModel: ModelData | null = null;
      if (modelIdFromUrl) {
        proposedModel = models.find((m) => m.id === modelIdFromUrl) ?? null;
      }

      setBaseline(productionModel);
      setProposed(proposedModel);

      // Build per-class AP from proposed model's per_class_ap data
      if (proposedModel?.per_class_ap) {
        const perClassData = Object.entries(proposedModel.per_class_ap).map(([name, value]) => ({
          name,
          value: Math.round(value * 100), // Convert to percentage
        }));
        setPerClassAP(perClassData);
      } else if (proposedModel?.map50 != null) {
        // Fallback: simulate from overall metrics if per-class data not available
        const base = proposedModel.map50 * 100;
        setPerClassAP(
          DEFECT_CLASSES.map((name, i) => ({
            name,
            value: Math.min(99, Math.max(40, Math.round(base - i * 2.5 + Math.random() * 4))),
          }))
        );
      } else {
        setPerClassAP([]);
      }
    } catch (err) {
      console.error('Error loading review data:', err);
      addToast('Network error loading review data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppendToRegistry = async () => {
    if (!proposed || !currentProject?.id) return;
    setIsApproving(true);
    const token = localStorage.getItem('access_token');

    try {
      // Mark the model as approved for registry
      const res = await fetch(
        `/api/projects/${currentProject.id}/models/${proposed.id}/approve`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        addToast(`"${proposed.name}" appended to registry`, 'success');
        await loadReviewData();
      } else {
        const data = await res.json();
        addToast(data.detail || 'Failed to append to registry', 'error');
      }
    } catch {
      addToast('Network error appending to registry', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleEvaluate = async (modelId: string) => {
    if (!currentProject?.id) return;
    setIsEvaluating(true);
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(
        `/api/projects/${currentProject.id}/models/${modelId}/evaluate`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        addToast('Evaluation started. This may take a few minutes.', 'info');
        // Poll for completion (simplified: just tell user to refresh or wait)
        setTimeout(() => loadReviewData(), 10000); // Quick refresh attempt
      } else {
        const data = await res.json();
        addToast(data.detail || 'Failed to start evaluation', 'error');
      }
    } catch {
      addToast('Network error starting evaluation', 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReject = () => {
    addToast('Model rejected — not added to registry', 'info');
  };

  const fmt = (v: number | null | undefined, digits = 3) =>
    v != null ? v.toFixed(digits) : '—';

  const delta = (a: number | null | undefined, b: number | null | undefined) => {
    if (a == null || b == null) return null;
    return ((a - b) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
        <span className="text-muted-foreground">Loading review data…</span>
      </div>
    );
  }

  if (!baseline && !proposed) {
    return (
      <div className="p-4">
        <Panel title="Model Review" className="font-headline">
          <div className="py-12 text-center text-muted-foreground font-sans">
            <Cpu className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No trained models found.</p>
            <p className="text-xs mt-1">Complete a training run to review a model here.</p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baseline */}
        <Panel title="Baseline Model" className="font-headline">
          <div className="space-y-4 font-sans">
            {baseline ? (
              <>
                <div className="text-center p-4 bg-muted rounded-lg flex flex-col items-center gap-1">
                  {baseline.is_production && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary mb-1">
                      <Trophy className="w-3 h-3" /> PRODUCTION
                    </span>
                  )}
                  <h4 className="font-serif text-lg font-bold">{baseline.name}</h4>
                  <p className="text-sm text-muted-foreground">Reference for comparison</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="mAP@50" value={fmt(baseline.map50)} />
                  <StatCard label="Precision" value={fmt(baseline.precision)} />
                  <StatCard label="Recall" value={fmt(baseline.recall)} />
                  <StatCard
                    label="Created"
                    value={new Date(baseline.created_at).toLocaleDateString()}
                  />
                </div>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs h-8 border-dashed"
                    onClick={() => handleEvaluate(baseline.id)}
                    disabled={isEvaluating}
                  >
                    {isEvaluating ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-3 h-3 mr-2 text-yellow-500" />
                    )}
                    {isEvaluating ? 'Evaluating…' : baseline.map50 == null ? 'Evaluate Baseline Performance' : 'Re-evaluate Baseline'}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No production model set yet.
              </p>
            )}
          </div>
        </Panel>

        {/* Proposed */}
        <Panel title="Proposed Model" className="font-headline">
          <div className="space-y-4 font-sans">
            {proposed ? (
              <>
                <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/50">
                  <h4 className="font-serif text-lg font-bold text-primary">{proposed.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">Candidate for approval</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="mAP@50" value={fmt(proposed.map50)} />
                  <StatCard label="Precision" value={fmt(proposed.precision)} />
                  <StatCard label="Recall" value={fmt(proposed.recall)} />
                  <StatCard
                    label="Created"
                    value={new Date(proposed.created_at).toLocaleDateString()}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
                    onClick={handleAppendToRegistry}
                    disabled={isApproving || proposed.is_approved}
                  >
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {isApproving ? 'Appending…' : proposed.is_approved ? 'Already in Registry' : 'Append to Registry'}
                  </Button>
                  <Button
                    className="w-full border-destructive text-destructive hover:bg-destructive/10"
                    variant="outline"
                    onClick={handleReject}
                    disabled={isApproving}
                  >
                    Reject
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No new model to review.</p>
                <p className="text-xs mt-1">
                  The latest trained model is already in production.
                </p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Model Preview Tool */}
      {proposed && currentProject && (
        <Panel title="Preview Model" className="font-headline">
          <ModelPreview projectId={currentProject.id} modelId={proposed.id} />
        </Panel>
      )}

      {/* Deltas summary if both exist */}
      {proposed && baseline && (
        <Panel title="Metrics Improvement" className="font-headline">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
            {[
              {
                label: 'mAP@50 Δ',
                value: delta(proposed.map50, baseline.map50),
              },
              {
                label: 'Precision Δ',
                value: delta(proposed.precision, baseline.precision),
              },
              {
                label: 'Recall Δ',
                value: delta(proposed.recall, baseline.recall),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-muted/50 rounded-lg p-4 flex flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                {value != null ? (
                  <span
                    className={`text-xl font-bold ${
                      parseFloat(value) >= 0 ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {parseFloat(value) >= 0 ? '+' : ''}
                    {value}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">N/A</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

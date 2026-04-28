'use client';

import { Panel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Download, Trophy, Loader2, PackageOpen, Rocket, Trash2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ModelData {
  id: string;
  name: string;
  is_base: boolean;
  is_production: boolean;
  is_approved: boolean;
  s3_key_pt: string | null;
  s3_key_onnx: string | null;
  map50: number | null;
  precision: number | null;
  recall: number | null;
  created_at: string;
  training_job_id: string | null;
}

type SortKey = 'map50' | 'precision' | 'recall' | 'created_at';

export function RegistryView() {
  const { addToast, currentProject } = useApp();

  const [models, setModels] = useState<ModelData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('map50');
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    if (!currentProject?.id) return;
    setIsLoading(true);
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ModelData[] = await res.json();
        setModels(data);
      } else {
        addToast('Failed to load models', 'error');
      }
    } catch {
      addToast('Network error loading models', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const sortedModels = [...models].sort((a, b) => {
    if (sortBy === 'created_at') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    const av = a[sortBy] ?? -Infinity;
    const bv = b[sortBy] ?? -Infinity;
    return (bv as number) - (av as number);
  });

  const handlePromote = async (model: ModelData) => {
    if (!currentProject?.id) return;
    setPromotingId(model.id);
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(
        `/api/projects/${currentProject.id}/models/${model.id}/promote`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        addToast(`"${model.name}" promoted to production`, 'success');
        await fetchModels();
      } else {
        const data = await res.json();
        addToast(data.detail || 'Failed to promote model', 'error');
      }
    } catch {
      addToast('Network error promoting model', 'error');
    } finally {
      setPromotingId(null);
    }
  };

  const handleDemote = async (model: ModelData) => {
    if (!currentProject?.id) return;
    setPromotingId(model.id); // Reusing promotingId for loading state
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(
        `/api/projects/${currentProject.id}/models/${model.id}/demote`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        addToast(`"${model.name}" removed from production`, 'info');
        await fetchModels();
      } else {
        const data = await res.json();
        addToast(data.detail || 'Failed to demote model', 'error');
      }
    } catch {
      addToast('Network error demoting model', 'error');
    } finally {
      setPromotingId(null);
    }
  };

  const handleRemoveFromRegistry = (model: ModelData) => {
    if (!confirm(`Remove "${model.name}" from the registry view?\n\nThe model will still be available in the Train Model page.`)) return;
    setRemovingId(model.id);
    // Only remove from local view — does NOT call the delete API
    // so the model remains in the database and available for training.
    setModels((prev) => prev.filter((m) => m.id !== model.id));
    addToast(`"${model.name}" removed from registry view`, 'info');
    setRemovingId(null);
  };

  const handleDownload = async (model: ModelData, format: 'pt' | 'onnx' = 'pt') => {
    if (!currentProject?.id) return;
    setDownloadingId(model.id);
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(
        `/api/projects/${currentProject.id}/models/${model.id}/download?format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const data = await res.json();
        addToast(data.detail || 'Download failed', 'error');
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`Downloading ${model.name}.${format}`, 'success');
    } catch {
      addToast('Network error during download', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const fmt = (v: number | null | undefined, digits = 3) =>
    v != null ? v.toFixed(digits) : '—';

  // Filter to only show approved models and base models
  const registryModels = models.filter((m) => m.is_base || m.is_approved);
  
  // Stats
  const trainedModels = registryModels.filter((m) => !m.is_base);
  const avgMap50 =
    trainedModels.length > 0
      ? trainedModels.reduce((s, m) => s + (m.map50 ?? 0), 0) / trainedModels.length
      : null;
  const productionModel = registryModels.find((m) => m.is_production && !m.is_base);

  if (!currentProject?.id) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64 gap-3 text-center">
        <PackageOpen className="w-10 h-10 opacity-30" style={{ color: '#D4820A' }} />
        <p className="font-semibold text-white/70 font-headline">No Project Selected</p>
        <p className="text-sm text-white/30 max-w-xs">
          Open a project from the dashboard to view its model registry.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
        <span className="text-white/40">Loading registry…</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <Panel title="Registry Statistics" className="font-headline">
        <div className="grid grid-cols-3 gap-4 text-sm font-sans">
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">{trainedModels.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Trained Models</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">
              {avgMap50 != null ? avgMap50.toFixed(3) : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Avg mAP@50</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold gradient-text truncate">
              {productionModel ? productionModel.name : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">In Production</p>
          </div>
        </div>
      </Panel>

      {/* Table */}
      <Panel title="Model Registry" className="font-headline">
        {/* Sort control */}
        <div className="mb-5 flex gap-2 font-sans">
          {/* <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="map50">Sort by mAP@50 (desc)</option>
            <option value="precision">Sort by Precision (desc)</option>
            <option value="recall">Sort by Recall (desc)</option>
            <option value="created_at">Sort by Date (newest)</option>
          </select> */}
          <Button variant="outline" size="sm" onClick={fetchModels} className="gap-1.5">
            Refresh
          </Button>
        </div>

        {registryModels.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-sans">
            <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No models in registry yet.</p>
            <p className="text-xs mt-1">Models must be approved in Model Review to appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Model</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">mAP@50</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Precision</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Recall</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Created</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedModels
                  .filter((m) => m.is_base || m.is_approved)
                  .map((model) => (
                  <tr
                    key={model.id}
                    className={`border-b border-border hover:bg-muted/50 transition-colors ${
                      model.is_production ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Name + badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{model.name}</p>
                          {model.is_production && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                              <Trophy className="w-2.5 h-2.5" /> PROD
                            </span>
                          )}
                          {model.is_base && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              BASE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {model.id.slice(0, 8)}…
                        </p>
                      </div>
                    </td>

                    <td className="text-center py-3 px-4 font-bold text-primary">
                      {fmt(model.map50)}
                    </td>
                    <td className="text-center py-3 px-4">{fmt(model.precision)}</td>
                    <td className="text-center py-3 px-4">{fmt(model.recall)}</td>
                    <td className="text-center py-3 px-4 text-muted-foreground text-xs">
                      {new Date(model.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* Download */}
                        <button
                          onClick={() => handleDownload(model)}
                          disabled={!model.s3_key_pt || downloadingId === model.id}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={model.s3_key_pt ? 'Download .pt weights' : 'No weights file'}
                        >
                          {downloadingId === model.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Download className="w-4 h-4 text-primary" />
                          )}
                        </button>

                        {/* Promote / Demote */}
                        {!model.is_base && (
                          model.is_production ? (
                            <button
                              onClick={() => handleDemote(model)}
                              disabled={promotingId === model.id}
                              className="p-2 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-40"
                              title="Remove from production"
                            >
                              {promotingId === model.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                              ) : (
                                <Rocket className="w-4 h-4 text-orange-500 fill-orange-500" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePromote(model)}
                              disabled={promotingId === model.id}
                              className="p-2 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-40"
                              title="Set as production"
                            >
                              {promotingId === model.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                              ) : (
                                <Rocket className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                          )
                        )}

                        {/* Remove from registry view */}
                        {!model.is_base && !model.is_production && (
                          <button
                            onClick={() => handleRemoveFromRegistry(model)}
                            disabled={removingId === model.id}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40"
                            title="Remove from registry view (model is kept in database)"
                          >
                            {removingId === model.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

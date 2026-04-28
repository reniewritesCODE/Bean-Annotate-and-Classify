'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/panels';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  Calendar, 
  Trash2, 
  ExternalLink,
  Trophy,
  BarChart3,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface TrainingJob {
  job_id: string;
  status: string;
  created_at: string;
  config: any;
  final_metrics: {
    map50?: number;
    precision?: number;
    recall?: number;
  };
  model: {
    id: string;
    name: string;
    s3_key_pt: string;
    s3_key_onnx: string;
    is_production: boolean;
  } | null;
}

interface SuccessfulModelsPanelProps {
  projectId: string | undefined;
}

export function SuccessfulModelsPanel({ projectId }: SuccessfulModelsPanelProps) {
  const router = useRouter();
  const [successfulJobs, setSuccessfulJobs] = useState<TrainingJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchSuccessfulModels = async () => {
    if (!projectId) {
      setError('No project selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/projects/${projectId}/train/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch training history');
      }

      const data = await response.json();
      // Filter only successful (done) jobs that have a model
      const successful = (data.history || []).filter(
        (job: TrainingJob) => job.status === 'done' && job.model
      );
      setSuccessfulJobs(successful);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch successful models');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuccessfulModels();
  }, [projectId]);

  const handleDelete = async (jobId: string) => {
    if (!projectId) return;
    if (!window.confirm('Are you sure you want to delete this trained model? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/projects/${projectId}/train/history/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete model');
      }

      // Remove from state
      setSuccessfulJobs(prev => prev.filter(job => job.job_id !== jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const handleReview = (modelId: string) => {
    router.push(`/projects/${projectId}/review?model=${modelId}`);
  };

  const handleEditName = (job: TrainingJob) => {
    if (!job.model) return;
    setEditingId(job.model.id);
    setEditName(job.model.name);
  };

  const handleSaveName = async (modelId: string) => {
    if (!projectId || !editName.trim()) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/projects/${projectId}/models/${modelId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update name');
      }

      // Update local state
      setSuccessfulJobs(prev => prev.map(job => {
        if (job.model?.id === modelId) {
          return { ...job, model: { ...job.model!, name: editName.trim() } };
        }
        return job;
      }));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatMetric = (value: number | undefined, isPercentage = false) => {
    if (value === undefined || value === null) return 'N/A';
    return isPercentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(3);
  };

  if (!projectId) {
    return null;
  }

  return (
    <Panel title="Successfully Trained Models" className="font-headline">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <Button
            onClick={fetchSuccessfulModels}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {successfulJobs.length} model{successfulJobs.length !== 1 ? 's' : ''} ready for review
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Successful models grid */}
        {successfulJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {successfulJobs.map((job) => (
              <div
                key={job.job_id}
                className="border border-border/50 rounded-lg p-4 space-y-3 bg-card hover:border-primary/30 transition-colors group"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingId === job.model?.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName(job.model!.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveName(job.model!.id)}
                            className="p-1 hover:bg-green-500/10 rounded text-green-500"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 hover:bg-red-500/10 rounded text-red-500"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {job.model?.name || 'Unnamed Model'}
                          </h4>
                          <button
                            onClick={() => handleEditName(job)}
                            className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit name"
                          >
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(job.created_at)}
                      </p>
                    </div>
                  </div>
                  {job.model?.is_production && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary flex-shrink-0">
                      <Trophy className="w-3 h-3" />
                      PROD
                    </span>
                  )}
                </div>

                {/* Metrics */}
                {job.final_metrics && Object.keys(job.final_metrics).length > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <div className="text-muted-foreground mb-1">mAP50</div>
                      <div className="font-semibold text-foreground">
                        {formatMetric(job.final_metrics.map50, true)}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <div className="text-muted-foreground mb-1">Precision</div>
                      <div className="font-semibold text-foreground">
                        {formatMetric(job.final_metrics.precision)}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <div className="text-muted-foreground mb-1">Recall</div>
                      <div className="font-semibold text-foreground">
                        {formatMetric(job.final_metrics.recall)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Config summary */}
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-3 h-3" />
                  <span>
                    {job.config?.epochs || '?'} epochs · 
                    Batch {job.config?.batch || job.config?.batchSize || '?'} · 
                    Size {job.config?.imgsz || job.config?.imageSize || '?'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => job.model && handleReview(job.model.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={!job.model}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Review Model
                  </Button>
                  <Button
                    onClick={() => handleDelete(job.job_id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    title="Delete trained model"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No successfully trained models yet</p>
            <p className="text-xs mt-1">Complete a training run to see models here</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

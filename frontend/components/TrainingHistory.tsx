'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/panels';
import { Download, Calendar, CheckCircle, XCircle, Clock, Star, TrendingUp, Trash2 } from 'lucide-react';

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

interface TrainingHistoryProps {
  projectId: string | undefined;
  onCompare?: (jobs: TrainingJob[]) => void;
}

export function TrainingHistory({ projectId, onCompare }: TrainingHistoryProps) {
  const [history, setHistory] = useState<TrainingJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  const fetchHistory = async () => {
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
      setHistory(data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch training history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

  const handleDownload = async (jobId: string) => {
    if (!projectId) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/projects/${projectId}/train/${jobId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get download URL');
      }

      const data = await response.json();
      
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!projectId) return;
    if (!window.confirm('Are you sure you want to delete this training history?')) return;

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
        throw new Error(errorData.detail || 'Failed to delete training history');
      }

      // Remove from state
      setHistory(prev => prev.filter(job => job.job_id !== jobId));
      setSelectedJobs(prev => prev.filter(id => id !== jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete training history');
    }
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleCompare = () => {
    const selectedJobData = history.filter(job => selectedJobs.includes(job.job_id));
    if (selectedJobData.length >= 2) {
      onCompare?.(selectedJobData);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'failed':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      case 'running':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  return (
    <Panel title="Training History" className="font-headline">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <Button
            onClick={fetchHistory}
            disabled={isLoading || !projectId}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          
          {selectedJobs.length >= 2 && (
            <Button
              onClick={handleCompare}
              variant="outline"
              size="sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Compare ({selectedJobs.length})
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* History list */}
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((job) => (
              <div
                key={job.job_id}
                className="border border-border/50 rounded-lg p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.job_id)}
                      onChange={() => handleSelectJob(job.job_id)}
                      disabled={job.status !== 'done'}
                      className="rounded"
                    />
                    {getStatusIcon(job.status)}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    {job.model?.is_production && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(job.created_at)}
                  </div>
                </div>

                {/* Configuration */}
                <div className="text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Epochs:</span>
                      <span className="ml-1 font-medium">{job.config?.epochs || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Batch:</span>
                      <span className="ml-1 font-medium">{job.config?.batch || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">LR:</span>
                      <span className="ml-1 font-medium">{job.config?.learningRate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-1 font-medium">{job.config?.imgsz || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                {job.final_metrics && Object.keys(job.final_metrics).length > 0 && (
                  <div className="text-sm">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">mAP50:</span>
                        <span className="ml-1 font-medium">
                          {job.final_metrics.map50 ? `${(job.final_metrics.map50 * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Precision:</span>
                        <span className="ml-1 font-medium">
                          {job.final_metrics.precision ? job.final_metrics.precision.toFixed(3) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recall:</span>
                        <span className="ml-1 font-medium">
                          {job.final_metrics.recall ? job.final_metrics.recall.toFixed(3) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    {job.model ? `Model: ${job.model.name}` : 'No model generated'}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.model && job.status === 'done' && (
                      <Button
                        onClick={() => handleDownload(job.job_id)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(job.job_id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Delete training job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No training history found</p>
            <p className="text-xs">Completed training runs will appear here</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

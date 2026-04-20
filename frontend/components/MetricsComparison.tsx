'use client';

import { Button } from '@/components/ui/button';
import { Panel } from '@/components/panels';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { X, TrendingUp } from 'lucide-react';

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

interface MetricsComparisonProps {
  jobs: TrainingJob[];
  onClose: () => void;
}

export function MetricsComparison({ jobs, onClose }: MetricsComparisonProps) {
  // Prepare data for comparison charts
  const comparisonData = jobs.map(job => ({
    name: job.model?.name || `Job ${job.job_id.slice(0, 8)}`,
    jobId: job.job_id,
    map50: job.final_metrics.map50 ? (job.final_metrics.map50 * 100) : 0,
    precision: job.final_metrics.precision || 0,
    recall: job.final_metrics.recall || 0,
    epochs: job.config?.epochs || 0,
    batchSize: job.config?.batch || 0,
    learningRate: job.config?.learningRate || 0,
    created_at: job.created_at,
  }));

  // Sort by creation date for line chart
  const timelineData = [...comparisonData].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getBestModel = (metric: 'map50' | 'precision' | 'recall') => {
    const best = comparisonData.reduce((prev, current) => 
      current[metric] > prev[metric] ? current : prev
    );
    return best.name;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Model Comparison
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Comparing {jobs.length} training runs
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Best mAP50</div>
              <div className="text-lg font-semibold">{getBestModel('map50')}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Best Precision</div>
              <div className="text-lg font-semibold">{getBestModel('precision')}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Best Recall</div>
              <div className="text-lg font-semibold">{getBestModel('recall')}</div>
            </div>
          </div>

          {/* Metrics Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Performance Metrics" className="font-headline">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                  <Bar dataKey="map50" fill="var(--chart-1)" name="mAP50 %" />
                  <Bar dataKey="precision" fill="var(--chart-2)" name="Precision" />
                  <Bar dataKey="recall" fill="var(--chart-3)" name="Recall" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Configuration Comparison" className="font-headline">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                  <Bar dataKey="epochs" fill="var(--chart-4)" name="Epochs" />
                  <Bar dataKey="batchSize" fill="var(--chart-5)" name="Batch Size" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Timeline Chart */}
          <Panel title="Performance Over Time" className="font-headline mb-6">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="created_at" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatDate}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  labelFormatter={(value) => formatDate(value as string)}
                />
                <Line
                  type="monotone"
                  dataKey="map50"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  name="mAP50 %"
                />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  name="Precision"
                />
                <Line
                  type="monotone"
                  dataKey="recall"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  name="Recall"
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {/* Detailed Table */}
          <Panel title="Detailed Comparison" className="font-headline">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">mAP50</th>
                    <th className="text-left p-2">Precision</th>
                    <th className="text-left p-2">Recall</th>
                    <th className="text-left p-2">Epochs</th>
                    <th className="text-left p-2">Batch</th>
                    <th className="text-left p-2">Learning Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item, index) => (
                    <tr key={item.jobId} className="border-b border-border/30">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 text-muted-foreground">{formatDate(item.created_at)}</td>
                      <td className="p-2">{item.map50.toFixed(1)}%</td>
                      <td className="p-2">{item.precision.toFixed(3)}</td>
                      <td className="p-2">{item.recall.toFixed(3)}</td>
                      <td className="p-2">{item.epochs}</td>
                      <td className="p-2">{item.batchSize}</td>
                      <td className="p-2">{item.learningRate.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

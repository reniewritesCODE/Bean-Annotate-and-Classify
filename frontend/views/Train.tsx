'use client';

import { useApp } from '@/context/AppContext';
import { Panel, StatCard } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, Pause2, Square } from 'lucide-react';

interface TrainConfig {
  model: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
}

export function TrainView() {
  const { isTraining, setIsTraining, trainingMetrics, setTrainingMetrics, addToast } = useApp();
  const [config, setConfig] = useState<TrainConfig>({
    model: 'YOLOv8-medium',
    epochs: 50,
    batchSize: 16,
    learningRate: 0.001,
  });

  useEffect(() => {
    if (!isTraining) return;

    const interval = setInterval(() => {
      setTrainingMetrics((prev) => {
        if (prev.length >= config.epochs) {
          setIsTraining(false);
          addToast('Training completed successfully!', 'success');
          return prev;
        }

        const epoch = prev.length + 1;
        const newMetric = {
          epoch,
          loss: Math.max(0.1, 1.0 - epoch * 0.018 + Math.random() * 0.05),
          acc: Math.min(0.98, 0.5 + epoch * 0.008 + Math.random() * 0.02),
          f1: Math.min(0.98, 0.5 + epoch * 0.008 + Math.random() * 0.02),
        };
        return [...prev, newMetric];
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTraining, config.epochs, setIsTraining, setTrainingMetrics, addToast]);

  const handleStartTraining = () => {
    setTrainingMetrics([]);
    setIsTraining(true);
    addToast('Training started', 'success');
  };

  const handleStop = () => {
    setIsTraining(false);
    addToast('Training stopped', 'info');
  };

  const metrics = trainingMetrics[trainingMetrics.length - 1];

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration */}
        <Panel title="Training Configuration">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Model
              </label>
              <select
                value={config.model}
                onChange={(e) =>
                  setConfig({ ...config, model: e.target.value })
                }
                disabled={isTraining}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground disabled:opacity-50"
              >
                <option>YOLOv8-nano</option>
                <option>YOLOv8-small</option>
                <option selected>YOLOv8-medium</option>
                <option>YOLOv8-large</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Epochs: {config.epochs}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={config.epochs}
                onChange={(e) =>
                  setConfig({ ...config, epochs: parseInt(e.target.value) })
                }
                disabled={isTraining}
                className="w-full disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Batch Size: {config.batchSize}
              </label>
              <input
                type="range"
                min="8"
                max="64"
                step="8"
                value={config.batchSize}
                onChange={(e) =>
                  setConfig({ ...config, batchSize: parseInt(e.target.value) })
                }
                disabled={isTraining}
                className="w-full disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Learning Rate: {config.learningRate}
              </label>
              <input
                type="number"
                step="0.0001"
                value={config.learningRate}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    learningRate: parseFloat(e.target.value),
                  })
                }
                disabled={isTraining}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground disabled:opacity-50"
              />
            </div>

            <div className="flex gap-2 pt-4">
              {!isTraining ? (
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  onClick={handleStartTraining}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Start Training
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                  onClick={handleStop}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </div>
        </Panel>

        {/* Metrics */}
        {trainingMetrics.length > 0 && (
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Epoch"
                value={trainingMetrics.length}
                subtext={`of ${config.epochs}`}
              />
              <StatCard
                label="Loss"
                value={metrics?.loss.toFixed(4)}
                subtext="Lower is better"
              />
              <StatCard
                label="Accuracy"
                value={metrics ? `${(metrics.acc * 100).toFixed(1)}%` : '-'}
                subtext="Training accuracy"
              />
              <StatCard
                label="F1 Score"
                value={metrics ? metrics.f1.toFixed(3) : '-'}
                subtext="Model performance"
              />
            </div>

            {/* Progress Bar */}
            <Panel title="Training Progress">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">
                    Progress: {trainingMetrics.length} / {config.epochs}
                  </span>
                  <span className="text-muted-foreground">
                    {((trainingMetrics.length / config.epochs) * 100).toFixed(
                      0
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(trainingMetrics.length / config.epochs) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </Panel>

            {/* Loss Chart */}
            <Panel title="Loss Curve">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trainingMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="epoch"
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
                  <Line
                    type="monotone"
                    dataKey="loss"
                    stroke="var(--chart-2)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

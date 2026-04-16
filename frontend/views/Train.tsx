'use client';

import { useApp } from '@/context/AppContext';
import { Panel, StatCard } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

interface AugmentationOptions {
  flip: boolean;
  rotate90: boolean;
  crop: boolean;
  rotation: boolean;
  shear: boolean;
  brightness: boolean;
  exposure: boolean;
  blur: boolean;
  noise: boolean;
  motionBlur: boolean;
  cameraGain: boolean;
}

interface TrainConfig {
  model: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
  imageSize: number;
  preprocessing: {
    autoOrient: boolean;
  };
  augmentations: AugmentationOptions;
}

export function TrainView() {
  const { isTraining, setIsTraining, trainingMetrics, setTrainingMetrics, addToast, currentProject, images } = useApp();
  const [config, setConfig] = useState<TrainConfig>({
    model: 'YOLOv8n (global base)',
    epochs: 50,
    batchSize: 16,
    learningRate: 0.0001,
    imageSize: 640,
    preprocessing: {
      autoOrient: true,
    },
    augmentations: {
      flip: true,
      rotate90: false,
      crop: false,
      rotation: false,
      shear: false,
      brightness: false,
      exposure: false,
      blur: false,
      noise: false,
      motionBlur: false,
      cameraGain: false,
    },
  });
  const [jobId, setJobId] = useState<string | null>(null);

  // Dataset split state (percentages must sum to 100)
  const [trainSplit, setTrainSplit] = useState<number>(70);
  const [valSplit, setValSplit] = useState<number>(20);
  const [testSplit, setTestSplit] = useState<number>(10);

  const logEndRef = useRef<HTMLDivElement>(null);
  const totalImages = images.length;
  const trainCount = Math.floor(totalImages * (trainSplit / 100));
  const valCount = Math.floor(totalImages * (valSplit / 100));
  const testCount = totalImages - trainCount - valCount;

  // Handle train split change - adjusts val/test proportionally
  const handleTrainSplitChange = (value: number[]) => {
    const newTrain = Math.min(95, Math.max(50, value[0]));
    const remaining = 100 - newTrain;
    const currentValRatio = valSplit / (valSplit + testSplit);
    const newVal = Math.round(remaining * currentValRatio);
    const newTest = remaining - newVal;
    setTrainSplit(newTrain);
    setValSplit(newVal);
    setTestSplit(newTest);
  };

  // Handle val split change - adjusts test accordingly
  const handleValSplitChange = (value: number[]) => {
    const maxVal = 100 - trainSplit - 1; // Keep at least 1% for test
    const newVal = Math.min(maxVal, Math.max(1, value[0]));
    const newTest = 100 - trainSplit - newVal;
    setValSplit(newVal);
    setTestSplit(newTest);
  };
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trainingMetrics]);

  // useEffect(() => {
  //   if (!isTraining) return;

  //   const interval = setInterval(() => {
  //     setTrainingMetrics((prev) => {
  //       if (prev.length >= config.epochs) {
  //         setIsTraining(false);
  //         addToast('Training completed successfully!', 'success');
  //         return prev;
  //       }

  //       const epoch = prev.length + 1;
  //       const newMetric = {
  //         epoch,
  //         loss: Math.max(0.1, 1.0 - epoch * 0.018 + Math.random() * 0.05),
  //         acc: Math.min(0.98, 0.5 + epoch * 0.008 + Math.random() * 0.02),
  //         f1: Math.min(0.98, 0.5 + epoch * 0.008 + Math.random() * 0.02),
  //       };
  //       return [...prev, newMetric];
  //     });
  //   }, 500);

  //   return () => clearInterval(interval);
  // }, [isTraining, config.epochs, setIsTraining, setTrainingMetrics, addToast]);
  // Replace the fake simulation useEffect
// Replace the fake simulation useEffect
  useEffect(() => {
    if (!isTraining || !currentProject?.id) return;

    const token = localStorage.getItem('access_token');

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${currentProject.id}/train/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        console.log('polling response:', data);  // ← add here

        if (data.progress?.length) {
          const mapped = data.progress.map((p: any) => ({
            epoch: p.epoch,
            loss: p.loss ?? 0,
            acc: p.map50 ?? 0,
            f1: p.precision ?? 0,
          }));
          setTrainingMetrics(mapped);
        }

        if (data.status === 'done') {
          setIsTraining(false);
          clearInterval(interval);
          addToast('Training completed successfully!', 'success');
        } else if (data.status === 'failed') {
          setIsTraining(false);
          clearInterval(interval);
          addToast(data.config?.error || 'Training failed', 'error');
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isTraining, currentProject?.id]);

  const handleStartTraining = async () => {
    if (!currentProject?.id) {
      addToast('No project selected', 'error');
      return;
    }

    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          epochs: config.epochs,
          imgsz: config.imageSize,
          batch: config.batchSize,
          splits: {
            train: trainSplit,
            val: valSplit,
            test: testSplit,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.detail || 'Failed to start training', 'error');
        return;
      }

      // Job is queued — now let the fake simulation run as normal
      setJobId(data.job_id);
      setTrainingMetrics([]);
      setIsTraining(true);
      addToast('Training started', 'success');

    } catch {
      addToast('Network error starting training', 'error');
    }
  };

  // const handleStop = () => {
  //   setIsTraining(false);
  //   addToast('Training stopped', 'info');
  // };

  const handleStop = async () => {
      if (!currentProject?.id) return;

      const token = localStorage.getItem('access_token');

      try {
        await fetch(`/api/projects/${currentProject.id}/train/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {
        // best effort
      }

      setIsTraining(false);
      setJobId(null);
      addToast('Training stopped', 'info');
 };
  const metrics = trainingMetrics[trainingMetrics.length - 1];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4">
        {/* Left Column: Configuration & Data Split */}
        <div className="flex flex-col gap-4">
          <Panel title="Dataset split" className='font-headline'>
            <div className="flex flex-col text-sm px-2 font-sans gap-4 py-2">
              {/* Train Split */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Train</span>
                  <span className="text-foreground">{trainCount} images ({trainSplit}%)</span>
                </div>
                <Slider
                  value={[trainSplit]}
                  onValueChange={handleTrainSplitChange}
                  min={50}
                  max={95}
                  step={1}
                  disabled={isTraining}
                  className="w-full"
                />
              </div>

              {/* Validation Split */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Validation</span>
                  <span className="text-foreground">{valCount} images ({valSplit}%)</span>
                </div>
                <Slider
                  value={[valSplit]}
                  onValueChange={handleValSplitChange}
                  min={1}
                  max={100 - trainSplit - 1}
                  step={1}
                  disabled={isTraining}
                  className="w-full"
                />
              </div>

              {/* Test Split (read-only display) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Test</span>
                  <span className="text-foreground">{testCount} images ({testSplit}%)</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/30 rounded-full"
                    style={{ width: `${testSplit}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Total images</span>
                  <span>{totalImages}</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Configuration" className="font-headline">
            <div className="flex flex-col text-sm px-2 font-sans">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="font-medium text-foreground">Base model</span>
                <span className="text-foreground text-sm">{config.model}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Epochs</span>
                <input
                  type="number"
                  value={config.epochs}
                  onChange={(e) => setConfig({ ...config, epochs: parseInt(e.target.value) || 0 })}
                  disabled={isTraining}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 w-[160px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Batch size</span>
                <select
                  value={config.batchSize}
                  onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 min-w-[160px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Learning rate</span>
                <input
                  type="number"
                  step="0.0001"
                  value={config.learningRate}
                  onChange={(e) => setConfig({ ...config, learningRate: parseFloat(e.target.value) || 0 })}
                  disabled={isTraining}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 w-[160px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Image size</span>
                <select
                  value={config.imageSize}
                  onChange={(e) => setConfig({ ...config, imageSize: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 min-w-[160px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={320}>320</option>
                  <option value={640}>640</option>
                  <option value={1280}>1280</option>
                </select>
              </div>

              {/* Preprocessing */}
              <div className="py-3 border-b border-border/50">
                <div className="font-medium text-foreground mb-2">Preprocessing</div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="auto-orient"
                    checked={config.preprocessing.autoOrient}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        preprocessing: { ...config.preprocessing, autoOrient: checked as boolean },
                      })
                    }
                    disabled={isTraining}
                  />
                  <label htmlFor="auto-orient" className="text-sm text-foreground cursor-pointer">
                    Auto-orient images (fix EXIF rotation)
                  </label>
                </div>
              </div>

              {/* Augmentations */}
              <div className="py-3">
                <div className="font-medium text-foreground mb-3">Augmentations</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'flip', label: 'Flip' },
                    { key: 'rotate90', label: '90° Rotate' },
                    { key: 'crop', label: 'Crop' },
                    { key: 'rotation', label: 'Rotation' },
                    { key: 'shear', label: 'Shear' },
                    { key: 'brightness', label: 'Brightness' },
                    { key: 'exposure', label: 'Exposure' },
                    { key: 'blur', label: 'Blur' },
                    { key: 'noise', label: 'Noise' },
                    { key: 'motionBlur', label: 'Motion Blur' },
                    { key: 'cameraGain', label: 'Camera Gain' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`aug-${key}`}
                        checked={config.augmentations[key as keyof AugmentationOptions]}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            augmentations: { ...config.augmentations, [key]: checked as boolean },
                          })
                        }
                        disabled={isTraining}
                      />
                      <label htmlFor={`aug-${key}`} className="text-sm text-foreground cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* <Panel title="Dataset split" className='font-headline'>
            <div className="flex flex-col text-sm px-2 font-sans">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Train</span>
                <span className="text-foreground">83 images (80%)</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Validation</span>
                <span className="text-foreground">11 images (10%)</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-medium text-foreground">Test</span>
                <span className="text-foreground">10 images (10%)</span>
              </div>
            </div>
          </Panel> */}


          

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-[#D97706] hover:bg-[#B45309] text-white py-5 text-[15px] font-semibold"
              onClick={handleStartTraining}
              disabled={isTraining}
            >
              Start training
            </Button>
            <Button
              className="bg-[#262626] hover:bg-[#404040] text-foreground py-5 px-6 font-semibold"
              onClick={handleStop}
              disabled={!isTraining}
            >
              Stop
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* <StatCard
              label="Epoch"
              value={trainingMetrics.length}
              subtext={`of ${config.epochs}`}
            />
            <StatCard
              label="Loss"
              value={metrics ? metrics.loss.toFixed(4) : "0.0000"}
              subtext="Lower is better"
            />
            <StatCard
              label="Accuracy"
              value={metrics ? `${(metrics.acc * 100).toFixed(1)}%` : "0.0%"}
              subtext="Training accuracy"
            />
            <StatCard
              label="F1 Score"
              value={metrics ? metrics.f1.toFixed(3) : "0.000"}
              subtext="Model performance"
            /> */}
            <StatCard
                label="Epoch"
                value={trainingMetrics.length}
                subtext={`of ${config.epochs}`}
              />
              <StatCard
                label="Loss"
                value={metrics ? metrics.loss.toFixed(4) : "0.0000"}
                subtext="Lower is better"
              />
              <StatCard
                label="mAP50"
                value={metrics ? `${(metrics.acc * 100).toFixed(1)}%` : "0.0%"}
                subtext="Validation accuracy"
              />
              <StatCard
                label="Precision"
                value={metrics ? metrics.f1.toFixed(3) : "0.000"}
                subtext="Model performance"
              />
          </div>

          {/* Progress Bar */}
          <Panel title="Training Progress" className='font-headline'>
            <div className="space-y-2 font-sans">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">
                  Progress: {trainingMetrics.length} / {config.epochs}
                </span>
                <span className="text-muted-foreground">
                  {((trainingMetrics.length / config.epochs) * 100).toFixed(0)}%
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
          <Panel title="Loss Curve" className='font-headline'>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trainingMetrics.length ? trainingMetrics : [{ epoch: 0, loss: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" tick={{ fontSize: 12 }} />
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
                  
          {/* Training Log */}
          <Panel title="Training Log" className='font-headline'>
            <div className="h-[100px] overflow-y-auto bg-[#0a0a0a] border border-border/50 rounded-md p-4 flex flex-col gap-1 font-sans">
              {trainingMetrics.length === 0 && !isTraining && (
                <div className="text-muted-foreground font-mono text-sm">System ready. Waiting to start training...</div>
              )}
              {trainingMetrics.map((m,idx) => (
                <div key={idx} className="text-zinc-300 font-mono text-[13px] leading-tight">
                  <span className="text-zinc-500">INFO</span> Epoch {m.epoch}/{config.epochs}
                  {' • '}loss: <span className="text-amber-500">{m.loss.toFixed(4)}</span>
                  {' • '}mAP50: <span className="text-blue-400">{m.acc.toFixed(4)}</span>
                  {' • '}recall: <span className="text-indigo-400">{m.f1.toFixed(4)}</span>
                </div>
              ))}
              {isTraining && (
                <div className="text-primary/70 font-mono text-sm mt-2 flex items-center gap-2">
                  Training in progress...
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              )}
              {!isTraining && trainingMetrics.length > 0 && trainingMetrics.length >= config.epochs && (
                <div className="text-[#10b981] font-mono text-sm mt-2">Training completed.</div>
              )}
              {!isTraining && trainingMetrics.length > 0 && trainingMetrics.length < config.epochs && (
                <div className="text-red-400 font-mono text-sm mt-2">Training stopped.</div>
              )}
              <div ref={logEndRef} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

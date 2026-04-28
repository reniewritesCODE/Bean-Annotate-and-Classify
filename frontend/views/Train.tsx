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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Zap, Pause, Square, Layers } from 'lucide-react';

import { TrainingHistory } from '@/components/TrainingHistory';

import { MetricsComparison } from '@/components/MetricsComparison';

import { SuccessfulModelsPanel } from '@/components/SuccessfulModelsPanel';

import Link from 'next/link';



interface TrainConfig {

  model: string;

  epochs: number;

  batchSize: number;

  learningRate: number;

  imageSize: number;

}



export function TrainView() {

  const { isTraining, setIsTraining, trainingMetrics, setTrainingMetrics, addToast, currentProject } = useApp();

  const [config, setConfig] = useState<TrainConfig>({

    // model: 'YOLOv8n (global base)',
    model: '',

    epochs: 50,

    batchSize: 16,

    learningRate: 0.0001,

    imageSize: 640,

  });

  const [baseModel, setBaseModel] = useState<{id: string; name: string} | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);

  const [compareJobs, setCompareJobs] = useState<any[]>([]);

  const [showComparison, setShowComparison] = useState(false);

  const [versions, setVersions] = useState<any[]>([]);

  const [selectedVersionId, setSelectedVersionId] = useState<string>('');



  useEffect(() => {

    if (!currentProject?.id) return;

    const fetchVersions = async () => {

      const token = localStorage.getItem('access_token');

      try {

        const res = await fetch(`/api/projects/${currentProject.id}/versions`, {

          headers: { 'Authorization': `Bearer ${token}` },

        });

        if (res.ok) {

          const data = await res.json();

          setVersions(data);

          

          // Use search params or default to first version

          const params = new URLSearchParams(window.location.search);

          const versionParam = params.get('version');

          

          if (versionParam && data.some((v: any) => v.id === versionParam)) {

            setSelectedVersionId(versionParam);

          } else if (data.length > 0) {

            setSelectedVersionId(data[0].id);

          }

        }

      } catch (err) {

        console.error('Failed to fetch versions', err);

      }

    };

    fetchVersions();

  }, [currentProject?.id]);



  const logContainerRef = useRef<HTMLDivElement>(null);

  // Scroll only within the log box — not the whole page
  useEffect(() => {
    const el = logContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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

  // Fetch global base model
  useEffect(() => {
    if (!currentProject?.id) return;
    const fetchBaseModel = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/projects/${currentProject.id}/models`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const models = await res.json();
          const base = models.find((m: any) => m.is_base);
          if (base) {
            setBaseModel({ id: base.id, name: base.name });
            setConfig(prev => ({ ...prev, model: base.name }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch base model', err);
      }
    };
    fetchBaseModel();
  }, [currentProject?.id]);

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

          learning_rate: config.learningRate,

          model: config.model,

          version_id: selectedVersionId || undefined,

        }),

      });



      const data = await res.json();



      if (!res.ok) {

        addToast(data.detail || 'Failed to start training', 'error');

        return;

      }



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



  const handleCompare = (jobs: any[]) => {

    setCompareJobs(jobs);

    setShowComparison(true);

  };



  const metrics = trainingMetrics[trainingMetrics.length - 1];



  return (

    <div className="p-4 space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4">

        {/* Left Column: Training Hyperparameters */}

        <div className="flex flex-col gap-4">

          <Panel title="Training Configuration" className="font-headline">

            <div className="flex flex-col text-sm px-2 font-sans">

              <div className="flex justify-between items-center py-2 border-b border-border/50">

                <span className="font-medium text-foreground">Base model</span>

                {/* <span className="text-foreground text-sm">{config.model}</span> */}

                <span className="text-foreground text-sm">
                  {baseModel ? baseModel.name : 'Loading...'}
                </span>

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

                <Select
                  value={config.batchSize.toString()}
                  onValueChange={(val) => setConfig({ ...config, batchSize: parseInt(val) })}
                  disabled={isTraining}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select batch size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                  </SelectContent>
                </Select>

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



              <div className="flex justify-between items-center py-3">

                <span className="font-medium text-foreground">Image size</span>

                <Select
                  value={config.imageSize.toString()}
                  onValueChange={(val) => setConfig({ ...config, imageSize: parseInt(val) })}
                  disabled={isTraining}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select image size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="320">320</SelectItem>
                    <SelectItem value="640">640</SelectItem>
                    <SelectItem value="1280">1280</SelectItem>
                  </SelectContent>
                </Select>

              </div>

            </div>

          </Panel>



          {/* Dataset Version Info */}

          <Panel title="Dataset Version" className="font-headline">

            <div className="flex flex-col text-sm px-2 font-sans">

              <div className="flex flex-col gap-2 py-3 border-b border-border/50">

                <span className="font-medium text-foreground">Select Version</span>

                <Select
                  value={selectedVersionId}
                  onValueChange={setSelectedVersionId}
                  disabled={isTraining || versions.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.length === 0 && (
                      <SelectItem value="none" disabled>No versions found</SelectItem>
                    )}
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.train_split}/{v.val_split}/{v.test_split})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {versions.length === 0 && (

                  <p className="text-xs text-muted-foreground mt-1 text-red-400">

                    No versions found. Please create one first.

                  </p>

                )}

              </div>

            </div>

            <div className="p-4 text-sm text-muted-foreground">

              <p className="mb-3">

                Need a new configuration? Adjust dataset splits, preprocessing, and augmentations in the 

                <Link 

                  href={`/projects/${currentProject?.id}/versions`}

                  className="text-primary hover:underline inline-flex items-center gap-1 mx-1"

                >

                  <Layers className="w-3 h-3" />

                  Versions

                </Link>

                page.

              </p>

            </div>

          </Panel>



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
                  isAnimationActive={true}
                  animationDuration={300}
                />

              </LineChart>

            </ResponsiveContainer>

          </Panel>

                  

          {/* Training Log */}

          <Panel title="Training Log" className='font-headline'>

            <div ref={logContainerRef} className="h-[100px] overflow-y-auto bg-[#0a0a0a] border border-border/50 rounded-md p-4 flex flex-col gap-1 font-sans">

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



            </div>

          </Panel>

        </div>

      </div>



      



      {/* Successfully Trained Models Section */}

      <div className="mt-4">

        <SuccessfulModelsPanel projectId={currentProject?.id} />

      </div>



      {/* Training History Section */}

      <div className="mt-4">

        <TrainingHistory 

          projectId={currentProject?.id}

          onCompare={handleCompare}

        />

      </div>



      {/* Metrics Comparison Modal */}

      {showComparison && (

        <MetricsComparison 

          jobs={compareJobs}

          onClose={() => setShowComparison(false)}

        />

      )}

    </div>

  );

}


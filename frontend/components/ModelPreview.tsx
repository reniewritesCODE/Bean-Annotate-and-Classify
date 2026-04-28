'use client';

import { useState, useEffect, useRef } from 'react';
import { Panel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { DEFECT_CLASSES } from '@/lib/constants';
import { 
  Upload, 
  Link as LinkIcon, 
  Cpu, 
  Copy, 
  Check, 
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Detection {
  cls: number;
  conf: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ModelPreviewProps {
  projectId: string;
  modelId: string;
}

export function ModelPreview({ projectId, modelId }: ModelPreviewProps) {
  const { addToast } = useApp();
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSampleUrl, setSelectedSampleUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [threshold, setThreshold] = useState(0.5);
  const [overlap, setOverlap] = useState(0.5);
  const [opacity, setOpacity] = useState(0.75);
  const [labelMode, setLabelMode] = useState<'confidence' | 'class' | 'none'>('confidence');
  const [copied, setCopied] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch samples from the test set
  useEffect(() => {
    const fetchSamples = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/images/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const allImages = await res.json();
          // Filter for test split and take up to 4
          const testSamples = allImages
            .filter((img: any) => img.split === 'test')
            .slice(0, 4);
          setSamples(testSamples);
          if (testSamples.length > 0) {
            setSelectedSampleUrl(testSamples[0].url);
          }
        }
      } catch (err) {
        console.error('Failed to fetch samples:', err);
      }
    };
    fetchSamples();
  }, [projectId]);

  // Run inference when sample, model, or threshold changes
  useEffect(() => {
    if (selectedSampleUrl) {
      runInference(selectedSampleUrl);
    }
  }, [selectedSampleUrl, modelId, threshold]);

  const runInference = async (url: string) => {
    setIsProcessing(true);
    const token = localStorage.getItem('access_token');
    
    try {
      // 1. Fetch the image as a blob
      const imgRes = await fetch(url);
      const blob = await imgRes.blob();
      
      // 2. Upload to inference endpoint
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('threshold', threshold.toString());
      formData.append('model_id', modelId);
      formData.append('device', 'cpu');

      const res = await fetch(`/api/projects/${projectId}/inference/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Inference failed');
      
      const data = await res.json();
      setDetections(data.detections || []);
    } catch (err) {
      console.error('Inference error:', err);
      addToast('Failed to run inference on this image', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedSampleUrl(url);
    }
  };

  const drawDetections = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match displayed image
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const cls = DEFECT_CLASSES[det.cls] || DEFECT_CLASSES[0];
      
      // YOLO normalized coordinates (center_x, center_y, width, height)
      const x = (det.x - det.w / 2) * canvas.width;
      const y = (det.y - det.h / 2) * canvas.height;
      const w = det.w * canvas.width;
      const h = det.h * canvas.height;

      // Draw box
      ctx.strokeStyle = cls.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1.0;
      ctx.strokeRect(x, y, w, h);

      // Draw overlay
      ctx.fillStyle = cls.color;
      ctx.globalAlpha = opacity * 0.3;
      ctx.fillRect(x, y, w, h);

      // Draw label
      if (labelMode !== 'none') {
        ctx.globalAlpha = 1.0;
        const label = labelMode === 'confidence' 
          ? `${cls.name} ${(det.conf * 100).toFixed(0)}%`
          : cls.name;
        
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = cls.color;
        ctx.fillRect(x, y - 20, textWidth + 10, 20);
        
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x + 5, y - 6);
      }
    });
  };

  useEffect(() => {
    drawDetections();
  }, [detections, opacity, labelMode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify({ predictions: detections }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 font-sans">
      {/* Left Column: Samples and Upload */}
      <div className="lg:col-span-1 space-y-4">
        <Panel title="Samples from Test Set" className="font-headline">
          <div className="grid grid-cols-4 gap-2">
            {samples.length > 0 ? (
              samples.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => setSelectedSampleUrl(sample.url)}
                  className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    selectedSampleUrl === sample.url ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={sample.url} alt="sample" className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              <div className="col-span-4 py-4 text-center text-xs text-muted-foreground italic">
                No test samples found
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Upload Image or Video File" className="font-headline">
          <div 
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground mb-1">Drop file here or</p>
            <Button variant="outline" size="sm" className="h-8">
              Select File
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
              accept="image/*"
            />
          </div>
        </Panel>

        <Panel title="Image URL" className="font-headline">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Paste a link..."
                className="w-full bg-input border border-border rounded-md pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedSampleUrl((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
          </div>
        </Panel>
      </div>

      {/* Middle: Canvas */}
      <div className="lg:col-span-2">
        <div className="relative bg-black/20 rounded-lg border border-border overflow-hidden h-[500px] flex items-center justify-center">
          {selectedSampleUrl ? (
            <>
              <img
                ref={imageRef}
                src={selectedSampleUrl}
                alt="preview"
                className="max-w-full max-h-full object-contain"
                onLoad={drawDetections}
              />
              <canvas
                ref={canvasRef}
                className="absolute pointer-events-none"
                style={{ 
                  width: imageRef.current?.clientWidth, 
                  height: imageRef.current?.clientHeight 
                }}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-white text-sm font-medium">Running Inference...</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg border border-white/10">
                {detections.length} object{detections.length !== 1 ? 's' : ''} detected
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Select an image to preview model performance</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Controls and JSON */}
      <div className="lg:col-span-1 space-y-4">
        <Panel title="Settings" className="font-headline">
          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Confidence Threshold:</span>
                <span className="font-bold text-primary">{(threshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Overlap Threshold:</span>
                <span className="font-bold text-primary">{(overlap * 100).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={overlap}
                onChange={(e) => setOverlap(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Opacity Threshold:</span>
                <span className="font-bold text-primary">{(opacity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium text-muted-foreground">Label Display Mode:</span>
              <Select
                value={labelMode}
                onValueChange={(val: any) => setLabelMode(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Display mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Draw Confidence</SelectItem>
                  <SelectItem value="class">Draw Class Name</SelectItem>
                  <SelectItem value="none">Hide Labels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Panel>

        <Panel title="JSON Results" className="font-headline h-[200px] flex flex-col">
          <div className="flex-1 relative bg-[#09090b] rounded-md border border-white/5 overflow-hidden font-mono text-[10px]">
            <div className="absolute inset-0 overflow-auto p-3 text-primary-foreground/80 leading-relaxed">
              <pre>{JSON.stringify({ 
                predictions: detections.map(d => ({
                  x: Math.round((d.x - d.w/2) * 1000),
                  y: Math.round((d.y - d.h/2) * 1000),
                  width: Math.round(d.w * 1000),
                  height: Math.round(d.h * 1000),
                  confidence: parseFloat(d.conf.toFixed(3)),
                  class: DEFECT_CLASSES[d.cls]?.name || "unknown",
                  class_id: DEFECT_CLASSES[d.cls]?.id || d.cls,
                  detection_id: Math.random().toString(36).substring(2, 7)
                }))
              }, null, 2)}</pre>
            </div>
            <div className="absolute bottom-2 right-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

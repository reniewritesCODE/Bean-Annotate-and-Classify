'use client';

import { useRef, useEffect, useState } from 'react';
import { Panel, StatCard } from '@/components/panels';
import { DEFECT_CLASSES, INITIAL_IMAGES } from '@/lib/constants';
import { fillBeanCanvas, generateRandomDetections, drawDetectionBox } from '@/lib/canvas-utils';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Play, Square } from 'lucide-react';

export function DetectView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [frameCount, setFrameCount] = useState(0);
  const [detectionStats, setDetectionStats] = useState({
    total: 0,
    classes: {} as Record<number, number>,
  });
  const { addToast } = useApp();

  // Initialize canvas on first render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#F5F1EB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  useEffect(() => {
    if (!isRunning || !canvasRef.current) return;

    const animationId = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get a random image to use as background
      const imageIdx = Math.floor(Math.random() * INITIAL_IMAGES.length);
      const img = INITIAL_IMAGES[imageIdx];

      // Draw bean canvas
      fillBeanCanvas(canvas, img.seed + frameCount);

      // Generate and draw detections
      const detections = generateRandomDetections(
        img.seed + frameCount,
        DEFECT_CLASSES,
        canvas.width,
        canvas.height,
        threshold
      );

      // Draw detection boxes
      detections.forEach((detection) => {
        const defectClass = DEFECT_CLASSES.find((c) => c.id === detection.cls);
        if (defectClass) {
          drawDetectionBox(
            ctx,
            detection.x,
            detection.y,
            detection.w,
            detection.h,
            defectClass.color,
            defectClass.name,
            detection.conf
          );
        }
      });

      // Update stats
      const stats = { total: detections.length, classes: {} as Record<number, number> };
      detections.forEach((d) => {
        stats.classes[d.cls] = (stats.classes[d.cls] || 0) + 1;
      });
      setDetectionStats(stats);
      setFrameCount((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(animationId);
  }, [isRunning, threshold]);

  const handleStart = () => {
    setIsRunning(true);
    setFrameCount(0);
    addToast('Detection started', 'success');
  };

  const handleStop = () => {
    setIsRunning(false);
    addToast('Detection stopped', 'info');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <Panel title="Live Detection Feed" className="font-headline">
            <div className="space-y-4 font-sans">
              <div className="border border-border rounded-lg overflow-hidden bg-muted">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="w-full bg-muted"
                />
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Confidence Threshold
                    </label>
                    <span className="text-sm font-bold text-primary">
                      {(threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    disabled={isRunning}
                    className="w-full disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-2">
                  {!isRunning ? (
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                      onClick={handleStart}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Detection
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
            </div>
          </Panel>
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          {/* Detection Stats */}
          <Panel title="Detection Stats" className='font-headline'>
            <div className="space-y-3 font-sans">
              <StatCard label="Total Objects" value={detectionStats.total} />
              <div className="text-sm space-y-2">
                <p className="font-medium text-foreground">Per-Class Count:</p>
                {DEFECT_CLASSES.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cls.color }}
                      />
                      <span className="text-xs text-foreground">{cls.name}</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {detectionStats.classes[cls.id] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Model Info */}
          <Panel title="Model Info" className='font-headline'>
            <div className="text-sm space-y-2 font-sans">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">YOLOv8-large</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FPS:</span>
                <span className="font-medium">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latency:</span>
                <span className="font-medium">41ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input Size:</span>
                <span className="font-medium">640x640</span>
              </div>
            </div>
          </Panel>

          {/* Legend */}
          <Panel title="Class Colors" className='font-headline'>
            <div className="space-y-2 font-sans">
              {DEFECT_CLASSES.slice(0, 4).map((cls) => (
                <div key={cls.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="text-sm text-foreground">{cls.name}</span>
                </div>
              ))}
              {DEFECT_CLASSES.length > 4 && (
                <p className="text-xs text-muted-foreground pt-2">
                  + {DEFECT_CLASSES.length - 4} more classes
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

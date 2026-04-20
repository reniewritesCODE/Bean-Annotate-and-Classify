'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Panel, StatCard } from '@/components/panels';
import { DEFECT_CLASSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Play, Square, Camera, Upload, X, ChevronDown, ChevronUp, Settings } from 'lucide-react';

type DetectionMode = 'camera' | 'upload';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  detections?: Array<{ cls: number; x: number; y: number; w: number; h: number; conf: number }>;
}

export function DetectView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopActive = useRef<boolean>(false);
  
  const [device, setDevice] = useState<'cpu'|'cuda'>('cpu');
  const [isRunning, setIsRunning] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [mode, setMode] = useState<DetectionMode>('camera');
  const [selectedModel, setSelectedModel] = useState<string>('YOLOv8-large');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [liveDetections, setLiveDetections] = useState<any[]>([]);
  
  const AVAILABLE_MODELS = [
    { name: 'YOLOv8-nano', description: 'Fastest, lowest accuracy' },
    { name: 'YOLOv8-small', description: 'Balanced speed/accuracy' },
    { name: 'YOLOv8-medium', description: 'Good accuracy' },
    { name: 'YOLOv8-large', description: 'Best accuracy, slower' },
  ];
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedPanels, setCollapsedPanels] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    total: 0,
    classes: {} as Record<number, number>,
  });
  const { addToast, currentProject } = useApp();


  const handleStart = () => {
    if (mode === 'upload' && uploadedImages.length > 0) {
      setIsRunning(true);
      // Run sequentially on all pending
      const runAll = async () => {
        for (const img of uploadedImages) {
          if (img.status === 'pending' || img.status === 'error') {
            await runDetectionOnImage(img.id);
          }
        }
        setIsRunning(false);
      };
      runAll();
      addToast('Batch detection started', 'info');
    } else {
      setIsRunning(true);
      addToast('Real-time detection started', 'success');
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    loopActive.current = false;
    if (wsRef.current) wsRef.current.close();
    setLiveDetections([]);
    addToast('Detection stopped', 'info');
  };

  // Camera controls
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      addToast('Camera started', 'success');
    } catch (err) {
      addToast('Camera access denied or not available', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      addToast('Please drop image files only', 'error');
      return;
    }
    addImages(files);
  }, [addToast]);

  const addImages = (files: File[]) => {
    const newImages: UploadedImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setUploadedImages(prev => [...prev, ...newImages]);
    addToast(`${files.length} image(s) added`, 'success');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addImages(files);
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const updateStats = useCallback((detections: any[], accumulate: boolean = false) => {
    setDetectionStats(prev => {
      const classes = accumulate ? { ...prev.classes } : {};
      detections.forEach(d => {
        classes[d.cls] = (classes[d.cls] || 0) + 1;
      });
      return {
        total: accumulate ? prev.total + detections.length : detections.length,
        classes
      };
    });
  }, []);

  const runDetectionOnImage = async (imageId: string) => {
    if (!currentProject?.id) return;
    
    const img = uploadedImages.find(i => i.id === imageId);
    if (!img) return;

    setUploadedImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'processing', detections: undefined } : i));

    try {
      const formData = new FormData();
      formData.append('file', img.file);
      formData.append('threshold', threshold.toString());
      formData.append('device', device);

      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/projects/${currentProject.id}/inference/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Detection failed');

      const data = await res.json();
      setUploadedImages(prev => prev.map(i => i.id === imageId ? { 
        ...i, 
        status: 'done',
        detections: data.detections
      } : i));
      
      updateStats(data.detections, true);
    } catch (err) {
      setUploadedImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'error' } : i));
      addToast('Failed. Check if a model is trained and production ready.', 'error');
    }
  };

  // Inference Websocket Loop
  useEffect(() => {
    if (!isRunning || mode !== 'camera' || !currentProject?.id) {
       loopActive.current = false;
       if (wsRef.current) wsRef.current.close();
       setLiveDetections([]);
       if (mode === 'camera') updateStats([], false);
       return;
    }

    loopActive.current = true;
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/projects/${currentProject.id}/inference/stream`;
    
    const targetWsUrl = wsUrl.replace('3000', '8000'); // Handling typical Next.js to FastAPI proxy dev port
    
    // Fix absolute URLs in dev environment
    const socket = new WebSocket(targetWsUrl.includes('localhost') ? 'ws://localhost:8000' + new URL(targetWsUrl).pathname : targetWsUrl);
    wsRef.current = socket;

    let isWaitingForResponse = false;

    socket.onopen = () => {
      socket.send(JSON.stringify({ config: { device, threshold } }));
      requestFrame();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'detections') {
        setLiveDetections(data.detections);
        updateStats(data.detections, false);
        isWaitingForResponse = false;
        if (loopActive.current) {
          setTimeout(requestFrame, 150); // ~6.6 FPS
        }
      }
    };

    socket.onerror = (e) => {
      console.error('WebSocket Error:', e);
      addToast('Inference streaming failed. Check backend.', 'error');
      setIsRunning(false);
    };

    const requestFrame = () => {
      if (!loopActive.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (isWaitingForResponse) return;
      if (!videoRef.current || videoRef.current.readyState < 2) {
        setTimeout(requestFrame, 100);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = 480 / Math.max(video.videoWidth, video.videoHeight, 1);
      const cw = Math.floor(video.videoWidth * scale);
      const ch = Math.floor(video.videoHeight * scale);
      
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, cw, ch);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        isWaitingForResponse = true;
        wsRef.current.send(JSON.stringify({ frame: dataUrl }));
      }
    };

    return () => {
      loopActive.current = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, [isRunning, mode, currentProject?.id, updateStats]);

  useEffect(() => {
     if (isRunning && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ config: { device, threshold } }));
     }
  }, [device, threshold, isRunning]);

  const renderDetections = (detections: any[]) => {
    return detections.map((det, i) => {
      const cls = DEFECT_CLASSES.find(c => c.id === det.cls) || DEFECT_CLASSES[0];
      const left = (det.x - det.w / 2) * 100;
      const top = (det.y - det.h / 2) * 100;
      const width = det.w * 100;
      const height = det.h * 100;
      return (
        <div 
          key={i}
          className="absolute border-2 pointer-events-none"
          style={{
            left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
            borderColor: cls.color
          }}
        >
          <div 
            className="absolute -top-5 left-[-2px] text-[10px] px-1 font-bold text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: cls.color }}
          >
            {cls.name} {(det.conf * 100).toFixed(0)}%
          </div>
        </div>
      );
    });
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
      <div className="h-[calc(100vh-80px)] flex flex-col gap-3 p-3 overflow-hidden">
      {/* Top Bar: Mode Toggle Only */}
      <div className="flex gap-2 shrink-0">
        <Button
          variant={mode === 'camera' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('camera');
            startCamera();
          }}
          className={mode === 'camera' ? 'bg-primary text-white' : ''}
        >
          <Camera className="w-4 h-4 mr-2" />
          Camera
        </Button>
        <Button
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('upload');
            stopCamera();
          }}
          className={mode === 'upload' ? 'bg-primary text-white' : ''}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
        {/* Main Content Area */}
        <div className="lg:col-span-3 min-h-0 flex flex-col">
          <Panel title={mode === 'camera' ? 'Camera Feed' : 'Uploaded Images'} className="font-headline flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col gap-4 font-sans min-h-0">
              <div className="flex-1 border border-border rounded-lg overflow-hidden bg-muted relative min-h-0">
                <canvas ref={canvasRef} className="hidden" />
                {mode === 'camera' ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                    {liveDetections.length > 0 && (
                      <div className="absolute inset-0 max-w-full max-h-full object-contain z-10 pointer-events-none">
                        <div className="relative w-full h-full" style={{ aspectRatio: videoRef.current ? `${videoRef.current.videoWidth}/${videoRef.current.videoHeight}` : 'auto' }}>
                          {renderDetections(liveDetections)}
                        </div>
                      </div>
                    )}
                  </>
                ) : mode === 'upload' ? (
                  <div
                    ref={dropZoneRef}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`w-full h-full flex flex-col items-center justify-center gap-4 p-8 transition-colors ${
                      isDragging ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploadedImages.length === 0 ? (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <p className="text-lg font-medium text-foreground">
                          Drag & drop images here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to select files
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Select Images
                        </Button>
                      </>
                    ) : (
                      <div className="w-full h-full overflow-y-auto">
                        <div className="grid grid-cols-3 gap-2 p-2">
                          {uploadedImages.map((img) => (
                            <div
                              key={img.id}
                              className={`relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer ${
                                selectedImageId === img.id ? 'border-primary' : 'border-border'
                              }`}
                              onClick={() => setSelectedImageId(img.id)}
                            >
                              <img
                                src={img.preview}
                                alt={`Upload ${img.id}`}
                                className="w-full h-full object-cover"
                              />
                              {img.detections && (
                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                  {renderDetections(img.detections)}
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(img.id);
                                }}
                                className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90 z-20"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              {img.status === 'processing' && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                  <span className="text-white text-xs">Processing...</span>
                                </div>
                              )}
                              {img.status === 'done' && (
                                <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full z-20 shadow-sm" />
                              )}
                            </div>
                          ))}
                          <div
                            className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Controls */}
              <div className="shrink-0 flex gap-2">
                {!isRunning ? (
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    onClick={handleStart}
                    disabled={mode === 'upload' && uploadedImages.length === 0}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {mode === 'upload' ? 'Detect All' : 'Start Detection'}
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
                {mode === 'upload' && selectedImageId && (
                  <Button
                    variant="outline"
                    onClick={() => runDetectionOnImage(selectedImageId)}
                    disabled={isRunning}
                  >
                    Detect Selected
                  </Button>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Panel: Model, Threshold, Stats */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          {/* Compact Model + Threshold Row */}
          <div className="flex gap-2 shrink-0">
            {/* Model Selector */}
            <Panel title="Model" className='font-headline shrink-0 flex-1 min-w-0'>
              <div className="font-sans">
                <div className="relative">
                  <button
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="w-full flex items-center justify-between px-2 py-1.5 border border-border rounded-md hover:bg-muted text-left text-sm"
                  >
                    <span className="font-medium truncate">{selectedModel}</span>
                    {showModelSelector ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
                  </button>
                  {showModelSelector && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50">
                      <div className="p-1.5">
                        {AVAILABLE_MODELS.map((model) => (
                          <button
                            key={model.name}
                            onClick={() => {
                              setSelectedModel(model.name);
                              setShowModelSelector(false);
                              addToast(`Switched to ${model.name}`, 'info');
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex flex-col gap-0.5 hover:bg-muted ${
                              selectedModel === model.name ? 'bg-primary/10 border border-primary/30' : ''
                            }`}
                          >
                            <span className="font-medium">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground">{model.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            {/* Hardware Toggle */}
            <Panel title="Device" className='font-headline shrink-0 flex-1 min-w-0'>
              <div className="font-sans flex items-center justify-between">
                {/* <span className="text-sm font-medium text-foreground">Device</span> */}
                <div className="flex bg-muted rounded-md p-0.5">
                  <button
                    onClick={() => setDevice('cpu')}
                    disabled={isRunning}
                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${device === 'cpu' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    CPU
                  </button>
                  <button
                    onClick={() => setDevice('cuda')}
                    disabled={isRunning}
                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${device === 'cuda' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    GPU
                  </button>
                </div>
              </div>
            </Panel>

            {/* Compact Confidence Threshold */}
            <Panel title="Threshold" className='font-headline shrink-0 flex-1 min-w-0'>
              <div className="font-sans flex items-center gap-2">
                <span className="text-sm font-bold text-primary shrink-0">
                  {(threshold * 100).toFixed(0)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  disabled={isRunning}
                  className="w-full disabled:opacity-50 h-1.5"
                />
              </div>
            </Panel>
          </div>

          {/* Detection Stats - Maximized with full per-class count */}
          <Panel title="Detection Stats" className='font-headline flex-1 min-h-0 flex flex-col overflow-hidden'>
            <div className="flex-1 flex flex-col gap-2 font-sans min-h-0 overflow-hidden">
              <StatCard label="Total Objects" value={detectionStats.total} />
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <p className="text-sm font-medium text-foreground mb-1">Per-Class Count</p>
                <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                  <div className="space-y-1">
                    {DEFECT_CLASSES.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between text-xs py-0.5"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="text-foreground truncate">{cls.name}</span>
                        </div>
                        <span className="font-bold text-foreground shrink-0 ml-2">
                          {detectionStats.classes[cls.id] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}

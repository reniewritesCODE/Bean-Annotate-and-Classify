'use client';

import { useApp } from '@/context/AppContext';
import { DEFECT_CLASSES } from '@/lib/constants';
import { drawCanvasImageAndBoxes, getImageFromCache } from '@/lib/canvas-utils';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { BoundingBox } from '@/lib/types';
import { Trash2, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useRouter } from 'next/navigation';

// ─── Reusable floating panel card ─────────────────────────────────────────────
function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Image thumbnail with real bean canvas preview ─────────────────────────────
function ImageThumbnail({
  image,
  isSelected,
  annotationCount,
  onClick,
}: {
  image: any;
  isSelected: boolean;
  annotationCount: number;
  onClick: () => void;
}) {

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? 'border-[#B87A0E] bg-[#B87A0E]/10'
          : 'border-transparent hover:border-border'
      }`}
    >
      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        <img 
          src={image.url || `https://placehold.co/40x40?text=Img`} 
          alt={image.name || `Image-${image.id?.toString().slice(-4)}`} 
          className="w-full h-full object-cover" 
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{image.name || `Image-${image.id?.toString().slice(-4)}`}</p>
        <p className="text-xs text-muted-foreground">
          {annotationCount} box{annotationCount !== 1 ? 'es' : ''}
        </p>
      </div>
    </button>
  );
}

// ─── Category badge ────────────────────────────────────────────────────────────
function CatBadge({ cat }: { cat: 0 | 1 | 2 }) {
  const configs = {
    0: { label: 'Cat0', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    1: { label: 'Cat1', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    2: { label: 'Cat2', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  };
  
  const { label, color, bg, border } = configs[cat];
  
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border leading-none whitespace-nowrap transition-colors ${color} ${bg} ${border}`}>
      {label}
    </span>
  );
}

// ─── Main AnnotateView ─────────────────────────────────────────────────────────
export function AnnotateView() {
  const { images, annotations, setAnnotations, addToast } = useApp();

  // Add useRef to your imports from 'react'
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sort defect classes by category (Cat0, Cat1, Cat2)
  const sortedDefectClasses = useMemo(() => {
    return [...DEFECT_CLASSES].sort((a, b) => parseInt(a.category) - parseInt(b.category));
  }, []);

  // Build shortcut groups based on first letter of class names
  const shortcutGroups = useMemo(() => {
    const groups: Record<string, number[]> = {};
    sortedDefectClasses.forEach((cls) => {
      const firstLetter = cls.name.charAt(0).toLowerCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(cls.id);
    });
    return groups;
  }, [sortedDefectClasses]);

  // Track current index within each shortcut group for cycling
  const shortcutIndicesRef = useRef<Record<string, number>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedClass, setSelectedClass] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState<BoundingBox | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const currentImage = images[currentImageIndex];
  const currentAnnotations = currentImage
    ? annotations[currentImage.id] || []
    : [];

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const lastSavedSignatureRef = useRef<string>('');
  const autosaveTimerRef = useRef<number | null>(null);

  // Redraw canvas when anything changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    drawCanvasImageAndBoxes(
      canvas,
      currentImage.url ?? null,
      DEFECT_CLASSES,
      [...currentAnnotations, ...(tempBox ? [tempBox] : [])]
    );
  }, [currentImage, currentAnnotations, tempBox]);

  useEffect(() => {
    if (selectedClass && scrollContainerRef.current) {
      // Find the button that has our custom "data-active" attribute
      const activeElement = scrollContainerRef.current.querySelector(
        `[data-class-id="${selectedClass}"]`
      );

      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth', // Makes it slide smoothly
          block: 'nearest',   // Prevents the whole page from jumping
        });
      }
    }
  }, [selectedClass]); // Run this every time the selection changes

  const handleGlobalKey = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Handle first-letter cycling shortcuts
      const matchingIds = shortcutGroups[key];
      if (matchingIds && matchingIds.length > 0) {
        const currentIdx = shortcutIndicesRef.current[key] ?? -1;
        const nextIdx = (currentIdx + 1) % matchingIds.length;
        shortcutIndicesRef.current[key] = nextIdx;
        setSelectedClass(matchingIds[nextIdx]);
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        currentImage
      ) {
        const imageAnnotations = annotations[currentImage.id] || [];
        if (selectedBoxId) {
          const updated = imageAnnotations.filter(
            (b) => b.id !== selectedBoxId,
          );
          setAnnotations({ ...annotations, [currentImage.id]: updated });
          setSelectedBoxId(null);
        } else if (imageAnnotations.length > 0) {
          // Removes the last drawn box
          const updated = imageAnnotations.slice(0, -1);
          setAnnotations({ ...annotations, [currentImage.id]: updated });
        }
        return;
      }
      if (e.key === 'Escape') setSelectedBoxId(null);
    },
    [selectedBoxId, currentImage, annotations, setAnnotations, setSelectedClass, shortcutGroups]
  );
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  // Canvas coordinate scaling
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e);
    setIsDrawing(true);
    setStartPos({ x, y });
    setSelectedBoxId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    setTempBox({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y),
      cls: selectedClass,
      id: 'temp',
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !tempBox || !currentImage) return;

      setIsDrawing(false);

      const newBox: BoundingBox = {
        cls: tempBox.cls,
        x: tempBox.x,
        y: tempBox.y,
        w: tempBox.w,
        h: tempBox.h,
      };

      const imageAnnotations = annotations[currentImage.id] || [];
      setAnnotations({
        ...annotations,
        [currentImage.id]: [...imageAnnotations, newBox],
      });

      setTempBox(null);
  };

  const handleDeleteBox = (boxIndex: string) => {
      if (!currentImage) return;

      const imageAnnotations = annotations[currentImage.id] || [];
      setAnnotations({
        ...annotations,
        [currentImage.id]: imageAnnotations.filter((_, idx) => idx !== parseInt(boxIndex)),
      });
    };

  const handleSave = async () => {
    if (!currentImage) return;

    // Convert to DB payload
    const token = localStorage.getItem('access_token');
    
    // Grab the cached image element to find its natural dimensions
    const imgElement = getImageFromCache(currentImage.url ?? '');
    if (!imgElement) {
        addToast('Please wait for image to load fully before saving', 'error');
        return;
    }

    // Mathematical translation from 640x480 container coordinates (with object-fit:contain letterboxing) 
    // to raw YOLO relative coordinates (0-1) across the true unpadded image.
    const canvasWidth = 640;
    const canvasHeight = 480;
    const imgRatio = imgElement.naturalWidth / imgElement.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;
    
    let drawW = canvasWidth;
    let drawH = canvasHeight;
    let drawX = 0;
    let drawY = 0;

    if (imgRatio > canvasRatio) {
      drawH = canvasWidth / imgRatio;
      drawY = (canvasHeight - drawH) / 2;
    } else {
      drawW = canvasHeight * imgRatio;
      drawX = (canvasWidth - drawW) / 2;
    }

    const payload = currentAnnotations.map(box => {
       // Convert canvas box to normalized image relative coordinates
       const xCenterCanvas = box.x + box.w / 2;
       const yCenterCanvas = box.y + box.h / 2;

       // Normalized relative to the actual image pixels
       const x_center = (xCenterCanvas - drawX) / drawW;
       const y_center = (yCenterCanvas - drawY) / drawH;
       const width = box.w / drawW;
       const height = box.h / drawH;
       
       // Handle edge case of drawing outside letterbox
       return {
         image_id: currentImage.id,
         class_id: box.cls,
         x_center: Math.max(0, Math.min(1, x_center)),
         y_center: Math.max(0, Math.min(1, y_center)),
         width: Math.max(0.001, Math.min(1, width)),
         height: Math.max(0.001, Math.min(1, height)),
         source: 'human'
       };
    });

    try {
      const res = await fetch(`/api/annotations/${currentImage.id}`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Annotations saved successfully
      } else {
        addToast('Failed to save annotations', 'error');
      }
    } catch {
       addToast('Network error saving annotations', 'error');
    }
  };

  const autosaveSignature = useMemo(() => {
    if (!currentImage) return '';
    // Stable signature to avoid resaving identical payloads
    // (stringifying is fine here: max boxes is small, and it debounces anyway).
    return `${currentImage.id}:${JSON.stringify(currentAnnotations)}`;
  }, [currentImage, currentAnnotations]);

  useEffect(() => {
    if (!currentImage) return;

    // Debounced autosave to avoid spamming the backend while drawing.
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    // If unchanged since last save, do nothing.
    if (autosaveSignature && autosaveSignature === lastSavedSignatureRef.current) return;

    autosaveTimerRef.current = window.setTimeout(async () => {
      if (!currentImage) return;
      if (autosaveSignature === lastSavedSignatureRef.current) return;

      setIsAutoSaving(true);
      try {
        await handleSave();
        lastSavedSignatureRef.current = autosaveSignature;
      } finally {
        setIsAutoSaving(false);
      }
    }, 900);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [autosaveSignature, currentImage, handleSave]);

  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const handleExport = async () => {
    if (!currentImage) return;
    
    setIsExporting(true);
    const token = localStorage.getItem('access_token');
    
    try {
      const res = await fetch(`/api/projects/${currentImage.project_id}/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        addToast(`Dataset exported to: ${data.export_path}`, 'success');
      } else {
        addToast(data.detail || 'Failed to export dataset', 'error');
      }
    } catch {
      addToast('Network error during export', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '8') {
        const classId = parseInt(e.key);
        if (classId <= DEFECT_CLASSES.length) {
          setSelectedClass(classId);
        }
      }
    };

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };
  
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };


  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">


      {/* ── Three-column body with padding so panels float ───────────────── */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

        {/* ════════════════════════════════
            LEFT COLUMN
            Three independent panels stacked
            ════════════════════════════════ */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-4 min-h-0">
          {/* Panel A — Defect classes */}
          <Panel className='flex flex-col h-full '>
            <div className="px-4 pt-4 pb-2 shrink-0 font-headline">
              <h3 className="text-sm font-semibold text-foreground">
                Defect classes
              </h3>
            </div>
            <div className="custom-scrollbar pl-3 pb-3 flex-1 min-h-0 overflow-y-auto font-sans">
              <div ref={scrollContainerRef} className='pr-2 space-y-1'>
                 {sortedDefectClasses.map((cls) => {
                    const classId = cls.id;
                    const isSelected = selectedClass === classId;

                    // Show first letter as shortcut
                    const shortcutLabel = cls.name.charAt(0).toUpperCase();

                    const cat: 0 | 1 | 2 = parseInt(cls.category || '1') as 0 | 1 | 2;
                    return (
                      <button
                        key={cls.name}
                        data-class-id={classId}
                        onClick={() => setSelectedClass(classId)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 transition-all text-left"
                        style={{
                          borderColor: isSelected ? cls.color : 'transparent',
                          backgroundColor: isSelected ? cls.color + '20' : 'transparent',
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cls.color }}
                        />
                        <span
                          className="flex-1 text-xs font-medium truncate"
                          style={{
                            color: isSelected ? cls.color : 'var(--foreground)',
                          }}
                        >
                          {cls.name}
                        </span>
                        <CatBadge cat={cat} />
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {/* {classId <= 5 ? classId : classId === 7 ? '0' : ['Q','W','E','R','T','Y','U','I','O','P'][classId - 11]} */}
                          {shortcutLabel}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </Panel>

          {/* Panel B — Image queue */}
          <Panel className='flex flex-col h-full'>
            <div className="px-4 pt-4 pb-2 shrink-0">
              <h3 className="text-sm font-semibold text-foreground font-headline">
                Image queue
              </h3>
            </div>
            <div className="custom-scrollbar pl-2 flex-1 min-h-0 overflow-y-auto">
              <div className="px-2 space-y-1">
                {images.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 px-2">
                    No images. Upload some first.
                  </p>
                ) : (
                  images.map((image, idx) => (
                    <ImageThumbnail
                      key={image.id}
                      image={image}
                      isSelected={idx === currentImageIndex}
                      annotationCount={(annotations[image.id] || []).length}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))
                )}
              </div>

            </div>
          </Panel>
        </div>

        {/* ════════════════════════════════
            CENTER COLUMN
            Single panel: header + dark canvas
            ════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 gap-2 ">
          
          <Panel className="flex-1 flex flex-col min-h-0">

            <div className="flex-shrink-0 px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground font-headline">
                {currentImage?.id ? `Image-${currentImage.id.toString().slice(-4)}` : 'No image selected'}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentImageIndex((i) => Math.max(0, i - 1))
                  }
                  disabled={currentImageIndex === 0}
                  className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((i) =>
                      Math.min(images.length - 1, i + 1),
                    )
                  }
                  disabled={currentImageIndex >= images.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>


            <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 min-h-0 overflow-hidden">
                      {currentImage ? (
                        <div className="relative flex items-center justify-center w-full h-full max-w-full max-h-full">
                          <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            className="rounded cursor-crosshair max-w-full max-h-full object-contain"
                            style={{ touchAction: 'none' }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onKeyDown={handleKeyPress}
                          />
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center">
                          <p>No images available</p>
                          <p className="text-sm">Upload images to start annotating</p>
                        </div>
                      )} 

            {/* <div className="flex-1 flex items-center justify-center bg-[#0F0E0C] min-h-0 p-4">
              {currentImage ? (
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="rounded-lg border border-[#2E2924] cursor-crosshair max-w-full max-h-full"
                  style={{ touchAction: 'none' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">No images available</p>
                  <p className="text-xs mt-1">Go to Upload to add images</p>
                </div>
              )}
            </div> */}

          </div>

          </Panel>

          <Panel className=''>
            <div className="flex justify-center px-4 py-3 gap-3">
              {[
                ['drag', 'draw box'],
                ['Del', 'remove box'],
                ['a-z', 'first letter cycles'],
                ['Esc', 'deselect'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2.5">
                  <kbd className="text-[10px] font-mono bg-secondary border border-border text-foreground px-1.5 py-0.5 rounded min-w-[34px] text-center leading-none">
                    {key}
                  </kbd>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ════════════════════════════════
            RIGHT COLUMN
            Single panel: annotations list
            + pinned save buttons
            ════════════════════════════════ */}
        <div className="w-52 flex-shrink-0 flex flex-col min-h-0">
          <Panel className="flex-1 flex flex-col min-h-0">


            {/* Annotations header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-border font-headline">
              <h3 className="text-sm font-semibold text-foreground">
                Annotations ({currentAnnotations.length})
              </h3>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
              {currentAnnotations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center pt-8 px-2 leading-relaxed">
                  No annotations yet.{' '}
                  <br />
                  Draw boxes on the canvas.
                </p>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {currentAnnotations.map((annotation, idx) => {
                    const defectClass = DEFECT_CLASSES.find(c => c.id === annotation.cls);
                    if (!defectClass) return null;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 hover:bg-secondary rounded transition-colors group"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: defectClass.color }}
                        />
                        <span className="flex-1 text-xs text-foreground font-medium truncate">
                          {defectClass.name}
                        </span>
                        <button
                          onClick={() => handleDeleteBox(idx.toString())}
                          className="p-0.5 hover:bg-primary/20 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5 text-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Action Buttons */}
          <div className="p-4 border-t border-border space-y-2">
            <button 
              onClick={() => router.push(`/projects/${currentImage.project_id}/versions`)}
              disabled={!currentImage}
              className="w-full py-2 px-3 bg-yellow-500 text-black text-sm font-semibold rounded hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Continue to Versions
              {/* <ArrowRight className="w-4 h-4" /> */}
            </button>
          </div>

          </Panel>
        </div>

      </div>
    </div>
  );
}
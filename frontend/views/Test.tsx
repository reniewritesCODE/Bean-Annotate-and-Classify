'use client';

import { useApp } from '@/context/AppContext';
import { DEFECT_CLASSES } from '@/lib/constants';
import { fillBeanCanvas } from '@/lib/canvas-utils';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { BoundingBox } from '@/lib/types';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';

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
  image: { id: string; name: string; seed: number };
  isSelected: boolean;
  annotationCount: number;
  onClick: () => void;
}) {
  const thumbRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = thumbRef.current;
    if (!canvas) return;
    fillBeanCanvas(canvas, image.seed, 0, DEFECT_CLASSES, []);
  }, [image.seed]);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? 'border-[#B87A0E] bg-[#B87A0E]/10'
          : 'border-transparent hover:border-border'
      }`}
    >
      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#1A1208]">
        <canvas ref={thumbRef} width={40} height={40} className="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{image.name}</p>
        <p className="text-xs text-muted-foreground">
          {annotationCount} box{annotationCount !== 1 ? 'es' : ''}
        </p>
      </div>
    </button>
  );
}

// ─── Category badge ────────────────────────────────────────────────────────────
function CatBadge({ cat }: { cat: 1 | 2 }) {
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-1 rounded leading-none  ${
        cat === 1
          ? 'bg-[#FCEBEB] text-[#791F1F]'
          : 'bg-secondary text-muted-foreground'
      }`}
    >
      Cat{cat}
    </span>
  );
}

// ─── Main AnnotateView ─────────────────────────────────────────────────────────
export function Test() {
  const { images, annotations, setAnnotations, addToast } = useApp();

  // Add useRef to your imports from 'react'
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const SHORTCUT_LABELS = ['1', '2', '3', '4', '5', '6', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];

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

  // Redraw canvas when anything changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;
    fillBeanCanvas(canvas, currentImage.seed, 0, DEFECT_CLASSES, [
      ...currentAnnotations,
      ...(tempBox ? [tempBox] : []),
    ]);
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
      const shortcutMap: Record<string, number> = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, 'q': 7, 'w': 8, 'e': 9, 'r': 10,
        't': 11, 'y': 12, 'u': 13, 'i': 14, 'o': 15, 'p': 16
      };

      const targetId = shortcutMap[e.key.toLowerCase()];

      if (targetId && targetId <= DEFECT_CLASSES.length) {
        setSelectedClass(targetId);
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedBoxId &&
        currentImage
      ) {
        const updated = (annotations[currentImage.id] || []).filter(
          (b) => b.id !== selectedBoxId,
        );
        setAnnotations({ ...annotations, [currentImage.id]: updated });
        setSelectedBoxId(null);
        return;
      }
      if (e.key === 'Escape') setSelectedBoxId(null);
    },
    [selectedBoxId, currentImage, annotations, setAnnotations, setSelectedClass] // Added setSelectedClass to dependencies
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
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
      classId: selectedClass,
      id: 'temp',
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !tempBox || !currentImage) {
      setIsDrawing(false);
      setTempBox(null);
      return;
    }
    setIsDrawing(false);
    if (tempBox.width < 8 || tempBox.height < 8) {
      setTempBox(null);
      return;
    }
    const newBox: BoundingBox = { ...tempBox, id: `box-${Date.now()}` };
    const existing = annotations[currentImage.id] || [];
    setAnnotations({ ...annotations, [currentImage.id]: [...existing, newBox] });
    setTempBox(null);
    addToast({
      type: 'success',
      message: `${DEFECT_CLASSES[selectedClass - 1].name} box added`,
    });
  };

  const handleDeleteBox = (boxId: string) => {
    if (!currentImage) return;
    const updated = (annotations[currentImage.id] || []).filter(
      (b) => b.id !== boxId,
    );
    setAnnotations({ ...annotations, [currentImage.id]: updated });
    if (selectedBoxId === boxId) setSelectedBoxId(null);
  };

  const handleSave = () =>
    addToast({ type: 'success', message: 'Annotations saved' });

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
          <Panel className='flex flex-col h-full'>
            <div className="px-4 pt-4 pb-2 shrink-0">
              <h3 className="text-sm font-semibold text-foreground">
                Defect classes
              </h3>
            </div>
            <div
              className="defect-scroll pl-3 pb-3 flex-1 min-h-0 overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) rgba(255,255,255,0.05)',
              }}
            >
              <div ref={scrollContainerRef} className='pr-2 space-y-1'>
                 {DEFECT_CLASSES.map((cls, idx) => {
                    const classId = idx + 1;
                    const isSelected = selectedClass === classId;

                    const shortcutLabel = SHORTCUT_LABELS[idx] || classId;

                    const cat: 1 | 2 =
                      (cls as any).category ?? (classId <= 6 ? 1 : 2);
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
              <h3 className="text-sm font-semibold text-foreground">
                Image queue
              </h3>
            </div>
            <div
              className="pl-2 flex-1 min-h-0 overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) rgba(255,255,255,0.05)',
              }}
            >
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
              <h3 className="text-sm font-semibold text-foreground">
                {currentImage?.name ?? 'No image selected'}
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

            <div className="flex-1 flex items-center justify-center bg-[#0F0E0C] min-h-0 p-4">
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
            </div>

          </Panel>

          <Panel className=''>
            <div className="flex justify-center px-4 py-3 gap-3">
              {[
                ['drag', 'draw box'],
                ['Del', 'remove box'],
                ['1–6', 'cat-1 defect class'],
                ['q-p', 'cat-2 defect class'],
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
            <div className="flex-shrink-0 px-4 py-3 border-b border-border">
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
                <div className="space-y-2">
                  {currentAnnotations.map((ann) => {
                    const cls = DEFECT_CLASSES[ann.classId - 1];
                    if (!cls) return null;
                    const isSel = selectedBoxId === ann.id;
                    return (
                      <div
                        key={ann.id}
                        onClick={() =>
                          setSelectedBoxId(isSel ? null : ann.id)
                        }
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer border transition-all ${
                          isSel
                            ? 'border-[#B87A0E] bg-[#B87A0E]/10'
                            : 'border-transparent bg-secondary hover:bg-secondary/60'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cls.color }}
                        />
                        <span className="flex-1 text-xs font-medium text-foreground truncate">
                          {cls.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBox(ann.id);
                          }}
                          className="p-0.5 rounded hover:bg-[#FCEBEB] transition-colors flex-shrink-0 group"
                          aria-label="Delete annotation"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#791F1F]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pinned bottom actions */}
            <div className="flex-shrink-0 p-3 pt-2 border-t border-border space-y-2">
              <Button
                onClick={handleSave}
                className="w-full bg-[#B87A0E] hover:bg-[#9A6509] text-white font-semibold"
              >
                Save annotations
              </Button>
              <button className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                Proceed to Train →
              </button>
            </div>

          </Panel>
        </div>

      </div>
    </div>
  );
}
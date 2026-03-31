'use client';

import { useApp } from '@/context/AppContext';
import { DEFECT_CLASSES } from '@/lib/constants';
import { fillBeanCanvas } from '@/lib/canvas-utils';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BoundingBox } from '@/lib/types';
import { Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export function AnnotateView() {
  const { images, annotations, setAnnotations, selectedImageId, addToast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedClass, setSelectedClass] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState<(BoundingBox & { id?: string }) | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const currentImage = images[currentImageIndex];
  const currentAnnotations = currentImage
    ? annotations[currentImage.id] || []
    : [];

  // Draw canvas with beans and annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    fillBeanCanvas(canvas, currentImage.seed, 0, DEFECT_CLASSES, [
      ...currentAnnotations,
      ...(tempBox ? [tempBox] : []),
    ]);
  }, [currentImage, currentAnnotations, tempBox]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const box: BoundingBox = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y),
      cls: selectedClass,
    };

    setTempBox(box);
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
    addToast(
      `${DEFECT_CLASSES[selectedClass - 1].name} bounding box added`,
      'success'
    );
  };

  const handleDeleteBox = (boxIndex: string) => {
    if (!currentImage) return;

    const imageAnnotations = annotations[currentImage.id] || [];
    setAnnotations({
      ...annotations,
      [currentImage.id]: imageAnnotations.filter((_, idx) => idx !== parseInt(boxIndex)),
    });
  };

  const handleClassSelect = (classId: number) => {
    setSelectedClass(classId);
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

  const handleSaveAnnotation = () => {
    addToast('Training stopped', 'info');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Annotate</h2>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm text-foreground hover:bg-secondary rounded transition-colors">
            Save all
          </button>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Next: Train →
          </Button>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Defect Classes & Image Queue */}
        <div className="w-52 bg-card border-r border-border flex flex-col overflow-hidden">
          {/* Defect Classes Section */}
          <div className="border-b border-border">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Defect classes
              </h3>
              <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
              {DEFECT_CLASSES.map((defectClass, idx) => {
                const classId = idx + 1;
                const isSelected = selectedClass === classId;
                return (
                  <button
                    key={defectClass.name}
                    onClick={() => handleClassSelect(classId)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition-colors text-xs ${
                      isSelected
                        ? 'border-primary bg-secondary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: defectClass.color }}
                    />
                    <span className="flex-1 text-left text-foreground font-medium truncate">
                      {defectClass.name}
                    </span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      Cat{classId}
                    </span>
                    <span className="text-muted-foreground font-semibold text-xs">
                      {classId}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>

          {/* Image Queue Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Image queue
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {images.map((image, idx) => {
                const isSelected = idx === currentImageIndex;
                const annotationCount = (annotations[image.id] || []).length;
                return (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-full p-2 rounded border transition-colors text-left ${
                      isSelected
                        ? 'border-primary bg-secondary/50'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-full h-16 bg-muted rounded mb-2 flex items-center justify-center overflow-hidden relative">
                      <canvas 
                        width={200}
                        height={64}
                        className="w-full h-full object-cover"
                        ref={(canvas) => {
                          if (canvas) {
                            fillBeanCanvas(canvas, image.seed, 0, DEFECT_CLASSES, annotations[image.id] || []);
                          }
                        }}
                      />
                    </div>
                    <div className="text-xs">
                      <p className="text-foreground font-medium truncate">
                        {image.name}
                      </p>
                      <p className="text-muted-foreground">
                        {annotationCount} boxes
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Panel - Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
          <div className="flex items-center gap-3 mb-4 self-start">
            <button
              onClick={handlePrevImage}
              disabled={currentImageIndex === 0}
              className="p-1 hover:bg-secondary rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {currentImage && (
              <h3 className="text-sm font-semibold text-foreground">
                {currentImage.name}
              </h3>
            )}
            <button
              onClick={handleNextImage}
              disabled={currentImageIndex === images.length - 1}
              className="p-1 hover:bg-secondary rounded disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {currentImage ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="border border-border rounded cursor-crosshair"
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

          {/* Canvas Instructions */}
          <div className="mt-3 text-xs text-muted-foreground">
            <p>drag  draw box | Del  remove box | 1-8  select class | Esc  deselect</p>
          </div>
        </div>

        {/* Right Panel - Annotations List */}
        <div className="w-52 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Annotations ({currentAnnotations.length})
            </h3>
          </div>

          {currentAnnotations.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8 flex-1">
              No annotations yet.
            </div>
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

          {/* Bottom Action Buttons */}
          <div className="p-4 border-t border-border space-y-2">
            <button onClick={handleSaveAnnotation}  className="w-full py-2 px-3 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/90 transition-colors">
              Save annotations
            </button>
            <button className="w-full py-2 px-3 bg-secondary text-foreground text-sm font-semibold rounded hover:bg-secondary/80 transition-colors">
              Proceed to Train →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

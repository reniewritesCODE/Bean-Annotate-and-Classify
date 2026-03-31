'use client';

import { useApp } from '@/context/AppContext';
import { DEFECT_CLASSES } from '@/lib/constants';
import { fillBeanCanvas } from '@/lib/canvas-utils';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BoundingBox } from '@/lib/types';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export function AnnotateView() {
  const { images, annotations, setAnnotations, selectedImageId, addToast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedClass, setSelectedClass] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState<BoundingBox | null>(null);
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
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
      classId: selectedClass,
      id: 'temp',
    };

    setTempBox(box);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !tempBox || !currentImage) return;

    setIsDrawing(false);

    const newBox: BoundingBox = {
      ...tempBox,
      id: `box-${Date.now()}`,
    };

    const imageAnnotations = annotations[currentImage.id] || [];
    setAnnotations({
      ...annotations,
      [currentImage.id]: [...imageAnnotations, newBox],
    });

    setTempBox(null);
    addToast({
      type: 'success',
      message: `${DEFECT_CLASSES[selectedClass - 1].name} bounding box added`,
    });
  };

  const handleDeleteBox = (boxId: string) => {
    if (!currentImage) return;

    const imageAnnotations = annotations[currentImage.id] || [];
    setAnnotations({
      ...annotations,
      [currentImage.id]: imageAnnotations.filter((box) => box.id !== boxId),
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Annotate</h2>
        <div className="flex gap-2">
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
        <div className="w-56 bg-card border-r border-border overflow-y-auto p-4 space-y-6">
          {/* Defect Classes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Defect classes
            </h3>
            <div className="space-y-2">
              {DEFECT_CLASSES.map((defectClass, idx) => {
                const classId = idx + 1;
                const isSelected = selectedClass === classId;
                return (
                  <button
                    key={defectClass.name}
                    onClick={() => handleClassSelect(classId)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded border-2 transition-colors ${
                      isSelected
                        ? `border-[${defectClass.color}] bg-secondary`
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: defectClass.color }}
                    />
                    <span className="flex-1 text-left text-sm text-foreground">
                      {defectClass.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DEFECT_CLASSES[classId - 1].shortcut}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {classId}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Queue */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Image queue
            </h3>
            <div className="space-y-2">
              {images.map((image, idx) => {
                const isSelected = idx === currentImageIndex;
                const annotationCount = (annotations[image.id] || []).length;
                return (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-full p-2 rounded border-2 transition-colors text-left ${
                      isSelected
                        ? 'border-primary bg-secondary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-full h-12 bg-primary/10 rounded mb-1 flex items-center justify-center text-xs text-muted-foreground">
                      {image.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {annotationCount} boxes
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Panel - Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-secondary/30 p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handlePrevImage}
              disabled={currentImageIndex === 0}
              className="p-2 hover:bg-secondary rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {currentImage && (
              <h3 className="text-sm font-semibold text-foreground">
                {currentImage.name}
              </h3>
            )}
            <button
              onClick={handleNextImage}
              disabled={currentImageIndex === images.length - 1}
              className="p-2 hover:bg-secondary rounded disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {currentImage ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="border-2 border-border rounded cursor-crosshair"
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
          <div className="mt-4 text-xs text-muted-foreground text-center">
            <p>Drag: draw box | 1-8: select class | Del: remove box | Esc: deselect</p>
          </div>
        </div>

        {/* Right Panel - Annotations List */}
        <div className="w-56 bg-card border-l border-border overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Annotations ({currentAnnotations.length})
            </h3>
          </div>

          {currentAnnotations.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              No annotations yet. Draw boxes on the canvas to add annotations.
            </div>
          ) : (
            <div className="space-y-2">
              {currentAnnotations.map((annotation) => {
                const defectClass = DEFECT_CLASSES[annotation.classId - 1];
                return (
                  <div
                    key={annotation.id}
                    className="flex items-center gap-2 p-2 bg-secondary rounded border-l-4"
                    style={{ borderColor: defectClass.color }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: defectClass.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {defectClass.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Box {annotation.id.split('-').pop()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBox(annotation.id)}
                      className="p-1 hover:bg-primary/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

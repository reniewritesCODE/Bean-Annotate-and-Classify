'use client';

import { useApp } from '@/context/AppContext';
import { Panel } from '@/components/panels';
import { DEFECT_CLASSES } from '@/lib/constants';
import { useRef, useEffect } from 'react';
import { fillBeanCanvas as drawBeans } from '@/lib/canvas-utils';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';

export function UploadView() {
  const { images, addToast, setSelectedImageId } = useApp();
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  useEffect(() => {
    images.forEach((img) => {
      const canvas = canvasRefs.current[img.id];
      if (canvas) {
        drawBeans(canvas, img.seed);
      }
    });
  }, [images]);

  const handleUpload = () => {
    addToast('Image uploaded successfully', 'success');
  };

  const handleDelete = (id: number) => {
    addToast('Image deleted', 'info');
  };

  return (
    <div className="p-8 space-y-8">
      {/* Upload Area */}
      <Panel title="Upload New Images">
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            Drag and drop images here
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to select files
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleUpload}
          >
            Select Images
          </Button>
        </div>
      </Panel>

      {/* Image Grid */}
      <Panel title="Uploaded Images">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedImageId(img.id)}
            >
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current[img.id] = el;
                }}
                width={200}
                height={200}
                className="w-full bg-muted"
              />
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Image {img.id}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      img.status === 'annotated'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {img.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {img.count} defects
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1 text-xs rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

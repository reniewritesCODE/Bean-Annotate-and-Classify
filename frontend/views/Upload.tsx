'use client';

import { useApp } from '@/context/AppContext';
import { Panel } from '@/components/panels';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';

export function UploadView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { 
    images, 
    activeProjectId, 
    addToast, 
    setSelectedImageId, 
    setImages 
  } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const token = localStorage.getItem('access_token');

      if (!files.length) return;
      if (!activeProjectId) {
        addToast('Please select a project first', 'error');
        return;
      }
      if (!token) {
        addToast('Authentication required', 'error');
        return;
      }

      const imageFiles = files.filter((f) => f.type?.startsWith('image/'));
      if (imageFiles.length === 0) {
        addToast('Please select image files only', 'error');
        return;
      }

      setIsUploading(true);
      addToast(`Uploading ${imageFiles.length} image(s)...`, 'info');

      try {
        const results = await Promise.allSettled(
          imageFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('project_id', activeProjectId);

            const response = await fetch('/api/images', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });

            if (!response.ok) {
              const text = await response.text();
              throw new Error(text || 'Upload failed');
            }
            return response.json();
          }),
        );

        const uploaded: any[] = [];
        let failed = 0;
        for (const r of results) {
          if (r.status === 'fulfilled') uploaded.push(r.value);
          else failed += 1;
        }

        if (uploaded.length) {
          setImages((prev: any) => [...prev, ...uploaded]);
        }

        if (failed === 0) addToast('Upload complete', 'success');
        else if (uploaded.length === 0) addToast('All uploads failed', 'error');
        else addToast(`Uploaded ${uploaded.length}, failed ${failed}`, 'info');
      } catch {
        addToast('Upload failed', 'error');
      } finally {
        setIsUploading(false);
      }
    },
    [activeProjectId, addToast, setImages],
  );

  const handleUploadInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    await uploadFiles(files);
    // allow re-selecting the same file(s)
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setImages((prev: any) => prev.filter((img: any) => img.id !== id));
        addToast('Image deleted', 'info');
      }
    } catch (error) {
      addToast('Delete failed', 'error');
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleUploadInput}
        accept="image/*"
        multiple
      />
      
      {/* Upload Area */} 
      <Panel title="Upload New Images" className='font-headline'>
        <div 
          ref={dropRef}
          className={[
            "border-2 border-dashed border-border rounded-lg p-12 text-center transition-colors cursor-pointer font-sans",
            isDragging ? "border-primary bg-primary/5" : "hover:border-primary/50",
            isUploading ? "opacity-80 pointer-events-none" : "",
          ].join(' ')}
          onClick={triggerSelect}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files ?? []);
            await uploadFiles(files);
          }}
        >
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            Click to select or drag and drop images
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={(e) => {
              e.stopPropagation();
              triggerSelect();
            }}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading…' : 'Select Images'}
          </Button>
        </div>
      </Panel>

      {/* Image Grid */}
      <Panel title="Uploaded Images" className='font-headline'>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-sans">
          {images.map((img: any) => (
            <div
              key={img.id}
              className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedImageId(img.id)}
            >
              <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
                <img 
                  src={img.url || `https://placehold.co/200x200?text=Scan+Core`} 
                  alt={`Image ${img.id}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium truncate w-20">
                    ...{typeof img.id === 'string' ? img.id.slice(-8) : img.id}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      img.status === 'done'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {img.status}
                  </span>
                </div>
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

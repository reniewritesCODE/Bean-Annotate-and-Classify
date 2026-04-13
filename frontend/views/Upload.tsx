'use client';

import { useApp } from '@/context/AppContext';
import { Panel } from '@/components/panels';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';

export function UploadView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    images, 
    activeProjectId, 
    addToast, 
    setSelectedImageId, 
    setImages 
  } = useApp();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const token = localStorage.getItem('access_token');
    
    if (!file) return;
    
    if (!activeProjectId) {
      addToast('Please select a project first', 'error');
      return;
    }

    if (!token) {
      addToast('Authentication required', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', activeProjectId);

    try {
      addToast('Uploading image...', 'info');
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const newImage = await response.json();
      setImages((prev: any) => [...prev, newImage]);
      addToast('Image uploaded successfully', 'success');
    } catch (error) {
      addToast('Upload failed', 'error');
    }
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
        onChange={handleUpload}
        accept="image/*"
      />
      
      {/* Upload Area */} 
      <Panel title="Upload New Images" className='font-headline'>
        <div 
          className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer font-sans"
          onClick={triggerSelect}
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
          >
            Select Images
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

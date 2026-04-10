'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ImageData, BoundingBox, TrainingMetrics } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

type ViewType =
  | 'dashboard'
  | 'upload'
  | 'annotate'
  | 'test'
  | 'train'
  | 'review'
  | 'registry'
  | 'detect'
  | 'users';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  images: ImageData[];
  setImages: (images: ImageData[]) => void;
  annotations: Record<string, BoundingBox[]>;
  setAnnotations: (annotations: Record<string, BoundingBox[]>) => void;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  trainingMetrics: TrainingMetrics[];
  setTrainingMetrics: (metrics: TrainingMetrics[]) => void;
  isTraining: boolean;
  setIsTraining: (training: boolean) => void;
  projects: any[];
  setProjects: (projects: any[]) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [images, setImages] = useState<ImageData[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, BoundingBox[]>>({});
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fetch projects on mount or when token changes
  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const response = await fetch('/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
          if (data.length > 0 && !activeProjectId) {
            setActiveProjectId(data[0].id);
          } else if (data.length === 0) {
            // Auto-create a default project if none exists
            console.log('No projects found, creating Default Project...');
            const createRes = await fetch('/api/projects', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: 'Default Project', description: 'Automatically created project' })
            });
            if (createRes.ok) {
              const newProj = await createRes.json();
              setProjects([newProj]);
              setActiveProjectId(newProj.id);
            } else {
              console.error('Failed to auto-create project', await createRes.text());
            }
          }
        } else if (response.status === 401) {
          console.error('Unauthorized project fetch. Your session may have expired.');
          // Optional: clear local state if unauthorized
          // localStorage.removeItem('access_token');
          // window.location.reload(); 
        } else {
          console.error('Failed to fetch projects', await response.text());
        }
      } catch (error) {
        console.error('Network error while fetching projects:', error);
      }
    };

    fetchProjects();
  }, [user]);

  // Fetch images when active project changes
  useEffect(() => {
    const fetchImages = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !activeProjectId) return;

      try {
        const response = await fetch(`/api/images/${activeProjectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setImages(data);

          const projectAnnotations: Record<string, BoundingBox[]> = {};
          
          await Promise.all(data.map(async (img: any) => {
             // Let URL replacement take effect just to be safe if backend didn't do it
             const url = img.url?.replace("http://minio:9000", "http://localhost:9000");
             
             const annRes = await fetch(`/api/annotations/${img.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
             if (annRes.ok) {
                const yoloAnns = await annRes.json();
                if (yoloAnns.length > 0 && url) {
                   // Translate YOLO to Canvas Space asynchronously
                   await new Promise<void>((resolve) => {
                     const domImg = new Image();
                     domImg.crossOrigin = "anonymous";
                     domImg.onload = () => {
                        const imgRatio = domImg.naturalWidth / domImg.naturalHeight;
                        const canvasRatio = 640 / 480;
                        let drawW = 640; let drawH = 480; let drawX = 0; let drawY = 0;
                        if (imgRatio > canvasRatio) { drawH = 640 / imgRatio; drawY = (480 - drawH) / 2; } 
                        else { drawW = 480 * imgRatio; drawX = (640 - drawW) / 2; }
                        
                        projectAnnotations[img.id] = yoloAnns.map((yolo: any) => {
                           const boxW = yolo.width * drawW;
                           const boxH = yolo.height * drawH;
                           const boxX = (yolo.x_center * drawW + drawX) - boxW / 2;
                           const boxY = (yolo.y_center * drawH + drawY) - boxH / 2;
                           return { cls: yolo.class_id, x: boxX, y: boxY, w: boxW, h: boxH, id: yolo.id };
                        });
                        resolve();
                     };
                     domImg.onerror = () => resolve(); // Safely skip broken images
                     domImg.src = url;
                   });
                } else {
                   projectAnnotations[img.id] = [];
                }
             }
          }));
          
          setAnnotations(projectAnnotations);
        }
      } catch (error) {
        console.error('Failed to fetch images', error);
      }
    };

    if (activeProjectId) {
      fetchImages();
    }
  }, [activeProjectId]);

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 3000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: AppContextType = {
    currentView,
    setCurrentView,
    images,
    setImages,
    annotations,
    setAnnotations,
    selectedImageId,
    setSelectedImageId,
    trainingMetrics,
    setTrainingMetrics,
    isTraining,
    setIsTraining,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    toasts,
    addToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
  
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

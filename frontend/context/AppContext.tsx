'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ImageData, BoundingBox, TrainingMetrics } from '@/lib/types';
import { INITIAL_IMAGES } from '@/lib/constants';

type ViewType =
  | 'dashboard'
  | 'upload'
  | 'annotate'
  | 'train'
  | 'review'
  | 'registry'
  | 'detect';

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
  annotations: Record<number, BoundingBox[]>;
  setAnnotations: (annotations: Record<number, BoundingBox[]>) => void;
  selectedImageId: number | null;
  setSelectedImageId: (id: number | null) => void;
  trainingMetrics: TrainingMetrics[];
  setTrainingMetrics: (metrics: TrainingMetrics[]) => void;
  isTraining: boolean;
  setIsTraining: (training: boolean) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [images, setImages] = useState<ImageData[]>(INITIAL_IMAGES);
  const [annotations, setAnnotations] = useState<Record<number, BoundingBox[]>>(
    {}
  );
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

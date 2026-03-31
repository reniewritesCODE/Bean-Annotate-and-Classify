'use client';

import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  upload: 'Upload Images',
  annotate: 'Annotate Images',
  train: 'Train Model',
  review: 'Review Models',
  registry: 'Model Registry',
  detect: 'Detect Objects',
};

export function TopBar() {
  const { currentView, addToast } = useApp();
  const title = VIEW_TITLES[currentView] || 'BeanScan';

  const getActionButton = () => {
    switch (currentView) {
      case 'upload':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => addToast('Image upload initiated', 'success')}
          >
            + Upload Images
          </Button>
        );
      case 'annotate':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => addToast('Annotations saved', 'success')}
          >
            Save Annotations
          </Button>
        );
      case 'train':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => addToast('Training started', 'success')}
          >
            Start Training
          </Button>
        );
      case 'review':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => addToast('Model approved', 'success')}
          >
            Approve Model
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
      <h2 className="text-xl font-bold text-foreground">
        {title}
      </h2>
      {getActionButton()}
    </div>
  );
}

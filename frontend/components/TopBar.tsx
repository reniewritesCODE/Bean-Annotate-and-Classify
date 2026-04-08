'use client';

import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Button_Variant1 } from './ui/button_variant1';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  upload: 'Upload Images',
  annotate: 'Annotate Images',
  train: 'Train Model',
  review: 'Review Models',
  registry: 'Model Registry',
  detect: 'Detect Objects',
  test: 'Annotate Images',
};

export function TopBar() {
  const { currentView, addToast } = useApp();
  const title = VIEW_TITLES[currentView] || 'Annotate';

  const getActionButton = () => {
    switch (currentView) {
      case 'test':
        return (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-1'>
          <Button_Variant1
            className="bg-card border-2 hover:bg-primary/90 text-primary-foreground font-bold text-xs"
            onClick={() => addToast('Image upload initiated', 'success')}
          >
            Save All
          </Button_Variant1>
          <Button
            className="bg-primary hover:bg-primary/90 text-background font-bold text-xs"
            onClick={() => addToast('Image upload initiated', 'success')}
          >
            Next: Train →
          </Button>
          </div>
        );
      case 'upload':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-background font-bold text-xs"
            onClick={() => addToast('Image upload initiated', 'success')}
          >
            Next: Annotate →
          </Button>
        );
      case 'annotate':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-background font-bold"
            onClick={() => addToast('Annotations saved', 'success')}
          >
            Save Annotations
          </Button>
        );
      case 'train':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-background font-bold"
            onClick={() => addToast('Training started', 'success')}
          >
            Start Training
          </Button>
        );
      case 'review':
        return (
          <Button
            className="bg-primary hover:bg-primary/90 text-background font-bold "
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
    <div className="p-4 bg-background border-b border-border px-6 flex items-center justify-between">
      <h2 className="text-base font-headline font-bold text-foreground">
        {title}
      </h2>
      {getActionButton()}
    </div>
  );
}

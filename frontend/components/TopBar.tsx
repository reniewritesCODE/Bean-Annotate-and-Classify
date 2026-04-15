'use client';

import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Button_Variant1 } from './ui/button_variant1';
import { usePathname } from 'next/navigation';

const VIEW_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/upload': 'Upload Images',
  '/annotate': 'Annotate Images',
  '/train': 'Train Model',
  '/review': 'Review Models',
  '/registry': 'Model Registry',
  '/detect': 'Detect Objects',

  '/users': 'Manage Users',
};

export function TopBar() {
  const { addToast } = useApp();
  const pathname = usePathname() || '/';
  const pathSegments = pathname.split('/').filter(Boolean);
  const leaf = pathSegments.length ? `/${pathSegments[pathSegments.length - 1]}` : '/';
  const title = VIEW_TITLES[pathname] || VIEW_TITLES[leaf] || 'Dashboard';

  const getActionButton = () => {
    switch (leaf) {

      // case '/upload':
      //   return (
      //     <Button
      //       className="bg-primary hover:bg-primary/90 text-background font-bold text-xs"
      //       onClick={() => addToast('Image upload initiated', 'success')}
      //     >
      //       Next: Annotate →
      //     </Button>
      //   );
      // case '/annotate':
      //   return (
      //     <Button
      //       className="bg-primary hover:bg-primary/90 text-background font-bold"
      //       onClick={() => addToast('Annotations saved', 'success')}
      //     >
      //       Save Annotations
      //     </Button>
      //   );
      // case '/train':
      //   return (
      //     <Button
      //       className="bg-primary hover:bg-primary/90 text-background font-bold"
      //       onClick={() => addToast('Training started', 'success')}
      //     >
      //       Start Training
      //     </Button>
      //   );
      // case '/review':
      //   return (
      //     <Button
      //       className="bg-primary hover:bg-primary/90 text-background font-bold "
      //       onClick={() => addToast('Model approved', 'success')}
      //     >
      //       Approve Model
      //     </Button>
      //   );
      // default:
      //   return null;
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


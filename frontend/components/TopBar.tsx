'use client';

import { useApp } from '@/context/AppContext';
import { usePathname } from 'next/navigation';

const VIEW_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/upload': 'Upload Images',
  '/annotate': 'Annotate Images',
  '/train': 'Train Model',
  '/review': 'Model Review',
  '/registry': 'Model Registry',
  '/detect': 'Detect Objects',
  '/users': 'Manage Users',
  '/account': 'Account Settings',
  '/versions': 'Dataset Versions',
  '/settings': 'Project Settings',
};

export function TopBar() {
  const pathname = usePathname() || '/';
  const pathSegments = pathname.split('/').filter(Boolean);
  const leaf = pathSegments.length ? `/${pathSegments[pathSegments.length - 1]}` : '/';
  const title = VIEW_TITLES[pathname] || VIEW_TITLES[leaf] || 'Dashboard';

  return (
    <div
      className="shrink-0 flex items-center justify-between px-6 py-3"
      style={{
        background: 'rgba(14,14,14,0.70)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Gradient accent dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: 'linear-gradient(135deg, #ff9159, #D4820A)', boxShadow: '0 0 6px rgba(255,145,89,0.6)' }}
        />
        <h2 className="text-sm font-bold tracking-wide text-white/80 font-headline">
          {title}
        </h2>
      </div>
    </div>
  );
}

'use client';

import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Upload,
  Edit3,
  Zap,
  CheckCircle,
  Database,
  Eye,
  LogOut,
  User as UserIcon,
  Users as UsersIcon,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Settings } from 'lucide-react';

const ADMIN_VIEWS = [
  { id: 'users', path: '/users', label: 'Manage Users', icon: UsersIcon },
];

function normalizePathname(pathname: string | null) {
  if (!pathname) return '';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function isActivePath(pathname: string | null, href: string) {
  const p = normalizePathname(pathname);
  const h = normalizePathname(href);
  if (!p) return false;
  if (p === h) return true;
  if (h !== '/' && p.startsWith(`${h}/`)) return true;
  return false;
}

function isProjectDashboardActive(pathname: string | null, projectRootHref: string) {
  const p = normalizePathname(pathname);
  const root = normalizePathname(projectRootHref);
  return Boolean(p) && p === root;
}

function normalizeImageUrl(url?: string | null) {
  if (!url) return '';
  // Backend sometimes returns minio hostnames not reachable by browser.
  return url.replace('http://minio:9000', 'http://localhost:9000');
}

function getProjectThumbnailUrl(images: any[]) {
  if (!images?.length) return '';
  const sorted = [...images].sort((a, b) => {
    const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
    const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
    return tb - ta;
  });
  return normalizeImageUrl(sorted[0]?.url);
}

export function PrimarySidebar() {
  const { logout, user } = useAuth();
  const { projects } = useApp();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string;

  const activeProject = projects.find(p => p.id === projectId);

  const isInProject = Boolean(projectId);

  const PRIMARY_ITEMS = [
    { id: 'projects', path: '/', label: 'All Projects', icon: LayoutDashboard },
    {
      id: 'detect',
      path: projectId ? `/projects/${projectId}/detect` : '/detect',
      label: 'Detect',
      icon: Eye,
    },
  ];

  return (
    <div
      className={[
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen flex flex-col',
        isInProject ? 'w-14 items-stretch' : 'w-56',
      ].join(' ')}
    >
      {/* Logo */}
      <div className={['border-sidebar-border', isInProject ? 'p-3' : 'p-3'].join(' ')}>
        <div className={['flex items-center', isInProject ? 'justify-center' : 'gap-2'].join(' ')}>
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
            <img src="/cbass-logo.png" alt="CBASS Logo" className="w-full h-full object-contain" />
          </div>
          {!isInProject && (
            <div>
              <h1 className="font-bold leading-tight">DOST-CBASS</h1>
              {activeProject && (
                <p className="text-[10px] text-primary font-bold truncate max-w-[120px]">
                  {activeProject.name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={['flex-1 overflow-y-auto', isInProject ? 'p-2 space-y-4' : 'p-4 space-y-6'].join(' ')}>
        {/* Primary navigation */}
        <div>
          {!isInProject && (
            <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-3">
              Navigation
            </h3>
          )}
          <div className="space-y-1">
            {PRIMARY_ITEMS.map(item => (
              <Link
                key={item.id}
                href={item.path}
                title={item.label}
                className={[
                  'w-full flex items-center rounded transition-colors text-sm',
                  isInProject ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                  isActivePath(pathname, item.path)
                    ? 'bg-sidebar-primary text-sidebar font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/30',
                ].join(' ')}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!isInProject && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* System (admin) */}
        {user?.role === 'admin' && (
          <div>
            {!isInProject && (
              <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-3">
                System
              </h3>
            )}
            <div className="space-y-1">
              {ADMIN_VIEWS.map(view => (
                <Link
                  key={view.id}
                  href={view.path}
                  title={view.label}
                  className={[
                    'w-full flex items-center rounded transition-colors text-sm',
                    isInProject ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                    isActivePath(pathname, view.path)
                      ? 'bg-sidebar-primary text-sidebar font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/30',
                  ].join(' ')}
                >
                  <view.icon className="w-4 h-4 shrink-0" />
                  {!isInProject && <span className="flex-1 text-left">{view.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile / Account Header */}
      <div className={['border-t border-sidebar-border mt-auto', isInProject ? 'p-2' : 'p-4'].join(' ')}>
        {isInProject ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary border border-sidebar-primary/30"
              title={user?.username || 'Guest'}
            >
              <UserIcon className="w-5 h-5" />
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-red-500/10 text-sidebar-foreground/50 hover:text-red-400 transition-all group"
              title="Log out"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/20 border border-sidebar-border/50">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary border border-sidebar-primary/30">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-sidebar-foreground">
                {user?.username || 'Guest'}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 truncate">
                {user?.role || 'User'}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-red-500/10 text-sidebar-foreground/50 hover:text-red-400 transition-all group"
              title="Log out"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectSidebar() {
  const { projects, images } = useApp();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string;

  if (!projectId) return null;

  const activeProject = projects.find(p => p.id === projectId);
  const thumbnailUrl = getProjectThumbnailUrl(images as any[]);

  const PROJECT_ITEMS = [
    { id: 'dashboard', path: `/projects/${projectId}`, label: 'Project dashboard', icon: LayoutDashboard },
    { id: 'upload', path: `/projects/${projectId}/upload`, label: 'Upload', icon: Upload },
    { id: 'annotate', path: `/projects/${projectId}/annotate`, label: 'Annotate', icon: Edit3 },
    { id: 'versions', path: `/projects/${projectId}/versions`, label: 'Versions', icon: GitBranch },
    { id: 'train', path: `/projects/${projectId}/train`, label: 'Train Model', icon: Zap },
    { id: 'review', path: `/projects/${projectId}/review`, label: 'Model Review', icon: CheckCircle },
    { id: 'registry', path: `/projects/${projectId}/registry`, label: 'Model Registry', icon: Database },
    { id: 'settings', path: `/projects/${projectId}/settings`, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen flex flex-col">
      <div className="p-4 border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-sidebar-border bg-sidebar-accent/20 shrink-0">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="Project thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sidebar-foreground/40 text-[10px] font-semibold">
                —
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold leading-tight truncate text-sm">Project</h2>
            <p className="text-[10px] text-primary font-bold truncate">
              {activeProject?.name || projectId}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-2">
            Overview
          </h3>
          <Link
            href={`/projects/${projectId}`}
            className={[
              'w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm',
              isProjectDashboardActive(pathname, `/projects/${projectId}`)
                ? 'bg-sidebar-primary text-sidebar font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/30',
            ].join(' ')}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Dashboard</span>
          </Link>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-2">
            ML WORKFLOW
          </h3>
          <div className="space-y-1">
            {PROJECT_ITEMS.filter(i => i.id !== 'dashboard' && i.id !== 'settings').map(item => (
              <Link
                key={item.id}
                href={item.path}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm',
                  isActivePath(pathname, item.path)
                    ? 'bg-sidebar-primary text-sidebar font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/30',
                ].join(' ')}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-2">
            Admin
          </h3>
          <Link
            href={`/projects/${projectId}/settings`}
            className={[
              'w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm',
              isActivePath(pathname, `/projects/${projectId}/settings`)
                ? 'bg-sidebar-primary text-sidebar font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/30',
            ].join(' ')}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function Sidebar() {
  return <PrimarySidebar />;
}

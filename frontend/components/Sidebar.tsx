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
  ChevronUp,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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

/* ─── shared style atoms ─── */
const sidebarBase: React.CSSProperties = {
  background: 'rgba(14, 13, 11, 0.85)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  boxShadow: 'inset -1px 0 0 0 rgba(255,255,255,0.03)',
};

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  title,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  title?: string;
}) {
  return (
    <Link
      href={href}
      title={title ?? label}
      className={[
        'w-full flex items-center rounded-xl transition-all duration-200 text-sm relative group',
        collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
        active
          ? 'text-white font-semibold'
          : 'text-white/50 hover:text-white/80',
      ].join(' ')}
      style={
        active
          ? {
              background: 'linear-gradient(135deg, rgba(255,145,89,0.18) 0%, rgba(212,130,10,0.14) 100%)',
              border: '1px solid rgba(255,145,89,0.25)',
              boxShadow: '0 0 12px rgba(255,145,89,0.08)',
            }
          : { border: '1px solid transparent' }
      }
    >
      {/* Active indicator dot */}
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ background: 'linear-gradient(180deg,#ff9159,#D4820A)' }}
        />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
    </Link>
  );
}

export function PrimarySidebar() {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isInProject = Boolean(projectId);

  const PRIMARY_ITEMS = [
    { id: 'projects', path: '/', label: 'All Projects', icon: LayoutDashboard },
    { id: 'detect', path: '/detect', label: 'Detect', icon: Eye },
    { id: 'registry', path: '/registry', label: 'Model Registry', icon: Database },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={[
        'h-screen flex flex-col relative z-40',
        isInProject ? 'w-14 items-stretch' : 'w-56',
      ].join(' ')}
      style={sidebarBase}
    >
      {/* Logo */}
      <div className={['py-4', isInProject ? 'px-3' : 'px-4'].join(' ')}>
        <div className={['flex items-center', isInProject ? 'justify-center' : 'gap-2.5'].join(' ')}>
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/cbass-logo.png" alt="CBASS Logo" className="w-full h-full object-contain" />
          </div>
          {!isInProject && (
            <div>
              <h1 className="font-bold text-sm leading-tight text-white font-headline">DOST-CBASS</h1>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} />

      {/* Navigation */}
      <nav className={['flex-1 overflow-y-auto', isInProject ? 'p-2 space-y-1' : 'p-3 space-y-5'].join(' ')}>

        {/* Primary navigation */}
        <div>
          {!isInProject && (
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/25 mb-2 px-1">
              Navigation
            </p>
          )}
          <div className="space-y-0.5">
            {PRIMARY_ITEMS.map(item => (
              <NavItem
                key={item.id}
                href={item.path}
                icon={item.icon}
                label={item.label}
                active={isActivePath(pathname, item.path)}
                collapsed={isInProject}
              />
            ))}
          </div>
        </div>

        {/* System (admin) */}
        {user?.role === 'admin' && (
          <div>
            {!isInProject && (
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/25 mb-2 px-1">
                System
              </p>
            )}
            <div className="space-y-0.5">
              {ADMIN_VIEWS.map(view => (
                <NavItem
                  key={view.id}
                  href={view.path}
                  icon={view.icon}
                  label={view.label}
                  active={isActivePath(pathname, view.path)}
                  collapsed={isInProject}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Divider */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} />

      {/* User footer */}
      <div className={['relative', isInProject ? 'p-2' : 'p-3'].join(' ')}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={[
            'w-full flex items-center transition-all duration-200 rounded-xl hover:bg-white/5',
            isInProject ? 'justify-center p-1.5' : 'gap-3 p-2.5',
          ].join(' ')}
          style={{ 
            background: dropdownOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
            border: dropdownOpen ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent'
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 shrink-0 "
            style={{ background: 'rgba(212,130,10,0.15)', border: '1px solid rgba(212,130,10,0.25)' }}
          >
            <UserIcon className="w-4 h-4" />
          </div>
          {!isInProject && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold truncate text-white/80">{user?.username || 'Guest'}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/30 truncate">{user?.role || 'User'}</p>
              </div>
              <ChevronUp className={`w-3 h-3 text-white/20 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className={[
              "absolute bottom-full mb-2 z-[60] overflow-hidden",
              isInProject ? "left-2 w-64" : "left-3 right-3"
            ].join(' ')}
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)',
            }}
          >
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 shrink-0"
                  style={{ background: 'rgba(212,130,10,0.2)', border: '1px solid rgba(212,130,10,0.3)' }}
                >
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user?.username || 'Renie Boy M. Maglinte'}</p>
                  <p className="text-xs text-white/40 truncate">{user?.username.toLowerCase()}@gmail.com</p>
                </div>
              </div>
            </div>
            
            <div className="p-1.5">
              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <UserCircle className="w-4 h-4" />
                <span>Account Settings</span>
              </Link>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
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
    { id: 'upload',   path: `/projects/${projectId}/upload`,    label: 'Upload',         icon: Upload },
    { id: 'annotate', path: `/projects/${projectId}/annotate`,  label: 'Annotate',       icon: Edit3 },
    { id: 'versions', path: `/projects/${projectId}/versions`,  label: 'Versions',       icon: GitBranch },
    { id: 'train',    path: `/projects/${projectId}/train`,     label: 'Train Model',    icon: Zap },
    { id: 'review',   path: `/projects/${projectId}/review`,    label: 'Model Review',   icon: CheckCircle },
    { id: 'registry', path: `/projects/${projectId}/registry`,  label: 'Model Registry', icon: Database },
  ];

  return (
    <div className="w-52 h-screen flex flex-col relative z-30" style={sidebarBase}>
      {/* Project header */}
      <div className="p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)' }}
          >
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="Project thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px] font-semibold">
                —
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/30 mb-0.5">Project</p>
            <p className="text-xs font-bold truncate text-white/80 font-headline">
              {activeProject?.name || projectId}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} />

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Overview */}
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/25 mb-2 px-1">Overview</p>
          <NavItem
            href={`/projects/${projectId}`}
            icon={LayoutDashboard}
            label="Dashboard"
            active={isProjectDashboardActive(pathname, `/projects/${projectId}`)}
            collapsed={false}
          />
        </div>

        {/* ML Workflow */}
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/25 mb-2 px-1">ML Workflow</p>
          <div className="space-y-0.5">
            {PROJECT_ITEMS.map(item => (
              <NavItem
                key={item.id}
                href={item.path}
                icon={item.icon}
                label={item.label}
                active={isActivePath(pathname, item.path)}
                collapsed={false}
              />
            ))}
          </div>
        </div>

        {/* Admin */}
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/25 mb-2 px-1">Admin</p>
          <NavItem
            href={`/projects/${projectId}/settings`}
            icon={Settings}
            label="Settings"
            active={isActivePath(pathname, `/projects/${projectId}/settings`)}
            collapsed={false}
          />
        </div>
      </nav>
    </div>
  );
}

export function Sidebar() {
  return <PrimarySidebar />;
}

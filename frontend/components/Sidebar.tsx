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
  ChevronRight,
  LogOut,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const OVERVIEW_VIEWS = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'detect', path: '/detect', label: 'Detect', icon: Eye},
];

const ML_WORKFLOW = [
  { id: 'upload', path: '/upload', label: 'Upload', icon: Upload, step: 1 },
  { id: 'annotate', path: '/annotate', label: 'Annotate', icon: Edit3, step: 2 },  
  { id: 'train', path: '/train', label: 'Train Model', icon: Zap, step: 3 },
  { id: 'review', path: '/review', label: 'Model Review', icon: CheckCircle, step: 4 },
  { id: 'registry', path: '/registry', label: 'Model Registry', icon: Database, step: 5 },
];

const ADMIN_VIEWS = [
  { id: 'users', path: '/users', label: 'Manage Users', icon: UsersIcon },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
            <img src="/cbass-logo.png" alt="CBASS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-bold ">DOST-CBASS</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Overview Section */}
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-3">
            Overview
          </h3>
          <div className="space-y-1">
            {OVERVIEW_VIEWS.map((view: any) => (
              <Link
                key={view.id}
                href={view.path}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ${
                  pathname === view.path
                    ? 'bg-sidebar-primary text-sidebar font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/30'
                }`}
              >
                <view.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{view.label}</span>
                {view.badge && (
                  <span className="text-xs px-2 py-0.5 bg-sidebar-primary text-white rounded">
                    {view.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* ML Workflow Section */}
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-3 ">
            ML Workflow
          </h3>
          <div className="space-y-1">
            {ML_WORKFLOW.map((view: any) => (
              <Link
                key={view.id}
                href={view.path}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ${
                  pathname === view.path
                    ? 'bg-sidebar-primary text-sidebar font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/30'
                }`}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-sidebar-accent text-sidebar-foreground text-xs font-semibold flex-shrink-0">
                  {view.step}
                </div>
                <span className="flex-1 text-left">{view.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Administration Section (Admin only) */}
        {user?.role === 'admin' && (
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-3">
              Administration
            </h3>
            <div className="space-y-1">
              {ADMIN_VIEWS.map((view: any) => (
                <Link
                  key={view.id}
                  href={view.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ${
                    pathname === view.path
                      ? 'bg-sidebar-primary text-sidebar font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/30'
                  }`}
                >
                  <view.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{view.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile / Account Header */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
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
      </div>
    </div>
  );
}

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
} from 'lucide-react';

const OVERVIEW_VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'detect', label: 'Classify', icon: Eye},
];

const ML_WORKFLOW = [
  { id: 'upload', label: 'Upload dataset', icon: Upload, step: 1 },
  { id: 'annotate', label: 'Annotate', icon: Edit3, step: 2 },
  { id: 'train', label: 'Train Model', icon: Zap, step: 3 },
  { id: 'review', label: 'Model Review', icon: CheckCircle, step: 4 },
  { id: 'registry', label: 'Model Registry', icon: Database, step: 5 },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useApp();

  return (
    <div className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sidebar-primary rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <h1 className="font-bold text-base">BeanScan</h1>
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
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ${
                  currentView === view.id
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
              </button>
            ))}
          </div>
        </div>

        {/* ML Workflow Section */}
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60 mb-3">
            ML Workflow
          </h3>
          <div className="space-y-1">
            {ML_WORKFLOW.map((view: any) => (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ${
                  currentView === view.id
                    ? 'bg-sidebar-primary text-sidebar font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/30'
                }`}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-sidebar-accent text-sidebar-foreground text-xs font-semibold flex-shrink-0">
                  {view.step}
                </div>
                <span className="flex-1 text-left">{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Project Info */}
      <div className="p-4 border-t border-sidebar-border text-xs">
        <div className="font-semibold mb-2 text-xs uppercase tracking-wide">Project</div>
        <div className="space-y-1 text-sidebar-foreground/70">
          <p>Images: 5</p>
          <p>Annotations: 2</p>
          <p>Models: 4</p>
        </div>
      </div>
    </div>
  );
}

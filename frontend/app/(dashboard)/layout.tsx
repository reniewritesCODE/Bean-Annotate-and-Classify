'use client';

import { PrimarySidebar, ProjectSidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { LoginView } from '@/views/Login';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0e0e0e]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login view inline when not authenticated (no redirect)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0e0e0e]">
        <LoginView />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background flex-row w-full relative overflow-hidden">
      {/* Ambient background glows — match login/register aesthetic */}
      <div
        className="pointer-events-none absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full"
        style={{ background: 'rgba(74,222,128,0.05)', filter: 'blur(120px)', zIndex: 0 }}
      />
      <div
        className="pointer-events-none absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full"
        style={{ background: 'rgba(255,145,89,0.06)', filter: 'blur(150px)', zIndex: 0 }}
      />

      {/* Primary sidebar (collapses to rail inside projects) */}
      <PrimarySidebar />

      {/* Project sidebar (only inside projects) */}
      {projectId && <ProjectSidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
        {/* Top Bar */}
        <TopBar />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-transparent min-h-0">
          {children}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}

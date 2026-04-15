'use client';

import { PrimarySidebar, ProjectSidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-foreground flex-row w-full">
      {/* Primary sidebar (collapses to rail inside projects) */}
      <PrimarySidebar />

      {/* Project sidebar (only inside projects) */}
      {projectId && <ProjectSidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <TopBar />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-background min-h-0">
          {children}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}

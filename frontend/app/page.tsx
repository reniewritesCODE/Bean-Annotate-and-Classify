'use client';

import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Toast } from '@/components/Toast';
import { Dashboard } from '@/views/Dashboard';
import { UploadView } from '@/views/Upload';
import { AnnotateView } from '@/views/Annotate';
import { TrainView } from '@/views/Train';
import { ReviewView } from '@/views/Review';
import { RegistryView } from '@/views/Registry';
import { DetectView } from '@/views/Detect';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const { currentView } = useApp(); 

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <UploadView />;    
      case 'annotate':
        return <AnnotateView />;
      case 'train':
        return <TrainView />;
      case 'review':
        return <ReviewView />;
      case 'registry':
        return <RegistryView />;
      case 'detect':
        return <DetectView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-background">
          {renderView()}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}

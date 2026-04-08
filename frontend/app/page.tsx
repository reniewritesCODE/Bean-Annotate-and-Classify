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
import { UsersView } from '@/views/Users';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { LoginView } from '@/views/Login';
import { RegisterView } from '@/views/Register';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const { currentView } = useApp(); 
  const { isAuthenticated, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <RegisterView onBackToLogin={() => setShowRegister(false)} />
    ) : (
      <LoginView onRegisterClick={() => setShowRegister(true)} />
    );
  }

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
      case 'users':
        return <UsersView />;
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

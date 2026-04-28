'use client';

import { useState, useEffect, Suspense } from 'react';
import { LoginView } from '@/views/Login';
import { RegisterView } from '@/views/Register';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function LoginContent() {
  const [view, setView] = useState<'login' | 'register'>('login');
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect authenticated users to home (Project Portfolio)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0e0e0e]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff9159]" />
      </div>
    );
  }

  // Don't render login form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      {view === 'login' ? (
        <LoginView onRegisterClick={() => setView('register')} />
      ) : (
        <RegisterView onBackToLogin={() => setView('login')} />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0e0e0e]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff9159]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { LoginView } from '@/views/Login';
import { RegisterView } from '@/views/Register';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0e0e0e]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff9159]" />
      </div>
    );
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

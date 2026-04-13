'use client';

import { RegisterView } from '@/views/Register';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  return <RegisterView onBackToLogin={() => router.push('/login')} />;
}

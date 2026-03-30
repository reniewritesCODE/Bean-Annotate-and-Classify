'use client';

import { useApp } from '@/context/AppContext';
import { useEffect } from 'react';

export function Toast() {
  const { toasts } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

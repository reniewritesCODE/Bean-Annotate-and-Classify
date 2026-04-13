'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams();
  const { setActiveProjectId, projects } = useApp();

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId as string);
    }
  }, [projectId, setActiveProjectId]);

  return <>{children}</>;
}

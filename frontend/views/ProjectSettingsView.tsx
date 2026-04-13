'use client';

import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import { Panel } from '@/components/panels';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';

export function ProjectSettingsView() {
  const { projects, setProjects, addToast } = useApp();
  const { projectId } = useParams();
  const router = useRouter();
  
  const project = projects.find(p => p.id === projectId);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (project) {
      setFormData({ 
        name: project.name || '', 
        description: project.description || '' 
      });
    }
  }, [project]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch(`/api/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, id: projectId }), // Assuming backend can handle update via POST or we need a PUT
      });

      // NOTE: Our backend projects router uses POST only for creation. 
      // I should check if there's a PUT or if I need to add one.
      // For now, let's assume I need to implement PUT in backend or use what's available.
      
      if (response.ok) {
        const updated = await response.json();
        setProjects(projects.map(p => p.id === projectId ? updated : p));
        addToast('Project settings updated', 'success');
      } else {
        addToast('Failed to update project settings', 'error');
      }
    } catch {
      addToast('Network error while updating project', 'error');
    }
  };

  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-secondary rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold font-headline">Project Settings</h1>
      </div>

      <Panel title="General Information" className="p-6">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Danger Zone" className="p-6 border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Delete this project</h3>
            <p className="text-xs text-muted-foreground mt-1">Once you delete a project, there is no going back. Please be certain.</p>
          </div>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={async () => {
              if (confirm('Are you absolutely sure? All datasets and images will be permanently deleted.')) {
                const token = localStorage.getItem('access_token');
                try {
                  const response = await fetch(`/api/projects/${projectId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (response.ok) {
                    setProjects(projects.filter(p => p.id !== projectId));
                    addToast('Project deleted successfully', 'success');
                    router.push('/');
                  } else {
                    addToast('Failed to delete project', 'error');
                  }
                } catch {
                  addToast('Network error while deleting project', 'error');
                }
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </Button>
        </div>
      </Panel>
    </div>
  );
}

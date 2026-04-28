'use client';

import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import { Panel } from '@/components/panels';
import { Plus, Folder, Trash2, Calendar, ExternalLink, Search, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function ProjectsView() {
  const { projects, setProjects, addToast, setActiveProjectId } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects([...projects, data]);
        setIsCreating(false);
        setNewProject({ name: '', description: '' });
        addToast('Project created successfully', 'success');
      } else {
        const err = await response.json();
        addToast(err.detail || 'Failed to create project', 'error');
      }
    } catch (error) {
      addToast('Network error while creating project', 'error');
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${projectName}"? This will remove all images and annotations.`)) return;

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
        addToast('Project deleted successfully', 'success');
      } else {
        addToast('Failed to delete project', 'error');
      }
    } catch (error) {
      addToast('Network error while deleting project', 'error');
    }
  };

  const handleSelect = (projectId: string) => {
    setActiveProjectId(projectId);
    router.push(`/projects/${projectId}`);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 h-full max-w-6xl mx-auto flex flex-col space-y-8 animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Folder className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-headline">Project Portfolio</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage your coffee bean annotation sets, models, and research batches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Filter projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-sidebar-accent/30 border border-sidebar-border rounded-xl text-sm w-full md:w-56 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-white"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="gradient-button rounded-xl gap-2 h-10 px-5 flex items-center font-bold text-sm text-black"
            style={{ boxShadow: '0 4px 20px -4px rgba(255,145,89,0.4)' }}
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Main Content (Table) */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/10 shadow-2xl flex flex-col flex-1 min-h-0">
        {projects.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
            <div className="p-3 rounded-full bg-sidebar-accent/50 border border-sidebar-border">
              <Folder className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">No Projects Found</h3>
              <p className="text-sm">Initiate your first research project to begin data ingestion.</p>
            </div>
            <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-2">
              Create Project
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sidebar-accent/20 border-b border-sidebar-border/50 sticky top-0 z-30 backdrop-blur-md">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Identity</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scope & Description</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Inception Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sidebar-border/30">
                {filteredProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    onClick={() => handleSelect(project.id)}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sidebar-accent/50 border border-sidebar-border flex-shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
                          {project.thumbnail_url ? (
                            <img 
                              src={project.thumbnail_url} 
                              alt={project.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                              <Folder className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                            ID: {project.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-muted-foreground line-clamp-2 italic">
                        {project.description || 'No description provided to define project scope.'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(project.created_at).toLocaleDateString()}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          {new Date(project.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center items-center gap-2">
                         <button
                           onClick={() => handleSelect(project.id)}
                           className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all group/btn"
                           title="Open Project"
                         >
                           <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                         </button>
                         <button
                           onClick={(e) => handleDelete(e, project.id, project.name)}
                           className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all group/btn"
                           title="Archive Project"
                         >
                           <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
          onClick={() => setIsCreating(false)}
        >
          <div
            className="glass-panel rounded-2xl w-full max-w-md"
            style={{ boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white font-headline">New Project</h2>
                <p className="text-xs text-white/30 mt-1">Create a new annotation and training workspace.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                    Project Name
                  </label>
                  <div className="field-underline-wrap">
                    <input
                      autoFocus
                      type="text"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="e.g. Robusta Batch 2026"
                      className="w-full rounded-xl py-3.5 px-4 text-white placeholder-white/20 outline-none rim-light font-sans text-sm"
                      style={{ background: '#201f1f', border: 'none' }}
                      required
                    />
                    <div className="underline-bar" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                    Description (optional)
                  </label>
                  <div className="field-underline-wrap">
                    <textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Describe the project scope..."
                      rows={3}
                      className="w-full rounded-xl py-3.5 px-4 text-white placeholder-white/20 outline-none rim-light font-sans text-sm resize-none"
                      style={{ background: '#201f1f', border: 'none' }}
                    />
                    <div className="underline-bar" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 gradient-button py-3 rounded-xl text-sm font-bold text-black"
                  style={{ boxShadow: '0 8px 24px -6px rgba(255,145,89,0.3)' }}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import {
  Users,
  UserCheck,
  UserMinus,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Shield,
  Clock,
  Mail,
} from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export function UsersView() {
  const { user: currentUser, token } = useAuth();
  const { addToast } = useApp();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    setIsDeleting(username);
    try {
      const response = await fetch(`/api/auth/users/${username}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete user');
      }

      addToast(`User ${username} deleted successfully`, 'success');
      setUsers(users.filter((u) => u.username !== username));
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-headline">User Management</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage system access, monitor user registrations, and handle roles.
          </p>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-sidebar-accent/30 border border-sidebar-border rounded-xl text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-white"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/10 shadow-2xl">
        {isLoading ? (
          <div className="p-24 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="animate-pulse">Loading personnel registry...</p>
          </div>
        ) : error ? (
          <div className="p-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="max-w-xs">
              <h3 className="font-bold text-white mb-1">Access Denied</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button 
              onClick={fetchUsers}
              className="mt-2 text-sm font-bold text-primary hover:underline"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
            <div className="p-3 rounded-full bg-sidebar-accent/50 border border-sidebar-border">
              <Search className="w-8 h-8" />
            </div>
            <p>No users found matching your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sidebar-accent/20 border-b border-sidebar-border/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personnel</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Level</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Registry Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sidebar-border/30">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white flex items-center gap-2">
                            {user.username}
                            {user.username === currentUser?.username && (
                              <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[8px] font-black uppercase tracking-tighter text-zinc-500 border border-zinc-700">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">ID: {user.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground hover:text-zinc-300 transition-colors cursor-default">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        user.role === 'admin' 
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                        : user.role === 'trainer'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        <Shield className="w-2.5 h-2.5" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          {new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {user.username !== currentUser?.username ? (
                          <button
                            onClick={() => handleDeleteUser(user.username)}
                            disabled={isDeleting === user.username}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all group/btn disabled:opacity-50"
                            title="Deactivate Account"
                          >
                            {isDeleting === user.username ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            )}
                          </button>
                        ) : (
                          <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-600 cursor-not-allowed" title="Self-deletion prohibited">
                            <UserCheck className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lab Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-sidebar-accent/10 border border-sidebar-border/50 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Registry</p>
          <p className="text-3xl font-black font-headline text-white">{users.length}</p>
        </div>
        <div className="p-6 rounded-2xl bg-sidebar-accent/10 border border-sidebar-border/50 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Admin Units</p>
          <p className="text-3xl font-black font-headline text-white">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="p-6 rounded-2xl bg-sidebar-accent/10 border border-sidebar-border/50 flex flex-col gap-1 text-primary">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-1">System Status</p>
          <p className="text-lg font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Operational
          </p>
        </div>
      </div>
    </div>
  );
}

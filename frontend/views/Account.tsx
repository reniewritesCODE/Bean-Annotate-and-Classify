'use client';

import { useAuth } from '@/context/AuthContext';
import { Panel } from '@/components/panels';
import { User, Mail, Shield, LogOut, Key, BadgeCheck } from 'lucide-react';
import { useState } from 'react';

export function AccountView() {
  const { user, logout } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-6 mb-2">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center text-white/80 shrink-0 shadow-2xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,145,89,0.2) 0%, rgba(212,130,10,0.2) 100%)', 
            border: '2px solid rgba(212,130,10,0.3)',
            boxShadow: '0 0 40px -10px rgba(255,145,89,0.3)'
          }}
        >
          <User className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-headline gradient-text">{user?.username || 'User Profile'}</h1>
          <p className="text-white/40 mt-1 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span className="uppercase tracking-[0.2em] text-[10px] font-bold">{user?.role || 'System User'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Panel title="Personal Information">
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Username</label>
                  <div className="field-underline-wrap">
                    <input
                      type="text"
                      defaultValue={user?.username || ''}
                      disabled
                      className="w-full rounded-xl py-3 px-4 text-white/50 bg-white/5 outline-none rim-light font-sans text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                  <div className="field-underline-wrap">
                    <input
                      type="email"
                      defaultValue={`${user?.username.toLowerCase()}@gmail.com`}
                      disabled
                      className="w-full rounded-xl py-3 px-4 text-white/50 bg-white/5 outline-none rim-light font-sans text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  disabled
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/20 bg-white/5 border border-white/10 cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Security">
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Change Password</p>
                    <p className="text-xs text-white/30">Update your account password regularly.</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all">
                  Update
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-white/30">Add an extra layer of security to your account.</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-green-400/60 hover:text-green-400 hover:bg-green-400/10 transition-all">
                  Enable
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Account Actions">
            <div className="space-y-3 py-2">
              <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-red-400 font-bold text-sm bg-red-400/5 border border-red-400/10 hover:bg-red-400/10 hover:border-red-400/20 transition-all shadow-lg shadow-red-400/5 group"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                Sign Out from Device
              </button>
              
              <div className="pt-4 text-center">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">DOST-CBASS Account Services</p>
              </div>
            </div>
          </Panel>
          
          <div 
            className="p-6 rounded-2xl flex flex-col items-center text-center space-y-3"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,145,89,0.05) 0%, rgba(212,130,10,0.05) 100%)',
              border: '1px solid rgba(255,145,89,0.1)'
            }}
          >
            <Shield className="w-8 h-8 text-primary/40" />
            <div>
              <p className="text-xs font-bold text-white/60">Data Privacy</p>
              <p className="text-[10px] text-white/30 mt-1">Your data is secured using industry standard encryption protocols.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

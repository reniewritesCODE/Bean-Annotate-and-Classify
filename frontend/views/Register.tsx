'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import {
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Microscope,
  BadgeCheck,
  UploadCloud,
  BrainCircuit,
  History,
  ArrowLeft,
} from 'lucide-react';

interface RegisterViewProps {
  onBackToLogin: () => void;
}

export function RegisterView({ onBackToLogin }: RegisterViewProps) {
  const { login } = useAuth();
  const { addToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail || 'Registration failed';
        throw new Error(detail);
      }

      addToast(`Account created successfully! Please login.`, 'success');
      onBackToLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden font-sans"
      style={{ background: '#0e0e0e', color: '#ffffff' }}
    >
      <style>{`
        .font-headline { font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif; }
        .gradient-text {
          background: linear-gradient(90deg, #ff9159, #D4820A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-button { background: linear-gradient(135deg, #ff9159 0%, #D4820A 100%); transition: all 0.3s ease; }
        .gradient-button:hover {
          background: linear-gradient(135deg, #ffaa7a 0%, #e8941a 100%);
          box-shadow: 0 0 32px rgba(255,145,89,0.5), 0 0 8px rgba(212,130,10,0.4);
          transform: translateY(-2px) scale(1.01);
          filter: brightness(1.08);
        }
        .gradient-button:active { transform: scale(0.98); filter: brightness(0.95); }
        .glass-panel {
          background: rgba(38, 38, 38, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rim-light { box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.1); }
        .field-underline-wrap { position: relative; }
        .field-underline-wrap .underline-bar {
          position: absolute;
          bottom: 0; left: 0;
          width: 0; height: 2px;
          background: #ff9159;
          transition: width 0.4s ease;
          border-radius: 9999px;
        }
        .field-underline-wrap:focus-within .underline-bar { width: 100%; }
      `}</style>

      {/* ── Background Glows ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none"
           style={{ background: 'rgba(74,222,128,0.10)', filter: 'blur(120px)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none"
           style={{ background: 'rgba(255,145,89,0.10)', filter: 'blur(150px)' }} />

      <main className="relative flex min-h-screen w-full flex-col md:flex-row items-center justify-center">
        
        {/* ── LEFT: Register Form ── */}
        <section className="relative z-10 w-full md:w-1/2 flex items-center justify-center p-6 lg:p-12 pt-28">
          <div className="w-full max-w-md">
            
            <button 
              onClick={onBackToLogin}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-medium">Back to Login</span>
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                  <img src="/cbass-logo.png" alt="CBASS Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl">DOST-CBASS</span>
              </div>
              
              <h1 className="text-4xl font-bold pt-1 font-headline">
                Join the <span className="gradient-text">Future.</span>
              </h1>
              <p className="text-lg" style={{ color: '#adaaaa' }}>Create an account to get started.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm border"
                  style={{
                    background: 'rgba(159,5,25,0.15)',
                    borderColor: 'rgba(255,113,108,0.2)',
                    color: '#ff716c',
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2 ml-1 text-zinc-500">
                    Full Name
                  </label>
                  <div className="field-underline-wrap">
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl py-3.5 px-5 text-white placeholder-zinc-600 outline-none transition-all duration-300 rim-light"
                      style={{ background: '#201f1f', border: 'none' }}
                    />
                    <div className="underline-bar" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2 ml-1 text-zinc-500">
                    Email Address
                  </label>
                  <div className="field-underline-wrap">
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl py-3.5 px-5 text-white placeholder-zinc-600 outline-none transition-all duration-300 rim-light"
                      style={{ background: '#201f1f', border: 'none' }}
                    />
                    <div className="underline-bar" />
                  </div>
                </div>

                {/* Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-2 ml-1 text-zinc-500">
                      Password
                    </label>
                    <div className="field-underline-wrap">
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full rounded-xl py-3.5 px-5 text-white placeholder-zinc-600 outline-none transition-all duration-300 rim-light"
                        style={{ background: '#201f1f', border: 'none' }}
                      />
                      <div className="underline-bar" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-2 ml-1 text-zinc-500">
                      Confirm
                    </label>
                    <div className="field-underline-wrap">
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full rounded-xl py-3.5 px-5 text-white placeholder-zinc-600 outline-none transition-all duration-300 rim-light"
                        style={{ background: '#201f1f', border: 'none' }}
                      />
                      <div className="underline-bar" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full gradient-button font-bold py-4 rounded-xl uppercase tracking-widest text-sm disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
                style={{ color: '#000000', boxShadow: '0 10px 30px -8px rgba(255,145,89,0.3)' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center pt-4">
                <p className="text-sm text-zinc-500">
                  Already have an account?{' '}
                  <button
                    onClick={onBackToLogin}
                    className="font-semibold hover:underline transition-all"
                    style={{ color: '#ff9159' }}
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>
          </div>
        </section>

        {/* ── RIGHT: Dashboard Preview ── */}
        <section className="hidden md:flex w-1/2 h-screen items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden rounded-l-[3rem]">
            <img
              className="w-full h-full object-cover opacity-30 mix-blend-luminosity grayscale contrast-125"
              alt="coffee beans"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0QlZMINWPV7Ml0FXn-oaHXfHn9t1UQuoUkz2KfWzsml3brW4-1i0jiqthkuT-8QzUG4pCdkMLk3p1waGkeSheBSabePmSAYaHjejpso-3on7TUAlLUNS-pJQce_SCb1hJaCTnXmP3k3XM6HMxa8_iEVOlYLNgK3KvenNmEV_opSmoeBZDg1etr4i1Y3FkbsYoFG_lqS7uzz_1uGAyks1OrNJXb7mdzq1nVCnbxaGt1aLg4V3jU_6PErveXZ-FUxTIt5chbcArPDlJ"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-[#0e0e0e]/60 to-transparent" />
          </div>

          <div className="relative z-10 glass-panel w-full max-w-2xl rounded-[2.5rem] p-8 flex flex-col gap-6 rim-light"
               style={{ height: '80vh', maxHeight: '720px' }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">
                    Registration Preview
                  </span>
                </div>
                <h2 className="text-2xl font-bold font-headline">Secure Lab Access</h2>
              </div>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <SlidersHorizontal className="w-5 h-5 text-white/40" />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#ff9159]/10 flex items-center justify-center border border-[#ff9159]/20">
                    <BadgeCheck className="w-10 h-10 text-[#ff9159]" />
                </div>
                <div className="max-w-xs">
                    <h3 className="text-lg font-bold mb-2">Automated Quality Control</h3>
                    <p className="text-sm text-zinc-500">
                        Join hundreds of researchers using AI to standardize Robusta coffee bean classification in the Philippines.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Total Users</p>
                    <p className="text-xl font-bold">1,248+</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Precision</p>
                    <p className="text-xl font-bold">98.2%</p>
                </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

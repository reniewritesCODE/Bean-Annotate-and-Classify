'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import {
  Leaf,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Microscope,
  BadgeCheck,
  UploadCloud,
  BrainCircuit,
  History,
} from 'lucide-react';

export function LoginView({ onRegisterClick }: { onRegisterClick: () => void }) {
  const { login } = useAuth();
  const { addToast } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      let response: Response;
      try {
        response = await fetch(`/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });
      } catch (networkErr) {
        throw new Error('Cannot reach server. Is the backend running?');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail || 'Incorrect username or password';
        throw new Error(`[${response.status}] ${detail}`);
      }

      const data = await response.json();
      login(data.access_token, {
        username,
        role: username.includes('admin') ? 'admin' : 'annotator',
      });
      addToast(`Welcome back, ${username}!`, 'success');
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
      {/* ── Google Fonts ── */}
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
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
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

      {/* ── Top Nav ── */}
      {/* <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-6"
           style={{ backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <img src="/cbass-logo.png" alt="CBASS Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-base font-bold">DOST-CBASS</span>
        </div>
        <div className="flex items-center gap-6">
          <a className="text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-all duration-300" href="#">
            Documentation
          </a>
        </div>
      </nav> */}

      {/* ── Background Glows ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none"
           style={{ background: 'rgba(74,222,128,0.10)', filter: 'blur(120px)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none"
           style={{ background: 'rgba(255,145,89,0.10)', filter: 'blur(150px)' }} />

      {/* ── Main Two-Column Layout ── */}
      <main className="relative flex min-h-screen w-full flex-col md:flex-row items-center justify-center">

        {/* ── LEFT: Login Form ── */}
        <section className="relative z-10 w-full md:w-1/2 flex items-center justify-center p-6 lg:p-12 pt-28">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="mb-4">
              <div className="flex items-center gap-3 cursor-pointer mb-4">
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                  <img src="/cbass-logo.png" alt="CBASS Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl">DOST-CBASS</span>
              </div>
              
              <h1 className="text-4xl lg:text-4xl font-bold pt-1 font-headline">
                Process Your <span className="gradient-text">Beans.</span>
            </h1>
              <p className="text-lg" style={{ color: '#adaaaa' }}>Enter credentials to login.</p>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">

                {/* Error Banner */}
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

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2 ml-1"
                         style={{ color: '#adaaaa' }}>
                    Username
                  </label>
                  <div className="field-underline-wrap">
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full rounded-xl py-4 px-5 text-white placeholder-zinc-600 outline-none transition-all duration-300 rim-light"
                      style={{ background: '#201f1f', border: 'none' }}
                    />
                    <div className="underline-bar" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="text-xs font-semibold tracking-widest uppercase"
                           style={{ color: '#adaaaa' }}>
                      Password
                    </label>
                  </div>
                  <div className="field-underline-wrap">
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl py-4 px-5 text-white placeholder-zinc-600 outline-none transition-all duration-300 rim-light"
                      style={{ background: '#201f1f', border: 'none' }}
                    />
                    <div className="underline-bar" />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full gradient-button font-bold py-4 rounded-xl uppercase tracking-widest text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ color: '#000000', boxShadow: '0 10px 30px -8px rgba(255,145,89,0.3)' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <div className="text-center">
                <div className='flex justify-center items-center gap-2'>
                <p className='text-sm'>Don't have account yet?</p>
                <button
                   className="text-sm font-semibold hover:underline transition-all"
                   style={{ color: '#ff9159' }}
                   onClick={onRegisterClick}
                >
                  Register here
                </button>

                </div>
              <div className="flex items-center justify-center text-zinc-600 text-[13px] pt-4">
                © 2026 DOST-CBASS. Coffee Bean Annotation and Scanning System.
              </div>
              </div>
            </form>
          </div>
        </section>

        {/* ── RIGHT: Dashboard Preview (desktop only) ── */}
        <section className="hidden md:flex w-1/2 h-screen items-center justify-center p-8 relative overflow-hidden">

          {/* Coffee bean background */}
          <div className="absolute inset-0 z-0 overflow-hidden rounded-l-[3rem]">
            <img
              className="w-full h-full object-cover opacity-30 mix-blend-luminosity grayscale contrast-125"
              alt="macro close up of raw unroasted green coffee beans under laboratory microscope lighting"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0QlZMINWPV7Ml0FXn-oaHXfHn9t1UQuoUkz2KfWzsml3brW4-1i0jiqthkuT-8QzUG4pCdkMLk3p1waGkeSheBSabePmSAYaHjejpso-3on7TUAlLUNS-pJQce_SCb1hJaCTnXmP3k3XM6HMxa8_iEVOlYLNgK3KvenNmEV_opSmoeBZDg1etr4i1Y3FkbsYoFG_lqS7uzz_1uGAyks1OrNJXb7mdzq1nVCnbxaGt1aLg4V3jU_6PErveXZ-FUxTIt5chbcArPDlJ"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-[#0e0e0e]/60 to-transparent" />
          </div>

          {/* Kinetic floaters */}
          <div className="absolute top-[10%] right-[10%] w-48 h-48 rounded-full pointer-events-none"
               style={{ background: 'rgba(255,145,89,0.05)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-[10%] left-[10%] w-32 h-32 rounded-full pointer-events-none"
               style={{ background: 'rgba(234,115,251,0.05)', filter: 'blur(60px)' }} />

          {/* Dashboard Card */}
          <div className="relative z-10 glass-panel w-full max-w-2xl rounded-[2.5rem] p-6 lg:p-8 flex flex-col gap-5 rim-light"
               style={{ height: '80vh', maxHeight: '720px' }}>

            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">
                    Live Analysis Core
                  </span>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold font-headline">Dashboard Preview</h2>
              </div>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <SlidersHorizontal className="w-5 h-5 text-white/40" />
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative p-4 lg:p-5 rounded-2xl overflow-hidden group"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full"
                     style={{ background: 'rgba(255,145,89,0.10)', filter: 'blur(24px)', transition: 'background 0.2s' }} />
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Total Scanned</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold font-headline">12.4k</span>
                  <span className="text-xs text-green-400 font-medium">+14%</span>
                </div>
                <Microscope className="absolute top-4 right-4 w-5 h-5 text-[#ff9159]/30" />
              </div>
              <div className="relative p-4 lg:p-5 rounded-2xl overflow-hidden group"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full"
                     style={{ background: 'rgba(234,115,251,0.10)', filter: 'blur(24px)' }} />
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Quality Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold font-headline">0.912</span>
                  <span className="text-xs text-zinc-400 font-medium">YOLOv8</span>
                </div>
                <BadgeCheck className="absolute top-4 right-4 w-5 h-5 text-[#ea73fb]/30" />
              </div>
            </div>

            {/* Lower Grid */}
            <div className="flex-1 grid grid-cols-5 gap-4 lg:gap-6 min-h-0">

              {/* Defect Distribution */}
              <div className="col-span-3 flex flex-col gap-3 rounded-2xl p-4 lg:p-5"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Defect Distribution
                </p>
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-3">
                    {[
                      { label: 'Full Black', pct: 38, color: '#ef4444' },
                      { label: 'Full Sour', pct: 31, color: '#f97316' },
                      { label: 'Fungus Damage', pct: 27, color: '#eab308' },
                      { label: 'Partial Black', pct: 18, color: '#60a5fa' },
                      { label: 'Immature', pct: 14, color: '#4ade80' },
                    ].map(({ label, pct, color }) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                          <span>{label}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="col-span-2 flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Activity Feed
                </p>
                <div className="space-y-2">
                  {[
                    {
                      icon: <UploadCloud className="w-3.5 h-3.5 text-green-400" />,
                      bg: 'rgba(74,222,128,0.10)',
                      title: 'Image Uploaded',
                      sub: '10:30 • Harvest_001.jpg',
                    },
                    {
                      icon: <BrainCircuit className="w-3.5 h-3.5 text-[#ff9159]/60" />,
                      bg: 'rgba(255,145,89,0.10)',
                      title: 'Model Review',
                      sub: '09:45 • YOLOv8-medium',
                    },
                    {
                      icon: <History className="w-3.5 h-3.5 text-zinc-500" />,
                      bg: 'rgba(120,120,120,0.10)',
                      title: 'Batch Archiving',
                      sub: 'Yesterday • 542 items',
                    },
                  ].map(({ icon, bg, title, sub }) => (
                    <div
                      key={title}
                      className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                           style={{ background: bg }}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold">{title}</p>
                        <p className="text-[8px] text-zinc-500">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      {/* <footer className="fixed bottom-0 w-full z-50 flex flex-col md:flex-row justify-between items-center px-12 py-6 gap-4 md:gap-0"
              style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>

        <div className='fixed bottom-0 w-full z-50 flex flex-col md:flex-row justify-between items-center px-12 py-6 gap-4 md:gap-0'> 
          <div className="text-zinc-600 text-center md:text-left">
            © 2024 DOST-CBASS. Agricultural Precision Engineering.
          </div>
        </div>
        <div className="flex items-center gap-8 text-zinc-600">
          {['Lab Protocols', 'Privacy', 'Support'].map((link) => (
            <a key={link} className="hover:text-white transition-colors opacity-80 hover:opacity-100" href="#">
              {link}
            </a>
          ))}
        </div>
      </footer> */}
      
    </div>
  );
}

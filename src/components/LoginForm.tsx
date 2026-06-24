/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LogIn, 
  GraduationCap, 
  ShieldAlert, 
  Award, 
  UserCheck, 
  BookOpen, 
  ArrowLeft, 
  Mail, 
  Key, 
  CheckCircle, 
  Copy,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname.includes('/reset-password') || params.has('token') || params.has('email')) {
      return 'reset';
    }
    return 'login';
  });

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<{ success: boolean; message: string; provider: string; resetLink?: string } | null>(null);

  // Reset password states
  const [resetEmail, setResetEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const demoAccounts = [
    { label: 'Admin Access', details: 'Full School Control', email: 'admin@school.com', pw: 'admin', role: 'admin', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { label: 'Principal Seat', details: 'Remarks & Approvals', email: 'principal@school.com', pw: 'principal', role: 'principal', icon: Award, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Teacher Panel (Math)', details: 'Grade Entry (JSS1)', email: 'teacher1@school.com', pw: 'teacher', role: 'teacher', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Student Portal (SS2)', details: 'Report Card David', email: 'student2@school.com', pw: 'student', role: 'student', icon: GraduationCap, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both administrative email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed. Incorrect login guidelines.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMessage('Please specify your registered email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setForgotResult(null);

    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await r.json();
      if (r.ok) {
        setForgotResult({
          success: true,
          message: data.message,
          provider: data.provider,
          resetLink: data.resetLink
        });
      } else {
        setErrorMessage(data.message || 'Verification email could not be issued.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to school server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !newPassword) {
      setErrorMessage('Email and new password are required fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Password confirmation inputs do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          token: resetToken || undefined,
          password: newPassword
        })
      });
      const data = await r.json();
      if (r.ok) {
        setResetSuccess(true);
      } else {
        setErrorMessage(data.message || 'Incorrect recovery parameters.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to school server.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (emailAdd: string, passWordStr: string) => {
    setEmail(emailAdd);
    setPassword(passWordStr);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 rounded-3xl bg-white p-8 shadow-xl shadow-slate-100/50 border border-slate-200/80">
        
        {/* Branding banner */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md border border-slate-950">
            <GraduationCap size={28} />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold font-display uppercase tracking-tight text-slate-900 leading-none">
            Delight Academy
          </h2>
          <p className="mt-2 text-xs text-slate-500 font-mono tracking-wide uppercase">
            School Management ERP Gate
          </p>
        </div>

        {/* ----------------- LOGIN MODE ----------------- */}
        {mode === 'login' && (
          <>
            <form className="space-y-5" onSubmit={handleLogin}>
              {errorMessage && (
                <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 font-semibold border border-red-200 font-mono flex items-center gap-1.5 line-clamp-2">
                  <AlertCircle size={15} className="shrink-0" /> {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2 font-mono">
                    Authorized Credentials Email
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-850 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-all font-sans bg-slate-50/50"
                    placeholder="portal@school.edu.ng"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage('');
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold font-mono underline hover:no-underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-850 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-all font-sans bg-slate-50/50"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:bg-slate-400 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <LogIn size={15} />
                )}
                Sign In to Dashboard
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
                <span className="bg-white px-3 text-slate-500 font-bold">
                  Quick Sandbox Logins
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {demoAccounts.map((ac) => {
                const Icon = ac.icon;
                let borderClass = 'border-slate-200 hover:border-slate-400 text-slate-700 bg-slate-50 hover:bg-slate-100';
                if (email === ac.email) {
                  borderClass = 'border-slate-900 text-slate-900 bg-slate-110 font-bold';
                }
                return (
                  <button
                    key={ac.email}
                    type="button"
                    onClick={() => loginAsDemo(ac.email, ac.pw)}
                    className={`flex flex-col items-start p-3 border rounded-xl text-left transition-all duration-200 ${borderClass}`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs font-display">
                      <Icon size={13} className="shrink-0 text-slate-600" />
                      {ac.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 font-mono">
                      {ac.details}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ----------------- FORGOT PASSWORD MODE ----------------- */}
        {mode === 'forgot' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setForgotResult(null);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition"
              >
                <ArrowLeft size={16} />
              </button>
              <h3 className="font-extrabold text-slate-900 font-display text-base uppercase tracking-tight">Recover Portal Access</h3>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 font-semibold border border-red-200 font-mono flex items-center gap-2 animate-fadeIn">
                <AlertCircle size={15} className="shrink-0" /> {errorMessage}
              </div>
            )}

            {!forgotResult ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Enter your school-registered email. The portal will dispatch a signature verification link to initiate password restoration.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2 font-mono">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="teacher1@school.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-all font-sans bg-slate-50/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition"
                >
                  {loading ? 'Dispatched Access Link...' : 'Issue Recovery Link'}
                </button>
              </form>
            ) : (
              <div className="space-y-5 animate-scaleUp">
                <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-3 text-emerald-800">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-xs uppercase font-mono">Verification Sent!</p>
                    <p className="text-[11px] leading-relaxed text-emerald-700">{forgotResult.message}</p>
                  </div>
                </div>

                {/* Simulated Recovery block */}
                {forgotResult.provider === 'simulated' && forgotResult.resetLink && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Local Testing Link Block</p>
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono break-all leading-normal flex items-start gap-2.5 relative group border border-slate-950">
                      <div className="flex-1 select-all">{forgotResult.resetLink}</div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(forgotResult.resetLink!);
                          alert('Reset link copied to clipboard!');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-md shrink-0"
                        title="Copy Link"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <a 
                        href={forgotResult.resetLink}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold font-mono underline uppercase tracking-wider"
                      >
                        Click here to proceed with test reset &rarr;
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setForgotResult(null);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------- RESET PASSWORD MODE ----------------- */}
        {mode === 'reset' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-extrabold text-slate-905 font-display text-base uppercase tracking-tight text-center">Reset Credentials Password</h3>
            
            {errorMessage && (
              <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 font-semibold border border-red-200 font-mono flex items-center gap-2 animate-fadeIn">
                <AlertCircle size={15} className="shrink-0" /> {errorMessage}
              </div>
            )}

            {!resetSuccess ? (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">
                      Restoring Account Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="teacher1@school.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-905 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                    />
                  </div>

                  {resetToken && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">
                        Verification Secure Token Key
                      </label>
                      <input
                        type="text"
                        required
                        disabled
                        value={resetToken}
                        className="w-full rounded-xl border border-slate-250 px-3.5 py-2.5 text-xs text-slate-400 bg-slate-50 cursor-not-allowed font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-605 uppercase tracking-widest block font-mono">
                      New Secure Password
                    </label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-800 focus:outline-none transition-all bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-605 uppercase tracking-widest block font-mono">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-800 focus:outline-none transition-all bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition"
                >
                  {loading ? 'Changing Credentials Password...' : 'Change Password'}
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-center animate-scaleUp">
                <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-3 text-emerald-800 text-left">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-xs uppercase font-mono">Recovery Succeeded!</p>
                    <p className="text-[11px] leading-relaxed text-emerald-700">Your school access credentials password has been modified successfully.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Remove url tokens cleanly
                    window.history.replaceState({}, '', '/');
                    setMode('login');
                    setResetEmail('');
                    setResetToken('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetSuccess(false);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-md"
                >
                  Sign In with New Password
                </button>
              </div>
            )}
          </div>
        )}

        <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-150 font-mono uppercase tracking-wider">
          Compliance code: MoE Nigeria ERP-1.0
        </div>
      </div>
    </div>
  );
}

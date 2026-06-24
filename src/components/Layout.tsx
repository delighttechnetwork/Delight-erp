/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Award, 
  BookOpen, 
  GraduationCap, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Calendar, 
  UserCircle2, 
  Sliders, 
  Users, 
  FolderLock, 
  Layers, 
  ClipboardCheck, 
  Trophy, 
  Volume2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeSection: string;
  setActiveSection: (sec: string) => void;
  children: React.ReactNode;
}

export default function Layout({ user, onLogout, activeSection, setActiveSection, children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role Badge Config
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-100' };
      case 'principal':
        return { label: 'Principal Seat', icon: Award, color: 'text-amber-600 bg-amber-50 border-amber-100' };
      case 'teacher':
        return { label: 'Academic Tutor', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
      default:
        return { label: 'Student Council', icon: GraduationCap, color: 'text-blue-600 bg-blue-50 border-blue-100' };
    }
  };

  const rc = getRoleConfig(user.role);
  const RoleIcon = rc.icon;

  // Sidebar Menu Configurations
  const adminMenu = [
    { id: 'dashboard', label: 'Administration metrics', icon: Sliders },
    { id: 'students', label: 'Student Registers', icon: Users },
    { id: 'teachers', label: 'Academic Staff', icon: BookOpen },
    { id: 'subjects', label: 'Classes & Subjects', icon: Layers },
    { id: 'results', label: 'Terminal Directory', icon: FolderLock },
    { id: 'attendance', label: 'Scholar Attendance', icon: ClipboardCheck },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'audit', label: 'System Audit Logs', icon: ShieldAlert },
    { id: 'announcements', label: 'Portal Broadcaster', icon: Volume2 },
    { id: 'settings', label: 'System Configurations', icon: Sliders },
  ];

  const teacherMenu = [
    { id: 'dashboard', label: 'Teacher Stat Panel', icon: Sliders },
    { id: 'scores', label: 'Enter Terminal Scores', icon: ClipboardCheck },
    { id: 'attendance', label: 'Mark Attendance', icon: ClipboardCheck },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'announcements', label: 'School Announcements', icon: Volume2 },
  ];

  const principalMenu = [
    { id: 'dashboard', label: 'Approval Seat', icon: ClipboardCheck },
    { id: 'evaluate', label: 'Evaluations Board', icon: Trophy },
    { id: 'attendance-reports', label: 'Attendance Audit', icon: ClipboardCheck },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics Reports', icon: Layers },
    { id: 'announcements', label: 'Announcements Board', icon: Volume2 },
  ];

  const studentMenu = [
    { id: 'dashboard', label: 'My Progress Board', icon: Sliders },
    { id: 'report-card', label: 'My Official Record', icon: Trophy },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'announcements', label: 'Campus Broadcaster', icon: Volume2 },
  ];

  const getMenuForRole = (role: string) => {
    switch (role) {
      case 'admin': return adminMenu;
      case 'teacher': return teacherMenu;
      case 'principal': return principalMenu;
      default: return studentMenu;
    }
  };

  const activeMenu = getMenuForRole(user.role);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Top Navbar Header */}
      <header className="no-print bg-white border-b border-slate-200/80 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold font-display shadow-sm border border-slate-950">
              DT
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-wider font-display hidden sm:inline-block uppercase">
              DELIGHT ACADEMY
            </span>
          </div>
        </div>

        {/* Global actions and Identity */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4">
            <Calendar size={15} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600 font-mono tracking-tight uppercase">
              Academic Term 3rd
            </span>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden md:block">
              <div className="font-bold text-xs text-slate-900 leading-none">{user.fullname}</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider truncate max-w-[150px] mt-1">{user.email}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold hover:ring-2 hover:ring-slate-200 transition duration-200 border border-slate-200/60">
              <UserCircle2 size={20} className="text-slate-700" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <div className="flex flex-1 relative">
        
        {/* Left Side Navigation (desktop) */}
        <aside className="no-print hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 shrink-0 sticky top-16 h-[calc(100vh-64px)] justify-between p-4 bg-linear-to-b from-white to-slate-50">
          <div className="space-y-6">
            
            {/* Context Badge */}
            <div className={`p-4 rounded-xl border flex items-center gap-2.5 ${rc.color}`}>
              <RoleIcon size={18} className="shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest leading-none text-slate-400 font-mono">Security Gate</div>
                <div className="font-extrabold text-xs font-display tracking-wide mt-1.5">{rc.label}</div>
              </div>
            </div>

            {/* Navigation links list */}
            <nav className="space-y-1">
              {activeMenu.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-150 ${
                      isActive 
                        ? 'bg-slate-900 text-white shadow-sm border border-slate-950 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Logout Trigger button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut size={15} className="text-slate-400 group-hover:text-rose-600 shrink-0" />
            Sign Out Securely
          </button>
        </aside>

        {/* Mobile Left Drawer navigation overlay */}
        {mobileMenuOpen && (
          <div className="no-print fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="w-68 bg-white h-full relative flex flex-col justify-between p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-extrabold font-display text-slate-900 text-xs uppercase tracking-wider">Navigation Sheet</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>

                <div className={`p-4 rounded-xl border flex items-center gap-2.5 ${rc.color}`}>
                  <RoleIcon size={16} />
                  <div>
                    <div className="font-black text-xs font-display tracking-wide">{rc.label}</div>
                  </div>
                </div>

                <nav className="space-y-1">
                  {activeMenu.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-slate-900 text-white font-bold shadow-sm border border-slate-950' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
              >
                <LogOut size={15} />
                Sign Out Securely
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Display Panel with motion transitions */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:py-8 select-text">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="max-w-7xl mx-auto space-y-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

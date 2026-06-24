/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import PrincipalDashboard from './components/PrincipalDashboard';
import StudentDashboard from './components/StudentDashboard';
import { User, SystemSettings, SchoolClass, Subject } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize and check current session on mount
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        // Fetch current user if session exists
        const meRes = await fetch('/api/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        // Fetch settings, classes, subjects
        const [settData, classData, subjData] = await Promise.all([
          fetch('/api/settings').then(r => r.json()),
          fetch('/api/classes').then(r => r.json()),
          fetch('/api/subjects').then(r => r.json())
        ]);

        setSettings(settData);
        setClasses(classData);
        setSubjects(subjData);
      } catch (err) {
        console.error('App init failure', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveSection('dashboard');
    
    // Refresh common static info
    try {
      const [classData, subjData] = await Promise.all([
        fetch('/api/classes').then(r => r.json()),
        fetch('/api/subjects').then(r => r.json())
      ]);
      setClasses(classData);
      setSubjects(subjData);
    } catch (err) {
      console.error('Data pull failed upon login', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    }
    setUser(null);
    setActiveSection('dashboard');
  };

  // Loading state placeholder screen
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-900 tracking-tight font-display">DELIGHT ERP</h3>
            <p className="text-[11px] text-gray-400 font-mono">Verifying authorization pipelines...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Authenticated - Render login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-blue-100">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Authenticated - Render App Shell layout matching specific roles
  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeSection={activeSection} 
      setActiveSection={setActiveSection}
    >
      {user.role === 'admin' && (
        <AdminDashboard 
          activeTab={activeSection}
          settings={settings}
          setSettings={setSettings}
          classes={classes}
          setClasses={setClasses}
          subjects={subjects}
          setSubjects={setSubjects}
        />
      )}

      {user.role === 'teacher' && (
        <TeacherDashboard 
          teacher={user as any}
          activeTab={activeSection}
          settings={settings}
          classes={classes}
          subjects={subjects}
        />
      )}

      {user.role === 'principal' && (
        <PrincipalDashboard 
          activeTab={activeSection}
          settings={settings}
          setSettings={setSettings}
          classes={classes}
          subjects={subjects}
        />
      )}

      {user.role === 'student' && (
        <StudentDashboard 
          studentId={user.id}
          activeTab={activeSection}
          settings={settings}
        />
      )}
    </Layout>
  );
}

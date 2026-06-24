/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Sliders, 
  FileText, 
  UserCheck, 
  Calendar, 
  TrendingUp, 
  RefreshCw,
  Lock,
  Tag
} from 'lucide-react';
import { AuditLog } from '../types';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to sync security logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter & Search Logic
  const filteredLogs = logs.filter(l => {
    const matchesCategory = filterCategory === 'ALL' || l.category.toUpperCase() === filterCategory.toUpperCase();
    const matchesSearch = l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (l.details && l.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'grades':
        return { label: 'Grades', color: 'bg-emerald-50 text-emerald-800 border-emerald-150 border' };
      case 'results':
        return { label: 'Results', color: 'bg-indigo-50 text-indigo-800 border-indigo-150 border' };
      case 'users':
        return { label: 'User Admin', color: 'bg-rose-50 text-rose-800 border-rose-150 border' };
      case 'calendar':
        return { label: 'Calendar', color: 'bg-blue-50 text-blue-800 border-blue-150 border' };
      case 'attendance':
        return { label: 'Attendance', color: 'bg-amber-50 text-amber-800 border-amber-150 border' };
      case 'auth':
        return { label: 'Security Auth', color: 'bg-violet-50 text-violet-800 border-violet-150 border' };
      default:
        return { label: category, color: 'bg-slate-100 text-slate-700 border-slate-200 border' };
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-rose-600 text-white';
      case 'principal': return 'bg-amber-500 text-white';
      case 'teacher': return 'bg-emerald-600 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  // Metrics calculations
  const totalCount = logs.length;
  const gradeLogs = logs.filter(l => l.category.toLowerCase() === 'grades').length;
  const authLogs = logs.filter(l => l.category.toLowerCase() === 'auth').length;
  const resultLogs = logs.filter(l => l.category.toLowerCase() === 'results').length;

  return (
    <div className="space-y-6">
      
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-xl font-extrabold font-display text-slate-900 uppercase tracking-tight">Portal Activity & Audit Reports</h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wide">
            Immutable, real-time security log tracking modifications to terminal registers, calendar notices, user roles, and access credentials.
          </p>
        </div>
        
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Audit Entries
        </button>
      </div>

      {/* Audit Logs Quick Dashboard Stats Widget */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Gross Total Logs</div>
          <div className="text-2xl font-black font-display text-slate-900 mt-1">{totalCount}</div>
          <p className="text-[9px] text-slate-400 mt-2 font-mono">ALL CAPTURED EVENTS</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Grade Mutations</div>
          <div className="text-2xl font-black font-display text-slate-900 mt-1">{gradeLogs}</div>
          <p className="text-[9px] text-slate-400 mt-2 font-mono">TEACHING CORE COMPLIANCE</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">Results Approvals</div>
          <div className="text-2xl font-black font-display text-slate-900 mt-1">{resultLogs}</div>
          <p className="text-[9px] text-slate-400 mt-2 font-mono">PRINCIPAL VERIFIED BATCHES</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider font-mono">Security Actions</div>
          <div className="text-2xl font-black font-display text-slate-900 mt-1">{authLogs}</div>
          <p className="text-[9px] text-slate-400 mt-2 font-mono">AUTH ACCESS ATTEMPTS</p>
        </div>
      </div>

      {/* Controls: Search and Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'GRADES', 'RESULTS', 'USERS', 'CALENDAR', 'ATTENDANCE', 'AUTH'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition tracking-wider uppercase ${
                filterCategory === cat 
                  ? 'bg-slate-900 border-slate-950 text-white font-bold' 
                  : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {cat === 'USERS' ? 'User Admin' : cat === 'AUTH' ? 'Auth Security' : cat}
            </button>
          ))}
        </div>

        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search action keyword, actor name, email details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:bg-white text-xs px-3.5 py-2 rounded-xl transition outline-none"
          />
        </div>
      </div>

      {/* Main Audit entries table ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Sensitive Action Detail</th>
                <th className="py-3 px-5">Authorized Actor</th>
                <th className="py-3 px-5">Role Badge</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center font-mono text-xs text-slate-400">Pulling immutable catalog entries from core engine...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-mono">No matching audit events registered in ledger.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const catBadge = getCategoryTheme(log.category);
                  return (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition group text-xs">
                      <td className="py-4 px-5 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase font-mono tracking-wider ${catBadge.color}`}>
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 max-w-sm">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800 leading-tight block">{log.action}</p>
                          <p className="text-slate-500 text-[11px] leading-relaxed break-keep">{log.details}</p>
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{log.actorName}</p>
                          <p className="text-slate-400 text-[10px] font-mono">{log.actorEmail}</p>
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${getRoleBadgeColor(log.actorRole)}`}>
                          {log.actorRole}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

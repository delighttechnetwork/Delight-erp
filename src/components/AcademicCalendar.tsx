/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  Info, 
  Sparkles, 
  CalendarDays, 
  CheckCircle, 
  Tag, 
  Sliders, 
  X,
  AlertCircle
} from 'lucide-react';
import { AcademicCalendarEvent } from '../types';

interface AcademicCalendarProps {
  role: 'admin' | 'teacher' | 'principal' | 'student';
}

export default function AcademicCalendar({ role }: AcademicCalendarProps) {
  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states (Admins only)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    type: 'holiday' as 'term' | 'exam' | 'holiday' | 'event',
    startDate: '',
    endDate: '',
    description: '',
    published: true
  });
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar${role !== 'admin' ? '?publishedOnly=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        // Sort by starting date ascending
        data.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to carry calendar streams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [role]);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(''), 3500);
    } else {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(''), 3500);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      type: 'holiday',
      startDate: '',
      endDate: '',
      description: '',
      published: true
    });
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleOpenEdit = (evt: AcademicCalendarEvent) => {
    setForm({
      title: evt.title,
      type: evt.type,
      startDate: evt.startDate,
      endDate: evt.endDate,
      description: evt.description || '',
      published: evt.published ?? true
    });
    setEditingId(evt.id);
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate || !form.endDate) {
      triggerAlert('error', 'Please complete all required fields.');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      triggerAlert('error', 'Starting date cannot be subsequent to ending date.');
      return;
    }

    try {
      const url = editingId ? `/api/calendar/${editingId}` : '/api/calendar';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        triggerAlert('success', editingId ? 'Calendar event updated successfully.' : 'Calendar event added to register.');
        setShowFormModal(false);
        resetForm();
        fetchEvents();
      } else {
        triggerAlert('error', 'Failed saving calendar details.');
      }
    } catch (err) {
      triggerAlert('error', 'Pipeline transmission error.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to retract and delete this milestone schedule?')) return;
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerAlert('success', 'Calendar notice retracted.');
        fetchEvents();
      } else {
        triggerAlert('error', 'Failed retracting schedule.');
      }
    } catch (err) {
      triggerAlert('error', 'Deletion error.');
    }
  };

  // Filters
  const filteredEvents = events.filter(e => {
    const matchesFilter = filterType === 'ALL' || e.type === filterType.toLowerCase();
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'term':
        return { label: 'Syllabus Term', color: 'bg-emerald-50 text-emerald-700 border-emerald-150 border' };
      case 'exam':
        return { label: 'Exam Period', color: 'bg-indigo-50 text-indigo-700 border-indigo-150 border' };
      case 'holiday':
        return { label: 'Holiday / Recess', color: 'bg-amber-50 text-amber-700 border-amber-150 border' };
      default:
        return { label: 'Co-Curricular', color: 'bg-slate-100 text-slate-700 border-slate-200 border' };
    }
  };

  return (
    <div id="calendar-module" className="space-y-6">
      
      {/* Dynamic Action Alerts */}
      <AnimatePresence>
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl font-medium text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle size={15} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-250 text-red-800 rounded-xl font-medium text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-xl font-extrabold font-display text-slate-900 uppercase tracking-tight">Academic School Calendar</h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wide">
            Track official term timelines, milestones, examination slots, and gazetted national recesses.
          </p>
        </div>
        
        {role === 'admin' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
          >
            <Plus size={15} /> Create School Notice
          </button>
        )}
      </div>

      {/* Directory controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/85 shadow-sm shadow-slate-100/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'TERM', 'EXAM', 'HOLIDAY', 'EVENT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition ${
                filterType === type 
                  ? 'bg-slate-900 border-slate-950 text-white font-bold' 
                  : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search school event titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:bg-white text-xs px-3.5 py-2 rounded-xl transition outline-none"
          />
        </div>
      </div>

      {/* Event boards - Grid */}
      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-slate-400">Syncing official educational parameters...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-slate-50 border border-slate-150 rounded-3xl py-12 text-center text-slate-400 text-xs">
          No matches found for the selected category filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((evt) => {
            const badge = getEventBadge(evt.type);
            const isFuture = new Date(evt.startDate) > new Date();
            const isCurrent = new Date(evt.startDate) <= new Date() && new Date(evt.endDate) >= new Date();
            
            return (
              <div 
                key={evt.id} 
                className={`bg-white rounded-3xl border p-5 flex flex-col justify-between hover:shadow-md transition duration-200 relative ${
                  isCurrent ? 'border-indigo-300 ring-2 ring-indigo-50/50' : 'border-slate-200/85'
                }`}
              >
                {/* Notice Status indicator pill */}
                {isCurrent && (
                  <span className="absolute top-4 right-4 bg-indigo-600 text-[9px] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                    ACTIVE NOW
                  </span>
                )}
                {!isCurrent && isFuture && (
                  <span className="absolute top-4 right-4 bg-slate-100 text-[9px] text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                    UPCOMING
                  </span>
                )}

                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono tracking-wider ${badge.color}`}>
                      {badge.label}
                    </span>
                    {role === 'admin' && !(evt.published ?? true) && (
                      <span className="text-[10px] bg-red-50 text-red-600 border border-red-150 px-2 py-0.5 rounded-md uppercase font-bold font-mono">
                        DRAFT/PRIVATE
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-extrabold font-display text-slate-900 text-sm leading-snug">{evt.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-normal">{evt.description || 'No detailed briefing published for this milestone.'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 mt-5 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                    <CalendarDays size={14} className="text-slate-400" />
                    <span>
                      {new Date(evt.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(evt.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {role === 'admin' && (
                    <div className="flex items-center gap-1.5 object-right">
                      <button
                        onClick={() => handleOpenEdit(evt)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-200"
                        title="Edit schedule details"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(evt.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-100"
                        title="Retract schedule"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal Window (Admins Only) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-205/80 shadow-2xl relative space-y-5 animate-scaleUp">
            <button 
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar size={18} className="text-indigo-600" />
              <h3 className="font-extrabold font-display text-sm tracking-tight text-slate-900 uppercase">
                {editingId ? 'Edit Calendar Schedule File' : 'Establish New School Milestone'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">Milestone Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 3rd Term Midterm Break"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-xs px-3.5 py-2 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">Milestone Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none"
                  >
                    <option value="holiday">Holiday / Recess</option>
                    <option value="term">Syllabus Term</option>
                    <option value="exam">Exam Period</option>
                    <option value="event">Co-Curricular Event</option>
                  </select>
                </div>

                <div className="space-y-2 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">Publish Notice</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2 rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono font-mono">Scope Narrative / description</label>
                <textarea
                  rows={3}
                  placeholder="Insert briefing context or guidelines..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-xs px-3.5 py-2 rounded-xl outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

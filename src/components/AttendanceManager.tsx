/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  UserCheck, 
  Calendar, 
  Users, 
  Check, 
  AlertCircle, 
  CheckCircle,
  FileCheck,
  TrendingUp,
  Sliders,
  AlertOctagon,
  MessageSquare
} from 'lucide-react';
import { StudentProfile, AttendanceRecord } from '../types';

interface AttendanceProps {
  role: 'admin' | 'teacher' | 'principal';
  teacherDetails?: { fullname: string; assigned_class?: string };
}

export default function AttendanceManager({ role, teacherDetails }: AttendanceProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSheet, setAttendanceSheet] = useState<{ [studentId: string]: { status: 'Present' | 'Absent' | 'Late'; comments: string } }>({});
  
  // Principal report states
  const [reports, setReports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch class lists & summary
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const classRes = await fetch('/api/classes');
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(classData);
          
          if (role === 'teacher' || role === 'admin') {
            // Default to teacher's assigned class or first available
            const defClass = teacherDetails?.assigned_class || (classData.length > 0 ? classData[0].id : '');
            setSelectedClass(defClass);
          }
        }

        if (role === 'principal') {
          fetchPrincipalSummary();
        }
      } catch (err) {
        console.error('Failed to sync registers', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [role]);

  // 2. Fetch students and existing attendance for selected class & date (Teachers/Admins)
  useEffect(() => {
    if ((role !== 'teacher' && role !== 'admin') || !selectedClass) return;

    const syncClassRegister = async () => {
      setLoading(true);
      try {
        // Fetch current active students in selected class
        const studentsRes = await fetch(`/api/students`);
        const existingRes = await fetch(`/api/attendance?classId=${selectedClass}&date=${selectedDate}`);
        
        if (studentsRes.ok && existingRes.ok) {
          const allStudents: StudentProfile[] = await studentsRes.json();
          const activeClassStudents = allStudents.filter(s => s.class_id === selectedClass);
          const existingAtt: AttendanceRecord[] = await existingRes.json();
          
          setStudents(activeClassStudents);
          
          // Map existing sheet records or build default
          const initialSheet: typeof attendanceSheet = {};
          activeClassStudents.forEach(st => {
            const registered = existingAtt.find(e => e.studentId === st.id);
            initialSheet[st.id] = {
              status: registered ? (registered.status as any) : 'Present',
              comments: registered ? (registered.comments || '') : ''
            };
          });
          setAttendanceSheet(initialSheet);
        }
      } catch (err) {
        console.error('Failed syncing class roster', err);
      } finally {
        setLoading(false);
      }
    };

    syncClassRegister();
  }, [selectedClass, selectedDate, role]);

  const fetchPrincipalSummary = async () => {
    setLoading(true);
    try {
      const summaryRes = await fetch('/api/attendance/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setReports(summaryData);
      }
    } catch (err) {
      console.error('Failed calling attendance report aggregates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceSheet(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleCommentChange = (studentId: string, comments: string) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comments
      }
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const records = Object.keys(attendanceSheet).map(stId => {
        const student = students.find(s => s.id === stId);
        return {
          studentId: stId,
          studentName: student ? student.fullname : 'Enrolled Scholar',
          status: attendanceSheet[stId].status,
          comments: attendanceSheet[stId].comments
        };
      });

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          records,
          teacherName: teacherDetails?.fullname || 'School Admin'
        })
      });

      if (res.ok) {
        setSuccessMsg(`Daily register for ${selectedClass} saved successfully.`);
        setTimeout(() => setSuccessMsg(''), 4500);
      } else {
        setErrorMsg('Academic core rejected attendance values.');
      }
    } catch (err) {
      setErrorMsg('Transmission error.');
    } finally {
      setSaving(false);
    }
  };

  // Render components
  return (
    <div className="space-y-6">
      
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl font-medium text-xs flex items-center gap-2 animate-fadeIn font-sans">
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-250 text-red-800 rounded-xl font-medium text-xs flex items-center gap-2 animate-fadeIn font-sans">
          <AlertCircle size={15} /> {errorMsg}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-xl font-extrabold font-display text-slate-900 uppercase tracking-tight">Active Scholar Attendance</h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wide">
            {role === 'teacher' || role === 'admin'
              ? `Manage daily class schedules and check registers for assigned student bodies.`
              : `Review school-wide attendance logs and compliance ratios by classroom groups.`}
          </p>
        </div>
        
        {role === 'principal' && (
          <button
            onClick={fetchPrincipalSummary}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-705 bg-white rounded-xl text-xs font-bold transition shrink-0 font-mono"
          >
            <TrendingUp size={14} /> Recompute Aggregates
          </button>
        )}
      </div>

      {/* -------------------- TEACHER/ADMIN VIEW (Daily input) -------------------- */}
      {(role === 'teacher' || role === 'admin') && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Assigned Classroom</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-150 text-xs px-3.5 py-2 rounded-xl outline-none font-semibold text-slate-700 font-sans"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.label ? `(${c.label})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Roll-call Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-150 text-xs px-3.5 py-2 rounded-xl outline-none text-slate-700 font-mono"
              />
            </div>

            {role === 'teacher' && teacherDetails?.assigned_class && selectedClass !== teacherDetails.assigned_class && (
              <div className="bg-slate-50 p-2 border border-slate-200 rounded-xl flex items-center gap-1.5 text-[10px] text-slate-400 font-medium font-sans">
                <AlertOctagon size={13} className="text-slate-400" />
                <span>Alternate workspace. Your official assigned class is {teacherDetails.assigned_class}.</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-slate-400">Fetching registers and student indexes...</div>
          ) : students.length === 0 ? (
            <div className="bg-slate-50 border border-slate-150 rounded-3xl py-12 text-center text-slate-400 text-xs font-mono">
              No students are currently catalogued under the {selectedClass} group.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <th className="py-3 px-5">Student / Adm No</th>
                      <th className="py-3 px-5 text-center">Status Selectors</th>
                      <th className="py-3 px-5">Observation Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => {
                      const sheetState = attendanceSheet[st.id] || { status: 'Present', comments: '' };
                      return (
                        <tr key={st.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition duration-150 text-xs">
                          <td className="py-4 px-5">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900">{st.fullname}</p>
                              <p className="text-slate-400 text-[10px] font-mono uppercase font-medium">{st.admission_number} ({st.gender})</p>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
                              {(['Present', 'Absent', 'Late'] as const).map((status) => {
                                const active = sheetState.status === status;
                                const btnColor = status === 'Present' 
                                  ? 'bg-emerald-600 border-emerald-700 font-semibold text-white' 
                                  : status === 'Absent' 
                                  ? 'bg-red-650 border-red-700 font-semibold text-white' 
                                  : 'bg-amber-500 border-amber-600 font-semibold text-white';
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleStatusChange(st.id, status)}
                                    className={`px-3.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition ${
                                      active 
                                        ? `${btnColor} border shadow-xs` 
                                        : 'text-slate-505 hover:bg-slate-200 hover:text-slate-800'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2 max-w-xs">
                              <MessageSquare size={13} className="text-slate-400 shrink-0" />
                              <input
                                type="text"
                                placeholder="e.g., Doctor appointment..."
                                value={sheetState.comments}
                                onChange={(e) => handleCommentChange(st.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200/80 focus:border-slate-350 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none transition"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Commit changes toolbar */}
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Roll call roster has {students.length} registers
                </span>
                
                <button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <FileCheck size={14} /> {saving ? 'Cataloguing...' : 'Save Roll Call'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- PRINCIPAL VIEW (Aggregates & Reports) -------------------- */}
      {role === 'principal' && (
        <div className="space-y-6 animate-fadeIn">
          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-slate-400">Recomputing school logs and registers...</div>
          ) : reports.length === 0 ? (
            <div className="bg-slate-50 border border-slate-150 rounded-3xl py-12 text-center text-slate-400 text-xs font-mono">
              No daily registers have been saved yet by Teachers. Roster analytics are empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Report List of Attendance Ratios */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
                <h3 className="font-extrabold font-display text-slate-900 text-sm tracking-tight uppercase">Monthly Class Breakdown</h3>
                
                <div className="space-y-3.5">
                  {reports.map((r) => {
                    const health = r.presentRate;
                    const progressColor = health >= 90 
                      ? 'bg-emerald-600' 
                      : health >= 75 
                      ? 'bg-amber-500' 
                      : 'bg-rose-600';
                    return (
                      <div key={r.classId} className="p-4 rounded-2xl border border-slate-100 space-y-3 bg-slate-50/45">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-xs font-mono uppercase">{r.classId} GROUP</span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                            health >= 90 ? 'bg-emerald-50 text-emerald-800' : health >= 75 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
                          }`}>
                            {r.presentRate}% Present
                          </span>
                        </div>

                        {/* Visual bar container */}
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                            style={{ width: `${health}%` }}
                          />
                        </div>

                        {/* Sub metrics */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                          <span>Total Logs: {r.totalCount}</span>
                          <span>Present: {r.presentCount}</span>
                          <span>Absent: {r.absentCount}</span>
                          <span>Late Check-in: {r.lateCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roster Advice & Warnings container */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="font-extrabold font-display text-slate-900 text-xs tracking-wider uppercase">Administrative Roster Auditing</h3>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-[11px] text-slate-500 leading-relaxed font-normal">
                  Our system evaluates present states based on combined [Present] and [Late] marks. A classroom below <b>85%</b> score warning warrants tutor feedback.
                </div>

                <div className="space-y-3">
                  {reports.filter(r => r.presentRate < 85).map(r => (
                    <div key={r.classId} className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs uppercase font-mono">
                        <AlertCircle size={14} className="text-rose-650" /> Warning: {r.classId}
                      </div>
                      <p className="text-[10px] text-rose-700/80 leading-relaxed">
                        This group exhibits a low check-in compliance coefficient ({r.presentRate}%). Please recommend the form teacher review rolls carefully.
                      </p>
                    </div>
                  ))}

                  {reports.filter(r => r.presentRate >= 85).length === reports.length && (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-emerald-800">
                      <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-xs uppercase font-mono leading-none">All classes compliant</p>
                        <p className="text-[10px] text-emerald-700/80 mt-1 leading-snug">Present attendance indices across classrooms are in optimal metrics (85%+).</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

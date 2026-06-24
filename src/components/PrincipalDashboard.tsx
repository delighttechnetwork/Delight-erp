/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Award, 
  TrendingUp, 
  ClipboardCheck, 
  ShieldCheck, 
  CheckCircle, 
  XOctagon, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle,
  Flame,
  Volume2,
  Calendar
} from 'lucide-react';
import { 
  StudentDetail, 
  Subject, 
  Result, 
  SchoolClass, 
  SystemSettings, 
  TeacherProfile,
  GradeScaleEntry,
  Announcement
} from '../types';
import AcademicCalendar from './AcademicCalendar';
import AttendanceManager from './AttendanceManager';

interface PrincipalDashboardProps {
  activeTab: string;
  settings: SystemSettings;
  setSettings: (s: SystemSettings) => void;
  classes: SchoolClass[];
  subjects: Subject[];
}

export default function PrincipalDashboard({ activeTab, settings, setSettings, classes, subjects }: PrincipalDashboardProps) {
  const [studentsList, setStudentsList] = useState<StudentDetail[]>([]);
  const [resultsList, setResultsList] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [dangerMsg, setDangerMsg] = useState('');

  // Results publish scheduler states
  const [isScheduled, setIsScheduled] = useState(settings.resultPublishScheduled || false);
  const [scheduleTime, setScheduleTime] = useState(settings.resultPublishTime || '');

  // Announcements list states
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);

  // Sync settings of scheduler
  useEffect(() => {
    setIsScheduled(settings.resultPublishScheduled || false);
    setScheduleTime(settings.resultPublishTime || '');
  }, [settings]);

  // UI Selection controllers
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [reviewResults, setReviewResults] = useState<Array<Result & { subject_name: string; teacher_name: string }>>([]);
  const [selectedStudentAnalysis, setSelectedStudentAnalysis] = useState<any | null>(null);
  const [loadingStudentAnalysis, setLoadingStudentAnalysis] = useState(false);

  // Remark & Evaluation Form input
  const [principalRemark, setPrincipalRemark] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch announcements feed
  const fetchAnnouncementsList = async () => {
    setAnnLoading(true);
    try {
      const res = await fetch('/api/announcements?publishedOnly=true');
      const data = await res.json();
      setAnnouncements(data);
    } catch (e) {
      console.error('Error fetching announcements in Principal Dashboard', e);
    } finally {
      setAnnLoading(false);
    }
  };

  // Fetch registers
  const reloadAcademicRegisters = async () => {
    setLoading(true);
    try {
      const [studRes, resRes] = await Promise.all([
        fetch('/api/students').then(r => r.json()),
        fetch('/api/results').then(r => r.json())
      ]);
      setStudentsList(studRes);
      setResultsList(resRes);
    } catch (err) {
      console.error('Principal dashboard reload failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAcademicRegisters();
    fetchAnnouncementsList();
  }, [activeTab]);

  const savePublicationSchedule = async () => {
    if (isScheduled && !scheduleTime) {
      triggerNotify('danger', 'Please specify a valid schedule publication time first.');
      return;
    }

    const updatedSettings = {
      ...settings,
      resultPublishScheduled: isScheduled,
      resultPublishTime: isScheduled ? scheduleTime : null
    };

    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (r.ok) {
        setSettings(updatedSettings);
        triggerNotify('success', isScheduled 
          ? `Result publication automated to scheduled time successfully.` 
          : 'Automatic publication scheduling disabled.'
        );
      } else {
        triggerNotify('danger', 'System refused updated scheduling credentials.');
      }
    } catch (e) {
      triggerNotify('danger', 'Communication error updating scheduler.');
    }
  };

  const triggerNotify = (type: 'success' | 'danger', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setDangerMsg(text);
      setTimeout(() => setDangerMsg(''), 4000);
    }
  };

  // Release status toggle
  const toggleResultRelease = async () => {
    const fresh = { ...settings, resultReleased: !settings.resultReleased };
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fresh)
      });
      if (r.ok) {
        setSettings(fresh);
        triggerNotify('success', fresh.resultReleased ? 'All students progress sheets RELEASED to Student Portals.' : 'Report sheets publication ARCHIVED.');
      }
    } catch (e) {
      triggerNotify('danger', 'System publication trigger failed.');
    }
  };

  // Trigger evaluation drawer
  const inspectScholarReportSheet = (student: StudentDetail) => {
    setSelectedStudent(student);

    // Load active term results
    const activeSubjRes = (student.results || []).filter(
      r => r.term === settings.currentTerm && r.session === settings.currentSession
    );
    setReviewResults(activeSubjRes);

    // Populate remark if exists
    const matchingRemark = activeSubjRes.find(r => r.principal_remark)?.principal_remark || '';
    setPrincipalRemark(matchingRemark || 'Excellent compliance. Maintain academic standards.');

    // Pre-load student analytical advisor data
    setSelectedStudentAnalysis(null);
    setLoadingStudentAnalysis(true);
    fetch(`/api/ai/analyze-student-results?studentId=${student.id}&term=${encodeURIComponent(settings.currentTerm)}&session=${encodeURIComponent(settings.currentSession)}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error && data.status !== 'not_generated') {
          setSelectedStudentAnalysis(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStudentAnalysis(false));
  };

  // AI GEMINI COMMENTS SUGGESTION FOR PRINCIPAL
  const generateAIPrincipalRemark = async () => {
    if (!selectedStudent) return;
    setAiLoading(true);

    try {
      // Format simple summary array
      const scoresPayload = reviewResults.map(r => ({
        subject: r.subject_name,
        total: r.total,
        grade: r.grade
      }));

      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.fullname,
          subjectScores: scoresPayload,
          isPrincipal: true
        })
      });

      const data = await res.json();
      if (res.ok && data.remark) {
        setPrincipalRemark(data.remark);
        triggerNotify('success', 'Gemini formulated professional principal remark card successfully!');
      }
    } catch (e) {
      triggerNotify('danger', 'AI Remarks controller failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const generateSelectedStudentAdvisory = async () => {
    if (!selectedStudent) return;
    setLoadingStudentAnalysis(true);
    try {
      const res = await fetch('/api/ai/analyze-student-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          term: settings.currentTerm,
          session: settings.currentSession
        })
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setSelectedStudentAnalysis(data);
        triggerNotify('success', 'Gemini student academic advisor diagnostics generated successfully!');
      } else {
        triggerNotify('danger', data.error || 'Failed to analyze results.');
      }
    } catch {
      triggerNotify('danger', 'Error connecting to analysis engine.');
    } finally {
      setLoadingStudentAnalysis(false);
    }
  };

  // Approved or Reject whole terminal report sheet
  const dispatchStudentAcademicStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedStudent || reviewResults.length === 0) return;

    try {
      // Loop write-back evaluations on all subjects of the student
      const promises = reviewResults.map(r => 
        fetch('/api/results/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            result_id: r.id,
            approval: status,
            principal_remark: principalRemark
          })
        })
      );

      await Promise.all(promises);
      triggerNotify('success', `Report card status successfully registered as: ${status.toUpperCase()}.`);

      if (status === 'approved') {
        try {
          const notifyRes = await fetch('/api/results/notify-release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: selectedStudent.id,
              term: settings.currentTerm,
              session: settings.currentSession
            })
          });
          const notifyData = await notifyRes.json();
          if (notifyRes.ok) {
            if (notifyData.email?.sent || notifyData.sms?.sent) {
              triggerNotify('success', 'SMS alerts & email updates dispatched to student and parent.');
            } else {
              triggerNotify('success', 'Notifications logged (Enable API Keys in .env to activate actual SMS/Email delivery).');
            }
          }
        } catch (err) {
          console.error('Failed to dispatch notifications', err);
        }
      }

      setSelectedStudent(null);
      reloadAcademicRegisters();
    } catch (e) {
      triggerNotify('danger', 'Status configuration failed.');
    }
  };

  // Analytics Helpers
  const filteredStudents = studentsList.filter(s => {
    return selectedClass === 'ALL' || s.class_id === selectedClass;
  });

  const pendingApprovalsCount = resultsList.filter(r => r.approved === 'pending').length;
  const approvedApprovalsCount = resultsList.filter(r => r.approved === 'approved').length;

  const visibleAnnouncements = announcements.filter(
    ann => !ann.target || ann.target === 'all' || ann.target === 'staff'
  );

  // Sorting highlights
  const topScholars = [...studentsList]
    .filter(s => s.average_score && s.average_score > 0)
    .sort((a, b) => (b.average_score || 0) - (a.average_score || 0))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      
      {/* Alert panels */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-lg border border-emerald-500 font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {dangerMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
          Error Constraints: {dangerMsg}
        </div>
      )}

      {/* VIEW DETERMINATOR */}

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight leading-none uppercase">PRINCIPAL EVALUATION CONSOLE</h1>
              <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Review terminal subject score registers, endorse reports cards, release data files.</p>
            </div>

            {/* Results Release publication switch! */}
            <button
              onClick={toggleResultRelease}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-md shrink-0 flex items-center gap-2 ${
                settings.resultReleased 
                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 font-mono text-[10px] uppercase tracking-wider' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-55 font-mono text-[10px] uppercase tracking-wider'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${settings.resultReleased ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
              {settings.resultReleased ? 'Released to Portals' : 'Hold results release'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Action board metrics */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Grades Pending Review</span>
                <span className="text-2xl font-bold font-mono text-slate-950 block">{pendingApprovalsCount}</span>
                <span className="text-[10.5px] italic text-amber-600 font-semibold block font-sans">Awaiting physical signature</span>
              </div>
              <div className="h-10 w-10 bg-amber-50 text-amber-600 border border-amber-100/65 rounded-xl flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Approved Card Registers</span>
                <span className="text-2xl font-bold font-mono text-slate-950 block">{approvedApprovalsCount}</span>
                <span className="text-[10.5px] italic text-emerald-600 font-semibold block font-sans">Fully endorsed sheets</span>
              </div>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-100/65 rounded-xl flex items-center justify-center">
                <CheckCircle size={18} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm shadow-slate-100/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Enrolled Candidates</span>
                <span className="text-2xl font-bold font-mono text-slate-950 block">{studentsList.length} Scholars</span>
                <span className="text-[10.5px] text-slate-400 block font-sans">JSS1 - SS3 Classrooms</span>
              </div>
              <div className="h-10 w-10 bg-slate-100 text-slate-800 border border-slate-200/60 rounded-xl flex items-center justify-center">
                <Award size={18} />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Scholars Roll of Honour (Top Students) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 lg:col-span-2 shadow-sm shadow-slate-100/30">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 flex items-center gap-1.5 font-mono"><Flame size={15} className="text-amber-500 animate-pulse" /> Scholars Terminal Roll of Honor</h3>
              
              <div className="divide-y divide-slate-100">
                {topScholars.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 italic text-xs font-mono">Awaiting academic computations.</div>
                ) : (
                  topScholars.map((s, idx) => (
                    <div key={s.id} className="py-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 font-sans">
                        <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-950 font-bold font-mono text-xs text-white flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <strong className="text-slate-950 block font-display text-sm uppercase font-bold tracking-wide">{s.fullname}</strong>
                          <span className="text-[10px] text-slate-400 font-mono font-bold block">{s.admission_number} | Class: {s.class_name || s.class_id}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-slate-950">{s.average_score}%</span>
                        <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-bold font-mono">Terminal Avg</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Advanced Automated Publication Scheduler (Principal Only) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm shadow-slate-100/30 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100/60">
                    <Calendar size={15} />
                  </div>
                  <h3 className="font-bold font-display text-[11px] uppercase tracking-wider text-slate-800 font-mono">Automated Publication Scheduler</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Set automatic timers to automatically transition terminal transcripts and report cards into student portals.
                </p>

                <div className="space-y-4 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={e => setIsScheduled(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">Enable Scheduled Release</span>
                  </label>

                  {isScheduled && (
                    <div className="space-y-1.5 duration-150">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Scheduled Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                      />
                    </div>
                  )}

                  {settings.resultPublishScheduled && settings.resultPublishTime && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] text-slate-700 font-mono flex items-center gap-2 leading-relaxed">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div>
                        <strong className="block text-slate-900 font-sans text-[10px] uppercase">Active Schedule:</strong>
                        <span>{new Date(settings.resultPublishTime).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={savePublicationSchedule}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-950 font-bold text-[10.5px] text-white uppercase rounded-xl hover:bg-slate-800 transition text-center font-mono tracking-wide"
                >
                  Apply Publications Timer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EVALUATION MATRIX LIST TAB */}
      {activeTab === 'evaluate' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black font-display text-gray-900 tracking-tight">SCHOLARS REPORT EVALUATION</h1>
              <p className="text-xs text-gray-500 mt-1">Review active terminal records of all secondary school classes.</p>
            </div>

            {/* filter by class */}
            <select
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs text-gray-700 bg-white font-bold"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              <option value="ALL">All Classrooms</option>
              {classes.map(cl => (
                <option key={cl.id} value={cl.id}>Class: {cl.class_name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700 border-collapse">
                <thead className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  <tr>
                    <th className="px-5 py-3">Scholar Card</th>
                    <th className="px-5 py-3">Classroom</th>
                    <th className="px-5 py-3">Obtained Marks Avg</th>
                    <th className="px-5 py-3 font-mono">Rank Position</th>
                    <th className="px-5 py-3">Portal Stamp</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-7 text-gray-400 italic">No students found under matching parameters.</td>
                    </tr>
                  ) : (
                    filteredStudents.map(stud => {
                      // Check if has approved or pending results
                      const activeStudResults = (resultsList || []).filter(r => r.student_id === stud.id && r.term === settings.currentTerm);
                      const isPending = activeStudResults.some(r => r.approved === 'pending');
                      const isApproved = activeStudResults.length > 0 && !isPending;

                      return (
                        <tr key={stud.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-gray-950 font-display">{stud.fullname}</div>
                            <span className="text-[10px] text-gray-400 font-mono font-bold block">{stud.admission_number} | {stud.gender}</span>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-gray-800">{stud.class_level || stud.class_id}</td>
                          <td className="px-5 py-3.5 font-bold font-mono text-gray-900">
                            {stud.average_score ? `${stud.average_score}%` : '0%'}
                          </td>
                          <td className="px-5 py-3.5 font-sans font-bold text-amber-600 font-mono">
                            {stud.position || 'Computing'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[10.5px] font-bold rounded-full ${
                              isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                              isPending ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-gray-50 text-gray-400 border-gray-150'
                            }`}>
                              {isApproved ? 'Approved' : isPending ? 'Pending Review' : 'No entries'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right shrink-0">
                            <button
                              onClick={() => inspectScholarReportSheet(stud)}
                              className="px-3.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 font-bold text-xs rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-1 align-middle"
                            >
                              Review sheet <ArrowRight size={13} />
                            </button>
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
      )}

      {/* DETAILED RESULTS REVIEW STAMP MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border shadow-xl p-6 w-full max-w-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3.5">
              <div>
                <h3 className="font-black font-display uppercase text-sm tracking-wide text-gray-950">Terminal Performance Evaluation</h3>
                <span className="text-xs text-gray-500 font-medium">Candidate: {selectedStudent.fullname} ({selectedStudent.admission_number})</span>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-55 rounded-lg"
              >
                Cancel Review
              </button>
            </div>

            {/* Terminal mini-report table inspection */}
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b">
                  <tr>
                    <th className="px-4 py-2">Assigned Topic</th>
                    <th className="px-4 py-2 text-center">CA + Assign + Test + Exam</th>
                    <th className="px-4 py-2 text-center">Total (100)</th>
                    <th className="px-4 py-2 text-center">Grade</th>
                    <th className="px-4 py-2">Teacher comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviewResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 italic text-gray-400">Scholars subjects score list are empty or not submitted.</td>
                    </tr>
                  ) : (
                    reviewResults.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-bold text-gray-800">{r.subject_name}</td>
                        <td className="px-4 py-2 text-center font-mono text-gray-600">{r.ca} + {r.assignment} + {r.test} + {r.exam}</td>
                        <td className="px-4 py-2 text-center font-extrabold text-gray-900 font-mono">{r.total}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-block px-2 text-[10px] font-bold border rounded-lg bg-gray-50 font-mono">{r.grade}</span>
                        </td>
                        <td className="px-4 py-2 italic text-gray-500 text-[11px] max-w-xs truncate" title={r.remark}>{r.remark}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* AI Academic Advisor Diagnostics integration built for the Principal Seat */}
            <div className="border border-violet-100 bg-violet-50/10 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-violet-700 font-bold">
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="font-bold uppercase tracking-wider text-[9.5px] font-mono">Academic AI Advisor Insights</span>
                </div>
                {!selectedStudentAnalysis && !loadingStudentAnalysis && (
                  <button
                    type="button"
                    onClick={generateSelectedStudentAdvisory}
                    disabled={reviewResults.length === 0}
                    className="px-2.5 py-1 bg-violet-600 text-white font-bold text-[9px] uppercase tracking-wide rounded-md hover:bg-violet-700 transition"
                  >
                    Generate Diagnostics
                  </button>
                )}
              </div>

              {loadingStudentAnalysis && (
                <div className="flex items-center gap-2 text-[10.5px] text-violet-600 py-1 font-mono uppercase tracking-wider text-[8.5px] animate-pulse">
                  <span className="h-3 w-3 animate-spin rounded-full border border-violet-600 border-t-transparent inline-block" />
                  Analyzing candidate results...
                </div>
              )}

              {selectedStudentAnalysis && !loadingStudentAnalysis && (
                <div className="space-y-3.5 text-[11px] leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-violet-100">
                      <strong className="block text-violet-700 uppercase font-mono text-[8px] tracking-wider mb-0.5">Strongest Core:</strong>
                      <p className="text-gray-600 italic font-medium">{selectedStudentAnalysis.strongestSubjects}</p>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-violet-100">
                      <strong className="block text-amber-700 uppercase font-mono text-[8px] tracking-wider mb-0.5">Growth milestones:</strong>
                      <p className="text-gray-600 italic font-medium">{selectedStudentAnalysis.areasForImprovement}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/80 p-2.5 rounded-lg border border-violet-100 font-sans">
                    <strong className="block text-orange-700 uppercase font-mono text-[8px] tracking-wider mb-0.5">Actionable Coaching Advice:</strong>
                    <p className="text-gray-600 italic font-medium">{selectedStudentAnalysis.actionableAdvice}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-violet-100">
                    <button
                      type="button"
                      onClick={() => {
                        setPrincipalRemark(selectedStudentAnalysis.humanSummary);
                        triggerNotify('success', 'AI Summary Remark applied to card comments!');
                      }}
                      className="px-2.5 py-1 bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-200/50 font-bold text-[9px] uppercase rounded-lg transition"
                    >
                      Use as Official Remark
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrincipalRemark(selectedStudentAnalysis.actionableAdvice);
                        triggerNotify('success', 'AI Actionable Advice applied to card comments!');
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 font-bold text-[9px] uppercase rounded-lg transition"
                    >
                      Use Actionable Advice
                    </button>
                  </div>
                </div>
              )}

              {!selectedStudentAnalysis && !loadingStudentAnalysis && (
                <p className="text-[10px] text-slate-500 font-sans">
                  The academic performance diagnostics are currently clear. Press the button to perform deep, AI-powered mentoring reviews.
                </p>
              )}
            </div>

            {/* Core Principal remark comments with AI Suggest widgets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold uppercase tracking-widest text-[9.5px] text-gray-500">Endorsement Principal Remark</label>
                <button
                  type="button"
                  onClick={generateAIPrincipalRemark}
                  disabled={aiLoading || reviewResults.length === 0}
                  className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[10.5px] uppercase rounded-lg hover:bg-amber-100 transition flex items-center gap-1 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                  ) : (
                    <Sparkles size={11} strokeWidth={2.5} />
                  )}
                  Suggest with Gemini AI
                </button>
              </div>
              <textarea
                rows={3}
                required
                className="w-full text-xs rounded-xl border border-gray-200 px-3.5 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter terminal diagnostic recommendations or notes of encouragement..."
                value={principalRemark}
                onChange={e => setPrincipalRemark(e.target.value)}
              />
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => dispatchStudentAcademicStatus('rejected')}
                className="px-4 py-2.5 border border-rose-100 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-50 transition flex items-center gap-1 shrink-0"
              >
                <XOctagon size={16} /> Reject Grades sheet
              </button>
              <button
                type="button"
                onClick={() => dispatchStudentAcademicStatus('approved')}
                className="px-4 py-2.5 bg-emerald-600 font-bold text-xs text-white rounded-xl hover:bg-emerald-700 shadow-md transition flex items-center gap-1 shrink-0"
              >
                <ShieldCheck size={16} /> Endorse & Approve Card
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance-reports' && (
        <div className="animate-fadeIn pb-12">
          <AttendanceManager role="principal" />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="animate-fadeIn pb-12">
          <AcademicCalendar role="principal" />
        </div>
      )}

      {/* CAMPUS ANNOUNCEMENTS BROADCAST FEED */}
      {activeTab === 'announcements' && (
        <div className="space-y-6 animate-fadeIn pb-12">
          <div>
            <h1 className="text-2xl font-black font-display text-gray-900 tracking-tight leading-none uppercase">CAMPUS BROADSHEET FEEDS</h1>
            <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Stay informed on terminal timelines, administrative notices, and security directives.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-5 shadow-sm shadow-slate-100/30 md:col-span-2">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 flex items-center gap-2 font-mono"><Volume2 size={16} className="text-blue-600 animate-pulse" /> Current Administrative Dispatches</h3>

              {annLoading ? (
                <div className="text-center py-10 text-slate-400 font-mono text-xs">Loading board publications...</div>
              ) : visibleAnnouncements.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic font-mono text-xs border border-dashed border-slate-200 rounded-2xl">No published school announcements found in board record.</div>
              ) : (
                <div className="space-y-4">
                  {visibleAnnouncements.map((ann) => (
                    <div key={ann.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight leading-snug">{ann.title}</h4>
                        <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase shrink-0">Official</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">{ann.content}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-150/60 font-mono uppercase">
                        <span>Publisher: {ann.by}</span>
                        <span>{ann.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-950 text-white flex flex-col justify-between shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-800 rounded-lg text-amber-400 border border-slate-700/60">
                      <Sparkles size={15} />
                    </div>
                    <h3 className="font-bold font-display text-[11px] uppercase tracking-wider text-amber-400 font-mono">Dissection Room Briefing</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Administrative notices are broadcasted exclusively by the highest admin workspace. For scheduling updates or physical corrections, kindly check continuous assessment dossiers with your assignees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

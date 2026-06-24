/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Settings, 
  HelpCircle, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  ClipboardList,
  Volume2
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

interface TeacherDashboardProps {
  teacher: TeacherProfile;
  activeTab: string;
  settings: SystemSettings;
  classes: SchoolClass[];
  subjects: Subject[];
}

export default function TeacherDashboard({ teacher, activeTab, settings, classes, subjects }: TeacherDashboardProps) {
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [resultsList, setResultsList] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [dangerMsg, setDangerMsg] = useState('');

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);

  // Active workspace selector (Default teacher assigned credentials)
  const [selectedClass, setSelectedClass] = useState(teacher.assigned_class || 'JSS1');
  const [selectedSubject, setSelectedSubject] = useState(teacher.assigned_subject || 'subj-math-jr');

  // Fetch announcements list
  const fetchAnnouncementsList = async () => {
    setAnnLoading(true);
    try {
      const res = await fetch('/api/announcements?publishedOnly=true');
      const data = await res.json();
      setAnnouncements(data);
    } catch (e) {
      console.error('Error fetching teacher announcements Feed', e);
    } finally {
      setAnnLoading(false);
    }
  };

  // Input matrix state for current class students
  const [formScores, setFormScores] = useState<Record<string, {
    ca: string;
    assignment: string;
    test: string;
    exam: string;
    remark: string;
    isEditingRemark: boolean;
    aiLoading: boolean;
  }>>({});

  const teacherSubject = subjects.find(s => s.id === selectedSubject);

  const fetchClassroomAndGrades = async () => {
    setLoading(true);
    try {
      const [studRes, resRes] = await Promise.all([
        fetch('/api/students').then(r => r.json()),
        fetch('/api/results').then(r => r.json())
      ]);

      // Filter students corresponding to selectedClass
      const classStuds = studRes.filter((s: StudentDetail) => s.class_id === selectedClass);
      setStudents(classStuds);
      setResultsList(resRes);

      // Initialize scores form matrix
      const matrix: typeof formScores = {};
      classStuds.forEach((st: StudentDetail) => {
        // Find existing result
        const existing = resRes.find(
          (r: Result) => 
            r.student_id === st.id && 
            r.subject_id === selectedSubject && 
            r.term === settings.currentTerm && 
            r.session === settings.currentSession
        );

        matrix[st.id] = {
          ca: existing ? String(existing.ca) : '0',
          assignment: existing ? String(existing.assignment) : '0',
          test: existing ? String(existing.test) : '0',
          exam: existing ? String(existing.exam) : '0',
          remark: existing ? String(existing.remark) : 'Good compliance.',
          isEditingRemark: !existing, // editable if new
          aiLoading: false
        };
      });

      setFormScores(matrix);
    } catch (err) {
      console.error('Teacher fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomAndGrades();
    fetchAnnouncementsList();
  }, [selectedClass, selectedSubject, activeTab]);

  const triggerNotification = (type: 'success' | 'danger', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setDangerMsg(msg);
      setTimeout(() => setDangerMsg(''), 4000);
    }
  };

  // REAL-TIME COMPUTATIONS FOR MATRIX ROW
  const computeRowValues = (studentId: string) => {
    const row = formScores[studentId];
    if (!row) return { total: 0, grade: 'F', remark: 'Fail', color: 'text-red-500' };

    const caVal = Number(row.ca || 0);
    const assignVal = Number(row.assignment || 0);
    const testVal = Number(row.test || 0);
    const examVal = Number(row.exam || 0);

    const total = caVal + assignVal + testVal + examVal;

    // Find grade from active settings scale
    const gs = settings.gradingScale.find(scale => total >= scale.minScore && total <= scale.maxScore);
    return {
      total,
      grade: gs ? gs.grade : 'F',
      remark: gs ? gs.remark : 'Fail',
      color: gs ? gs.color : 'red'
    };
  };

  const handleValueChange = (studentId: string, field: 'ca' | 'assignment' | 'test' | 'exam' | 'remark', value: string) => {
    // Validate Max bounds
    if (field === 'ca' && Number(value) > 20) return;
    if (field === 'assignment' && Number(value) > 10) return;
    if (field === 'test' && Number(value) > 10) return;
    if (field === 'exam' && Number(value) > 60) return;

    setFormScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // AI GEMINI COMMENTS SUGGESTIONS API
  const generateAIRemark = async (studentId: string, studentName: string) => {
    setFormScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], aiLoading: true }
    }));

    const vals = computeRowValues(studentId);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          subjectScores: [{ subject: teacherSubject ? teacherSubject.subject_name : 'Primary Module', total: vals.total, grade: vals.grade }],
          isPrincipal: false
        })
      });

      const data = await response.json();
      if (response.ok && data.remark) {
        handleValueChange(studentId, 'remark', data.remark);
        triggerNotification('success', `AI suggested feedback formulated for ${studentName}!`);
      }
    } catch (err) {
      triggerNotification('danger', 'Failed to consult AI feedback co-pilot.');
    } finally {
      setFormScores(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], aiLoading: false }
      }));
    }
  };

  // Core grade saver dispatcher
  const submitGradesRow = async (studentId: string, studentName: string) => {
    const row = formScores[studentId];
    if (!row) return;

    // Check if result has already been evaluated as approved
    const existingResult = resultsList.find(
      (r: Result) => 
        r.student_id === studentId && 
        r.subject_id === selectedSubject && 
        r.term === settings.currentTerm && 
        r.session === settings.currentSession
    );

    if (existingResult && existingResult.approved === 'approved') {
      triggerNotification('danger', 'Error: Result sheet already approved by Principal. Manual changes blocked.');
      return;
    }

    try {
      const submitPayload = {
        id: existingResult ? existingResult.id : undefined,
        student_id: studentId,
        subject_id: selectedSubject,
        term: settings.currentTerm,
        session: settings.currentSession,
        ca: row.ca,
        assignment: row.assignment,
        test: row.test,
        exam: row.exam,
        teacher_id: teacher.id
      };

      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      });

      if (res.ok) {
        triggerNotification('success', `Scores and remarks for ${studentName} saved.`);
        fetchClassroomAndGrades(); // Refresh lists
      } else {
        triggerNotification('danger', 'Portal refused results payload format.');
      }
    } catch (err) {
      triggerNotification('danger', 'Grade registration failed.');
    }
  };

  // Bulk save full classroom
  const saveAllClassroomGrades = async () => {
    setLoading(true);
    let successCount = 0;
    try {
      const ids = students.map(s => s.id);
      
      const payloadScores = ids.map(id => {
        const row = formScores[id];
        return {
          student_id: id,
          ca: row?.ca || '0',
          assignment: row?.assignment || '0',
          test: row?.test || '0',
          exam: row?.exam || '0'
        };
      });

      const res = await fetch('/api/results/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass,
          subject_id: selectedSubject,
          scores: payloadScores,
          teacher_id: teacher.id
        })
      });

      if (res.ok) {
        triggerNotification('success', `Successfully uploaded scores for classroom.`);
        fetchClassroomAndGrades();
      }
    } catch (e) {
      triggerNotification('danger', 'Bulk uploads system error.');
    } finally {
      setLoading(false);
    }
  };

  // Filters results list for analytical visual distributions
  const activeClassResults = resultsList.filter(
    (r: Result) => r.subject_id === selectedSubject && r.term === settings.currentTerm && r.session === settings.currentSession
  );

  const pendingCount = activeClassResults.filter(r => r.approved === 'pending').length;
  const approvedCount = activeClassResults.filter(r => r.approved === 'approved').length;

  const visibleAnnouncements = announcements.filter(
    ann => !ann.target || ann.target === 'all' || ann.target === 'staff'
  );

  return (
    <div className="space-y-6">
      
      {/* Notifications Alert */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-lg border border-emerald-500 font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {dangerMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
          Error Constraints: {dangerMsg}
        </div>
      )}

      {/* RENDER ACTIVE FORMS VIEW */}
      
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight leading-none uppercase">ACADEMIC ROOM CONTROLS: {teacher.fullname}</h1>
            <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Terminal evaluations sheet for assigned subject room ({teacherSubject ? teacherSubject.subject_name : teacher.assigned_subject}).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Quick stats and Classroom state */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/85 space-y-4 shadow-sm shadow-slate-100/30">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 font-mono">My Assignment Duties</h3>
              
              <div className="space-y-3 pt-2 text-xs text-slate-600 leading-relaxed font-sans">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Assigned Form Classroom:</span>
                  <span className="font-extrabold text-slate-900 text-sm font-mono">{teacher.assigned_class}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Duty Subject Field:</span>
                  <span className="font-extrabold text-slate-900 text-xs">{teacherSubject ? teacherSubject.subject_name : 'Mathematics'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Active Pupils:</span>
                  <span className="font-bold text-slate-900 font-mono">{students.length} scholars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Academic Term Period:</span>
                  <span className="font-bold text-slate-900 font-mono">{settings.currentTerm}</span>
                </div>
              </div>
            </div>

            {/* Results submitted list status */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/85 space-y-4 shadow-sm shadow-slate-100/30 md:col-span-2">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 font-mono">Terminal Approval Status Review</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3">
                  <div className="h-9 w-9 bg-yellow-50 text-yellow-650 rounded-xl flex items-center justify-center border border-yellow-200">
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 font-mono">Awaiting Approval</span>
                    <span className="text-lg font-bold font-mono text-slate-800 leading-none">{pendingCount} grades</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3">
                  <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 font-mono">Principal Approved</span>
                    <span className="text-lg font-bold font-mono text-slate-800 leading-none">{approvedCount} grades</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 italic p-3 border-l-4 border-slate-850 bg-slate-50 rounded-r-2xl font-sans">
                Note: Grades which are already approved by the Principal cannot be adjusted. If correction is needed, consult the Principal.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SCORES ENTRY SHEET MATRIX ROOM */}
      {activeTab === 'scores' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 uppercase tracking-tight leading-none">Terminal Scores Entry</h1>
              <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Formulate continuous assessment (CA), test, and examination sheets.</p>
            </div>
            
            {/* Class Selection Filter */}
            <div className="flex gap-2.5">
              <select
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-700 bg-white font-bold select-none focus:outline-none focus:ring-1 focus:ring-slate-800"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                {classes.map(cl => (
                  <option key={cl.id} value={cl.id}>Class: {cl.class_name}</option>
                ))}
              </select>
              
              <button
                onClick={saveAllClassroomGrades}
                disabled={loading}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 font-bold text-xs uppercase tracking-wider text-white rounded-xl shadow-md transition border border-slate-950"
              >
                Save All Room Grades
              </button>
            </div>
          </div>

          {/* Core spreadsheet score matrix */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shadow-slate-100/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[750px]">
                <thead className="bg-slate-900 text-white font-semibold text-[9px] uppercase tracking-wider border-b border-slate-950">
                  <tr>
                    <th className="px-5 py-3.5">Pupil Demographics</th>
                    <th className="px-3 py-3.5 text-center w-20">CA (20)</th>
                    <th className="px-3 py-3.5 text-center w-20">Assign (10)</th>
                    <th className="px-3 py-3.5 text-center w-20">Test (10)</th>
                    <th className="px-3 py-3.5 text-center w-20">Exam (60)</th>
                    <th className="px-3 py-3.5 text-center font-bold">Total (100)</th>
                    <th className="px-3 py-3.5 text-center font-mono">Grade</th>
                    <th className="px-4 py-3.5">Subject Remark Comments</th>
                    <th className="px-5 py-3.5 text-right font-bold w-36">Actions Dashboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 italic font-mono">No students enrolled under classroom index: {selectedClass}.</td>
                    </tr>
                  ) : (
                    students.map(st => {
                      const rowState = formScores[st.id] || { ca: '0', assignment: '0', test: '0', exam: '0', remark: 'Good compliance.', isEditingRemark: true, aiLoading: false };
                      const computed = computeRowValues(st.id);
                      
                      // Check if already approved
                      const matchResult = resultsList.find(
                        (r: Result) => 
                          r.student_id === st.id && 
                          r.subject_id === selectedSubject && 
                          r.term === settings.currentTerm && 
                          r.session === settings.currentSession
                      );
                      const isApproved = matchResult?.approved === 'approved';

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/50 transition">
                          {/* Student ID Name details */}
                          <td className="px-5 py-3 font-sans">
                            <div className="font-bold text-slate-950">{st.fullname}</div>
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{st.admission_number}</span>
                          </td>

                          {/* CA score input */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              disabled={isApproved}
                              className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50/50 text-center font-mono font-bold text-slate-950 focus:ring-1 focus:ring-slate-800 focus:border-slate-800 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                              value={rowState.ca}
                              onChange={e => handleValueChange(st.id, 'ca', e.target.value)}
                            />
                          </td>

                          {/* Assignment input */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              disabled={isApproved}
                              className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50/50 text-center font-mono font-bold text-slate-950 focus:ring-1 focus:ring-slate-800 focus:border-slate-800 focus:outline-none disabled:bg-slate-100"
                              value={rowState.assignment}
                              onChange={e => handleValueChange(st.id, 'assignment', e.target.value)}
                            />
                          </td>

                          {/* Test input */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              disabled={isApproved}
                              className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50/50 text-center font-mono font-bold text-slate-950 focus:ring-1 focus:ring-slate-800 focus:border-slate-800 focus:outline-none disabled:bg-slate-100"
                              value={rowState.test}
                              onChange={e => handleValueChange(st.id, 'test', e.target.value)}
                            />
                          </td>

                          {/* Exam input */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              disabled={isApproved}
                              className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50/50 text-center font-mono font-bold text-slate-950 focus:ring-1 focus:ring-slate-800 focus:border-slate-800 focus:outline-none disabled:bg-slate-100px-2"
                              value={rowState.exam}
                              onChange={e => handleValueChange(st.id, 'exam', e.target.value)}
                            />
                          </td>

                          {/* Sum Total dynamic */}
                          <td className="px-3 py-3 text-center font-bold font-mono text-slate-950">
                            {computed.total}
                          </td>

                          {/* Calculated Grade */}
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-bold border font-mono ${
                              computed.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              computed.grade === 'B' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                              computed.grade === 'C' ? 'bg-slate-100 text-slate-800 border-slate-200 animate-none' :
                              computed.grade === 'D' ? 'bg-yellow-50 text-yellow-750 border-yellow-200' : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {computed.grade}
                            </span>
                          </td>

                          {/* Remarks with AI co-pilot */}
                          <td className="px-4 py-3 min-w-[150px]">
                            {rowState.isEditingRemark ? (
                              <input
                                type="text"
                                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-sans"
                                value={rowState.remark}
                                onChange={e => handleValueChange(st.id, 'remark', e.target.value)}
                              />
                            ) : (
                              <span className="text-[11px] italic text-slate-500 font-semibold line-clamp-1">{rowState.remark}</span>
                            )}
                          </td>

                          {/* Action panel triggers */}
                          <td className="px-5 py-3 text-right space-x-1 shrink-0">
                            {!isApproved ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => generateAIRemark(st.id, st.fullname)}
                                  disabled={rowState.aiLoading}
                                  className="p-2 bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl hover:bg-slate-200 hover:text-slate-950 transition-all inline-flex items-center justify-center align-middle"
                                  title="Formulate remark comment with Gemini AI"
                                >
                                  {rowState.aiLoading ? (
                                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                  ) : (
                                    <Sparkles size={13} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => submitGradesRow(st.id, st.fullname)}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 font-bold text-[10px] uppercase tracking-wide text-white rounded-xl transition inline-block align-middle border border-slate-950 shadow-sm"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold uppercase text-[9px] tracking-wider leading-none font-mono">
                                <CheckCircle size={12} /> Approved
                              </span>
                            )}
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

      {/* ANNOUNCEMENTS tab view */}
      {activeTab === 'attendance' && (
        <div className="animate-fadeIn pb-12">
          <AttendanceManager role="teacher" teacherDetails={{ fullname: teacher.fullname, assigned_class: teacher.assigned_class }} />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="animate-fadeIn pb-12">
          <AcademicCalendar role="teacher" />
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-6 animate-fadeIn pb-12">
          <div>
            <h1 className="text-2xl font-black font-display text-gray-900 tracking-tight leading-none uppercase">Campus Broadcaster publications</h1>
            <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Timelines, continuous assessment directives, and administrative notices.</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-5 shadow-sm shadow-slate-100/30">
            <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 flex items-center gap-2 font-mono"><Volume2 size={16} className="text-blue-600 animate-pulse" /> Official Administrative Bulletins</h3>

            {annLoading ? (
              <div className="text-center py-10 text-slate-400 font-mono text-xs">Loading board bulletins...</div>
            ) : visibleAnnouncements.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic font-mono text-xs border border-dashed border-slate-200 rounded-2xl">No published school announcements found.</div>
            ) : (
              <div className="space-y-4">
                {visibleAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight leading-snug">{ann.title}</h4>
                      <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase shrink-0">Official</span>
                    </div>
                    <p className="text-xs text-slate-650 leading-relaxed font-sans">{ann.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-150/60 font-mono uppercase">
                      <span>Publisher: {ann.by}</span>
                      <span>{ann.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

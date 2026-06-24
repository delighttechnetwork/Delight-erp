/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Layers, 
  Sliders, 
  UserPlus, 
  Plus, 
  Trash2, 
  Edit3, 
  Key, 
  Award, 
  TrendingUp, 
  Volume2, 
  CheckCircle,
  HelpCircle,
  Upload,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { 
  StudentDetail, 
  TeacherProfile, 
  Subject, 
  SchoolClass, 
  SystemSettings, 
  UserRole,
  GradeScaleEntry
} from '../types';
import AcademicCalendar from './AcademicCalendar';
import AuditLogView from './AuditLogView';
import AttendanceManager from './AttendanceManager';

interface AdminDashboardProps {
  activeTab: string;
  settings: SystemSettings;
  setSettings: (s: SystemSettings) => void;
  classes: SchoolClass[];
  setClasses: (c: SchoolClass[]) => void;
  subjects: Subject[];
  setSubjects: (s: Subject[]) => void;
}

export default function AdminDashboard({ activeTab, settings, setSettings, classes, setClasses, subjects, setSubjects }: AdminDashboardProps) {
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    totalClasses: 0,
    pendingResults: 0,
    approvedResults: 0,
    promotionRate: 0,
  });

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals / Creators
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentDetail | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Announcements tab CRUD state
  const [adminAnnouncements, setAdminAnnouncements] = useState<any[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annForm, setAnnForm] = useState({ title: '', content: '', published: true, target: 'all' });

  // Bulk Student Import states
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkParsedRows, setBulkParsedRows] = useState<any[]>([]);
  const [bulkValidationErrors, setBulkValidationErrors] = useState<string[]>([]);
  const [bulkImportProcessing, setBulkImportProcessing] = useState(false);

  // Form Inputs
  const [studentForm, setStudentForm] = useState({
    fullname: '', email: '', password: '', class_id: 'JSS1', department: 'None' as any, gender: 'Male' as any, parent_phone: ''
  });
  const [teacherForm, setTeacherForm] = useState({
    fullname: '', email: '', password: '', phone: '', assigned_class: 'JSS1', assigned_subject: 'subj-math-jr'
  });
  const [subjectForm, setSubjectForm] = useState({
    subject_name: '', class_level: 'Junior' as any, department: 'Core' as any, is_active: true
  });
  const [newPassword, setNewPassword] = useState('');

  // Helper selectors
  const fetchAdminAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const r = await fetch('/api/announcements');
      const data = await r.json();
      setAdminAnnouncements(data);
    } catch (e) {
      console.error('Failed to load portal dispatches', e);
    } finally {
      setAnnLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [studRes, teachRes, statsRes] = await Promise.all([
        fetch('/api/students').then(r => r.json()),
        fetch('/api/teachers').then(r => r.json()),
        fetch('/api/dashboard/stats').then(r => r.json())
      ]);
      setStudents(studRes);
      setTeachers(teachRes);
      setStats(statsRes);
      fetchAdminAnnouncements();
    } catch (err) {
      console.error('Failed to reload admin registers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const triggerAlert = (type: 'success' | 'danger', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMessage(text);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // --- CRUD DISPATCHERS ---

  // Teachers dispatchers
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : '/api/teachers';
      const method = editingTeacher ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherForm)
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Action failed.');
      }

      triggerAlert('success', editingTeacher ? 'Teacher file updated successfully.' : 'New academic instructor account created.');
      setShowTeacherModal(false);
      setEditingTeacher(null);
      setTeacherForm({ fullname: '', email: '', password: '', phone: '', assigned_class: 'JSS1', assigned_subject: 'subj-math-jr' });
      fetchAllData();
    } catch (err: any) {
      triggerAlert('danger', err.message);
    }
  };

  const deleteTeacher = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to dismiss this teacher profile? All assignments will be unlinked.')) return;
    try {
      await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      triggerAlert('success', 'Teacher account unlinked successfully.');
      fetchAllData();
    } catch (err: any) {
      triggerAlert('danger', 'Instructor dismissal pipeline failed.');
    }
  };

  // Students dispatchers
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Student register failure.');
      }

      triggerAlert('success', editingStudent ? 'Student file updated.' : 'New student profile registered successfully.');
      setShowStudentModal(false);
      setEditingStudent(null);
      setStudentForm({ fullname: '', email: '', password: '', class_id: 'JSS1', department: 'None', gender: 'Male', parent_phone: '' });
      fetchAllData();
    } catch (err: any) {
      triggerAlert('danger', err.message);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss this student? His academic grade sheets will be deleted irreversibly.')) return;
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      triggerAlert('success', 'Student record dismissed successfully.');
      fetchAllData();
    } catch (err: any) {
      triggerAlert('danger', 'Dismissal system failed.');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      triggerAlert('danger', 'Password must be at least 4 characters.');
      return;
    }
    try {
      const r = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedUserId, newPassword })
      });
      if (r.ok) {
        triggerAlert('success', 'User portal access password successfully reset.');
        setShowPasswordModal(false);
        setNewPassword('');
      }
    } catch (err) {
      triggerAlert('danger', 'Reset pipeline failed.');
    }
  };

  // Subjects dispatchers
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSubject ? { ...subjectForm, id: editingSubject.id } : subjectForm)
      });
      if (response.ok) {
        triggerAlert('success', editingSubject ? 'Curriculum subject updated.' : 'New subject added to school curriculum.');
        setShowSubjectModal(false);
        setEditingSubject(null);
        setSubjectForm({ subject_name: '', class_level: 'Junior', department: 'Core', is_active: true });
        // Retrieve fresh state
        const freshSubjects = await fetch('/api/subjects').then(r => r.json());
        setSubjects(freshSubjects);
      }
    } catch (err) {
      triggerAlert('danger', 'Subject creation failed.');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Proceed to remove subject from curriculum?')) return;
    try {
      await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      triggerAlert('success', 'Subject removed from index.');
      const freshSubjects = await fetch('/api/subjects').then(r => r.json());
      setSubjects(freshSubjects);
    } catch (err) {
      triggerAlert('danger', 'Removal failed.');
    }
  };

  // Bulk student promoter
  const promoSessionClass = async (cl_id: string, dir: 'Promoted' | 'Repeated') => {
    const classStudents = students.filter(s => s.class_id === cl_id);
    if (classStudents.length === 0) {
      triggerAlert('danger', `No active students registered under ${cl_id}.`);
      return;
    }
    const ids = classStudents.map(s => s.id);
    if (!confirm(`Deploy automatic session promotions for ${classStudents.length} students under ${cl_id} to direction: ${dir}?`)) return;

    try {
      const r = await fetch('/api/students/promote-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: ids, force_status: dir })
      });
      if (r.ok) {
        triggerAlert('success', `Dynamic academic promotions processed for classroom index ${cl_id}.`);
        fetchAllData();
      }
    } catch (err) {
      triggerAlert('danger', 'Promotion pipeline failed.');
    }
  };

  // Adjust config settings
  const updateTermConfig = async (term: string) => {
    const fresh = { ...settings, currentTerm: term as any };
    const r = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fresh)
    });
    if (r.ok) {
      setSettings(fresh);
      triggerAlert('success', `Active Academic Term updated to ${term}.`);
    }
  };

  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) {
      triggerAlert('danger', 'Please complete title and content inputs first.');
      return;
    }
    try {
      const url = editingAnnId ? `/api/announcements/${editingAnnId}` : '/api/announcements';
      const method = editingAnnId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: annForm.title,
          content: annForm.content,
          published: annForm.published,
          target: annForm.target,
          by: 'School Administrator'
        })
      });
      if (r.ok) {
        triggerAlert('success', editingAnnId ? 'Announcement post updated successfully!' : 'Announcement dispatched on feeds!');
        setAnnForm({ title: '', content: '', published: true, target: 'all' });
        setEditingAnnId(null);
        fetchAdminAnnouncements();
      } else {
        triggerAlert('danger', 'System refused to process the bulletin post.');
      }
    } catch (e) {
      triggerAlert('danger', 'Failed to dispatch broadcaster announcement.');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to retract and delete this administrative notice?')) return;
    try {
      const r = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (r.ok) {
        triggerAlert('success', 'Announcement deleted successfully.');
        fetchAdminAnnouncements();
      } else {
        triggerAlert('danger', 'Administrative refusal to delete.');
      }
    } catch (e) {
      triggerAlert('danger', 'Failed to delete announcement bulletin.');
    }
  };

  const toggleAnnPublish = async (ann: any) => {
    try {
      const r = await fetch(`/api/announcements/${ann.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ann,
          published: !ann.published
        })
      });
      if (r.ok) {
        triggerAlert('success', ann.published ? 'Announcement retracted to draft.' : 'Announcement published to dashboards!');
        fetchAdminAnnouncements();
      }
    } catch (e) {
      triggerAlert('danger', 'Toggle state communication error.');
    }
  };

  const handleCSVUpload = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (!lines || lines.length === 0) {
      setBulkParsedRows([]);
      setBulkValidationErrors(['Empty text or file provided.']);
      return;
    }

    let startIndex = 0;
    const firstLineMatch = lines[0].toLowerCase();
    if (firstLineMatch.includes('name') || firstLineMatch.includes('email') || firstLineMatch.includes('class') || firstLineMatch.includes('fullname')) {
      startIndex = 1;
    }

    const parsed: any[] = [];
    const errors: string[] = [];

    // Local lists for checks
    const classIds = classes.map(c => c.id);
    const existingEmails = students.map(s => s.email.toLowerCase());
    const fileEmails = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const p = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      const fullname = p[0] || '';
      const email = p[1] || '';
      const password = p[2] || 'student123';
      const classId = p[3] ? p[3].toUpperCase() : 'JSS1';
      const dept = p[4] || 'None';
      const gender = p[5] || 'Male';
      const phone = p[6] || '';

      const rowIdx = i + 1;

      // Validate Columns
      if (!fullname) {
        errors.push(`Row ${rowIdx}: Student Name is missing.`);
      }
      if (!email || !email.includes('@')) {
        errors.push(`Row ${rowIdx}: Access email address is invalid.`);
      } else {
        if (existingEmails.includes(email.toLowerCase())) {
          errors.push(`Row ${rowIdx}: Duplicate system email registered: ${email}`);
        }
        if (fileEmails.has(email.toLowerCase())) {
          errors.push(`Row ${rowIdx}: Duplicate email listed within the CSV file: ${email}`);
        }
        fileEmails.add(email.toLowerCase());
      }
      if (!classIds.includes(classId)) {
        errors.push(`Row ${rowIdx}: Target Class ID '${classId}' does not exist in standard classrooms layout.`);
      }
      if (gender !== 'Male' && gender !== 'Female') {
        errors.push(`Row ${rowIdx}: Sex must be strictly 'Male' or 'Female'.`);
      }

      parsed.push({
        fullname,
        email,
        password,
        class_id: classId,
        department: dept,
        gender,
        parent_phone: phone,
        status: errors.filter(e => e.startsWith(`Row ${rowIdx}:`)).length === 0 ? 'valid' : 'invalid'
      });
    }

    setBulkParsedRows(parsed);
    setBulkValidationErrors(errors);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkInputText(text);
      handleCSVUpload(text);
    };
    reader.readAsText(file);
  };

  const commitBulkImport = async () => {
    if (bulkParsedRows.length === 0) {
      triggerAlert('danger', 'No student records parsed to upload.');
      return;
    }
    if (bulkValidationErrors.length > 0) {
      triggerAlert('danger', 'File contains validation errors. Please rectify records and re-try upload.');
      return;
    }

    setBulkImportProcessing(true);
    try {
      const r = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: bulkParsedRows })
      });
      const data = await r.json();
      if (r.ok) {
        triggerAlert('success', `Bulk Import Finished! Successfully enrolled ${data.importedCount} scholars securely.`);
        setShowBulkImportModal(false);
        setBulkInputText('');
        setBulkParsedRows([]);
        setBulkValidationErrors([]);
        fetchAllData();
      } else {
        triggerAlert('danger', data.message || 'Bulk student import rejected by the portal server.');
      }
    } catch (e) {
      triggerAlert('danger', 'Bulk pipeline execution error.');
    } finally {
      setBulkImportProcessing(false);
    }
  };

  // Formatting students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullname.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'ALL' || s.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      
      {/* Alert Notices */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-lg border border-emerald-500 font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
          Error: {errorMessage}
        </div>
      )}

      {/* RENDER VIEW DEPENDING ON CURRENT TAB IDENTIFIER */}

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Welcome Intro */}
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight leading-none uppercase">ADMINISTRATIVE DIRECTORY METRICS</h1>
            <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Academic control center for Delight Tech International Academy.</p>
          </div>

          {/* Dash Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/85 shadow-sm shadow-slate-100/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-705 border border-slate-200/70 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Total Scholars</span>
                  <span className="text-xl font-bold text-slate-950 font-mono leading-none mt-1">{stats.totalStudents}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/85 shadow-sm shadow-slate-100/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-705 border border-slate-200/70 flex items-center justify-center">
                  <BookOpen size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Staff Members</span>
                  <span className="text-xl font-bold text-slate-950 font-mono leading-none mt-1">{stats.totalTeachers}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/85 shadow-sm shadow-slate-100/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-705 border border-slate-200/70 flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Curricula Subjects</span>
                  <span className="text-xl font-bold text-slate-950 font-mono leading-none mt-1">{stats.totalSubjects}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/85 shadow-sm shadow-slate-100/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-705 border border-slate-200/70 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Promotion Pass-Rate</span>
                  <span className="text-xl font-bold text-slate-950 font-mono leading-none mt-1">{stats.promotionRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Term Settings & Quick Control Config */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/85 space-y-5 lg:col-span-2 shadow-sm shadow-slate-100/30">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 font-mono">Active Academic Calendar Controls</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5 font-mono">Current Academic Term Selection</span>
                  <div className="flex gap-1.5">
                    {['1st Term', '2nd Term', '3rd Term'].map(t => (
                      <button
                        key={t}
                        onClick={() => updateTermConfig(t)}
                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition border font-mono ${
                          settings.currentTerm === t 
                            ? 'bg-slate-900 text-white border-slate-950 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5 font-mono">Authorized Academic Year Session</span>
                  <div className="font-bold text-xs text-slate-900 border border-slate-200 bg-white rounded-xl px-3 py-1.5 font-mono leading-none flex items-center justify-center h-8">
                    {settings.currentSession}
                  </div>
                </div>
              </div>

              {/* General Grading Scale review list */}
              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Official Evaluation Gradients Scale</span>
                  <span className="text-[10px] text-slate-400 italic font-medium">Ministry of Education Compliant Rules</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {settings.gradingScale.map(gs => (
                    <div key={gs.grade} className="px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-900">{gs.grade} ({gs.minScore}+ %)</span>
                      <span className="text-[9px] font-bold text-slate-800 italic leading-none font-mono uppercase">{gs.remark}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Broadcast Board Desk (Create announcements) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-blue-600" />
                  <h3 className="font-bold font-display text-sm text-gray-800 uppercase tracking-widest">Portal Broadcaster</h3>
                </div>
                <form onSubmit={submitAnnouncement} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Title e.g. Final Exams Update"
                      value={annForm.title}
                      onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter broadcaster instructions or message content..."
                      value={annForm.content}
                      onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition"
                  >
                    Broadcast Announcement Now
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STUDENTS REGISTER TAB */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black font-display text-gray-900 tracking-tight">OFFICIAL SCHOLAR REGISTER</h1>
              <p className="text-xs text-gray-500 mt-1">Enroll lists, edit demographics, change department fields, promote candidates.</p>
            </div>
            <div className="flex gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setBulkInputText('');
                  setBulkParsedRows([]);
                  setBulkValidationErrors([]);
                  setShowBulkImportModal(true);
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition"
              >
                <Upload size={16} /> Bulk Import CSV
              </button>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setStudentForm({ fullname: '', email: '', password: '', class_id: 'JSS1', department: 'None', gender: 'Male', parent_phone: '' });
                  setShowStudentModal(true);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition shrink-0"
              >
                <UserPlus size={16} /> Add Scholar Profile
              </button>
            </div>
          </div>

          {/* Search, Filter bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-150 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by student full name or admission code..."
              className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs text-gray-700 focus:outline-none bg-white font-semibold"
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
            >
              <option value="ALL">All Classrooms</option>
              {classes.map(cl => (
                <option key={cl.id} value={cl.id}>{cl.class_name}</option>
              ))}
            </select>
          </div>

          {/* Student profiles list Table */}
          <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-gray-700">
                <thead className="bg-gray-50/70 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Admission ID</th>
                    <th className="px-5 py-3">Full Name</th>
                    <th className="px-5 py-3">Classroom</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3 font-mono">Term Avg / Pos</th>
                    <th className="px-5 py-3 text-right">Actions Dashboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-7 text-gray-400 italic">No registered pupils matches active filtered indexes.</td>
                    </tr>
                  ) : (
                    filteredStudents.map(stud => (
                      <tr key={stud.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3 font-mono font-bold text-blue-900">{stud.admission_number}</td>
                        <td className="px-5 py-3 font-bold text-gray-900">{stud.fullname}</td>
                        <td className="px-5 py-3 font-semibold">{stud.class_level || stud.class_id}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            stud.department === 'Science' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            stud.department === 'Commercial' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            stud.department === 'Arts' ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {stud.department}
                          </span>
                        </td>
                        <td className="px-5 py-3">{stud.gender}</td>
                        <td className="px-5 py-3 font-mono font-bold text-gray-900">
                          {stud.average_score ? `${stud.average_score}%` : 'N/A'} 
                          <span className="text-amber-600 font-sans text-[11px] ml-1">({stud.position || 'Compute'})</span>
                        </td>
                        <td className="px-5 py-3 text-right space-x-1.5 shrink-0">
                          <button
                            title="Reset Portal Password"
                            onClick={() => {
                              setSelectedUserId(stud.id);
                              setShowPasswordModal(true);
                            }}
                            className="p-1.5 bg-gray-50 text-gray-500 rounded-lg border hover:bg-gray-100 transition inline-block align-middle"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            title="Edit Student Demographics"
                            onClick={() => {
                              setEditingStudent(stud);
                              setStudentForm({
                                fullname: stud.fullname,
                                email: stud.email || '',
                                password: '',
                                class_id: stud.class_id,
                                department: stud.department,
                                gender: stud.gender,
                                parent_phone: stud.parent_phone || ''
                              });
                              setShowStudentModal(true);
                            }}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition inline-block align-middle"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            title="Dismiss Student Data File"
                            onClick={() => deleteStudent(stud.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition inline-block align-middle"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHERS STAFF REGISTER TAB */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black font-display text-gray-900 tracking-tight">ACADEMIC TUTORS REGISTER</h1>
              <p className="text-xs text-gray-500 mt-1">Assign primary subject disciplines, classes, and setup login credentials.</p>
            </div>
            <button
              onClick={() => {
                setEditingTeacher(null);
                setTeacherForm({ fullname: '', email: '', password: '', phone: '', assigned_class: 'JSS1', assigned_subject: subjects[0]?.id || 'subj-math-jr' });
                setShowTeacherModal(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition"
            >
              <Plus size={16} /> Enroll Instructor Staff
            </button>
          </div>

          {/* Grid of registered teachers and profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map(t => {
              const subjMatch = subjects.find(s => s.id === t.assigned_subject);
              return (
                <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-150 flex flex-col justify-between shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 bg-blue-50 text-blue-600 font-bold flex items-center justify-center rounded-xl text-sm font-display">
                        T
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">{t.fullname}</h4>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">{t.email}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                      <div><strong className="text-gray-400">Assigned Room:</strong> <span className="font-bold text-gray-800">{t.assigned_class}</span></div>
                      <div><strong className="text-gray-400">Subject Class:</strong> <span className="font-bold text-gray-800">{subjMatch ? subjMatch.subject_name : t.assigned_subject}</span></div>
                      {t.phone && <div><strong className="text-gray-400">Primary Phone:</strong> <span className="font-mono text-gray-700">{t.phone}</span></div>}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-gray-100 pt-3 mt-3">
                    <button
                      title="Reset Portal Password"
                      onClick={() => {
                        setSelectedUserId(t.id);
                        setShowPasswordModal(true);
                      }}
                      className="p-1.5 bg-gray-50 border text-gray-500 rounded-lg hover:bg-gray-100 transition"
                    >
                      <Key size={14} />
                    </button>
                    <button
                      title="Edit assigned duties"
                      onClick={() => {
                        setEditingTeacher(t);
                        setTeacherForm({
                          fullname: t.fullname,
                          email: t.email,
                          password: '',
                          phone: t.phone || '',
                          assigned_class: t.assigned_class,
                          assigned_subject: t.assigned_subject
                        });
                        setShowTeacherModal(true);
                      }}
                      className="p-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      title="Delete profile"
                      onClick={() => deleteTeacher(t.id)}
                      className="p-1.5 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CURRICULUM MANAGEMENT: SUBJECTS & CLASSES */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of current program subjects */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display text-sm uppercase tracking-widest text-gray-800">Current Academic Curriculum</h3>
                <p className="text-[11px] text-gray-400">Classrooms level topics and departments limits.</p>
              </div>
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectForm({ subject_name: '', class_level: 'Junior', department: 'Core', is_active: true });
                  setShowSubjectModal(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Add Curriculum Topic
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700 border-collapse">
                <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                  <tr>
                    <th className="px-4 py-2">Subject Title</th>
                    <th className="px-3 py-2">Fittings</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjects.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-bold text-gray-900">{s.subject_name}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                          {s.class_level} ({s.department})
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-extrabold ${s.is_active ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {s.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSubject(s);
                            setSubjectForm({
                              subject_name: s.subject_name,
                              class_level: s.class_level,
                              department: s.department as any,
                              is_active: s.is_active
                            });
                            setShowSubjectModal(true);
                          }}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition inline-block align-middle"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => deleteSubject(s.id)}
                          className="p-1 hover:bg-red-50 text-red-600 rounded transition inline-block align-middle"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promotion overrides controllers */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 space-y-4">
            <h3 className="font-bold font-display text-sm uppercase tracking-widest text-gray-800">Terminal Class Promotions Panel</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              At the final conclusion of Third Term session evaluations, admin triggers academic advancement of scholars based on passing percentage threshold (Averages &gt;= 35%).
            </p>

            <div className="divide-y divide-gray-150 text-xs">
              {classes.map(cl => {
                const count = students.filter(s => s.class_id === cl.id).length;
                return (
                  <div key={cl.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <strong className="text-gray-900 block font-display">{cl.class_name} Room Index</strong>
                      <span className="text-[10px] text-gray-400 font-mono font-bold block">{count} Students currently registered.</span>
                    </div>
                    {cl.id !== 'SS3' && cl.id !== 'GRADUATED' ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => promoSessionClass(cl.id, 'Promoted')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] uppercase font-bold rounded-lg hover:bg-emerald-100 transition"
                        >
                          Adv / Pass
                        </button>
                        <button
                          onClick={() => promoSessionClass(cl.id, 'Repeated')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] uppercase font-bold rounded-lg hover:bg-rose-100 transition"
                        >
                          Hold / Repeat
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">SS3 Grad Class</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC CREATOR MODALS */}

      {/* 1. Scholar Register Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-md space-y-4">
            <h3 className="font-black font-display text-gray-900 uppercase text-sm tracking-wide border-b pb-2">
              {editingStudent ? 'Update Scholar File Demographics' : 'Enroll New Secondary Pupil'}
            </h3>
            <form onSubmit={handleStudentSubmit} className="space-y-3.5 text-xs text-gray-700">
              <div>
                <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Scholar Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. David Abiola Adeleke"
                  value={studentForm.fullname}
                  onChange={e => setStudentForm({ ...studentForm, fullname: e.target.value })}
                />
              </div>

              {!editingStudent && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Portal Login Access Email</label>
                    <input
                      type="email"
                      required
                      className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. adeleke@school.edu.ng"
                      value={studentForm.email}
                      onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Assigned Password</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border px-3.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Default: student123"
                      value={studentForm.password}
                      onChange={e => setStudentForm({ ...studentForm, password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Class Fitting Allocation</label>
                  <select
                    className="w-full bg-white rounded-xl border px-3.5 py-2 text-xs text-gray-700 focus:outline-none"
                    value={studentForm.class_id}
                    onChange={e => setStudentForm({ ...studentForm, class_id: e.target.value })}
                  >
                    {classes.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.class_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Senior Department (SS Only)</label>
                  <select
                    className="w-full bg-white rounded-xl border px-3.5 py-2 text-xs text-gray-700 focus:outline-none"
                    value={studentForm.department}
                    onChange={e => setStudentForm({ ...studentForm, department: e.target.value as any })}
                  >
                    <option value="None">Junior Classroom</option>
                    <option value="Science">Science (Physics/Chem)</option>
                    <option value="Commercial">Commercial (Business/Econ)</option>
                    <option value="Arts">Humanities (Gov/CRS/Lit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Gender</label>
                  <select
                    className="w-full bg-white rounded-xl border px-3.5 py-2 text-xs text-gray-700 focus:outline-none"
                    value={studentForm.gender}
                    onChange={e => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Parent Phone Alert (SMS)</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. +2348000001"
                    value={studentForm.parent_phone}
                    onChange={e => setStudentForm({ ...studentForm, parent_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3.5">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 border font-semibold text-xs text-gray-500 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 font-bold text-xs text-white rounded-xl hover:bg-blue-700 transition"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Teacher Register / Editor Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-md space-y-4">
            <h3 className="font-black font-display text-gray-900 uppercase text-sm tracking-wide border-b pb-2">
              {editingTeacher ? 'Amend Instructor Duties assignment' : 'Join Academic Teacher Register'}
            </h3>
            <form onSubmit={handleTeacherSubmit} className="space-y-3.5 text-xs text-gray-700">
              <div>
                <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Teacher Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Malam Gabriel Adebayo"
                  value={teacherForm.fullname}
                  onChange={e => setTeacherForm({ ...teacherForm, fullname: e.target.value })}
                />
              </div>

              {!editingTeacher && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Instructional Email</label>
                    <input
                      type="email"
                      required
                      className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. adebayo@academy.org"
                      value={teacherForm.email}
                      onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Secure Password</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border px-3.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Default: teacher123"
                      value={teacherForm.password}
                      onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Primary Phone</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="+234..."
                    value={teacherForm.phone}
                    onChange={e => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Form Classroom Duty</label>
                  <select
                    className="w-full bg-white rounded-xl border px-3.5 py-2 text-xs text-gray-700 focus:outline-none"
                    value={teacherForm.assigned_class}
                    onChange={e => setTeacherForm({ ...teacherForm, assigned_class: e.target.value })}
                  >
                    {classes.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.class_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Primary Subject Responsibility</label>
                <select
                  className="w-full bg-white rounded-xl border px-3.5 py-2 text-xs text-gray-700 focus:outline-none"
                  value={teacherForm.assigned_subject}
                  onChange={e => setTeacherForm({ ...teacherForm, assigned_subject: e.target.value })}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subject_name} ({s.class_level})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3.5">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 border font-semibold text-xs text-gray-500 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 font-bold text-xs text-white rounded-xl hover:bg-blue-700 transition"
                >
                  Assign Duty Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Password Reset Command Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-black font-display text-gray-900 uppercase text-xs tracking-wide">
              Override Credentials Access
            </h3>
            <form onSubmit={handlePasswordReset} className="space-y-3.5 text-xs text-gray-700">
              <div>
                <label className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Override Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter a secure override code..."
                  className="w-full rounded-xl border px-3.5 py-2 text-xs text-gray-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border font-semibold text-xs text-gray-500 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 font-bold text-xs text-white rounded-xl hover:bg-rose-700 transition"
                >
                  Execute Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Subject Creator Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-black font-display text-gray-950 uppercase text-sm tracking-wide">
              {editingSubject ? 'Update Topic Config' : 'Introduce New Curriculum Topic'}
            </h3>
            <form onSubmit={handleSubjectSubmit} className="space-y-3.5 text-xs text-gray-700">
              <div>
                <label className="font-bold text-gray-400 uppercase text-[9px] mb-1 block">Subject Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Civic Education / Chemistry"
                  value={subjectForm.subject_name}
                  onChange={e => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-400 uppercase text-[9px] mb-1 block">Education Category</label>
                  <select
                    className="w-full bg-white rounded-xl border px-3 py-2 text-xs"
                    value={subjectForm.class_level}
                    onChange={e => setSubjectForm({ ...subjectForm, class_level: e.target.value as any })}
                  >
                    <option value="Junior">Junior Section (JSS)</option>
                    <option value="Senior">Senior Section (SS)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-400 uppercase text-[9px] mb-1 block">Core Stream Group</label>
                  <select
                    className="w-full bg-white rounded-xl border px-3 py-2 text-xs"
                    value={subjectForm.department}
                    onChange={e => setSubjectForm({ ...subjectForm, department: e.target.value as any })}
                  >
                    <option value="Core">Base Core Subjects</option>
                    <option value="Science">Science (SS Only)</option>
                    <option value="Commercial">Commercial (SS Only)</option>
                    <option value="Arts">Humanities / Arts (SS Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border font-semibold text-xs text-gray-500 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 font-bold text-xs text-white rounded-xl"
                >
                  Deploy Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS MANAGER SECTION */}
      {activeTab === 'announcements' && (
        <div className="space-y-6 animate-fadeIn pb-12">
          <div>
            <h1 className="text-2xl font-black font-display text-gray-900 tracking-tight leading-none uppercase">School Broadcast Publications Desk</h1>
            <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wide">Configure announcements, manage draft notices, and publish notices securely.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Publisher form card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm shadow-slate-100/30">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 flex items-center gap-2 font-mono">
                <Volume2 size={16} className="text-blue-600 animate-pulse" /> {editingAnnId ? 'Edit Draft notice description' : 'Deploy New Gazette notification'}
              </h3>

              <form onSubmit={submitAnnouncement} className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Notice Heading Title</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    placeholder="e.g. End of Term Resumption Dates"
                    value={annForm.title}
                    onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Content Body Message</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    placeholder="Provide full description of the administrative guidelines..."
                    value={annForm.content}
                    onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Audience Target Channel</label>
                  <select
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans font-semibold"
                    value={annForm.target}
                    onChange={e => setAnnForm({ ...annForm, target: e.target.value })}
                  >
                    <option value="all">All (Staff & Pupils)</option>
                    <option value="staff">Academic Staff Only</option>
                    <option value="students">Student Registry Only</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annForm.published}
                      onChange={e => setAnnForm({ ...annForm, published: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">Publish Immediately to Dashboards</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  {editingAnnId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAnnId(null);
                        setAnnForm({ title: '', content: '', published: true, target: 'all' });
                      }}
                      className="px-4 py-2.5 border font-semibold text-[10.5px] uppercase tracking-wide text-slate-550 rounded-xl hover:bg-slate-50 transition font-mono"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-900 border border-slate-950 font-bold text-[10.5px] text-white uppercase rounded-xl hover:bg-slate-800 transition text-center font-mono tracking-wide"
                  >
                    {editingAnnId ? 'Update dispatch post' : 'Broadcast Dispatch'}
                  </button>
                </div>
              </form>
            </div>

            {/* List of announcements */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm shadow-slate-100/30 lg:col-span-2">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 font-mono">Current Administrative Dispatches Archive</h3>

              {annLoading ? (
                <div className="text-center py-10 font-mono text-slate-400 text-xs">Loading publications list...</div>
              ) : adminAnnouncements.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic font-mono text-xs border border-dashed border-slate-250 rounded-2xl">No bulletins logged in system archives.</div>
              ) : (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-50 text-[9.5px] font-bold text-slate-400 uppercase border-b border-slate-200/60 font-mono">
                      <tr>
                        <th className="px-4 py-3">Heading / Content</th>
                        <th className="px-4 py-3">Publication Status</th>
                        <th className="px-4 py-3">Dispatched Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {adminAnnouncements.map((ann) => (
                        <tr key={ann.id} className="hover:bg-slate-50/50 transition duration-150">
                          <td className="px-4 py-3 max-w-xs sm:max-w-sm">
                            <div className="font-bold text-slate-900 text-xs tracking-tight line-clamp-1">{ann.title}</div>
                            <div className="text-slate-405 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">{ann.content}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10.5px]">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9.5px] font-bold uppercase rounded-full border ${
                              ann.published ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {ann.published ? 'Published' : 'Draft Copy'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400 text-[10.5px] whitespace-nowrap">{ann.date || 'Today'}</td>
                          <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingAnnId(ann.id);
                                setAnnForm({ title: ann.title, content: ann.content, published: !!ann.published, target: ann.target || 'all' });
                              }}
                              className="px-2 py-1 border border-slate-200 text-slate-600 bg-white font-bold text-[10px] rounded-lg hover:border-slate-350 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleAnnPublish(ann)}
                              className={`px-2 py-1 font-bold text-[10px] rounded-lg border transition ${
                                ann.published ? 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {ann.published ? 'Draft' : 'Publish'}
                            </button>
                            <button
                              onClick={() => deleteAnnouncement(ann.id)}
                              className="p-1 px-1.5 bg-rose-50 text-rose-600 border border-rose-100 font-bold text-[10px] rounded-lg hover:bg-rose-100 transition inline-block align-middle"
                            >
                              Retract
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="animate-fadeIn pb-12">
          <AcademicCalendar role="admin" />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="animate-fadeIn pb-12">
          <AuditLogView />
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="animate-fadeIn pb-12">
          <AttendanceManager role="admin" />
        </div>
      )}

      {/* 6. BULK IMPORT STUDENT DATA DIALOGUE MODAL */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border shadow-xl p-6 w-full max-w-3xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center border">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <h3 className="font-black font-display uppercase text-sm tracking-wide text-gray-950">Bulk Student File Registration</h3>
                  <span className="text-xs text-slate-500 font-medium font-sans">Batch upload scholar registers via paste or standard CSV selector</span>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkImportModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
              >
                Close Dialog
              </button>
            </div>

            {/* Instruction block */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[11px] leading-relaxed text-slate-600 space-y-2 font-sans">
              <span className="font-bold text-slate-800 uppercase font-mono block tracking-wider text-[10px]">Data Layout Standard Format (Columns order):</span>
              <code className="block bg-white p-2.5 border rounded-lg font-mono text-[10px] text-slate-800 overflow-x-auto whitespace-pre">
                fullname, email, password, class_id, department, gender, parent_phone
              </code>
              <div className="flex items-center gap-1.5 pt-1 font-mono text-[9.5px] font-bold text-slate-400 uppercase">
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-ping" />
                <span>Example: "Musa Ibrahim, musa@school.edu.ng, pass123, JSS1, None, Male, 08012345678"</span>
              </div>
            </div>

            {/* Paste Area and File Input */}
            <div className="space-y-3 font-sans">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Direct Paste csv lines</label>
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold font-mono text-[10.5px] cursor-pointer hover:bg-blue-100 transition">
                    <Upload size={13} /> Select Local File (.csv)
                    <input 
                      type="file" 
                      accept=".csv,text/csv" 
                      className="hidden" 
                      onChange={handleFileSelect} 
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={5}
                className="w-full text-xs font-mono rounded-2xl border px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="Paste your comma-separated records here..."
                value={bulkInputText}
                onChange={e => {
                  setBulkInputText(e.target.value);
                  handleCSVUpload(e.target.value);
                }}
              />
            </div>

            {/* Error notifications & Pre-flight Validation Checklist */}
            {bulkParsedRows.length > 0 && (
              <div className="space-y-3 animate-fadeIn">
                <h4 className="font-bold uppercase tracking-widest text-[9.5px] text-slate-500 font-mono">Pre-Flight Student Validation Feedback ({bulkParsedRows.length} scholars)</h4>
                
                {bulkValidationErrors.length > 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-[11px] font-mono flex items-start gap-2 max-h-32 overflow-y-auto">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block text-rose-800 uppercase font-sans text-[10px]">Rectify Column Errors prior to enrollment:</strong>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {bulkValidationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {bulkValidationErrors.length === 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-[11px] font-mono flex items-center gap-2">
                    <CheckCircle size={15} />
                    <span>Pre-flight validations passed successfully. All row columns match portal registration rules seamlessly.</span>
                  </div>
                )}

                <div className="border rounded-xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                  <table className="w-full text-left font-sans text-[11px]">
                    <thead className="bg-slate-50 text-[9px] text-slate-400 font-mono font-bold uppercase border-b">
                      <tr>
                        <th className="px-3 py-1.5">Scholar Name</th>
                        <th className="px-3 py-1.5">Access Login</th>
                        <th className="px-3 py-1.5">Class / Dept</th>
                        <th className="px-3 py-1.5">Check Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[10.5.px]">
                      {bulkParsedRows.map((r, i) => (
                        <tr key={i} className={r.status === 'invalid' ? 'bg-rose-50/20' : 'bg-white'}>
                          <td className="px-3 py-1.5 font-bold text-slate-800 font-sans">{r.fullname || <span className="text-rose-600">[Empty]</span>}</td>
                          <td className="px-3 py-1.5 text-slate-500 truncate max-w-[140px]">{r.email || <span className="text-rose-650">[Missing]</span>}</td>
                          <td className="px-3 py-1.5 font-semibold">{r.class_id} ({r.department})</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-block px-2 text-[9px] font-bold rounded-full ${
                              r.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {r.status === 'valid' ? 'Valid Ready' : 'Row Error'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3.5 border-t">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="px-4 py-2.5 border border-slate-205 text-slate-500 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkParsedRows.length === 0 || bulkValidationErrors.length > 0 || bulkImportProcessing}
                onClick={commitBulkImport}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {bulkImportProcessing ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing files...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Commit Batch Import ({bulkParsedRows.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

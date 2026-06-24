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
  CheckCircle, 
  HelpCircle, 
  User, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Volume2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { 
  StudentDetail, 
  Subject, 
  Result, 
  SchoolClass, 
  SystemSettings, 
  TeacherProfile,
  GradeScaleEntry
} from '../types';
import SchoolReportCard from './SchoolReportCard';
import AcademicCalendar from './AcademicCalendar';

interface StudentDashboardProps {
  studentId: string;
  activeTab: string;
  settings: SystemSettings;
}

export default function StudentDashboard({ studentId, activeTab, settings }: StudentDashboardProps) {
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const fetchStudentBoardData = async () => {
    setLoading(true);
    try {
      const [studRes, annRes] = await Promise.all([
        fetch(`/api/students/${studentId}`).then(r => r.json()),
        fetch('/api/announcements?publishedOnly=true').then(r => r.json())
      ]);
      setStudentDetail(studRes);
      setAnnouncements(annRes);

      // Pre-load evaluation companion insights
      try {
        const anaRes = await fetch(`/api/ai/analyze-student-results?studentId=${studentId}&term=${encodeURIComponent(settings.currentTerm)}&session=${encodeURIComponent(settings.currentSession)}`);
        const anaData = await anaRes.json();
        if (anaRes.ok && !anaData.error && anaData.status !== 'not_generated') {
          setAnalysis(anaData);
        }
      } catch (e) {
        console.warn('Silent analytics preload error', e);
      }
    } catch (e) {
      console.error('Student panel reloader failure', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentBoardData();
  }, [studentId, activeTab]);

  if (loading || !studentDetail) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Filter approved results for active Term/Session
  const currentResults = (studentDetail.results || []).filter(
    r => r.term === settings.currentTerm && r.session === settings.currentSession
  );

  const isResultsReleased = settings.resultReleased || 
    (!!settings.resultPublishScheduled && !!settings.resultPublishTime && new Date() >= new Date(settings.resultPublishTime));

  const visibleAnnouncements = announcements.filter(
    ann => !ann.target || ann.target === 'all' || ann.target === 'students'
  );

  return (
    <div className="space-y-6">
      
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Welcome Scholar card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="inline-block px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/60 rounded-md text-[10px] font-bold uppercase font-mono tracking-wider">Active Academic Card</div>
              <h1 className="text-2xl font-bold font-display tracking-tight leading-none">Welcome Back, {studentDetail.fullname}!</h1>
              <p className="text-xs text-slate-400">Study hard, stay steadfast in revisions, track terminal grade cards.</p>
            </div>
            
            <div className="flex gap-2.5 font-mono">
              <div className="px-3.5 py-2 bg-slate-800 border border-slate-700/60 rounded-xl text-center text-xs">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Class Pos</span>
                <strong className="text-sm font-bold text-amber-400">{isResultsReleased ? (studentDetail.position || 'Computing') : 'Restricted'}</strong>
              </div>
              <div className="px-3.5 py-2 bg-slate-800 border border-slate-700/60 rounded-xl text-center text-xs">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Term Average</span>
                <strong className="text-sm font-bold text-slate-100">{isResultsReleased ? `${studentDetail.average_score}%` : 'Restricted'}</strong>
              </div>
            </div>
          </div>

          {/* AI ACADEMIC ADVISOR INSIGHTS OVERVIEW */}
          {isResultsReleased && analysis && (
            <div className="bg-violet-50/40 border border-violet-100 rounded-3xl p-6 space-y-4 shadow-sm shadow-violet-105/10 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2 bg-violet-600/10 text-violet-700 font-bold uppercase font-mono tracking-wider text-[9.5px] rounded-lg flex items-center gap-1.5 w-fit">
                  <Sparkles size={13} className="animate-pulse" /> Gemini Academic Advisor Summary
                </div>
                <div className="text-[10px] text-slate-450 font-mono font-medium">FORMULATED FOR THE ACTIVE TERM REVIEW</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-2xs space-y-1.5">
                  <strong className="block text-violet-700 uppercase tracking-widest text-[9px] font-mono">Academic Strengths</strong>
                  <p className="text-slate-650 leading-relaxed text-[11px] font-sans italic">{analysis.strongestSubjects}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-2xs space-y-1.5">
                  <strong className="block text-amber-700 uppercase tracking-widest text-[9px] font-mono">Opportunities for Growth</strong>
                  <p className="text-slate-650 leading-relaxed text-[11px] font-sans italic">{analysis.areasForImprovement}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-2xs space-y-1.5">
                  <strong className="block text-orange-700 uppercase tracking-widest text-[9px] font-mono">Strategic Action Plan</strong>
                  <p className="text-slate-650 leading-relaxed text-[11px] font-sans italic">{analysis.actionableAdvice}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Scholar demographics registry */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm shadow-slate-100/30">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 font-mono">Academic Profile Folder</h3>
              
              <div className="space-y-3 pt-2 text-xs text-slate-650 leading-relaxed font-sans">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Admission Number Code:</span>
                  <span className="font-extrabold text-slate-900 font-mono text-[11px]">{studentDetail.admission_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Classroom Fitting:</span>
                  <span className="font-bold text-slate-800">{studentDetail.class_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Department Stream:</span>
                  <span className="font-semibold text-slate-800">{studentDetail.department || 'Junior Section'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Gender:</span>
                  <span className="font-semibold text-slate-800">{studentDetail.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Parent Phone (SMS alerts):</span>
                  <span className="font-mono text-slate-800 font-semibold">{studentDetail.parent_phone}</span>
                </div>
              </div>
            </div>

            {/* Announcements Broadcaster list */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm shadow-slate-100/30 lg:col-span-2">
              <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 flex items-center gap-2 font-mono"><Volume2 size={15} className="text-slate-700" /> Administrative Broadcasters</h3>
              
              <div className="space-y-4 divide-y divide-slate-100">
                {visibleAnnouncements.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 italic text-xs">Broadcaster lines are clear.</div>
                ) : (
                  visibleAnnouncements.map((ann, idx) => (
                    <div key={ann.id} className={`pt-4 ${idx === 0 ? 'pt-0 border-t-0' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-xs text-slate-950 font-display uppercase tracking-wide">{ann.title}</h4>
                        <span className="text-[9px] text-slate-400 font-bold font-mono bg-slate-55 px-2 py-0.5 rounded border border-slate-100">{ann.date}</span>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed font-sans">{ann.content}</p>
                      <span className="text-[10px] block text-slate-500 font-mono mt-1.5 font-bold uppercase tracking-wide">Dispatched: {ann.by}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DETAILED SCHOOL REPORT SHEET TAB */}
      {activeTab === 'report-card' && (
        <div className="space-y-6">
          {isResultsReleased ? (
            <SchoolReportCard
              student={studentDetail}
              gradingScale={settings.gradingScale}
              currentTerm={settings.currentTerm}
              currentSession={settings.currentSession}
            />
          ) : settings.resultPublishScheduled && settings.resultPublishTime ? (
            <div className="bg-white p-12 text-center border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-100/50 max-w-lg mx-auto flex flex-col items-center gap-4">
              <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm shadow-blue-50">
                <Printer size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-950 uppercase font-display tracking-wider">Scheduled Publication Configured</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-sm mt-1">
                  Your terminal grades are scheduled to be published on: <strong className="text-slate-800 font-mono block mt-1.5">{new Date(settings.resultPublishTime).toLocaleString()}</strong>
                </p>
              </div>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded border border-slate-200/50 animate-pulse">Automatic portal release processing</p>
            </div>
          ) : (
            <div className="bg-white p-12 text-center border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-100/50 max-w-lg mx-auto flex flex-col items-center gap-4">
              <div className="h-14 w-14 bg-amber-50 text-amber-650 rounded-2xl flex items-center justify-center border border-amber-200 shadow-sm shadow-amber-50">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-950 uppercase font-display tracking-wider">Terminal Results Restricted</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-sm mt-1">
                  Terminal grading reports for {settings.currentTerm} Session {settings.currentSession} are currently locked under security validations by the Principal Seat.
                </p>
              </div>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">Consult teacher form tutor for administrative release schedules.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="animate-fadeIn pb-12">
          <AcademicCalendar role="student" />
        </div>
      )}

      {/* Broadcaster duplicate tab for easy access */}
      {activeTab === 'announcements' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm shadow-slate-100/30">
          <h3 className="font-bold font-display text-[11px] uppercase tracking-widest text-slate-800 flex items-center gap-2 font-mono"><Volume2 size={15} className="text-slate-700" /> Campus Broadcaster Feeds</h3>
          <div className="space-y-4 divide-y divide-slate-150">
            {visibleAnnouncements.length === 0 ? (
              <div className="text-center py-6 text-slate-400 italic text-xs">Broadcaster lines are clear.</div>
            ) : (
              visibleAnnouncements.map((ann, idx) => (
                <div key={ann.id} className={`pt-4 ${idx === 0 ? 'pt-0 border-t-0' : ''} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 font-display uppercase tracking-wide">{ann.title}</h4>
                    <span className="text-[9px] text-slate-400 font-mono">{ann.date}</span>
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed font-sans">{ann.content}</p>
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Signed: {ann.by}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}

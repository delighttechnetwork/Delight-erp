/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Printer, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  SquareUser,
  Sparkles,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { StudentDetail, Result, GradeScaleEntry } from '../types';

interface SchoolReportCardProps {
  student: StudentDetail;
  gradingScale: GradeScaleEntry[];
  currentTerm: string;
  currentSession: string;
}

export default function SchoolReportCard({ student, gradingScale, currentTerm, currentSession }: SchoolReportCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<{ strongestSubjects: string; areasForImprovement: string; actionableAdvice: string; humanSummary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = async () => {
    try {
      const res = await fetch(`/api/ai/analyze-student-results?studentId=${student.id}&term=${encodeURIComponent(currentTerm)}&session=${encodeURIComponent(currentSession)}`);
      const data = await res.json();
      if (res.ok && !data.error && data.status !== 'not_generated') {
        setAnalysis(data);
      }
    } catch (e) {
      console.warn('Silent analytics load error:', e);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze-student-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          term: currentTerm,
          session: currentSession
        })
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setAnalysis(data);
      } else {
        setError(data.error || 'Failed to generate advisory suggestions.');
      }
    } catch (e) {
      setError('An error occurred while calling the academic analysis advisor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAnalysis(null);
    setError(null);
    loadAnalysis();
  }, [student.id, currentTerm, currentSession]);

  // Filter results for current term & session
  const activeResults = (student.results || []).filter(
    (r) => r.term === currentTerm && r.session === currentSession
  );

  const totalPossibleScore = activeResults.length * 100;
  const totalObtainedScore = activeResults.reduce((acc, r) => acc + r.total, 0);
  const classAvg = activeResults.length > 0 ? (totalObtainedScore / activeResults.length).toFixed(1) : '0';

  // Find general GPA performance status
  const studentAverage = Number(classAvg);
  const isPassing = studentAverage >= 35;

  const handlePrint = () => {
    window.print();
  };

  // Helper matching colors for matching items
  const getBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'B': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'C': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'D': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'E': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  return (
    <div className="w-full">
      {/* Action buttons (hidden on system print) */}
      <div className="no-print flex flex-wrap gap-3 items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Official School Report Card Utility</h3>
          <p className="text-xs text-gray-500">Formulated under current terminal sessions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
          >
            <Printer size={15} />
            Print Report Card
          </button>
        </div>
      </div>

      {/* Official Report Container */}
      <div 
        ref={printRef}
        className="print-card bg-white p-8 max-w-4xl mx-auto border border-gray-200 shadow-lg rounded-2xl relative overflow-hidden"
      >
        {/* Ribbon for active promotion */}
        {currentTerm === '3rd Term' && (
          <div className="absolute top-0 right-0 h-28 w-28 no-print">
            <div className={`absolute transform rotate-45 text-center text-[10px] font-bold text-white py-1.5 tracking-wider uppercase shadow-md w-44 top-7 -right-8 ${
              isPassing ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {isPassing ? 'Promoted' : 'Repeat Class'}
            </div>
          </div>
        )}

        {/* School Header Letterhead */}
        <div className="flex flex-col sm:flex-row items-center border-b-4 border-double border-slate-900 pb-5 mb-6 gap-4">
          <div className="h-20 w-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl border-2 border-slate-950 shadow-md flex-shrink-0 font-display">
            DTN
          </div>
          <div className="text-center sm:text-left flex-grow space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-950 uppercase font-display tracking-tight leading-none">
              Delight Tech International Academy
            </h1>
            <p className="text-xs text-slate-500 font-bold tracking-wider uppercase font-mono">
              Main Campus: Delight Plaza, Victoria Island, Lagos, Nigeria
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Email: delighttechnetwork@gmail.com | Portal ID: {student.admission_number || 'OFFICIAL_ERP'}
            </p>
            <div className="inline-block px-3 py-1 bg-slate-900 text-slate-100 font-bold rounded-lg text-[9px] uppercase font-mono tracking-widest mt-1.5 border border-slate-950">
              Terminal Academic Progress Sheet
            </div>
          </div>
        </div>

        {/* Student Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50/75 rounded-2xl border border-slate-200/85 mb-6 text-xs text-slate-700 leading-relaxed font-sans">
          
          {/* Avatar Passport */}
          <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
            {student.passport ? (
              <img 
                src={student.passport} 
                className="h-24 w-24 rounded-xl object-cover border border-slate-900 shadow-sm"
                alt="Passport"
              />
            ) : (
              <div className="h-24 w-24 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1 select-none">
                <SquareUser size={28} />
                <span className="text-[8px] font-semibold text-slate-500 uppercase font-mono">No Passport</span>
              </div>
            )}
            <div className="text-[10px] font-bold text-slate-900 font-mono mt-2 uppercase tracking-wider">{student.admission_number}</div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Student Full Name</span>
              <span className="font-bold text-slate-950 text-sm font-display">{student.fullname}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Class Level</span>
                <span className="font-bold text-slate-800">{student.class_name}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Department</span>
                <span className="font-bold text-slate-800">{student.department || 'None'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Gender</span>
                <span className="font-bold text-slate-800">{student.gender}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Academic Session</span>
                <span className="font-mono font-bold text-slate-800">{currentSession}</span>
              </div>
            </div>
          </div>

          {/* Key Terminal Stats Badges */}
          <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Term Period</span>
              <span className="font-bold text-slate-900">{currentTerm}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Class Position / Rank</span>
              <span className="font-sans font-bold text-lg text-slate-900 font-mono">{student.position || 'Computing...'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[9px] block font-mono">Academic Status</span>
              {currentTerm === '3rd Term' ? (
                <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase ${isPassing ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPassing ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                  {isPassing ? 'Promoted' : 'Repeat Class'}
                </span>
              ) : (
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">Active Attendance</span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Subject Results Matrix */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-6 shadow-sm">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-slate-900 text-white font-semibold text-[9px] uppercase tracking-wider border-b border-slate-950">
              <tr>
                <th className="px-4 py-3 pb-2.5">Subject Name</th>
                <th className="px-3 py-3 pb-2.5 text-center">CA (20)</th>
                <th className="px-3 py-3 pb-2.5 text-center">Assign (10)</th>
                <th className="px-3 py-3 pb-2.5 text-center">Test (10)</th>
                <th className="px-3 py-3 pb-2.5 text-center">Exam (60)</th>
                <th className="px-3 py-3 pb-2.5 text-center font-bold">Total (100)</th>
                <th className="px-3 py-3 pb-2.5 text-center">Grade</th>
                <th className="px-4 py-3 pb-2.5">Subject Teacher Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {activeResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 italic font-mono text-xs">
                    No approved terminal subjects results found for this period.
                  </td>
                </tr>
              ) : (
                activeResults.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 transition-colors font-sans">
                    <td className="px-4 py-3 font-semibold text-slate-900">{res.subject_name}</td>
                    <td className="px-3 py-3 text-center font-mono">{res.ca}</td>
                    <td className="px-3 py-3 text-center font-mono">{res.assignment}</td>
                    <td className="px-3 py-3 text-center font-mono">{res.test}</td>
                    <td className="px-3 py-3 text-center font-mono">{res.exam}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-950 font-mono">{res.total}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-bold font-mono border ${getBadgeColor(res.grade)}`}>
                        {res.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 italic text-slate-500 text-[11px] max-w-xs truncate" title={res.remark}>
                      {res.remark}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Academic Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
          <div className="space-y-2 font-sans text-slate-700">
            <h4 className="font-bold text-slate-950 uppercase tracking-widest text-[9px] font-mono">Terminal Grade Summative</h4>
            <div className="space-y-1 leading-normal">
              <div className="flex justify-between">
                <span>Number of Subjects Written:</span>
                <span className="font-bold font-mono text-slate-950">{activeResults.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Obtainable Terminal Marks:</span>
                <span className="font-mono text-slate-650">{totalPossibleScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Agreed Overall Obtained Score:</span>
                <span className="font-bold font-mono text-slate-950">{totalObtainedScore}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5">
                <span className="font-bold text-slate-900">Terminal Term Average (%):</span>
                <span className="font-black font-mono text-slate-950 text-sm">{classAvg}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
            <h4 className="font-bold text-slate-950 uppercase tracking-widest text-[9px] font-mono">Official School Grading Key</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              {gradingScale.map((scale) => (
                <div key={scale.grade} className="flex items-center gap-1 font-mono">
                  <span className="font-bold text-slate-800 w-5">{scale.grade}:</span>
                  <span>{scale.minScore}-{scale.maxScore}%</span>
                  <span className="text-slate-400 italic">({scale.remark})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI ACADEMIC ADVISOR ANALYSIS (HUMAN-CENTRIC GRADE COMPANION) */}
        <div className="no-print border border-violet-200/80 bg-violet-50/20 rounded-2xl p-5 mb-6 shadow-sm shadow-violet-100/10 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-slate-950 uppercase tracking-widest text-[9.5px] font-mono">Academic AI Mentor Advisor</h4>
                <p className="text-[10px] text-slate-500">Deep, humanized terminal grade diagnostics & actionable tutoring strategies.</p>
              </div>
            </div>
            {!analysis && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || activeResults.length === 0}
                className="px-3.5 py-1.5 bg-violet-600 font-bold text-[10.5px] uppercase tracking-wide text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-violet-200 transition"
              >
                {loading ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Sparkles size={12} />
                )}
                Analyze Report Card
              </button>
            )}
            {analysis && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="text-[10px] bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold px-2.5 py-1 rounded-lg transition"
              >
                {loading ? 'Refreshing...' : 'Refresh Insights'}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-6 text-center space-y-2"
              >
                <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                <p className="text-xs text-violet-600 font-medium animate-pulse font-mono uppercase tracking-wider text-[9px]">Gathering subject scores & formulating personalized guidance...</p>
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 border border-red-100"
              >
                <AlertTriangle size={14} />
                <span className="font-semibold">{error}</span>
              </motion.div>
            )}

            {analysis && !loading && (
              <motion.div
                key="analysis-result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs leading-relaxed"
              >
                <div className="bg-white p-4 rounded-xl border border-violet-100/80 shadow-xs space-y-1.5">
                  <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wide flex items-center gap-1 w-fit">
                    <CheckCircle size={10} /> Strongest Disciplines
                  </span>
                  <p className="text-slate-650 leading-relaxed text-[11px] font-sans italic">{analysis.strongestSubjects}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-violet-100/80 shadow-xs space-y-1.5">
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wide flex items-center gap-1 w-fit">
                    <TrendingUp size={10} /> Fields of growth
                  </span>
                  <p className="text-slate-650 leading-relaxed text-[11px] font-sans italic">{analysis.areasForImprovement}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-violet-100/80 shadow-xs space-y-1.5 md:col-span-1">
                  <span className="font-bold text-orange-700 bg-orange-55 px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wide flex items-center gap-1 w-fit">
                    <Lightbulb size={10} /> Actionable Strategies
                  </span>
                  <p className="text-slate-650 leading-relaxed text-[11px] font-sans italic">{analysis.actionableAdvice}</p>
                </div>
              </motion.div>
            )}

            {!analysis && !loading && !error && (
              <div className="text-center py-4 text-slate-400 italic text-[11px] font-sans">
                Click the "Analyze Report Card" button to generate personalized mentoring advice.
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* PRINTABLE ONLY COMPONENT (ONLY VISIBLE ON SYSTEM PRINT TO BE COHESIVE WITH PHYSICAL REPORT SHEETS) */}
        {analysis && (
          <div className="print-only hidden p-4 border border-slate-300 rounded-2xl bg-slate-50/50 mb-6 space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-widest text-[9px] font-mono border-b pb-1">AI Academic Advisor Assessment</h4>
            <div className="grid grid-cols-2 gap-4 text-[10px] leading-relaxed">
              <div>
                <strong className="block text-slate-800 tracking-wide uppercase text-[8px] font-mono">Strongest Core Disciplines:</strong>
                <p className="italic text-slate-650">{analysis.strongestSubjects}</p>
              </div>
              <div>
                <strong className="block text-slate-800 tracking-wide uppercase text-[8px] font-mono">Areas Requiring Study Adaptations:</strong>
                <p className="italic text-slate-650">{analysis.areasForImprovement}</p>
              </div>
            </div>
            <div className="text-[10px] leading-relaxed pt-2 border-t border-dashed">
              <strong className="block text-slate-800 tracking-wide uppercase text-[8px] font-mono">Practical Advice Checklist:</strong>
              <p className="italic text-slate-655">{analysis.actionableAdvice}</p>
            </div>
          </div>
        )}

        {/* Official Assessment Remarks Section */}
        <div className="space-y-4 mb-8">
          <div>
            <h4 className="font-bold text-slate-950 uppercase tracking-widest text-[9px] mb-1.5 font-mono">General Class Teacher Comments</h4>
            <div className="p-3 bg-slate-50/75 border border-slate-200 rounded-xl italic text-slate-600 leading-relaxed text-[11px] font-sans">
              {activeResults.length > 0 && activeResults[0].remark 
                ? activeResults[0].remark 
                : "A diligent scholar showing active classroom compliance. Continued dedication to mathematics and arts will unleash higher records next session."}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-slate-950 uppercase tracking-widest text-[9px] font-mono">Administrative Principal Remarks</h4>
              <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 uppercase tracking-wider font-mono">
                <ShieldCheck size={11} strokeWidth={2.5} /> Verified Academic Entry
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl italic text-slate-800 leading-relaxed text-[11px] font-sans font-medium">
              {activeResults.length > 0 && activeResults.some(r => r.principal_remark)
                ? activeResults.find(r => r.principal_remark)?.principal_remark
                : "Remarkable dedication and growth evident this term. Fully recommended to stay steadfast in academic assignments and revision cycles."}
            </div>
          </div>
        </div>

        {/* Autograph / Verification Badges Section */}
        <div className="grid grid-cols-3 gap-4 border-t border-dashed border-slate-300 pt-6 text-center text-xs text-slate-500 mb-2">
          <div className="space-y-1">
            <div className="h-8 flex items-end justify-center">
              <span className="font-serif italic font-semibold text-slate-400">Class Teacher Autograph</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 font-bold uppercase text-[9px] tracking-wide text-slate-700 font-mono">Class Form Tutor</div>
          </div>
          <div className="space-y-1">
            <div className="h-8 flex items-end justify-center select-none no-print">
              <div className="inline-flex px-3.5 py-0.5 border border-red-500 rounded text-red-500 text-[10px] font-bold font-serif uppercase tracking-widest rotate-[-3deg] leading-none">
                APPROVED
              </div>
            </div>
            <div className="border-t border-slate-200 pt-1.5 font-bold uppercase text-[9px] tracking-wide text-gray-700 font-mono">Official Portal Status</div>
          </div>
          <div className="space-y-1">
            <div className="h-8 flex items-end justify-center text-slate-900 select-none">
              <span className="font-serif italic text-slate-900 font-bold text-[13px] tracking-widest leading-none">Delight Obi</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 font-bold uppercase text-[9px] tracking-wide text-slate-700 font-mono">Principal Sign-Off</div>
          </div>
        </div>

      </div>
    </div>
  );
}

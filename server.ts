/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  User,
  StudentProfile,
  TeacherProfile,
  Subject,
  Result,
  SchoolClass,
  GradeScaleEntry,
  SystemSettings
} from './src/types';

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '10mb' }));

const DB_FILE = path.join(process.cwd(), 'server-db.json');

// LAZY GEMINI API CLIENT INITIALIZATION (to prevent startup crash if API key is not yet set)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 5) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('Gemini AI initialized successfully.');
    } else {
      console.warn('GEMINI_API_KEY is not configured or placeholder detected. Running AI features in intelligent local fallback mode.');
    }
  }
  return aiClient;
}

// DEFAULT GRADING SCALE
const defaultGradingScale: GradeScaleEntry[] = [
  { minScore: 70, maxScore: 100, grade: 'A', remark: 'Excellent', color: 'emerald' },
  { minScore: 60, maxScore: 69, grade: 'B', remark: 'Very Good', color: 'blue' },
  { minScore: 50, maxScore: 59, grade: 'C', remark: 'Good', color: 'indigo' },
  { minScore: 45, maxScore: 49, grade: 'D', remark: 'Fair', color: 'yellow' },
  { minScore: 40, maxScore: 44, grade: 'E', remark: 'Pass', color: 'orange' },
  { minScore: 0, maxScore: 39, grade: 'F', remark: 'Fail', color: 'red' },
];

// INITIAL SEED DATA
const initialDB = {
  users: [
    { id: 'usr-admin', fullname: 'Delight Portal Admin', email: 'admin@school.com', password: 'admin', role: 'admin', created_at: new Date().toISOString() },
    { id: 'usr-principal', fullname: 'Dr. Mrs. Victoria Adelaja', email: 'principal@school.com', password: 'principal', role: 'principal', created_at: new Date().toISOString() },
    { id: 'usr-t1', fullname: 'Mr. Samuel Alao', email: 'teacher1@school.com', password: 'teacher', role: 'teacher', created_at: new Date().toISOString() },
    { id: 'usr-t2', fullname: 'Mrs. Fatima Yusuf', email: 'teacher2@school.com', password: 'teacher', role: 'teacher', created_at: new Date().toISOString() },
    { id: 'usr-t3', fullname: 'Malam Ibrahim Danjuma', email: 'teacher3@school.com', password: 'teacher', role: 'teacher', created_at: new Date().toISOString() },
    { id: 'usr-s1', fullname: 'John Okafor', email: 'student1@school.com', password: 'student', role: 'student', created_at: new Date().toISOString() },
    { id: 'usr-s2', fullname: 'David Adeleke', email: 'student2@school.com', password: 'student', role: 'student', created_at: new Date().toISOString() },
    { id: 'usr-s3', fullname: 'Grace Johnson', email: 'student3@school.com', password: 'student', role: 'student', created_at: new Date().toISOString() },
    { id: 'usr-s4', fullname: 'Chioma Nwachukwu', email: 'student4@school.com', password: 'student', role: 'student', created_at: new Date().toISOString() },
    { id: 'usr-s5', fullname: 'Kelechi Egwu', email: 'student5@school.com', password: 'student', role: 'student', created_at: new Date().toISOString() },
  ] as Array<User & { password?: string }>,

  students: [
    { id: 'usr-s1', admission_number: 'ADM/2024/001', fullname: 'John Okafor', class_id: 'SS3', department: 'Arts', gender: 'Male', passport: '', status: 'Active', parent_phone: '+2348033334444', created_at: new Date().toISOString() },
    { id: 'usr-s2', admission_number: 'ADM/2024/002', fullname: 'David Adeleke', class_id: 'SS2', department: 'Science', gender: 'Male', passport: '', status: 'Active', parent_phone: '+2348012345678', created_at: new Date().toISOString() },
    { id: 'usr-s3', admission_number: 'ADM/2024/003', fullname: 'Grace Johnson', class_id: 'SS1', department: 'Commercial', gender: 'Female', passport: '', status: 'Active', parent_phone: '+2348022223333', created_at: new Date().toISOString() },
    { id: 'usr-s4', admission_number: 'ADM/2025/001', fullname: 'Chioma Nwachukwu', class_id: 'JSS1', department: 'None', gender: 'Female', passport: '', status: 'Active', parent_phone: '+2348044445555', created_at: new Date().toISOString() },
    { id: 'usr-s5', admission_number: 'ADM/2025/002', fullname: 'Kelechi Egwu', class_id: 'JSS1', department: 'None', gender: 'Male', passport: '', status: 'Active', parent_phone: '+2348055556666', created_at: new Date().toISOString() },
  ] as StudentProfile[],

  teachers: [
    { id: 'usr-t1', fullname: 'Mr. Samuel Alao', phone: '+2348035552222', email: 'teacher1@school.com', assigned_class: 'JSS1', assigned_subject: 'subj-math-jr' },
    { id: 'usr-t2', fullname: 'Mrs. Fatima Yusuf', phone: '+2348035553333', email: 'teacher2@school.com', assigned_class: 'SS2', assigned_subject: 'subj-phys-sr' },
    { id: 'usr-t3', fullname: 'Malam Ibrahim Danjuma', phone: '+2348035554444', email: 'teacher3@school.com', assigned_class: 'SS3', assigned_subject: 'subj-eng-sr' },
  ] as TeacherProfile[],

  classes: [
    { id: 'JSS1', class_name: 'JSS1', section: 'Junior' },
    { id: 'JSS2', class_name: 'JSS2', section: 'Junior' },
    { id: 'JSS3', class_name: 'JSS3', section: 'Junior' },
    { id: 'SS1', class_name: 'SS1', section: 'Senior' },
    { id: 'SS2', class_name: 'SS2', section: 'Senior' },
    { id: 'SS3', class_name: 'SS3', section: 'Senior' },
  ] as SchoolClass[],

  subjects: [
    // Junior Subjects
    { id: 'subj-eng-jr', subject_name: 'English Language', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-math-jr', subject_name: 'Mathematics', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-sci-jr', subject_name: 'Basic Science', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-tech-jr', subject_name: 'Basic Technology', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-bus-jr', subject_name: 'Business Studies', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-soc-jr', subject_name: 'Social Studies', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-crs-jr', subject_name: 'CRS', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-civ-jr', subject_name: 'Civic Education', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-comp-jr', subject_name: 'Computer Studies', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-yor-jr', subject_name: 'Yoruba', class_level: 'Junior', department: 'Core', is_active: true },
    { id: 'subj-agri-jr', subject_name: 'Agricultural Science', class_level: 'Junior', department: 'Core', is_active: true },

    // Senior Subjects
    { id: 'subj-eng-sr', subject_name: 'English Language', class_level: 'Senior', department: 'Core', is_active: true },
    { id: 'subj-math-sr', subject_name: 'Mathematics', class_level: 'Senior', department: 'Core', is_active: true },
    { id: 'subj-civ-sr', subject_name: 'Civic Education', class_level: 'Senior', department: 'Core', is_active: true },
    { id: 'subj-comp-sr', subject_name: 'Computer Studies', class_level: 'Senior', department: 'Core', is_active: true },
    { id: 'subj-phys-sr', subject_name: 'Physics', class_level: 'Senior', department: 'Science', is_active: true },
    { id: 'subj-chem-sr', subject_name: 'Chemistry', class_level: 'Senior', department: 'Science', is_active: true },
    { id: 'subj-biol-sr', subject_name: 'Biology', class_level: 'Senior', department: 'Science', is_active: true },
    { id: 'subj-fmath-sr', subject_name: 'Further Mathematics', class_level: 'Senior', department: 'Science', is_active: true },
    { id: 'subj-agri-sr', subject_name: 'Agricultural Science', class_level: 'Senior', department: 'Science', is_active: true },
    { id: 'subj-comm-sr', subject_name: 'Commerce', class_level: 'Senior', department: 'Commercial', is_active: true },
    { id: 'subj-acc-sr', subject_name: 'Accounting', class_level: 'Senior', department: 'Commercial', is_active: true },
    { id: 'subj-econ-sr', subject_name: 'Economics', class_level: 'Senior', department: 'Commercial', is_active: true },
    { id: 'subj-mark-sr', subject_name: 'Marketing', class_level: 'Senior', department: 'Commercial', is_active: true },
    { id: 'subj-gov-sr', subject_name: 'Government', class_level: 'Senior', department: 'Arts', is_active: true },
    { id: 'subj-lit-sr', subject_name: 'Literature in English', class_level: 'Senior', department: 'Arts', is_active: true },
    { id: 'subj-hist-sr', subject_name: 'History', class_level: 'Senior', department: 'Arts', is_active: true },
    { id: 'subj-crs-sr', subject_name: 'CRS', class_level: 'Senior', department: 'Arts', is_active: true },
    { id: 'subj-art-sr', subject_name: 'Fine Art', class_level: 'Senior', department: 'Arts', is_active: true },
  ] as Subject[],

  results: [
    // Chioma JSS1 (Math)
    { id: 'res-1', student_id: 'usr-s4', subject_id: 'subj-math-jr', term: '3rd Term', session: '2025/2026', ca: 16, assignment: 8, test: 7, exam: 54, total: 85, grade: 'A', remark: 'Excellent', teacher_id: 'usr-t1', approved: 'approved', principal_remark: 'Outstanding growth in analytical thinking.' },
    { id: 'res-2', student_id: 'usr-s4', subject_id: 'subj-eng-jr', term: '3rd Term', session: '2025/2026', ca: 15, assignment: 9, test: 8, exam: 51, total: 83, grade: 'A', remark: 'Excellent', teacher_id: 'usr-t1', approved: 'approved', principal_remark: 'Demonstrates deep literary mastery.' },
    
    // Kelechi JSS1 (Math)
    { id: 'res-3', student_id: 'usr-s5', subject_id: 'subj-math-jr', term: '3rd Term', session: '2025/2026', ca: 10, assignment: 6, test: 5, exam: 25, total: 46, grade: 'D', remark: 'Fair', teacher_id: 'usr-t1', approved: 'approved', principal_remark: 'Satisfactory but there is room for improvement.' },
    { id: 'res-4', student_id: 'usr-s5', subject_id: 'subj-eng-jr', term: '3rd Term', session: '2025/2026', ca: 12, assignment: 7, test: 6, exam: 35, total: 60, grade: 'B', remark: 'Very Good', teacher_id: 'usr-t1', approved: 'approved', principal_remark: 'Consistent efforts have shown progress.' },

    // David SS2 (Physics/Physics teacher)
    { id: 'res-5', student_id: 'usr-s2', subject_id: 'subj-phys-sr', term: '3rd Term', session: '2025/2026', ca: 18, assignment: 9, test: 9, exam: 52, total: 88, grade: 'A', remark: 'Excellent', teacher_id: 'usr-t2', approved: 'approved', principal_remark: 'An exceptional scientific mind. Keep it up.' },
    { id: 'res-6', student_id: 'usr-s2', subject_id: 'subj-chem-sr', term: '3rd Term', session: '2025/2026', ca: 14, assignment: 8, test: 8, exam: 42, total: 72, grade: 'A', remark: 'Excellent', teacher_id: 'usr-t2', approved: 'approved', principal_remark: 'Brilliant conceptual comprehension.' },

    // John SS3 (English Language teacher)
    { id: 'res-7', student_id: 'usr-s1', subject_id: 'subj-eng-sr', term: '3rd Term', session: '2025/2026', ca: 13, assignment: 7, test: 8, exam: 41, total: 69, grade: 'B', remark: 'Very Good', teacher_id: 'usr-t3', approved: 'approved', principal_remark: 'Commendable grammar mastery and presentation.' },
    { id: 'res-8', student_id: 'usr-s1', subject_id: 'subj-gov-sr', term: '3rd Term', session: '2025/2026', ca: 12, assignment: 6, test: 6, exam: 33, total: 57, grade: 'C', remark: 'Good', teacher_id: 'usr-t3', approved: 'approved', principal_remark: 'Consistent study brings higher achievement.' },

    // Grace SS1 (Commercial) - Results awaiting approval
    { id: 'res-9', student_id: 'usr-s3', subject_id: 'subj-econ-sr', term: '3rd Term', session: '2025/2026', ca: 11, assignment: 7, test: 6, exam: 32, total: 56, grade: 'C', remark: 'Good', teacher_id: 'usr-t2', approved: 'pending' },
  ] as Result[],

  announcements: [
    { id: 'ann-1', title: 'Third Term Result Release Announcement', content: 'The continuous assessments and examination grades for JSS and SS classes have been processed. Principal evaluation process is currently finalising.', date: new Date().toLocaleDateString(), by: 'Principal Office', published: true }
  ] as any[],

  calendarEvents: [
    { id: 'cal-1', title: 'Resumption for 3rd Term', type: 'Term Date', startDate: '2026-05-04', endDate: '2026-05-05', description: 'Academic activities begin fully for all classes.', published: true, term: '3rd Term', session: '2025/2026' },
    { id: 'cal-2', title: 'Mid-Term Break', type: 'Holiday', startDate: '2026-06-15', endDate: '2026-06-19', description: 'Mid-term break to rest and revise schoolwork.', published: true, term: '3rd Term', session: '2025/2026' },
    { id: 'cal-3', title: 'End of Term Examinations', type: 'Exam Period', startDate: '2026-07-20', endDate: '2026-07-31', description: 'Final promotional assessments for all JSS and SS pupils.', published: true, term: '3rd Term', session: '2025/2026' }
  ] as any[],

  auditLogs: [
    { id: 'aud-1', timestamp: new Date().toISOString(), action: 'System Setup', category: 'Auth', actorName: 'Delight Portal Admin', actorEmail: 'admin@school.com', actorRole: 'admin', details: 'Delight School Management System bootstrapped successfully.' }
  ] as any[],

  attendance: [
    { id: 'att-1', studentId: 'usr-s4', studentName: 'Chioma Nwachukwu', classId: 'JSS1', date: '2026-06-18', status: 'Present', comments: 'Early', markedBy: 'Mr. Samuel Alao' },
    { id: 'att-2', studentId: 'usr-s5', studentName: 'Kelechi Egwu', classId: 'JSS1', date: '2026-06-18', status: 'Absent', comments: 'Excused', markedBy: 'Mr. Samuel Alao' }
  ] as any[],

  studentAnalytics: {} as Record<string, any>,

  settings: {
    currentSession: '2025/2026',
    currentTerm: '3rd Term',
    gradingScale: defaultGradingScale,
    resultReleased: true,
    resultPublishScheduled: false,
    resultPublishTime: null
  } as SystemSettings
};

// LOAD DB OR INITIALIZE IF ABSENT
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    let changed = false;
    
    // Backfill new properties safely if they do not exist
    if (!parsed.calendarEvents) {
      parsed.calendarEvents = initialDB.calendarEvents;
      changed = true;
    }
    if (!parsed.auditLogs) {
      parsed.auditLogs = initialDB.auditLogs;
      changed = true;
    }
    if (!parsed.attendance) {
      parsed.attendance = initialDB.attendance;
      changed = true;
    }
    if (!parsed.studentAnalytics) {
      parsed.studentAnalytics = {};
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error('Error reading DB, using fresh initialDB', err);
    return initialDB;
  }
}

function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to write database file', err);
  }
}

function logAction(req: any, action: string, category: 'Grades' | 'Results' | 'Users' | 'Calendar' | 'Attendance' | 'Auth', details: string, dbOverride?: any) {
  const db = dbOverride || getDB();
  let actorName = 'System Anonymous';
  let actorEmail = 'anonymous@school.com';
  let actorRole: any = 'student';

  if (req) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['sessionId'];
    if (sessionId) {
      const u = db.users.find((userObj: any) => userObj.id === sessionId);
      if (u) {
        actorName = u.fullname;
        actorEmail = u.email;
        actorRole = u.role;
      }
    }
  }

  const newLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    action,
    category,
    actorName,
    actorEmail,
    actorRole,
    details
  };

  db.auditLogs.unshift(newLog);
  if (!dbOverride) {
    saveDB(db);
  }
}

// GRADE CALCULATION HELPERS BASED ON SETTINGS
function calculateGrade(total: number, gradingScale: GradeScaleEntry[]) {
  const matched = gradingScale.find(gs => total >= gs.minScore && total <= gs.maxScore);
  return matched || { grade: 'F', remark: 'Fail' };
}

// POSITION RANKING ENGINE
// Students with equal scores share the same rank (e.g. 1st, 2nd, 2nd, 4th)
function computeClassRankings(classId: string, term: string, session: string) {
  const db = getDB();
  const classStudents = db.students.filter((s: StudentProfile) => s.class_id === classId);
  const classResults = db.results.filter((r: Result) => r.term === term && r.session === session && r.approved === 'approved');

  const studentPerformance = classStudents.map((student: StudentProfile) => {
    const studentResults = classResults.filter((r: Result) => r.student_id === student.id);
    const resultCount = studentResults.length;
    const totalScore = studentResults.reduce((acc: number, r: Result) => acc + r.total, 0);
    const averageScore = resultCount > 0 ? Number((totalScore / resultCount).toFixed(2)) : 0;

    return {
      studentId: student.id,
      totalScore,
      averageScore,
      resultCount
    };
  });

  // Sort by total score descending
  studentPerformance.sort((a: any, b: any) => b.totalScore - a.totalScore);

  // Assign dense/shared ranking
  let currentRank = 1;
  let prevScore: number | null = null;
  let sharedOffset = 0;

  const rankings: Record<string, { rank: string; total: number; avg: number }> = {};

  studentPerformance.forEach((perf: any, idx: number) => {
    if (perf.resultCount === 0) {
      rankings[perf.studentId] = { rank: 'N/A', total: 0, avg: 0 };
      return;
    }

    if (prevScore !== null && perf.totalScore < prevScore) {
      currentRank += sharedOffset;
      sharedOffset = 1;
    } else {
      sharedOffset++;
    }

    prevScore = perf.totalScore;

    // Helper to format English cardinal indicators (1st, 2nd, 3rd, etc)
    const suffix = (rankNum: number) => {
      const v = rankNum % 100;
      return rankNum + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th');
    };

    rankings[perf.studentId] = {
      rank: suffix(currentRank),
      total: perf.totalScore,
      avg: perf.averageScore
    };
  });

  return rankings;
}

// ================= API ENDPOINTS =================

// Helper to manually parse cookies
function parseCookies(cookieHeader?: string) {
  const cookies: { [key: string]: string } = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials. Please verify your email and password.' });
  }

  // Clone and hide credentials
  const sessionUser = { ...user };
  delete sessionUser.password;

  // Set HTTP-only Cookie for session state
  res.setHeader('Set-Cookie', `sessionId=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json({ user: sessionUser });
});

app.get('/api/me', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['sessionId'];

  if (!sessionId) {
    return res.status(401).json({ message: 'Unauthorized. No active session.' });
  }

  const db = getDB();
  const user = db.users.find((u: any) => u.id === sessionId);

  if (!user) {
    return res.status(401).json({ message: 'Session user not found.' });
  }

  const sessionUser = { ...user };
  delete sessionUser.password;

  res.json({ user: sessionUser });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 2. Class List & CRUD
app.get('/api/classes', (req, res) => {
  const db = getDB();
  res.json(db.classes);
});

app.post('/api/classes', (req, res) => {
  const { class_name, section } = req.body;
  const db = getDB();
  const id = class_name.toUpperCase().replace(/\s+/g, '');
  
  if (db.classes.find((c: SchoolClass) => c.id === id)) {
    return res.status(400).json({ message: 'Class name already exists.' });
  }

  const newClass: SchoolClass = { id, class_name, section };
  db.classes.push(newClass);
  saveDB(db);
  res.status(201).json(newClass);
});

app.delete('/api/classes/:id', (req, res) => {
  const db = getDB();
  db.classes = db.classes.filter((c: SchoolClass) => c.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// 3. Subject List & CRUD
app.get('/api/subjects', (req, res) => {
  const db = getDB();
  res.json(db.subjects);
});

app.post('/api/subjects', (req, res) => {
  const { id, subject_name, class_level, department, is_active } = req.body;
  const db = getDB();
  
  if (id) {
    // Edit existing subject
    db.subjects = db.subjects.map((sub: Subject) => {
      if (sub.id === id) {
        return { ...sub, subject_name, class_level, department, is_active };
      }
      return sub;
    });
    saveDB(db);
    return res.json({ success: true, message: 'Subject updated successfully' });
  }

  // Create new subject
  const newId = `subj-${subject_name.toLowerCase().substring(0, 4).trim()}-${class_level === 'Junior' ? 'jr' : 'sr'}-${Math.floor(100 + Math.random() * 900)}`;
  const newSubject: Subject = {
    id: newId,
    subject_name,
    class_level,
    department,
    is_active: is_active ?? true
  };
  
  db.subjects.push(newSubject);
  saveDB(db);
  res.status(201).json(newSubject);
});

app.delete('/api/subjects/:id', (req, res) => {
  const db = getDB();
  db.subjects = db.subjects.filter((s: Subject) => s.id !== req.params.id);
  // Optional: archive or delete results associated with that subject
  saveDB(db);
  res.json({ success: true });
});

// 4. Students Profiles & Computed Report Cards
app.get('/api/students', (req, res) => {
  const db = getDB();
  const settings = db.settings;

  // Enhance each student with emails, compute rankings
  const enhanced = db.students.map((stud: StudentProfile) => {
    const userMatch = db.users.find((u: any) => u.id === stud.id);
    const classMatch = db.classes.find((c: SchoolClass) => c.id === stud.class_id);

    // Compute active performance statistics
    const classRanks = computeClassRankings(stud.class_id, settings.currentTerm, settings.currentSession);
    const rankInfo = classRanks[stud.id] || { rank: 'N/A', total: 0, avg: 0 };

    // Auto promotion evaluations on overall summary term (3rd Term)
    let promotion_status: any = 'Pending';
    if (settings.currentTerm === '3rd Term') {
      promotion_status = (rankInfo.avg >= 35) ? 'Promoted' : 'Repeated';
    }

    // Override manual principal overrides or updates if active
    if (stud.status === 'Promoted') promotion_status = 'Promoted';
    if (stud.status === 'Repeated') promotion_status = 'Repeated';

    return {
      ...stud,
      email: userMatch ? userMatch.email : '',
      class_name: classMatch ? classMatch.class_name : stud.class_id,
      total_score: rankInfo.total,
      average_score: rankInfo.avg,
      position: rankInfo.rank,
      promotion_status
    };
  });

  res.json(enhanced);
});

app.get('/api/students/:id', (req, res) => {
  const db = getDB();
  const student = db.students.find((s: StudentProfile) => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found.' });
  }

  const userMatch = db.users.find((u: any) => u.id === student.id);
  const classMatch = db.classes.find((c: SchoolClass) => c.id === student.class_id);

  // Load term results
  const termResults = db.results
    .filter((r: Result) => r.student_id === student.id)
    .map((r: Result) => {
      const subjMatch = db.subjects.find((s: Subject) => s.id === r.subject_id);
      const teacherMatch = db.teachers.find((t: TeacherProfile) => t.id === r.teacher_id);
      return {
        ...r,
        subject_name: subjMatch ? subjMatch.subject_name : 'Unknown Subject',
        teacher_name: teacherMatch ? teacherMatch.fullname : 'Assigned Teacher'
      };
    });

  const settings = db.settings;
  const classRanks = computeClassRankings(student.class_id, settings.currentTerm, settings.currentSession);
  const rankInfo = classRanks[student.id] || { rank: 'N/A', total: 0, avg: 0 };

  const studentDetail = {
    ...student,
    email: userMatch ? userMatch.email : '',
    class_name: classMatch ? classMatch.class_name : student.class_id,
    results: termResults,
    total_score: rankInfo.total,
    average_score: rankInfo.avg,
    position: rankInfo.rank,
    promotion_status: (settings.currentTerm === '3rd Term') ? (rankInfo.avg >= 35 ? 'Promoted' : 'Repeated') : 'Pending'
  };

  res.json(studentDetail);
});

// Create student with user login
app.post('/api/students', (req, res) => {
  const { fullname, email, password, class_id, department, gender, parent_phone } = req.body;
  const db = getDB();

  if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: 'A user with this email already exists.' });
  }

  const studentId = `usr-s-${Date.now()}`;
  
  // 1. Add User account
  db.users.push({
    id: studentId,
    fullname,
    email,
    password: password || 'student123',
    role: 'student',
    created_at: new Date().toISOString()
  });

  // Calculate generic admission registration code
  const yr = new Date().getFullYear();
  const index = db.students.length + 1;
  const admission_number = `ADM/${yr}/${String(index).padStart(3, '0')}`;

  // 2. Add Student profile
  const newStudent: StudentProfile = {
    id: studentId,
    admission_number,
    fullname,
    class_id,
    department: department || 'None',
    gender,
    passport: '',
    status: 'Active',
    parent_phone,
    created_at: new Date().toISOString()
  };

  db.students.push(newStudent);
  saveDB(db);

  res.status(201).json(newStudent);
});

// Bulk Import Student Data
app.post('/api/students/bulk', (req, res) => {
  const { students: importRows } = req.body;
  const db = getDB();
  const errors: string[] = [];
  const validStudents: any[] = [];
  const validUsers: any[] = [];
  
  if (!Array.isArray(importRows)) {
    return res.status(400).json({ message: 'Invalid payload. Expecting a list of students.' });
  }

  const existingEmails = new Set(db.users.map((u: any) => u.email.toLowerCase()));
  const incomingEmails = new Set<string>();
  const validClasses = new Set(db.classes.map((c: any) => c.id));

  importRows.forEach((row: any, index: number) => {
    const rowNum = index + 1;
    const fullname = row.fullname?.trim();
    const email = row.email?.trim()?.toLowerCase();
    const class_id = row.class_id?.trim()?.toUpperCase();
    const department = row.department?.trim() || 'None';
    const gender = row.gender?.trim();
    const parent_phone = row.parent_phone?.trim() || '';
    const password = row.password?.trim() || 'student123';

    if (!fullname) {
      errors.push(`Row ${rowNum}: Student Full Name is required.`);
      return;
    }
    if (!email) {
      errors.push(`Row ${rowNum}: Email address is required.`);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push(`Row ${rowNum}: '${email}' is not a valid email format.`);
      return;
    }
    if (existingEmails.has(email)) {
      errors.push(`Row ${rowNum}: Email '${email}' is already registered in the system.`);
      return;
    }
    if (incomingEmails.has(email)) {
      errors.push(`Row ${rowNum}: Duplicate email '${email}' detected in the uploaded file.`);
      return;
    }
    if (!class_id || !validClasses.has(class_id)) {
      errors.push(`Row ${rowNum}: Class ID '${class_id || ''}' does not exist in registered classes.`);
      return;
    }
    const standardGender = gender ? (gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()) : '';
    if (standardGender !== 'Male' && standardGender !== 'Female') {
      errors.push(`Row ${rowNum}: Gender must be 'Male' or 'Female'. Provided: '${gender || ''}'`);
      return;
    }
    const standardDept = department ? (department.charAt(0).toUpperCase() + department.slice(1).toLowerCase()) : 'None';
    const validDeps = ['Science', 'Commercial', 'Arts', 'None'];
    if (!validDeps.includes(standardDept)) {
      errors.push(`Row ${rowNum}: Department must be Science, Commercial, Arts, or None.`);
      return;
    }

    incomingEmails.add(email);

    const studentId = `usr-s-${Date.now()}-${index}`;
    const yr = new Date().getFullYear();
    const nextIdx = db.students.length + validStudents.length + 1;
    const admission_number = `ADM/${yr}/${String(nextIdx).padStart(3, '0')}`;

    validUsers.push({
      id: studentId,
      fullname,
      email,
      password,
      role: 'student',
      created_at: new Date().toISOString()
    });

    validStudents.push({
      id: studentId,
      admission_number,
      fullname,
      class_id,
      department: standardDept as any,
      gender: standardGender as any,
      passport: '',
      status: 'Active',
      parent_phone,
      created_at: new Date().toISOString()
    });
  });

  if (errors.length > 0) {
    return res.status(400).json({ errors, success: false });
  }

  // Insert all and save
  db.users.push(...validUsers);
  db.students.push(...validStudents);
  saveDB(db);

  return res.json({ success: true, count: validStudents.length });
});

app.put('/api/students/:id', (req, res) => {
  const { fullname, class_id, department, gender, parent_phone, status, passport } = req.body;
  const db = getDB();
  
  // Update students
  db.students = db.students.map((s: StudentProfile) => {
    if (s.id === req.params.id) {
      return {
        ...s,
        fullname: fullname ?? s.fullname,
        class_id: class_id ?? s.class_id,
        department: department ?? s.department,
        gender: gender ?? s.gender,
        parent_phone: parent_phone ?? s.parent_phone,
        status: status ?? s.status,
        passport: passport ?? s.passport
      };
    }
    return s;
  });

  // Keep fullname in user account synched
  if (fullname) {
    db.users = db.users.map((u: any) => {
      if (u.id === req.params.id) {
        return { ...u, fullname };
      }
      return u;
    });
  }

  saveDB(db);
  res.json({ success: true, message: 'Student profile updated' });
});

app.delete('/api/students/:id', (req, res) => {
  const db = getDB();
  db.students = db.students.filter((s: StudentProfile) => s.id !== req.params.id);
  db.users = db.users.filter((u: any) => u.id !== req.params.id);
  db.results = db.results.filter((r: Result) => r.student_id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// 5. Teachers CRUD
app.get('/api/teachers', (req, res) => {
  const db = getDB();
  res.json(db.teachers);
});

app.post('/api/teachers', (req, res) => {
  const { fullname, email, password, phone, assigned_class, assigned_subject } = req.body;
  const db = getDB();

  if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: 'A user with this email account already exists.' });
  }

  const teacherId = `usr-t-${Date.now()}`;

  // Join Login DB
  db.users.push({
    id: teacherId,
    fullname,
    email,
    password: password || 'teacher123',
    role: 'teacher',
    created_at: new Date().toISOString()
  });

  // Create Profile
  const newTeacher: TeacherProfile = {
    id: teacherId,
    fullname,
    phone,
    email,
    assigned_class,
    assigned_subject
  };

  db.teachers.push(newTeacher);
  saveDB(db);
  res.status(201).json(newTeacher);
});

app.put('/api/teachers/:id', (req, res) => {
  const { fullname, phone, assigned_class, assigned_subject } = req.body;
  const db = getDB();

  db.teachers = db.teachers.map((t: TeacherProfile) => {
    if (t.id === req.params.id) {
      return {
        ...t,
        fullname: fullname ?? t.fullname,
        phone: phone ?? t.phone,
        assigned_class: assigned_class ?? t.assigned_class,
        assigned_subject: assigned_subject ?? t.assigned_subject
      };
    }
    return t;
  });

  if (fullname) {
    db.users = db.users.map((u: any) => {
      if (u.id === req.params.id) {
        return { ...u, fullname };
      }
      return u;
    });
  }

  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/teachers/:id', (req, res) => {
  const db = getDB();
  db.teachers = db.teachers.filter((t: TeacherProfile) => t.id !== req.params.id);
  db.users = db.users.filter((u: any) => u.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// 6. Principal Accounts
app.get('/api/principals', (req, res) => {
  const db = getDB();
  const principalUsers = db.users.filter((u: any) => u.role === 'principal');
  res.json(principalUsers);
});

app.post('/api/principals', (req, res) => {
  const { fullname, email, password } = req.body;
  const db = getDB();

  if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: 'User already exists.' });
  }

  const pUserId = `usr-p-${Date.now()}`;
  const newPrincipal = {
    id: pUserId,
    fullname,
    email,
    password: password || 'principal123',
    role: 'principal' as const,
    created_at: new Date().toISOString()
  };

  db.users.push(newPrincipal);
  saveDB(db);
  res.status(201).json(newPrincipal);
});

// 7. Academic results entry and approvals
app.get('/api/results', (req, res) => {
  const db = getDB();
  const resultsWithDetails = db.results.map((r: Result) => {
    const studentMatch = db.students.find((s: StudentProfile) => s.id === r.student_id);
    const subjectMatch = db.subjects.find((s: Subject) => s.id === r.subject_id);
    const teacherMatch = db.teachers.find((t: TeacherProfile) => t.id === r.teacher_id);
    
    return {
      ...r,
      student_name: studentMatch ? studentMatch.fullname : 'Unknown Student',
      student_class: studentMatch ? studentMatch.class_id : 'N/A',
      student_admission: studentMatch ? studentMatch.admission_number : 'N/A',
      subject_name: subjectMatch ? subjectMatch.subject_name : 'Unknown Subject',
      teacher_name: teacherMatch ? teacherMatch.fullname : 'System'
    };
  });
  res.json(resultsWithDetails);
});

app.post('/api/results', (req, res) => {
  const { student_id, subject_id, term, session, ca, assignment, test, exam, teacher_id, id } = req.body;
  const db = getDB();
  const settings = db.settings;

  // Numerical sanitizations
  const nCA = Number(ca || 0);
  const nAssign = Number(assignment || 0);
  const nTest = Number(test || 0);
  const nExam = Number(exam || 0);
  const total = nCA + nAssign + nTest + nExam;

  // Grade allocations
  const matchedGrade = calculateGrade(total, settings.gradingScale);

  if (id) {
    // Edit score
    db.results = db.results.map((r: Result) => {
      if (r.id === id) {
        if (r.approved === 'approved') {
          // Rule constraint: block manual adjustment of already approved items
          return r;
        }
        return {
          ...r,
          ca: nCA,
          assignment: nAssign,
          test: nTest,
          exam: nExam,
          total,
          grade: matchedGrade.grade,
          remark: matchedGrade.remark,
          approved: 'pending' // Re-approvals
        };
      }
      return r;
    });
    logAction(req, 'Grade Modification', 'Grades', `Modified result score for student (ID: ${student_id}), subject: ${subject_id}. CA: ${nCA}, Assignment: ${nAssign}, Test: ${nTest}, Exam: ${nExam}, Total: ${total}`, db);
    saveDB(db);
    return res.json({ success: true, message: 'Result marks successfully saved' });
  }

  // Create score
  const newResult: Result = {
    id: `res-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    student_id,
    subject_id,
    term: term || settings.currentTerm,
    session: session || settings.currentSession,
    ca: nCA,
    assignment: nAssign,
    test: nTest,
    exam: nExam,
    total,
    grade: matchedGrade.grade,
    remark: matchedGrade.remark,
    teacher_id,
    approved: 'pending'
  };

  db.results.push(newResult);
  logAction(req, 'Grade Entry Created', 'Grades', `Recorded new result entry for student (ID: ${student_id}), subject: ${subject_id}. CA: ${nCA}, Assignment: ${nAssign}, Test: ${nTest}, Exam: ${nExam}, Total: ${total}`, db);
  saveDB(db);
  res.status(201).json(newResult);
});

// Bulk Result Upload
app.post('/api/results/bulk', (req, res) => {
  const { class_id, subject_id, scores, teacher_id } = req.body; // scores: array of { student_id, ca, assignment, test, exam }
  const db = getDB();
  const settings = db.settings;
  let added = 0;

  scores.forEach((sc: any) => {
    const nCA = Number(sc.ca || 0);
    const nAssign = Number(sc.assignment || 0);
    const nTest = Number(sc.test || 0);
    const nExam = Number(sc.exam || 0);
    const total = nCA + nAssign + nTest + nExam;
    const grading = calculateGrade(total, settings.gradingScale);

    // Check if result already exists for the student, subject, term, and session
    const existingIndex = db.results.findIndex(
      (r: Result) =>
        r.student_id === sc.student_id &&
        r.subject_id === subject_id &&
        r.term === settings.currentTerm &&
        r.session === settings.currentSession
    );

    if (existingIndex > -1) {
      if (db.results[existingIndex].approved !== 'approved') {
        db.results[existingIndex] = {
          ...db.results[existingIndex],
          ca: nCA,
          assignment: nAssign,
          test: nTest,
          exam: nExam,
          total,
          grade: grading.grade,
          remark: grading.remark,
          approved: 'pending'
        };
      }
    } else {
      db.results.push({
        id: `res-bk-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        student_id: sc.student_id,
        subject_id,
        term: settings.currentTerm,
        session: settings.currentSession,
        ca: nCA,
        assignment: nAssign,
        test: nTest,
        exam: nExam,
        total,
        grade: grading.grade,
        remark: grading.remark,
        teacher_id,
        approved: 'pending'
      });
    }
    added++;
  });

  logAction(req, 'Bulk Grade Import', 'Grades', `Imported / updated result scores in bulk for ${added} students. Subject: ${subject_id}`, db);
  saveDB(db);
  res.json({ success: true, message: `Successfully registered ${added} academic results.` });
});

// Principal approves / rejects
app.post('/api/results/evaluate', (req, res) => {
  const { result_id, approval, principal_remark } = req.body; // approval: 'approved' | 'rejected'
  const db = getDB();

  db.results = db.results.map((r: Result) => {
    if (r.id === result_id) {
      return {
        ...r,
        approved: approval,
        principal_remark: principal_remark ?? r.principal_remark
      };
    }
    return r;
  });

  const targetResult = db.results.find((r: Result) => r.id === result_id);
  const details = targetResult ? `Student Subject ID: ${targetResult.subject_id}, Student ID: ${targetResult.student_id}` : `Result ID: ${result_id}`;
  logAction(req, 'Result Evaluation', 'Results', `Principal evaluated result state to [${approval}] for ${details}. Remark: ${principal_remark || 'None'}`, db);

  saveDB(db);
  res.json({ success: true, message: `Result evaluated: ${approval}` });
});

// Batch evaluation for principal
app.post('/api/results/evaluate-batch', (req, res) => {
  const { result_ids, approval } = req.body;
  const db = getDB();

  db.results = db.results.map((r: Result) => {
    if (result_ids.includes(r.id)) {
      return {
        ...r,
        approved: approval
      };
    }
    return r;
  });

  logAction(req, 'Batch Result Evaluation', 'Results', `Principal batch-evaluated ${result_ids.length} scores to state: [${approval}]`, db);

  saveDB(db);
  res.json({ success: true, message: `Batch evaluation performed on ${result_ids.length} records.` });
});

// ================= COGNATIVE ADDONS =================

// 1. Forgot Password Workflow using Supabase Auth with Simulated Graceful Fallback
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  const db = getDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    logAction(null, 'Auth Reset Failed', 'Auth', `Failed reset credentials request for unregistered email: ${email}`, db);
    return res.status(404).json({ message: 'This email account is not registered to any student, teacher or administrator.' });
  }

  // Check process environment variables for Supabase integration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'MY_SUPABASE_URL') {
    try {
      // Lazy-loading supabase-js module
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.origin || 'http://localhost:3000'}/reset-password?email=${encodeURIComponent(email)}`
      });

      if (error) throw error;

      logAction(null, 'Password Reset Dispatched', 'Auth', `Supabase Auth secure password reset verification dispatched: ${email}`, db);
      return res.json({
        success: true,
        provider: 'supabase',
        message: 'A secure password reset verification link has been emailed to your inbox via Supabase Auth successfully.'
      });
    } catch (err: any) {
      console.error('Supabase application reset error. Defending with fallback simulation.', err);
    }
  }

  // Simulated Verification email flow (offline preview modes)
  const token = `tok-sim-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600 * 1000; // 1 hour token validity window
  saveDB(db);

  const resetLink = `${req.headers.origin || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  logAction(null, 'Password Reset Dispatched', 'Auth', `Simulated secure reset token generated for user email: ${email}`, db);

  res.json({
    success: true,
    provider: 'simulated',
    resetLink,
    message: 'A simulated password reset message was dispatched successfully! (Running offline preview; the verification link is displayed below for testing convenience).'
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, password } = req.body;
  const db = getDB();

  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: 'User account not located.' });
  }

  if (token) {
    if (user.resetToken !== token || (user.resetTokenExpiry && Date.now() > user.resetTokenExpiry)) {
      return res.status(400).json({ message: 'The verification recovery link has expired or is invalid.' });
    }
  }

  user.password = password;
  delete user.resetToken;
  delete user.resetTokenExpiry;
  saveDB(db);

  logAction(null, 'Reset Password Completed', 'Auth', `User password successfully changed via token verification: ${email}`, db);
  res.json({ success: true, message: 'Password recovery succeeded! You can now log back into the portal.' });
});

// 2. Academic Calendar API Management (Admin defined, global visibility)
app.get('/api/calendar', (req, res) => {
  const db = getDB();
  const { publishedOnly } = req.query;
  let events = db.calendarEvents || [];

  if (publishedOnly === 'true') {
    events = events.filter((e: any) => e.published !== false);
  }
  res.json(events);
});

app.post('/api/calendar', (req, res) => {
  const { title, type, startDate, endDate, description, published } = req.body;
  const db = getDB();

  const newEvent = {
    id: `cal-${Date.now()}`,
    title,
    type,
    startDate,
    endDate,
    description: description || '',
    published: published ?? true,
    term: db.settings.currentTerm,
    session: db.settings.currentSession
  };

  db.calendarEvents.push(newEvent);
  logAction(req, 'Calendar Event Created', 'Calendar', `Constructed new school event: "${title}" (${type}) running ${startDate} to ${endDate}`, db);
  
  res.status(201).json(newEvent);
});

app.put('/api/calendar/:id', (req, res) => {
  const { id } = req.params;
  const { title, type, startDate, endDate, description, published } = req.body;
  const db = getDB();

  db.calendarEvents = db.calendarEvents.map((e: any) => {
    if (e.id === id) {
      return {
        ...e,
        title: title ?? e.title,
        type: type ?? e.type,
        startDate: startDate ?? e.startDate,
        endDate: endDate ?? e.endDate,
        description: description ?? e.description,
        published: published ?? e.published
      };
    }
    return e;
  });

  logAction(req, 'Calendar Event Updated', 'Calendar', `Revised calendar notice milestone: "${title || id}"`, db);
  res.json({ success: true, message: 'Academic schedule updated.' });
});

app.delete('/api/calendar/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const termEvent = db.calendarEvents.find((e: any) => e.id === id);

  db.calendarEvents = db.calendarEvents.filter((e: any) => e.id !== id);
  logAction(req, 'Calendar Event Retracted', 'Calendar', `Deleted administrative milestone: "${termEvent ? termEvent.title : id}"`, db);

  res.json({ success: true, message: 'Milestone removed from portal broadsheet.' });
});

// 3. Attendance Management (Teachers mark daily, Principal views monthly statistics)
app.get('/api/attendance', (req, res) => {
  const db = getDB();
  const { classId, date } = req.query;
  let attendanceList = db.attendance || [];

  if (classId) {
    attendanceList = attendanceList.filter((r: any) => r.classId === classId);
  }
  if (date) {
    attendanceList = attendanceList.filter((r: any) => r.date === date);
  }
  res.json(attendanceList);
});

app.post('/api/attendance', (req, res) => {
  const { classId, date, records, teacherName } = req.body;
  const db = getDB();

  if (!classId || !date || !records) {
    return res.status(400).json({ message: 'Incomplete parameter logs for enrollment batch.' });
  }

  records.forEach((rec: any) => {
    const matchedIdx = db.attendance.findIndex((r: any) => r.studentId === rec.studentId && r.date === date);
    if (matchedIdx > -1) {
      db.attendance[matchedIdx] = {
        ...db.attendance[matchedIdx],
        status: rec.status,
        comments: rec.comments || '',
        markedBy: teacherName || db.attendance[matchedIdx].markedBy
      };
    } else {
      db.attendance.push({
        id: `att-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        studentId: rec.studentId,
        studentName: rec.studentName,
        classId,
        date,
        status: rec.status,
        comments: rec.comments || '',
        markedBy: teacherName || 'Academic Subject Teacher'
      });
    }
  });

  logAction(req, 'Attendance Saved', 'Attendance', `Logged class attendance register for class ${classId} on date: ${date}. Present is ${records.filter((re: any) => re.status === 'Present').length} scholars.`, db);
  res.json({ success: true, message: 'Class daily registers catalogued.' });
});

app.get('/api/attendance/summary', (req, res) => {
  const db = getDB();
  const records = db.attendance || [];
  
  const classTracker: { [key: string]: { total: number, present: number, absent: number, late: number } } = {};
  
  records.forEach((r: any) => {
    if (!classTracker[r.classId]) {
      classTracker[r.classId] = { total: 0, present: 0, absent: 0, late: 0 };
    }
    classTracker[r.classId].total++;
    if (r.status === 'Present') classTracker[r.classId].present++;
    if (r.status === 'Absent') classTracker[r.classId].absent++;
    if (r.status === 'Late') classTracker[r.classId].late++;
  });

  const summary = Object.keys(classTracker).map((cId) => {
    const dataset = classTracker[cId];
    const presentCount = dataset.present + dataset.late;
    const rate = dataset.total > 0 ? Math.round((presentCount / dataset.total) * 100) : 0;
    return {
      classId: cId,
      totalCount: dataset.total,
      presentCount: dataset.present,
      absentCount: dataset.absent,
      lateCount: dataset.late,
      presentRate: rate
    };
  });

  res.json(summary);
});

// 4. Audit Log Reports Endpoint index
app.get('/api/audit-logs', (req, res) => {
  const db = getDB();
  res.json(db.auditLogs || []);
});

// Admin Promotes students
app.post('/api/students/promote-batch', (req, res) => {
  const { student_ids, force_status } = req.body; // force_status: 'Promoted' | 'Repeated' | 'Active'
  const db = getDB();

  db.students = db.students.map((s: StudentProfile) => {
    if (student_ids.includes(s.id)) {
      // Find current class index
      const classSeq = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'GRADUATED'];
      const cIdx = classSeq.indexOf(s.class_id);
      let updatedClass = s.class_id;

      if (force_status === 'Promoted') {
        if (cIdx < classSeq.length - 1) {
          updatedClass = classSeq[cIdx + 1];
        }
      }

      return {
        ...s,
        class_id: updatedClass,
        status: force_status === 'Promoted' ? 'Active' : (force_status === 'Repeated' ? 'Active' : s.status)
      };
    }
    return s;
  });

  saveDB(db);
  res.json({ success: true, message: 'Promotion successfully recorded.' });
});

// Password resets
app.post('/api/users/reset-password', (req, res) => {
  const { id, newPassword } = req.body;
  const db = getDB();

  db.users = db.users.map((u: any) => {
    if (u.id === id) {
      return { ...u, password: newPassword };
    }
    return u;
  });

  saveDB(db);
  res.json({ success: true, message: 'User password reset completed.' });
});

// System Settings Endpoints
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json(db.settings);
});

app.put('/api/settings', (req, res) => {
  const { currentSession, currentTerm, gradingScale, resultReleased, resultPublishScheduled, resultPublishTime } = req.body;
  const db = getDB();

  db.settings = {
    currentSession: currentSession ?? db.settings.currentSession,
    currentTerm: currentTerm ?? db.settings.currentTerm,
    gradingScale: gradingScale ?? db.settings.gradingScale,
    resultReleased: resultReleased ?? db.settings.resultReleased,
    resultPublishScheduled: resultPublishScheduled ?? db.settings.resultPublishScheduled ?? false,
    resultPublishTime: resultPublishTime !== undefined ? resultPublishTime : (db.settings.resultPublishTime ?? null)
  };

  saveDB(db);
  res.json({ success: true, message: 'System settings adjusted.' });
});

// Dashboard and General Analytics
app.get('/api/dashboard/stats', (req, res) => {
  const db = getDB();
  const totalStudents = db.students.length;
  const totalTeachers = db.teachers.length;
  const totalSubjects = db.subjects.length;
  const totalClasses = db.classes.length;
  
  const pendingResults = db.results.filter((r: Result) => r.approved === 'pending').length;
  const approvedResults = db.results.filter((r: Result) => r.approved === 'approved').length;

  // Calculate promotion stats (averages out of academic standard)
  const approvedSummaries = db.students.map((st: StudentProfile) => {
    const studentGrades = db.results.filter((r: Result) => r.student_id === st.id && r.approved === 'approved');
    const avg = studentGrades.length > 0 ? (studentGrades.reduce((acc, g) => acc + g.total, 0) / studentGrades.length) : 0;
    return avg;
  });
  
  const passedCount = approvedSummaries.filter(v => v >= 35).length;
  const promotionRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 100;

  res.json({
    totalStudents,
    totalTeachers,
    totalSubjects,
    totalClasses,
    pendingResults,
    approvedResults,
    promotionRate
  });
});

// AI ENGINE: GEMINI FEEDBACK CO-PILOT
app.post('/api/ai/suggest', async (req, res) => {
  const { studentName, subjectScores, isPrincipal, studentSummaryData } = req.body;
  // subjectScores: array of { subject: string, total: number, grade: string }
  
  const scoreDetailsStr = (subjectScores || [])
    .map((s: any) => `${s.subject}: ${s.total}% (${s.grade})`)
    .join(', ');

  const promptText = isPrincipal
    ? `Write a highly encouraging, academic, and structured principal report card remark for ${studentName}.
      The student has the following terminal performance: ${scoreDetailsStr || 'Moderate Overall Grades'}.
      Include an assessment of their overall strengths, weak subjects that require work, action-oriented encouragement, and parental advice.
      Keep it brief, human-like, elegant, and directly addressable on a report sheet (2-3 highly polished sentences, maximum 60 words). No titles, no bullet points, just clean fluid text.`
    : `Generate a constructive, professional school teacher report card remark for ${studentName}.
      Subject scores: ${scoreDetailsStr}.
      Summarize which subjects they aced, where they must study harder, guidance for improvement, and a message of support.
      Limit the remark to exactly 2-3 formal sentences (under 55 words total) suitable for standard report sheets. Do not use quotes or list formatting.`;

  const client = getGeminiClient();

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          systemInstruction: 'You are an elite, warm, and highly professional Nigerian secondary school principal / class mentor known for writing deeply personalized, constructive, and highly elegant academic progress reports.',
          temperature: 0.7,
        }
      });
      
      const remark = response.text?.trim() || "Consistently good performance. Continued dedication to studies will ensure excellent results.";
      return res.json({ remark });

    } catch (err) {
      console.error('Gemini API call failed, backing up to simulation controller:', err);
    }
  }

  // FALLBACK SIMULATOR ENGINE (Stellar heuristic feedback if no key is supplied)
  const genericExcellent = [
    `${studentName} has performed exceptionally well this term. Their stellar scores in major disciplines are a testament to their dedication. Highly recommended to maintain this work ethic.`,
    `A brilliant and highly motivated student. ${studentName} demonstrates exemplary research skills and conceptual understanding, outstanding work throughout the term.`,
    `Outstanding performance! ${studentName} continues to set a highly impressive standard for peers. Keep cultivating this academic passion.`
  ];

  const genericAverages = [
    `${studentName} has demonstrated steady and satisfactory progress. Continued focus on weak modules, particularly during tutoring, will trigger notable growth.`,
    `A fairly good effort this term. ${studentName} shows active engagement in class, but must focus on core assignments and consistency next session to achieve their high potential.`,
    `With stronger application, ${studentName} can significantly raise his performance. Commendable improvement seen, keep aiming higher.`
  ];

  const genericRemedial = [
    `${studentName} has some academic gaps that must be addressed. Strong focus in tutoring and regular math/science drill sets will help build solid fundamentals.`,
    `A challenging term for ${studentName}. However, with renewed determination, systematic homework routines, and parent-coached revisions, substantial progress is entirely achievable.`,
    `${studentName} has shown talent, but needs to eliminate distractions and apply himself fully to critical areas to recover academic footing.`
  ];

  // Calculate Average from incoming scores
  const scoreArray = subjectScores || [];
  const avg = scoreArray.length > 0 ? (scoreArray.reduce((acc: number, s: any) => acc + s.total, 0) / scoreArray.length) : 55;

  let remarkList = genericAverages;
  if (avg >= 70) remarkList = genericExcellent;
  if (avg < 45) remarkList = genericRemedial;

  const randomIdx = Math.floor(Math.random() * remarkList.length);
  const remark = remarkList[randomIdx];

  setTimeout(() => {
    res.json({ remark: `(AI suggested) ${remark}` });
  }, 400); // Add natural loading transition delay
});

// HELPER FOR DETAILED STUDENT RESULT FALLBACK ANALYSIS
function generateFallbackAnalysis(studentName: string, results: any[]) {
  const sorted = [...results].sort((a, b) => b.total - a.total);
  const strongestList = sorted.filter(r => r.total >= 70).map(r => r.subject_name);
  const weakestList = sorted.filter(r => r.total < 50).map(r => r.subject_name);
  
  const strongStr = strongestList.length > 0 
    ? strongestList.slice(0, 2).join(' and ') 
    : (sorted[0] ? sorted[0].subject_name : 'General Academic Activities');
    
  const weakStr = weakestList.length > 0 
    ? weakestList.slice(0, 2).join(' and ') 
    : (sorted[sorted.length - 1] ? sorted[sorted.length - 1].subject_name : 'Revision Modules');

  const strongestSubjects = `You have demonstrated remarkable intelligence and concept mastery in ${strongStr}. Your excellent scores are highly commendable and reflect a strong work ethic. Keep soaring!`;
  
  const areasForImprovement = `To maximize your potential, we should direct extra focus and revisions toward ${weakStr}. Strengthening your active understanding here will expand your academic foundation.`;
  
  const actionableAdvice = `First, allocate a dedicated 15-minute daily study block precisely for active recall in ${weakStr}. Second, construct mock drill questions and practice solving them without looking at reference materials. Third, bring your practice answers directly to your subject teacher to review misunderstandings.`;
  
  const humanSummary = `${studentName} has shown fantastic dedication and academic integrity this term. With intentional study discipline and daily revisions in core concepts, they will unlock stellar results next term.`;

  return { strongestSubjects, areasForImprovement, actionableAdvice, humanSummary };
}

// GET STUDENT ADVISORY
app.get('/api/ai/analyze-student-results', (req, res) => {
  const { studentId, term, session } = req.query;
  if (!studentId || !term || !session) {
    return res.status(400).json({ error: 'Missing parameters: studentId, term, session' });
  }
  const db = getDB();
  const cacheKey = `${studentId}_${term}_${session}`;
  
  if (db.studentAnalytics && db.studentAnalytics[cacheKey]) {
    return res.json(db.studentAnalytics[cacheKey]);
  }
  
  return res.json({ status: 'not_generated' });
});

// GENERATE OR UPDATE STUDENT ADVISORY
app.post('/api/ai/analyze-student-results', async (req, res) => {
  const { studentId, term, session } = req.body;
  if (!studentId || !term || !session) {
    return res.status(400).json({ error: 'Missing parameters: studentId, term, session' });
  }

  const db = getDB();
  const cacheKey = `${studentId}_${term}_${session}`;

  const student = db.students.find((s: any) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found' });
  }

  const results = db.results.filter((r: any) => r.student_id === studentId && r.term === term && r.session === session && r.approved === 'approved');
  
  const studentResultsWithNames = results.map((r: any) => {
    const subject = db.subjects.find((s: any) => s.id === r.subject_id);
    return {
      ...r,
      subject_name: subject ? subject.subject_name : 'Unknown Subject'
    };
  });

  if (studentResultsWithNames.length === 0) {
    return res.status(400).json({ error: 'No approved results found for this term and session to perform analysis.' });
  }

  const client = getGeminiClient();
  let analysisResult: any = null;

  if (client) {
    try {
      const formattedScores = studentResultsWithNames.map(r => `${r.subject_name}: Total Score ${r.total}% (Grade ${r.grade}, Remarks: ${r.remark})`).join('\n');
      
      const prompt = `You are a warm, wise, Nigerian secondary school academic advisor and mentor who is deeply invested in each student's positive development. Analyze the following terminal academic results for the student named ${student.fullname} (Class: ${student.class_id || 'JSS/SS'}):
      
${formattedScores}

Generate a concise, deeply personalized student academic feedback analysis. Avoid generic or robotic sounding sentences, and instead of plain bulleted items, write each section as a flow of warm, encouraging, and mentoring paragraphs. Your final response must be in JSON form.
Use the following response keys:
1. strongestSubjects: Warm, detailed recognition and praise of the subjects they aced, emphasizing their qualitative or logical strengths.
2. areasForImprovement: Constructive, encouraging, and supportive explanation of areas where they have gaps, framing it as growth milestones.
3. actionableAdvice: Highly practical, creative, and clear sequential steps or study habits they can adopt right away to study smarter in weaker domains.
4. humanSummary: A professional, cohesive, 2-sentence formal report card comment that summarizes their overall efforts and is suitable for a Principal to write as terminal remarks.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an elite academic counselor at a top international school in Lagos, known for formulating deeply personalized, encouraging, and human reports for students and parents.',
          responseMimeType: 'application/json',
          temperature: 0.75,
        }
      });

      const responseText = response.text || "{}";
      const parsedText = JSON.parse(responseText.trim());
      
      if (parsedText.strongestSubjects && parsedText.areasForImprovement) {
        analysisResult = {
          strongestSubjects: parsedText.strongestSubjects,
          areasForImprovement: parsedText.areasForImprovement,
          actionableAdvice: parsedText.actionableAdvice,
          humanSummary: parsedText.humanSummary
        };
      }
    } catch (e) {
      console.error('Failed to generate analysis using Gemini, executing local fallback:', e);
    }
  }

  if (!analysisResult) {
    analysisResult = generateFallbackAnalysis(student.fullname, studentResultsWithNames);
  }

  // Save to DB cache
  if (!db.studentAnalytics) {
    db.studentAnalytics = {};
  }
  db.studentAnalytics[cacheKey] = analysisResult;
  saveDB(db);

  return res.json(analysisResult);
});

// DISPATCH NOTIFICATION ALERTS FOR COMPLETED REPORT CARDS (EMAIL via Resend, SMS via Twilio)
app.post('/api/results/notify-release', async (req, res) => {
  const { studentId, term, session } = req.body;
  if (!studentId || !term || !session) {
    return res.status(400).json({ error: 'Missing parameters: studentId, term, session' });
  }

  const db = getDB();
  const student = db.students.find((s: any) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  const studentUser = db.users.find((u: any) => u.id === studentId);
  const studentEmail = studentUser ? studentUser.email : '';
  const parentPhone = student.parent_phone || '';

  const className = student.class_id;
  const studentName = student.fullname;

  const emailSubject = `Academic Term Results Released: ${term} (${session})`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 15px 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">DELIGHT TECH ACADEMY</h2>
      </div>
      <div style="padding: 20px; background-color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <p style="font-size: 15px; color: #334155; line-height: 1.5; margin-top: 0;">Dear <strong>${studentName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">Excellent news! The principal of Delight Tech Academy has reviewed, approved, and officially released the terminal academic report sheet for <strong>${term} (${session})</strong>.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f1f5f9; border-left: 4px solid #4f46e5; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px;"><strong>Report Sheet Directory Details:</strong></h4>
          <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 0; font-weight: bold;">Student Name:</td>
              <td style="padding: 6px 0; text-align: right;">${studentName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 0; font-weight: bold;">Classroom Group:</td>
              <td style="padding: 6px 0; text-align: right;">${className}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 0; font-weight: bold;">Term Period:</td>
              <td style="padding: 6px 0; text-align: right;">${term}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Academic Session:</td>
              <td style="padding: 6px 0; text-align: right;">${session}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6;">Your dashboard has been enriched with deep, human-centric academic diagnostics formulated by our <strong>Gemini AI Academic Advisor</strong> to highlight your greatest strengths, areas of growth, and highly actionable revision schedules.</p>
        
        <div style="text-align: center; margin-top: 25px; margin-bottom: 20px;">
          <a href="${process.env.APP_URL || 'https://ai.studio/build'}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Login to Scholar Portal</a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated administrative notification dispatched by Delight Tech Academy. Selected grades are subject to final validation logs.</p>
      </div>
    </div>
  `;

  const smsText = `Hello Parent/Student, the continuous assessments & final examination grades for ${studentName} (${className}) for ${term} - ${session} are now officially APPROVED and RELEASED. Access the online student portal to inspect detailed transcripts & expert Gemini AI Academic Mentor recommendations.`;

  let emailSent = false;
  let smsSent = false;
  let emailLogs = '';
  let smsLogs = '';

  // 1. DISPATCH RESEND EMAIL
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && studentEmail) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Delight Tech Academy <onboarding@resend.dev>',
          to: [studentEmail],
          subject: emailSubject,
          html: emailHtml
        })
      });

      const emailData: any = await emailRes.json();
      if (emailRes.ok) {
        emailSent = true;
        emailLogs = `Succeeded. ID: ${emailData.id || 'N/A'}`;
      } else {
        emailLogs = `Failed: ${JSON.stringify(emailData)}`;
      }
    } catch (e: any) {
      emailLogs = `Error: ${e.message}`;
    }
  } else {
    emailLogs = !studentEmail ? 'Skipped (No student email found)' : 'Skipped (RESEND_API_KEY is not configured)';
  }

  // 2. DISPATCH TWILIO SMS
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuthToken && twilioPhone && parentPhone) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: twilioPhone,
          To: parentPhone,
          Body: smsText
        })
      });

      const smsData: any = await smsRes.json();
      if (smsRes.ok) {
        smsSent = true;
        smsLogs = `Succeeded. SID: ${smsData.sid || 'N/A'}`;
      } else {
        smsLogs = `Failed: ${JSON.stringify(smsData)}`;
      }
    } catch (e: any) {
      smsLogs = `Error: ${e.message}`;
    }
  } else {
    smsLogs = !parentPhone ? 'Skipped (No parent_phone found)' : 'Skipped (Twilio credentials not configured)';
  }

  // LOG ACTION TO AUDIT LOGS FOR PRINCIPAL/ADMIN TRANSPARENCY
  const notificationDetails = `Notification dispatch summary for student ${studentName} (${className}). Email status [${studentEmail || 'N/A'}]: ${emailLogs}. SMS status [${parentPhone || 'N/A'}]: ${smsLogs}. Message dispatched: "${smsText}"`;

  logAction(req, 'Result Release Notification', 'Results', notificationDetails, db);
  saveDB(db);

  return res.json({
    success: true,
    email: { sent: emailSent, logs: emailLogs },
    sms: { sent: smsSent, logs: smsLogs },
    message: 'Report release notifications processed successfully.'
  });
});

// Server-Sent Announcements API
app.get('/api/announcements', (req, res) => {
  const db = getDB();
  const { publishedOnly } = req.query;
  if (publishedOnly === 'true') {
    // Return only published announcements
    return res.json(db.announcements.filter((ann: any) => ann.published !== false));
  }
  res.json(db.announcements);
});

app.post('/api/announcements', (req, res) => {
  const { title, content, by, published } = req.body;
  const db = getDB();
  const newAnn = {
    id: `ann-${Date.now()}`,
    title,
    content,
    date: new Date().toLocaleDateString(),
    by: by || 'School Admin',
    published: published ?? true
  };
  db.announcements.unshift(newAnn);
  saveDB(db);
  res.status(201).json(newAnn);
});

app.put('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, published, by } = req.body;
  const db = getDB();
  db.announcements = db.announcements.map((ann: any) => {
    if (ann.id === id) {
      return {
        ...ann,
        title: title ?? ann.title,
        content: content ?? ann.content,
        published: published ?? ann.published,
        by: by ?? ann.by,
        date: new Date().toLocaleDateString()
      };
    }
    return ann;
  });
  saveDB(db);
  res.json({ success: true, message: 'Announcement updated successfully' });
});

app.delete('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  db.announcements = db.announcements.filter((ann: any) => ann.id !== id);
  saveDB(db);
  res.json({ success: true, message: 'Announcement deleted successfully' });
});

// VITE CLIENT INTEGRATION
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Delight Tech School Portal server booted on port ${PORT}`);
  });
}

startServer();

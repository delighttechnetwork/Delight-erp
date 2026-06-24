/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'teacher' | 'principal' | 'student';

export interface User {
  id: string;
  fullname: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  admission_number: string;
  fullname: string;
  class_id: string; // e.g. 'JSS1', 'SS2'
  department: 'Science' | 'Commercial' | 'Arts' | 'None';
  gender: 'Male' | 'Female';
  passport?: string; // Base64 or placeholder URL
  status: 'Active' | 'Promoted' | 'Repeated';
  parent_phone: string;
  created_at: string;
}

export interface TeacherProfile {
  id: string;
  fullname: string;
  phone: string;
  email: string;
  assigned_class: string; // e.g. 'JSS1'
  assigned_subject: string; // e.g. 'math'
}

export interface Subject {
  id: string;
  subject_name: string;
  class_level: 'Junior' | 'Senior'; // e.g. Junior for JS, Senior for SS
  department: 'Science' | 'Commercial' | 'Arts' | 'Core' | 'All';
  is_active: boolean;
}

export interface GradeScaleEntry {
  minScore: number;
  maxScore: number;
  grade: string;
  remark: string;
  color: string; // Tailwind color name for badge
}

export interface Result {
  id: string;
  student_id: string;
  subject_id: string;
  term: '1st Term' | '2nd Term' | '3rd Term';
  session: string; // e.g. '2025/2026'
  ca: number;          // Continuous Assessment 1 (max 15/20)
  assignment: number;  // Assignment (max 10)
  test: number;        // Test (max 10)
  exam: number;        // Exam (max 60)
  total: number;       // Calculated sum (max 100)
  grade: string;       // Grade (A-F)
  remark: string;      // Teacher comment (e.g., Excellent)
  teacher_id: string;
  approved: 'pending' | 'approved' | 'rejected';
  principal_remark?: string;
  ai_generated?: boolean;
  ai_summary?: string; // AI generated student performance summary
  is_released?: boolean;
}

export interface SchoolClass {
  id: string;
  class_name: string; // JSS1, JSS2, JSS3, SS1, SS2, SS3
  section: 'Junior' | 'Senior';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  by: string;
  published?: boolean;
}

export interface SystemSettings {
  currentSession: string;
  currentTerm: '1st Term' | '2nd Term' | '3rd Term';
  gradingScale: GradeScaleEntry[];
  resultReleased: boolean;
  resultPublishScheduled?: boolean;
  resultPublishTime?: string | null;
}

// Full student detail used in dashboards
export interface StudentDetail extends StudentProfile {
  email: string;
  class_name: string;
  results?: (Result & { subject_name: string; teacher_name: string })[];
  average_score?: number;
  position?: string; // e.g. "1st", "2nd"
  total_score?: number;
  promotion_status?: 'Promoted' | 'Repeated' | 'Pending';
}

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  type: 'Term Date' | 'Exam Period' | 'Holiday' | 'School Event';
  startDate: string;
  endDate: string;
  description: string;
  published: boolean;
  term: '1st Term' | '2nd Term' | '3rd Term';
  session: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'Grades' | 'Results' | 'Users' | 'Calendar' | 'Attendance' | 'Auth';
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  details: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  comments?: string;
  markedBy: string; // Teacher name
}


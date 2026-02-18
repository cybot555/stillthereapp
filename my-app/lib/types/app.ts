import { Database } from './database';

export type Profile = Database['public']['Tables']['users']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type SessionRun = Database['public']['Tables']['session_runs']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance']['Row'];
export type AttendanceLog = Database['public']['Tables']['attendance_logs']['Row'];

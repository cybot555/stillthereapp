import { Database } from './database';

export type Profile = Database['public']['Tables']['users']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance']['Row'];

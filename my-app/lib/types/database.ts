export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          session_name: string;
          instructor: string;
          class: string;
          start_time: string;
          end_time: string;
          date: string;
          status: 'active' | 'inactive';
          qr_token: string;
          cover_image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_name: string;
          instructor: string;
          class: string;
          start_time: string;
          end_time: string;
          date: string;
          status?: 'active' | 'inactive';
          qr_token: string;
          cover_image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_name?: string;
          instructor?: string;
          class?: string;
          start_time?: string;
          end_time?: string;
          date?: string;
          status?: 'active' | 'inactive';
          qr_token?: string;
          cover_image_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          session_id: string;
          student_name: string;
          time_in: string;
          proof_image: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_name: string;
          time_in?: string;
          proof_image?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_name?: string;
          time_in?: string;
          proof_image?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          }
        ];
      };
      attendance_logs: {
        Row: {
          id: string;
          session_id: string;
          student_name: string;
          student_id: string | null;
          proof_url: string;
          submitted_at: string;
          status: 'pending' | 'approved' | 'rejected';
        };
        Insert: {
          id?: string;
          session_id: string;
          student_name: string;
          student_id?: string | null;
          proof_url: string;
          submitted_at?: string;
          status?: 'pending' | 'approved' | 'rejected';
        };
        Update: {
          id?: string;
          session_id?: string;
          student_name?: string;
          student_id?: string | null;
          proof_url?: string;
          submitted_at?: string;
          status?: 'pending' | 'approved' | 'rejected';
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_logs_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

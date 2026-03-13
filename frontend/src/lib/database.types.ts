export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      lottery_batches: {
        Row: {
          id: string;
          name: string;
          year: string;
          semester: string;
          academy: string;
          start_date: string;
          end_date: string;
          status: 'draft' | 'active' | 'completed';
          created_at: string;
          total_groups: number;
          total_candidates: number;
          academy_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          year: string;
          semester: string;
          academy: string;
          start_date: string;
          end_date: string;
          status?: 'draft' | 'active' | 'completed';
          created_at?: string;
          total_groups?: number;
          total_candidates?: number;
          academy_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          year?: string;
          semester?: string;
          academy?: string;
          start_date?: string;
          end_date?: string;
          status?: 'draft' | 'active' | 'completed';
          created_at?: string;
          total_groups?: number;
          total_candidates?: number;
          academy_id?: string;
        };
      };
      lottery_groups: {
        Row: {
          id: string;
          batch_id: string;
          batch_name: string;
          name: string;
          description: string;
          candidate_count: number;
          created_at: string;
          exam_room_id: string | null;
          exam_room_name: string | null;
          date: string;
          start_time: string;
          end_time: string;
          academy_id: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          batch_name: string;
          name: string;
          description?: string;
          candidate_count?: number;
          created_at?: string;
          exam_room_id?: string | null;
          exam_room_name?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          academy_id: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          batch_name?: string;
          name?: string;
          description?: string;
          candidate_count?: number;
          created_at?: string;
          exam_room_id?: string | null;
          exam_room_name?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          academy_id?: string;
        };
      };
      lottery_candidates: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          id_card: string;
          registration_no: string | null;
          candidate_no: string | null;
          phone: string | null;
          status: 'waiting' | 'drawn' | 'absent' | 'completed';
          drawn_number: number | null;
          drawn_time: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          id_card: string;
          registration_no?: string | null;
          candidate_no?: string | null;
          phone?: string | null;
          status?: 'waiting' | 'drawn' | 'absent' | 'completed';
          drawn_number?: number | null;
          drawn_time?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          id_card?: string;
          registration_no?: string | null;
          candidate_no?: string | null;
          phone?: string | null;
          status?: 'waiting' | 'drawn' | 'absent' | 'completed';
          drawn_number?: number | null;
          drawn_time?: string | null;
        };
      };
      lottery_exam_rooms: {
        Row: {
          id: string;
          name: string;
          location: string;
          building: string;
          floor: string;
          capacity: number;
          facilities: string[];
          status: 'active' | 'inactive';
          created_at: string;
          description: string | null;
          academy_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          building: string;
          floor: string;
          capacity: number;
          facilities?: string[];
          status?: 'active' | 'inactive';
          created_at?: string;
          description?: string | null;
          academy_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          building?: string;
          floor?: string;
          capacity?: number;
          facilities?: Json;
          status?: 'active' | 'inactive';
          created_at?: string;
          description?: string | null;
          academy_id?: string;
        };
      };
      lottery_volunteers: {
        Row: {
          id: string;
          login_id: string | null;
          username: string;
          name: string;
          phone: string | null;
          email: string | null;
          password_hash: string | null;
          role: 'admin' | 'volunteer';
          created_at: string;
          status: 'active' | 'inactive';
          academy_id: string;
        };
        Insert: {
          id?: string;
          login_id?: string | null;
          username: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          password_hash?: string | null;
          role: 'admin' | 'volunteer';
          created_at?: string;
          status?: 'active' | 'inactive';
          academy_id: string;
        };
        Update: {
          id?: string;
          login_id?: string | null;
          username?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          password_hash?: string | null;
          role?: 'admin' | 'volunteer';
          created_at?: string;
          status?: 'active' | 'inactive';
          academy_id?: string;
        };
      };
      lottery_academies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      lottery_volunteer_exam_rooms: {
        Row: {
          id: string;
          volunteer_id: string;
          exam_room_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          volunteer_id: string;
          exam_room_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          volunteer_id?: string;
          exam_room_id?: string;
          created_at?: string;
        };
      };
      lottery_group_volunteers: {
        Row: {
          id: string;
          group_id: string;
          volunteer_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          volunteer_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          volunteer_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      verify_lottery_admin: {
        Args: {
          input_username: string;
          input_password: string;
        };
        Returns: {
          success: boolean;
          message: string;
          user_id: string;
          username: string;
          name: string;
          role: string;
          academy_id: string;
          academy_name: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

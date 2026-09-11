/**
 * ไฟล์นี้ generate อัตโนมัติจาก schema ของ Supabase — ห้ามแก้ด้วยมือ
 *
 *   npm run db:types
 *
 * แก้ schema เมื่อไหร่ ต้อง generate ใหม่ทันที (ดู CLAUDE.md กฎข้อ 1)
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      faculties: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          created_at: string;
          faculty_id: string;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          faculty_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          faculty_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "programs_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "faculties";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_active: boolean;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"];

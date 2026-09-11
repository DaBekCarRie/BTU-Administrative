/**
 * ไฟล์นี้ generate อัตโนมัติจาก schema ของ Supabase — ห้ามแก้ด้วยมือ
 *
 *   npm run db:types      (ต้อง `npx supabase login && npx supabase link` ก่อน)
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
      events: {
        Row: {
          id: number;
          occurred_at: string;
          payload: Json;
          person_id: string;
          recorded_at: string;
          recorded_by: string | null;
          type: Database["public"]["Enums"]["event_type"];
        };
        Insert: {
          id?: never;
          occurred_at: string;
          payload?: Json;
          person_id: string;
          recorded_at?: string;
          recorded_by?: string | null;
          type: Database["public"]["Enums"]["event_type"];
        };
        Update: {
          id?: never;
          occurred_at?: string;
          payload?: Json;
          person_id?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          type?: Database["public"]["Enums"]["event_type"];
        };
        Relationships: [
          {
            foreignKeyName: "events_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
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
      people: {
        Row: {
          created_at: string;
          enrollment_status: Database["public"]["Enums"]["enrollment_status"];
          enrollment_status_confirmed_at: string | null;
          facebook_name: string | null;
          faculty_id: string | null;
          first_contacted_at: string;
          follow_up_status: Database["public"]["Enums"]["follow_up_status"];
          full_name: string;
          id: string;
          last_event_at: string;
          line_id: string | null;
          next_call_at: string | null;
          nickname: string | null;
          note: string | null;
          owner_id: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          payment_status_confirmed_at: string | null;
          phone: string | null;
          prior_education: Database["public"]["Enums"]["prior_education"] | null;
          program_id: string | null;
          study_mode: Database["public"]["Enums"]["study_mode"] | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enrollment_status?: Database["public"]["Enums"]["enrollment_status"];
          enrollment_status_confirmed_at?: string | null;
          facebook_name?: string | null;
          faculty_id?: string | null;
          first_contacted_at: string;
          follow_up_status?: Database["public"]["Enums"]["follow_up_status"];
          full_name: string;
          id: string;
          last_event_at: string;
          line_id?: string | null;
          next_call_at?: string | null;
          nickname?: string | null;
          note?: string | null;
          owner_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          payment_status_confirmed_at?: string | null;
          phone?: string | null;
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null;
          program_id?: string | null;
          study_mode?: Database["public"]["Enums"]["study_mode"] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enrollment_status?: Database["public"]["Enums"]["enrollment_status"];
          enrollment_status_confirmed_at?: string | null;
          facebook_name?: string | null;
          faculty_id?: string | null;
          first_contacted_at?: string;
          follow_up_status?: Database["public"]["Enums"]["follow_up_status"];
          full_name?: string;
          id?: string;
          last_event_at?: string;
          line_id?: string | null;
          next_call_at?: string | null;
          nickname?: string | null;
          note?: string | null;
          owner_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          payment_status_confirmed_at?: string | null;
          phone?: string | null;
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null;
          program_id?: string | null;
          study_mode?: Database["public"]["Enums"]["study_mode"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "faculties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "people_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "people_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
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
      apply_person_state: {
        Args: { p_id: string; p_state: Json };
        Returns: undefined;
      };
      rebuild_person_state: {
        Args: { p_person_id: string; p_state: Json };
        Returns: undefined;
      };
      record_event: {
        Args: {
          p_occurred_at: string;
          p_payload: Json;
          p_person_id: string;
          p_state: Json;
          p_type: Database["public"]["Enums"]["event_type"];
        };
        Returns: string;
      };
    };
    Enums: {
      enrollment_status:
        | "ยังไม่เริ่ม"
        | "เรียนอยู่"
        | "ดรอป"
        | "ลาออก"
        | "จบแล้ว";
      event_type:
        | "ติดต่อเข้ามา"
        | "โทรตาม"
        | "ปิดเคส"
        | "ยื่นสมัคร"
        | "ส่งเอกสาร"
        | "ตรวจเอกสาร"
        | "ชำระเงิน"
        | "ได้รหัสนักศึกษา"
        | "ย้ายเทอม"
        | "ดรอป"
        | "กลับมาเรียน"
        | "ลาออก"
        | "ขอศูนย์สอบพิเศษ"
        | "ถอนคำขอศูนย์สอบ"
        | "แก้ไขข้อมูล";
      follow_up_status:
        | "ใหม่"
        | "กำลังติดตาม"
        | "นัดโทรแล้ว"
        | "สนใจสมัคร"
        | "สมัครแล้ว"
        | "ไม่สนใจ"
        | "ติดต่อไม่ได้";
      payment_status: "ยังไม่ชำระ" | "ผ่อนอยู่" | "รักษาสภาพ" | "ชำระครบ";
      prior_education:
        | "ม.6"
        | "กศน.เทียบเท่า ม.6"
        | "ปวช."
        | "ปวส."
        | "ปริญญาตรี"
        | "อื่นๆ";
      study_mode: "ปกติ" | "สมทบ" | "ทางไกล";
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
export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      enrollment_status: [
        "ยังไม่เริ่ม",
        "เรียนอยู่",
        "ดรอป",
        "ลาออก",
        "จบแล้ว",
      ],
      follow_up_status: [
        "ใหม่",
        "กำลังติดตาม",
        "นัดโทรแล้ว",
        "สนใจสมัคร",
        "สมัครแล้ว",
        "ไม่สนใจ",
        "ติดต่อไม่ได้",
      ],
      payment_status: ["ยังไม่ชำระ", "ผ่อนอยู่", "รักษาสภาพ", "ชำระครบ"],
      prior_education: [
        "ม.6",
        "กศน.เทียบเท่า ม.6",
        "ปวช.",
        "ปวส.",
        "ปริญญาตรี",
        "อื่นๆ",
      ],
      study_mode: ["ปกติ", "สมทบ", "ทางไกล"],
    },
  },
} as const;

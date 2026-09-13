export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answer: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          question: string
          source: string | null
          updated_at: string
          view_count: number
          visibility: Database["public"]["Enums"]["answer_visibility"]
        }
        Insert: {
          answer: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          question: string
          source?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["answer_visibility"]
        }
        Update: {
          answer?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          question?: string
          source?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["answer_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "answers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          academic_year: number
          created_at: string
          faculty_id: string | null
          id: string
          note: string | null
          person_id: string
          prior_education: Database["public"]["Enums"]["prior_education"] | null
          program_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_code: string | null
          study_mode: Database["public"]["Enums"]["study_mode"] | null
          term: number | null
          updated_at: string
        }
        Insert: {
          academic_year: number
          created_at?: string
          faculty_id?: string | null
          id?: string
          note?: string | null
          person_id: string
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null
          program_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_code?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          term?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: number
          created_at?: string
          faculty_id?: string | null
          id?: string
          note?: string | null
          person_id?: string
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null
          program_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_code?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          term?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_call_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          document_id: string | null
          id: number
          person_id: string
          viewed_at: string
          viewed_by: string | null
          what: string
        }
        Insert: {
          document_id?: string | null
          id?: never
          person_id: string
          viewed_at?: string
          viewed_by?: string | null
          what: string
        }
        Update: {
          document_id?: string | null
          id?: never
          person_id?: string
          viewed_at?: string
          viewed_by?: string | null
          what?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_call_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_viewed_by_fkey"
            columns: ["viewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          application_id: string | null
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          id: string
          person_id: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          id?: string
          person_id: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          id?: string
          person_id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_call_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: number
          occurred_at: string
          payload: Json
          person_id: string
          recorded_at: string
          recorded_by: string | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          id?: never
          occurred_at: string
          payload?: Json
          person_id: string
          recorded_at?: string
          recorded_by?: string | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          id?: never
          occurred_at?: string
          payload?: Json
          person_id?: string
          recorded_at?: string
          recorded_by?: string | null
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_call_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_center_requests: {
        Row: {
          academic_year: number
          center_name: string
          created_at: string
          id: string
          note: string | null
          person_id: string
          status: Database["public"]["Enums"]["exam_request_status"]
          updated_at: string
        }
        Insert: {
          academic_year: number
          center_name: string
          created_at?: string
          id?: string
          note?: string | null
          person_id: string
          status?: Database["public"]["Enums"]["exam_request_status"]
          updated_at?: string
        }
        Update: {
          academic_year?: number
          center_name?: string
          created_at?: string
          id?: string
          note?: string | null
          person_id?: string
          status?: Database["public"]["Enums"]["exam_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_center_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_center_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_call_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      merged_people: {
        Row: {
          merged_at: string
          merged_by: string | null
          merged_id: string
          survivor_id: string
        }
        Insert: {
          merged_at?: string
          merged_by?: string | null
          merged_id: string
          survivor_id: string
        }
        Update: {
          merged_at?: string
          merged_by?: string | null
          merged_id?: string
          survivor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merged_people_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merged_people_survivor_id_fkey"
            columns: ["survivor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merged_people_survivor_id_fkey"
            columns: ["survivor_id"]
            isOneToOne: false
            referencedRelation: "people_with_call_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string
          receipt_no: string | null
          recorded_by: string | null
          slip_path: string | null
        }
        Insert: {
          amount: number
          application_id: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at: string
          receipt_no?: string | null
          recorded_by?: string | null
          slip_path?: string | null
        }
        Update: {
          amount?: number
          application_id?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          receipt_no?: string | null
          recorded_by?: string | null
          slip_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          credit_balance: number
          enrollment_status: Database["public"]["Enums"]["enrollment_status"]
          enrollment_status_confirmed_at: string | null
          facebook_name: string | null
          faculty_id: string | null
          first_contacted_at: string
          follow_up_status: Database["public"]["Enums"]["follow_up_status"]
          full_name: string
          id: string
          last_event_at: string
          line_id: string | null
          national_id_enc: string | null
          national_id_last4: string | null
          next_call_at: string | null
          nickname: string | null
          note: string | null
          owner_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_status_confirmed_at: string | null
          phone: string | null
          prior_education: Database["public"]["Enums"]["prior_education"] | null
          program_id: string | null
          study_mode: Database["public"]["Enums"]["study_mode"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          enrollment_status?: Database["public"]["Enums"]["enrollment_status"]
          enrollment_status_confirmed_at?: string | null
          facebook_name?: string | null
          faculty_id?: string | null
          first_contacted_at: string
          follow_up_status?: Database["public"]["Enums"]["follow_up_status"]
          full_name: string
          id: string
          last_event_at: string
          line_id?: string | null
          national_id_enc?: string | null
          national_id_last4?: string | null
          next_call_at?: string | null
          nickname?: string | null
          note?: string | null
          owner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_status_confirmed_at?: string | null
          phone?: string | null
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null
          program_id?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_balance?: number
          enrollment_status?: Database["public"]["Enums"]["enrollment_status"]
          enrollment_status_confirmed_at?: string | null
          facebook_name?: string | null
          faculty_id?: string | null
          first_contacted_at?: string
          follow_up_status?: Database["public"]["Enums"]["follow_up_status"]
          full_name?: string
          id?: string
          last_event_at?: string
          line_id?: string | null
          national_id_enc?: string | null
          national_id_last4?: string | null
          next_call_at?: string | null
          nickname?: string | null
          note?: string | null
          owner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_status_confirmed_at?: string | null
          phone?: string | null
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null
          program_id?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      people_with_call_summary: {
        Row: {
          call_count: number | null
          created_at: string | null
          enrollment_status:
            | Database["public"]["Enums"]["enrollment_status"]
            | null
          enrollment_status_confirmed_at: string | null
          facebook_name: string | null
          faculty_id: string | null
          first_contacted_at: string | null
          follow_up_status:
            | Database["public"]["Enums"]["follow_up_status"]
            | null
          full_name: string | null
          id: string | null
          last_call_at: string | null
          last_call_note: string | null
          last_call_outcome: string | null
          last_event_at: string | null
          line_id: string | null
          next_call_at: string | null
          nickname: string | null
          note: string | null
          owner_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_status_confirmed_at: string | null
          phone: string | null
          prior_education: Database["public"]["Enums"]["prior_education"] | null
          program_id: string | null
          study_mode: Database["public"]["Enums"]["study_mode"] | null
          updated_at: string | null
        }
        Insert: {
          call_count?: never
          created_at?: string | null
          enrollment_status?:
            | Database["public"]["Enums"]["enrollment_status"]
            | null
          enrollment_status_confirmed_at?: string | null
          facebook_name?: string | null
          faculty_id?: string | null
          first_contacted_at?: string | null
          follow_up_status?:
            | Database["public"]["Enums"]["follow_up_status"]
            | null
          full_name?: string | null
          id?: string | null
          last_call_at?: never
          last_call_note?: never
          last_call_outcome?: never
          last_event_at?: string | null
          line_id?: string | null
          next_call_at?: string | null
          nickname?: string | null
          note?: string | null
          owner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_status_confirmed_at?: string | null
          phone?: string | null
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null
          program_id?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          updated_at?: string | null
        }
        Update: {
          call_count?: never
          created_at?: string | null
          enrollment_status?:
            | Database["public"]["Enums"]["enrollment_status"]
            | null
          enrollment_status_confirmed_at?: string | null
          facebook_name?: string | null
          faculty_id?: string | null
          first_contacted_at?: string | null
          follow_up_status?:
            | Database["public"]["Enums"]["follow_up_status"]
            | null
          full_name?: string | null
          id?: string | null
          last_call_at?: never
          last_call_note?: never
          last_call_outcome?: never
          last_event_at?: string | null
          line_id?: string | null
          next_call_at?: string | null
          nickname?: string | null
          note?: string | null
          owner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_status_confirmed_at?: string | null
          phone?: string | null
          prior_education?:
            | Database["public"]["Enums"]["prior_education"]
            | null
          program_id?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_person_state: {
        Args: { p_id: string; p_state: Json }
        Returns: undefined
      }
      document_desk_queue: {
        Args: { p_limit: number }
        Returns: {
          person_id: string
          total_people: number
          waiting_since: string
        }[]
      }
      merge_people: {
        Args: { p_details: Json; p_merged_id: string; p_survivor_id: string }
        Returns: undefined
      }
      read_national_id: { Args: { p_person_id: string }; Returns: string }
      rebuild_person_state: {
        Args: { p_person_id: string; p_state: Json }
        Returns: undefined
      }
      record_event: {
        Args: {
          p_occurred_at: string
          p_payload: Json
          p_person_id: string
          p_state: Json
          p_type: Database["public"]["Enums"]["event_type"]
        }
        Returns: string
      }
      set_national_id: {
        Args: { p_national_id: string; p_person_id: string }
        Returns: undefined
      }
      work_board_counts: {
        Args: {
          p_awaiting_days: number
          p_closed_statuses: Database["public"]["Enums"]["follow_up_status"][]
          p_doc_types: number
          p_stale_days: number
        }
        Returns: {
          applied_this_month: number
          awaiting_student_code: number
          dropped: number
          enrolled: number
          incomplete_documents: number
          stale_leads: number
        }[]
      }
    }
    Enums: {
      answer_visibility: "ตอบผู้สนใจได้" | "ใช้ภายในเท่านั้น"
      application_status:
        | "ร่าง"
        | "รอเอกสาร"
        | "รอชำระเงิน"
        | "รอตรวจสอบ"
        | "อนุมัติ"
        | "ยกเลิก"
      doc_status: "ส่งแล้ว" | "ผ่าน" | "ไม่ผ่าน"
      doc_type: "รูปถ่าย" | "วุฒิการศึกษา" | "สำเนาบัตรประชาชน" | "สำเนาทะเบียนบ้าน"
      enrollment_status: "ยังไม่เริ่ม" | "เรียนอยู่" | "ดรอป" | "ลาออก" | "จบแล้ว"
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
        | "แก้ไขข้อมูล"
        | "รวมข้อมูล"
        | "ยืนยันสถานะ"
      exam_request_status: "ขอแล้ว" | "ยืนยันแล้ว" | "ถอนแล้ว"
      follow_up_status:
        | "ใหม่"
        | "กำลังติดตาม"
        | "นัดโทรแล้ว"
        | "สนใจสมัคร"
        | "สมัครแล้ว"
        | "ไม่สนใจ"
        | "ติดต่อไม่ได้"
      payment_status: "ยังไม่ชำระ" | "ผ่อนอยู่" | "รักษาสภาพ" | "ชำระครบ"
      prior_education:
        | "ม.6"
        | "กศน.เทียบเท่า ม.6"
        | "ปวช."
        | "ปวส."
        | "ปริญญาตรี"
        | "อื่นๆ"
      study_mode: "ปกติ" | "สมทบ" | "ทางไกล"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      answer_visibility: ["ตอบผู้สนใจได้", "ใช้ภายในเท่านั้น"],
      application_status: [
        "ร่าง",
        "รอเอกสาร",
        "รอชำระเงิน",
        "รอตรวจสอบ",
        "อนุมัติ",
        "ยกเลิก",
      ],
      doc_status: ["ส่งแล้ว", "ผ่าน", "ไม่ผ่าน"],
      doc_type: ["รูปถ่าย", "วุฒิการศึกษา", "สำเนาบัตรประชาชน", "สำเนาทะเบียนบ้าน"],
      enrollment_status: ["ยังไม่เริ่ม", "เรียนอยู่", "ดรอป", "ลาออก", "จบแล้ว"],
      event_type: [
        "ติดต่อเข้ามา",
        "โทรตาม",
        "ปิดเคส",
        "ยื่นสมัคร",
        "ส่งเอกสาร",
        "ตรวจเอกสาร",
        "ชำระเงิน",
        "ได้รหัสนักศึกษา",
        "ย้ายเทอม",
        "ดรอป",
        "กลับมาเรียน",
        "ลาออก",
        "ขอศูนย์สอบพิเศษ",
        "ถอนคำขอศูนย์สอบ",
        "แก้ไขข้อมูล",
        "รวมข้อมูล",
        "ยืนยันสถานะ",
      ],
      exam_request_status: ["ขอแล้ว", "ยืนยันแล้ว", "ถอนแล้ว"],
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
} as const

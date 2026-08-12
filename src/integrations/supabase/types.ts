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
      bookings: {
        Row: {
          appointment_date: string
          appointment_time: string
          clinic_id: string
          created_at: string
          department: string
          id: string
          notes: string | null
          patient_id: string
          qr_payload: string
          reference_code: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          clinic_id: string
          created_at?: string
          department: string
          id?: string
          notes?: string | null
          patient_id: string
          qr_payload: string
          reference_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          clinic_id?: string
          created_at?: string
          department?: string
          id?: string
          notes?: string | null
          patient_id?: string
          qr_payload?: string
          reference_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          area_code: string | null
          closes_at: string
          created_at: string
          daily_capacity: number
          id: string
          latitude: number
          longitude: number
          name: string
          opens_at: string
        }
        Insert: {
          address: string
          area_code?: string | null
          closes_at?: string
          created_at?: string
          daily_capacity?: number
          id?: string
          latitude: number
          longitude: number
          name: string
          opens_at?: string
        }
        Update: {
          address?: string
          area_code?: string | null
          closes_at?: string
          created_at?: string
          daily_capacity?: number
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          opens_at?: string
        }
        Relationships: []
      }
      control_metrics: {
        Row: {
          amoxil_units: number
          ems_active: number
          ems_eta_min: number
          er_wait_min: number
          flu_cases: number
          icu_load: number
          id: number
          nurses: number
          panado_units: number
          patients: number
          staff: number
          tb_cases: number
          updated_at: string
        }
        Insert: {
          amoxil_units?: number
          ems_active?: number
          ems_eta_min?: number
          er_wait_min?: number
          flu_cases?: number
          icu_load?: number
          id?: number
          nurses?: number
          panado_units?: number
          patients?: number
          staff?: number
          tb_cases?: number
          updated_at?: string
        }
        Update: {
          amoxil_units?: number
          ems_active?: number
          ems_eta_min?: number
          er_wait_min?: number
          flu_cases?: number
          icu_load?: number
          id?: number
          nurses?: number
          panado_units?: number
          patients?: number
          staff?: number
          tb_cases?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          last_message_at: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          last_message_at?: string
          patient_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          last_message_at?: string
          patient_id?: string
        }
        Relationships: []
      }
      doh_submissions: {
        Row: {
          created_at: string
          facility: string | null
          id: string
          note: string | null
          period_end: string | null
          period_start: string | null
          reference: string
          report_type: string
          row_count: number
          status: string
          submitted_by: string | null
          submitted_by_name: string | null
        }
        Insert: {
          created_at?: string
          facility?: string | null
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string | null
          reference: string
          report_type: string
          row_count?: number
          status?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
        }
        Update: {
          created_at?: string
          facility?: string | null
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string
          report_type?: string
          row_count?: number
          status?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
        }
        Relationships: []
      }
      lab_orders: {
        Row: {
          created_at: string
          id: string
          ordered_by: string | null
          ordered_by_name: string | null
          patient_file_id: string | null
          patient_name: string
          priority: string
          result_summary: string | null
          resulted_at: string | null
          status: string
          test_id: string | null
          test_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordered_by?: string | null
          ordered_by_name?: string | null
          patient_file_id?: string | null
          patient_name: string
          priority?: string
          result_summary?: string | null
          resulted_at?: string | null
          status?: string
          test_id?: string | null
          test_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordered_by?: string | null
          ordered_by_name?: string | null
          patient_file_id?: string | null
          patient_name?: string
          priority?: string
          result_summary?: string | null
          resulted_at?: string | null
          status?: string
          test_id?: string | null
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_patient_file_id_fkey"
            columns: ["patient_file_id"]
            isOneToOne: false
            referencedRelation: "patient_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          available: boolean
          code: string
          created_at: string
          department: string
          id: string
          name: string
          notes: string | null
          price_cents: number
          sample_type: string
          turnaround_hours: number
        }
        Insert: {
          available?: boolean
          code: string
          created_at?: string
          department: string
          id?: string
          name: string
          notes?: string | null
          price_cents?: number
          sample_type: string
          turnaround_hours?: number
        }
        Update: {
          available?: boolean
          code?: string
          created_at?: string
          department?: string
          id?: string
          name?: string
          notes?: string | null
          price_cents?: number
          sample_type?: string
          turnaround_hours?: number
        }
        Relationships: []
      }
      medical_stock: {
        Row: {
          category: string
          clinic_id: string | null
          created_at: string
          department: string
          id: string
          item_name: string
          location: string | null
          quantity_on_hand: number
          reorder_level: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          clinic_id?: string | null
          created_at?: string
          department?: string
          id?: string
          item_name: string
          location?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string | null
          created_at?: string
          department?: string
          id?: string
          item_name?: string
          location?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_stock_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          kind: string
          media_duration_ms: number | null
          media_mime: string | null
          media_path: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          kind: string
          media_duration_ms?: number | null
          media_mime?: string | null
          media_path?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          media_duration_ms?: number | null
          media_mime?: string | null
          media_path?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_files: {
        Row: {
          address: string | null
          allergies: string[]
          area_code: string | null
          bp: string | null
          captured_by: string | null
          chief_complaint: string | null
          condition: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          hr: string | null
          id: string
          id_number: string | null
          latitude: number | null
          location_accuracy_m: number | null
          longitude: number | null
          medications: string[]
          mrn: string
          notes: string | null
          patient_id: string | null
          phone: string | null
          photo_path: string | null
          sex: string | null
          spo2: string | null
          status: string
          temp: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[]
          area_code?: string | null
          bp?: string | null
          captured_by?: string | null
          chief_complaint?: string | null
          condition?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          hr?: string | null
          id?: string
          id_number?: string | null
          latitude?: number | null
          location_accuracy_m?: number | null
          longitude?: number | null
          medications?: string[]
          mrn: string
          notes?: string | null
          patient_id?: string | null
          phone?: string | null
          photo_path?: string | null
          sex?: string | null
          spo2?: string | null
          status?: string
          temp?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[]
          area_code?: string | null
          bp?: string | null
          captured_by?: string | null
          chief_complaint?: string | null
          condition?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          hr?: string | null
          id?: string
          id_number?: string | null
          latitude?: number | null
          location_accuracy_m?: number | null
          longitude?: number | null
          medications?: string[]
          mrn?: string
          notes?: string | null
          patient_id?: string | null
          phone?: string | null
          photo_path?: string | null
          sex?: string | null
          spo2?: string | null
          status?: string
          temp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          consult_hours: string | null
          created_at: string
          date_of_birth: string | null
          dept_specialty: string | null
          full_name: string | null
          id: string
          id_number: string | null
          license_num: string | null
          shift_preference: string | null
          specialty: string | null
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          consult_hours?: string | null
          created_at?: string
          date_of_birth?: string | null
          dept_specialty?: string | null
          full_name?: string | null
          id: string
          id_number?: string | null
          license_num?: string | null
          shift_preference?: string | null
          specialty?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          consult_hours?: string | null
          created_at?: string
          date_of_birth?: string | null
          dept_specialty?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          license_num?: string | null
          shift_preference?: string | null
          specialty?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          findings: Json
          id: string
          scan_type: string
          status: string
          summary: string | null
          urgency: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          findings?: Json
          id?: string
          scan_type: string
          status?: string
          summary?: string | null
          urgency?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          findings?: Json
          id?: string
          scan_type?: string
          status?: string
          summary?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      stock_deliveries: {
        Row: {
          clinic_id: string | null
          created_at: string
          delivered_at: string
          destination: string
          id: string
          item_name: string
          note: string | null
          quantity: number
          received_by: string | null
          received_by_name: string | null
          stock_item_id: string | null
          supplier: string | null
          unit: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          delivered_at?: string
          destination: string
          id?: string
          item_name: string
          note?: string | null
          quantity: number
          received_by?: string | null
          received_by_name?: string | null
          stock_item_id?: string | null
          supplier?: string | null
          unit?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          delivered_at?: string
          destination?: string
          id?: string
          item_name?: string
          note?: string | null
          quantity?: number
          received_by?: string | null
          received_by_name?: string | null
          stock_item_id?: string | null
          supplier?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_deliveries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_deliveries_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "medical_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccine_movements: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          kind: string
          location: string | null
          note: string | null
          occurred_at: string
          quantity: number
          scheduled_for: string | null
          vaccine_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          kind: string
          location?: string | null
          note?: string | null
          occurred_at?: string
          quantity: number
          scheduled_for?: string | null
          vaccine_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          kind?: string
          location?: string | null
          note?: string | null
          occurred_at?: string
          quantity?: number
          scheduled_for?: string | null
          vaccine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_movements_vaccine_id_fkey"
            columns: ["vaccine_id"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccines: {
        Row: {
          batch_no: string | null
          created_at: string
          doses_delivered: number
          doses_on_hand: number
          doses_used: number
          expiry_date: string | null
          id: string
          location: string | null
          manufacturer: string | null
          name: string
          next_campaign_date: string | null
          reorder_level: number
          storage_temp: string
          target_disease: string
          updated_at: string
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          doses_delivered?: number
          doses_on_hand?: number
          doses_used?: number
          expiry_date?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          name: string
          next_campaign_date?: string | null
          reorder_level?: number
          storage_temp?: string
          target_disease: string
          updated_at?: string
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          doses_delivered?: number
          doses_on_hand?: number
          doses_used?: number
          expiry_date?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          name?: string
          next_campaign_date?: string | null
          reorder_level?: number
          storage_temp?: string
          target_disease?: string
          updated_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          amount_cents: number
          booking_id: string | null
          consumed_at: string | null
          created_at: string
          currency: string
          id: string
          kind: string
          method: string
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          consumed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          kind: string
          method?: string
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          consumed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          method?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      doctors_directory: {
        Row: {
          consult_hours: string | null
          dept_specialty: string | null
          full_name: string | null
          id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_or_create_conversation: {
        Args: { _doctor_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_health_staff: { Args: { _user_id: string }; Returns: boolean }
      is_stock_manager: { Args: { _user_id: string }; Returns: boolean }
      tick_control_metrics: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "patient"
        | "nurse"
        | "doctor"
        | "admin"
        | "storage_manager"
        | "minister"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "patient",
        "nurse",
        "doctor",
        "admin",
        "storage_manager",
        "minister",
      ],
    },
  },
} as const

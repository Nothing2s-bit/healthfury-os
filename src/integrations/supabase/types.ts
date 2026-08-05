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
      tick_control_metrics: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "patient" | "nurse" | "doctor" | "admin"
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
      app_role: ["patient", "nurse", "doctor", "admin"],
    },
  },
} as const

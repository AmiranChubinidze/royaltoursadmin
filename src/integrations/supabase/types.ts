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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      confirmation_attachments: {
        Row: {
          confirmation_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          confirmation_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          confirmation_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_attachments_confirmation_id_fkey"
            columns: ["confirmation_id"]
            isOneToOne: false
            referencedRelation: "confirmations"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmations: {
        Row: {
          arrival_date: string | null
          client_paid: boolean | null
          client_paid_at: string | null
          client_paid_by: string | null
          confirmation_code: string
          confirmation_date: string
          created_at: string
          date_code: string
          departure_date: string | null
          hotels_emailed: string[] | null
          id: string
          is_paid: boolean | null
          main_client_name: string | null
          paid_at: string | null
          paid_by: string | null
          price: number | null
          raw_payload: Json | null
          status: string
          total_days: number | null
          total_nights: number | null
          tour_source: string | null
          updated_at: string
        }
        Insert: {
          arrival_date?: string | null
          client_paid?: boolean | null
          client_paid_at?: string | null
          client_paid_by?: string | null
          confirmation_code: string
          confirmation_date: string
          created_at?: string
          date_code: string
          departure_date?: string | null
          hotels_emailed?: string[] | null
          id?: string
          is_paid?: boolean | null
          main_client_name?: string | null
          paid_at?: string | null
          paid_by?: string | null
          price?: number | null
          raw_payload?: Json | null
          status?: string
          total_days?: number | null
          total_nights?: number | null
          tour_source?: string | null
          updated_at?: string
        }
        Update: {
          arrival_date?: string | null
          client_paid?: boolean | null
          client_paid_at?: string | null
          client_paid_by?: string | null
          confirmation_code?: string
          confirmation_date?: string
          created_at?: string
          date_code?: string
          departure_date?: string | null
          hotels_emailed?: string[] | null
          id?: string
          is_paid?: boolean | null
          main_client_name?: string | null
          paid_at?: string | null
          paid_by?: string | null
          price?: number | null
          raw_payload?: Json | null
          status?: string
          total_days?: number | null
          total_nights?: number | null
          tour_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          attachment_id: string | null
          confirmation_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
        }
        Insert: {
          amount: number
          attachment_id?: string | null
          confirmation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          expense_type: string
          id?: string
        }
        Update: {
          amount?: number
          attachment_id?: string | null
          confirmation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "confirmation_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_confirmation_id_fkey"
            columns: ["confirmation_id"]
            isOneToOne: false
            referencedRelation: "confirmations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email: string
          id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      saved_hotels: {
        Row: {
          activities: string[] | null
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
        }
        Insert: {
          activities?: string[] | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          activities?: string[] | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          confirmation_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          is_auto_generated: boolean
          is_paid: boolean
          notes: string | null
          payment_method: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          confirmation_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          is_paid?: boolean
          notes?: string | null
          payment_method?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          confirmation_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          is_paid?: boolean
          notes?: string | null
          payment_method?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_confirmation_id_fkey"
            columns: ["confirmation_id"]
            isOneToOne: false
            referencedRelation: "confirmations"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "worker"
        | "visitor"
        | "booking"
        | "accountant"
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
      app_role: ["admin", "user", "worker", "visitor", "booking", "accountant"],
    },
  },
} as const

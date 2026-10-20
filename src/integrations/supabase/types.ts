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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_catalog: {
        Row: {
          avg_cost_jpy: number | null
          category: string
          city: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          gmaps_url: string | null
          id: string
          tip: string | null
          title: string
        }
        Insert: {
          avg_cost_jpy?: number | null
          category?: string
          city: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          gmaps_url?: string | null
          id?: string
          tip?: string | null
          title: string
        }
        Update: {
          avg_cost_jpy?: number | null
          category?: string
          city?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          gmaps_url?: string | null
          id?: string
          tip?: string | null
          title?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          planned_jpy: number
          position: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          planned_jpy?: number
          position?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          planned_jpy?: number
          position?: number
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          created_at: string
          day_id: string | null
          done: boolean
          id: string
          kind: string
          position: number
          text: string
        }
        Insert: {
          created_at?: string
          day_id?: string | null
          done?: boolean
          id?: string
          kind?: string
          position?: number
          text: string
        }
        Update: {
          created_at?: string
          day_id?: string | null
          done?: boolean
          id?: string
          kind?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["id"]
          },
        ]
      }
      city_geo: {
        Row: {
          city: string
          lat: number
          lng: number
          region: string | null
        }
        Insert: {
          city: string
          lat: number
          lng: number
          region?: string | null
        }
        Update: {
          city?: string
          lat?: number
          lng?: number
          region?: string | null
        }
        Relationships: []
      }
      day_activities: {
        Row: {
          cost_jpy: number | null
          created_at: string
          day_id: string
          description: string | null
          done: boolean
          id: string
          link: string | null
          position: number
          time_label: string | null
          title: string
        }
        Insert: {
          cost_jpy?: number | null
          created_at?: string
          day_id: string
          description?: string | null
          done?: boolean
          id?: string
          link?: string | null
          position?: number
          time_label?: string | null
          title: string
        }
        Update: {
          cost_jpy?: number | null
          created_at?: string
          day_id?: string
          description?: string | null
          done?: boolean
          id?: string
          link?: string | null
          position?: number
          time_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_jpy: number
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          note: string | null
        }
        Insert: {
          amount_jpy: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          note?: string | null
        }
        Update: {
          amount_jpy?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_days: {
        Row: {
          city: string
          created_at: string
          date: string
          day_number: number
          id: string
          notes: string | null
          phase: string
          position: number
          summary: string | null
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          date: string
          day_number: number
          id?: string
          notes?: string | null
          phase?: string
          position: number
          summary?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          date?: string
          day_number?: number
          id?: string
          notes?: string | null
          phase?: string
          position?: number
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

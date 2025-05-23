export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          id: string
          role: string
          timestamp: string
          visual_data: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          id?: string
          role: string
          timestamp?: string
          visual_data?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          id?: string
          role?: string
          timestamp?: string
          visual_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          condition_type: string
          condition_value: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_secret: boolean
          name: string
          points: number
        }
        Insert: {
          condition_type: string
          condition_value: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_secret?: boolean
          name: string
          points?: number
        }
        Update: {
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_secret?: boolean
          name?: string
          points?: number
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          budget_amount: number
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          budget_amount: number
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          budget_amount?: number
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_amount: number | null
          id: string
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_amount?: number | null
          id?: string
          name: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_amount?: number | null
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invitation_code: string
          invited_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          group_id: string
          id?: string
          invitation_code: string
          invited_by: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string
          id?: string
          invitation_code?: string
          invited_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_transaction_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_transaction_members_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "group_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          group_id: string
          id: string
          is_expense: boolean
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description: string
          group_id: string
          id?: string
          is_expense?: boolean
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          group_id?: string
          id?: string
          is_expense?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          recurring_interval: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          recurring_interval?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          recurring_interval?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          is_admin: boolean | null
          is_pro: boolean | null
          last_name: string | null
          points: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          is_admin?: boolean | null
          is_pro?: boolean | null
          last_name?: string | null
          points?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_pro?: boolean | null
          last_name?: string | null
          points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      showcase: {
        Row: {
          badge_id: string | null
          content: string
          created_at: string
          goal_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          content: string
          created_at?: string
          goal_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          content?: string
          created_at?: string
          goal_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          points_used: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          points_used?: number | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          points_used?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      upgrade_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          is_public: boolean
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          is_public?: boolean
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          is_public?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_upgrade_requests_view: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          is_already_pro: boolean | null
          last_name: string | null
          notes: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_group_invitation: {
        Args: { p_invitation_code: string; p_user_id: string }
        Returns: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
      }
      add_group_transaction: {
        Args:
          | {
              p_group_id: string
              p_user_id: string
              p_amount: number
              p_description: string
              p_date: string
              p_is_expense?: boolean
              p_category?: string
            }
          | {
              p_group_id: string
              p_user_id: string
              p_amount: number
              p_description: string
              p_date: string
              p_is_expense?: boolean
              p_category?: string
              p_member_ids?: string[]
            }
        Returns: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          group_id: string
          id: string
          is_expense: boolean
          user_id: string
        }
      }
      approve_upgrade_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      calculate_group_settlement: {
        Args: { group_id_param: string }
        Returns: Json
      }
      cancel_upgrade_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      check_and_grant_badges: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      check_pending_upgrade_request: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      create_group_invitation: {
        Args: { p_group_id: string; p_invited_by: string; p_email: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invitation_code: string
          invited_by: string
          status: string
          updated_at: string
        }
      }
      get_ai_conversations: {
        Args: { user_id_param: string }
        Returns: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_ai_messages: {
        Args: { conversation_id_param: string; user_id_param: string }
        Returns: {
          content: string
          conversation_id: string
          id: string
          role: string
          timestamp: string
          visual_data: Json | null
        }[]
      }
      get_group_invitations: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invitation_code: string
          invited_by: string
          status: string
          updated_at: string
        }[]
      }
      get_group_transactions: {
        Args: { group_id_param: string }
        Returns: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          group_id: string
          id: string
          is_expense: boolean
          user_id: string
        }[]
      }
      get_invitation_by_code: {
        Args: { p_invitation_code: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invitation_code: string
          invited_by: string
          status: string
          updated_at: string
        }
      }
      get_transaction_members: {
        Args: { transaction_id_param: string }
        Returns: {
          id: string
          transaction_id: string
          member_id: string
          created_at: string
          first_name: string
          last_name: string
        }[]
      }
      get_upgrade_requests: {
        Args: { p_status?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }[]
      }
      get_upgrade_requests_detailed: {
        Args: { p_status?: string }
        Returns: {
          id: string
          user_id: string
          status: string
          notes: string
          created_at: string
          approved_by: string
          approved_at: string
          first_name: string
          last_name: string
          is_already_pro: boolean
        }[]
      }
      grant_badge: {
        Args: { p_user_id: string; p_badge_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      join_group_by_code: {
        Args: { p_invitation_code: string; p_user_id: string }
        Returns: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
      }
      mark_all_notifications_as_read: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reject_upgrade_request: {
        Args: { p_request_id: string; p_reason?: string }
        Returns: Json
      }
      request_pro_upgrade: {
        Args: { p_notes?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          points: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
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
      group_transactions: {
        Row: {
          id: string
          group_id: string
          user_id: string
          amount: number
          description: string
          date: string
          is_expense: boolean
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          amount: number
          description: string
          date: string
          is_expense?: boolean
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          amount?: number
          description?: string
          date?: string
          is_expense?: boolean
          category?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
        Relationships: [
          {
            foreignKeyName: "showcase_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
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
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          is_public: boolean | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          is_public?: boolean | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          is_public?: boolean | null
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
      group_transaction_members: {
        Row: {
          id: string
          transaction_id: string
          member_id: string
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          member_id: string
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          member_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_transaction_members_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "group_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_transaction_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          timestamp: string
          visual_data: any | null
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          timestamp?: string
          visual_data?: any | null
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          timestamp?: string
          visual_data?: any | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          }
        ]
      },
      group_invites: {
        Row: {
          id: string
          group_id: string
          invited_by: string
          email: string
          invitation_code: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at: string
          updated_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          group_id: string
          invited_by: string
          email: string
          invitation_code?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          invited_by?: string
          email?: string
          invitation_code?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      upgrade_requests: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string
          approved_by?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string
          approved_by?: string | null
          approved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_group_transaction: {
        Args: {
          p_group_id: string
          p_user_id: string
          p_amount: number
          p_description: string
          p_date: string
          p_is_expense: boolean
          p_category?: string | null
          p_member_ids?: string[] | null
        }
        Returns: {
          id: string
          group_id: string
          user_id: string
          amount: number
          description: string
          date: string
          is_expense: boolean
          category: string | null
          created_at: string
        } | null
      }
      get_group_transactions: {
        Args: {
          group_id_param: string
        }
        Returns: {
          id: string
          group_id: string
          user_id: string
          amount: number
          description: string
          date: string
          is_expense: boolean
          category: string | null
          created_at: string
        }[]
      }
      get_transaction_members: {
        Args: {
          transaction_id_param: string
        }
        Returns: {
          id: string
          transaction_id: string
          member_id: string
          created_at: string
          first_name: string | null
          last_name: string | null
        }[]
      }
      mark_all_notifications_as_read: {
        Args: Record<string, never>
        Returns: null
      },
      get_ai_conversations: {
        Args: {
          user_id_param: string
        }
        Returns: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }[]
      },
      get_ai_messages: {
        Args: {
          conversation_id_param: string
          user_id_param: string
        }
        Returns: {
          id: string
          conversation_id: string
          role: string
          content: string
          timestamp: string
          visual_data: any | null
        }[]
      },
      calculate_group_settlement: {
        Args: {
          group_id_param: string
        }
        Returns: {
          from_user_id: string;
          to_user_id: string;
          amount: number;
          from_user_name: string;
          to_user_name: string;
        }[]
      },
      create_group_invitation: {
        Args: {
          p_group_id: string
          p_invited_by: string
          p_email: string
        }
        Returns: {
          id: string
          group_id: string
          invited_by: string
          email: string
          invitation_code: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at: string
          updated_at: string
          expires_at: string
        }
      },
      accept_group_invitation: {
        Args: {
          p_invitation_code: string
          p_user_id: string
        }
        Returns: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
      },
      get_group_invitations: {
        Args: {
          p_group_id: string
        }
        Returns: {
          id: string
          group_id: string
          invited_by: string
          email: string
          invitation_code: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at: string
          updated_at: string
          expires_at: string
        }[]
      },
      get_invitation_by_code: {
        Args: {
          p_invitation_code: string
        }
        Returns: {
          id: string
          group_id: string
          invited_by: string
          email: string
          invitation_code: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at: string
          updated_at: string
          expires_at: string
        }
      },
      join_group_by_code: {
        Args: {
          p_invitation_code: string
          p_user_id: string
        }
        Returns: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
      },
      request_pro_upgrade: {
        Args: {
          p_notes: string
        }
        Returns: {
          success: boolean
          message: string
          request_id?: string
        }
      },
      check_pending_upgrade_request: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      },
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      },
      approve_upgrade_request: {
        Args: {
          p_request_id: string
        }
        Returns: {
          success: boolean
          message: string
        }
      },
      reject_upgrade_request: {
        Args: {
          p_request_id: string
          p_reason?: string
        }
        Returns: {
          success: boolean
          message: string
        }
      },
      cancel_upgrade_request: {
        Args: {
          p_request_id: string
        }
        Returns: {
          success: boolean
          message: string
        }
      },
      get_upgrade_requests: {
        Args: {
          p_status?: string
        }
        Returns: {
          id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string
          approved_by: string | null
          approved_at: string | null
        }[]
      },
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

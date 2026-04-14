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
      achievements: {
        Row: {
          achievement_key: string
          created_at: string | null
          dashboard_key: string
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          meta: Json | null
          name: string
          progress_pct: number | null
          updated_at: string | null
          user_id: string | null
          xp: number | null
        }
        Insert: {
          achievement_key: string
          created_at?: string | null
          dashboard_key: string
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          meta?: Json | null
          name: string
          progress_pct?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Update: {
          achievement_key?: string
          created_at?: string | null
          dashboard_key?: string
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          meta?: Json | null
          name?: string
          progress_pct?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      agent_outputs: {
        Row: {
          agent_run_id: string | null
          created_at: string | null
          id: string
          kind: string | null
          payload: Json | null
          reviewed_at: string | null
          surfaced: boolean | null
          user_id: string | null
        }
        Insert: {
          agent_run_id?: string | null
          created_at?: string | null
          id?: string
          kind?: string | null
          payload?: Json | null
          reviewed_at?: string | null
          surfaced?: boolean | null
          user_id?: string | null
        }
        Update: {
          agent_run_id?: string | null
          created_at?: string | null
          id?: string
          kind?: string | null
          payload?: Json | null
          reviewed_at?: string | null
          surfaced?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string | null
          cost: number | null
          ended_at: string | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          project_id: string | null
          started_at: string | null
          status: string | null
          task_id: string | null
          tokens: number | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          cost?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          tokens?: number | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          cost?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          avatar: string | null
          color: string | null
          created_at: string | null
          id: string
          model: string | null
          monthly_budget: number | null
          name: string
          role: string | null
          status: string | null
          system_prompt: string | null
          tier: string | null
          tools: Json | null
          triggers: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          color?: string | null
          created_at?: string | null
          id: string
          model?: string | null
          monthly_budget?: number | null
          name: string
          role?: string | null
          status?: string | null
          system_prompt?: string | null
          tier?: string | null
          tools?: Json | null
          triggers?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          model?: string | null
          monthly_budget?: number | null
          name?: string
          role?: string | null
          status?: string | null
          system_prompt?: string | null
          tier?: string | null
          tools?: Json | null
          triggers?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: number
          ip: unknown
          meta: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          ip?: unknown
          meta?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          ip?: unknown
          meta?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing: {
        Row: {
          amount: number | null
          plan: string | null
          renewal_date: string | null
          seats: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          plan?: string | null
          renewal_date?: string | null
          seats?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          plan?: string | null
          renewal_date?: string | null
          seats?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      brokerage_connections: {
        Row: {
          access_token_enc: string | null
          account_scope: string
          created_at: string
          entity_id: string | null
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token_enc: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc?: string | null
          account_scope?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token_enc?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string | null
          account_scope?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token_enc?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coinbase_connections: {
        Row: {
          access_token_enc: string
          account_scope: string
          created_at: string
          entity_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          last_synced_at: string | null
          refresh_token_enc: string
          scope: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc: string
          account_scope?: string
          created_at?: string
          entity_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token_enc: string
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string
          account_scope?: string
          created_at?: string
          entity_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token_enc?: string
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      command_palette_index: {
        Row: {
          id: string
          keywords: unknown
          kind: string
          ref_id: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          keywords?: unknown
          kind: string
          ref_id?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          keywords?: unknown
          kind?: string
          ref_id?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_kpis: {
        Row: {
          as_of: string | null
          entity_id: string | null
          id: string
          kpi_key: string
          meta: Json | null
          period: string | null
          target: number | null
          unit: string | null
          value: number | null
        }
        Insert: {
          as_of?: string | null
          entity_id?: string | null
          id?: string
          kpi_key: string
          meta?: Json | null
          period?: string | null
          target?: number | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          as_of?: string | null
          entity_id?: string | null
          id?: string
          kpi_key?: string
          meta?: Json | null
          period?: string | null
          target?: number | null
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_kpis_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_ownership"
            referencedColumns: ["id"]
          },
        ]
      }
      company_milestones: {
        Row: {
          completed_at: string | null
          description: string | null
          entity_id: string | null
          id: string
          status: string | null
          target_date: string | null
          title: string
          xp: number | null
        }
        Insert: {
          completed_at?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          status?: string | null
          target_date?: string | null
          title: string
          xp?: number | null
        }
        Update: {
          completed_at?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          status?: string | null
          target_date?: string | null
          title?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_milestones_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_ownership"
            referencedColumns: ["id"]
          },
        ]
      }
      company_team: {
        Row: {
          avatar_url: string | null
          comp: number | null
          created_at: string | null
          email: string | null
          entity_id: string | null
          id: string
          name: string
          role: string | null
          status: string | null
        }
        Insert: {
          avatar_url?: string | null
          comp?: number | null
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          id?: string
          name: string
          role?: string | null
          status?: string | null
        }
        Update: {
          avatar_url?: string | null
          comp?: number | null
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          id?: string
          name?: string
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_team_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_ownership"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_holdings: {
        Row: {
          balance: number
          balance_usd: number | null
          connection_id: string
          cost_basis: number | null
          created_at: string
          currency: string
          id: string
          updated_at: string
        }
        Insert: {
          balance: number
          balance_usd?: number | null
          connection_id: string
          cost_basis?: number | null
          created_at?: string
          currency: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          balance_usd?: number | null
          connection_id?: string
          cost_basis?: number | null
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_holdings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "coinbase_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      docs: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          id: string
          kind: string | null
          pinned: boolean | null
          project_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          kind?: string | null
          pinned?: boolean | null
          project_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          kind?: string | null
          pinned?: boolean | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_ownership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_documents: {
        Row: {
          analysis_error: string | null
          analysis_result: Json | null
          analysis_status: string
          analyzed_at: string | null
          created_at: string
          document_type: string
          entity_id: string | null
          entity_name: string | null
          extracted_entities: Json | null
          extracted_ownership: Json | null
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          notes: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string
          analyzed_at?: string | null
          created_at?: string
          document_type?: string
          entity_id?: string | null
          entity_name?: string | null
          extracted_entities?: Json | null
          extracted_ownership?: Json | null
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string
          analyzed_at?: string | null
          created_at?: string
          document_type?: string
          entity_id?: string | null
          entity_name?: string | null
          extracted_entities?: Json | null
          extracted_ownership?: Json | null
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      entity_ownership: {
        Row: {
          created_at: string
          ein: string | null
          entity_id: string
          entity_name: string
          entity_type: string | null
          formation_date: string | null
          id: string
          notes: string | null
          owned_by: string | null
          ownership_pct: number | null
          parent_entity_id: string | null
          share_class: string | null
          shares_authorized: number | null
          shares_outstanding: number | null
          source_document_id: string | null
          state: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ein?: string | null
          entity_id: string
          entity_name: string
          entity_type?: string | null
          formation_date?: string | null
          id?: string
          notes?: string | null
          owned_by?: string | null
          ownership_pct?: number | null
          parent_entity_id?: string | null
          share_class?: string | null
          shares_authorized?: number | null
          shares_outstanding?: number | null
          source_document_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ein?: string | null
          entity_id?: string
          entity_name?: string
          entity_type?: string | null
          formation_date?: string | null
          id?: string
          notes?: string | null
          owned_by?: string | null
          ownership_pct?: number | null
          parent_entity_id?: string | null
          share_class?: string | null
          shares_authorized?: number | null
          shares_outstanding?: number | null
          source_document_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_ownership_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "entity_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_scope: string
          balance_available: number | null
          balance_current: number | null
          balance_limit: number | null
          created_at: string
          currency_code: string | null
          entity_id: string | null
          id: string
          last_synced_at: string | null
          mask: string | null
          name: string
          official_name: string | null
          plaid_account_id: string
          plaid_item_id: string
          subtype: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_scope?: string
          balance_available?: number | null
          balance_current?: number | null
          balance_limit?: number | null
          created_at?: string
          currency_code?: string | null
          entity_id?: string | null
          id?: string
          last_synced_at?: string | null
          mask?: string | null
          name: string
          official_name?: string | null
          plaid_account_id: string
          plaid_item_id: string
          subtype?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          account_scope?: string
          balance_available?: number | null
          balance_current?: number | null
          balance_limit?: number | null
          created_at?: string
          currency_code?: string | null
          entity_id?: string | null
          id?: string
          last_synced_at?: string | null
          mask?: string | null
          name?: string
          official_name?: string | null
          plaid_account_id?: string
          plaid_item_id?: string
          subtype?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string
          account_scope: string
          amount: number
          category: string[] | null
          created_at: string
          currency_code: string | null
          date: string
          datetime: string | null
          entity_id: string | null
          id: string
          merchant_name: string | null
          name: string
          pending: boolean | null
          personal_finance_category: string | null
          plaid_transaction_id: string
        }
        Insert: {
          account_id: string
          account_scope?: string
          amount: number
          category?: string[] | null
          created_at?: string
          currency_code?: string | null
          date: string
          datetime?: string | null
          entity_id?: string | null
          id?: string
          merchant_name?: string | null
          name: string
          pending?: boolean | null
          personal_finance_category?: string | null
          plaid_transaction_id: string
        }
        Update: {
          account_id?: string
          account_scope?: string
          amount?: number
          category?: string[] | null
          created_at?: string
          currency_code?: string | null
          date?: string
          datetime?: string | null
          entity_id?: string | null
          id?: string
          merchant_name?: string | null
          name?: string
          pending?: boolean | null
          personal_finance_category?: string | null
          plaid_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["account_id"]
          },
        ]
      }
      forge_ideas: {
        Row: {
          agentic_architecture: string | null
          approved_at: string | null
          approved_by: string | null
          competition_level: string | null
          competition_notes: string | null
          confidence_score: number | null
          converted_project_id: string | null
          created_at: string | null
          date_added: string
          estimated_build_time: string | null
          how_it_works: string | null
          id: string
          monthly_revenue_potential: string | null
          mvp_scope: string | null
          name: string
          notes: string | null
          path_to_100k: string | null
          problem: string | null
          revenue_model: string | null
          source_signals: string[] | null
          status: string
          tagline: string | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          agentic_architecture?: string | null
          approved_at?: string | null
          approved_by?: string | null
          competition_level?: string | null
          competition_notes?: string | null
          confidence_score?: number | null
          converted_project_id?: string | null
          created_at?: string | null
          date_added?: string
          estimated_build_time?: string | null
          how_it_works?: string | null
          id: string
          monthly_revenue_potential?: string | null
          mvp_scope?: string | null
          name: string
          notes?: string | null
          path_to_100k?: string | null
          problem?: string | null
          revenue_model?: string | null
          source_signals?: string[] | null
          status?: string
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          agentic_architecture?: string | null
          approved_at?: string | null
          approved_by?: string | null
          competition_level?: string | null
          competition_notes?: string | null
          confidence_score?: number | null
          converted_project_id?: string | null
          created_at?: string | null
          date_added?: string
          estimated_build_time?: string | null
          how_it_works?: string | null
          id?: string
          monthly_revenue_potential?: string | null
          mvp_scope?: string | null
          name?: string
          notes?: string | null
          path_to_100k?: string | null
          problem?: string | null
          revenue_model?: string | null
          source_signals?: string[] | null
          status?: string
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forge_ideas_converted_project_id_fkey"
            columns: ["converted_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          account_id: string
          cost_basis: number | null
          created_at: string
          id: string
          institution_price: number | null
          institution_price_as_of: string | null
          institution_value: number | null
          iso_currency_code: string | null
          quantity: number
          security_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          institution_price?: number | null
          institution_price_as_of?: string | null
          institution_value?: number | null
          iso_currency_code?: string | null
          quantity: number
          security_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          institution_price?: number | null
          institution_price_as_of?: string | null
          institution_value?: number | null
          iso_currency_code?: string | null
          quantity?: number
          security_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "holdings_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          id: string
          owner: string | null
          postmortem: string | null
          resolved_at: string | null
          severity: string | null
          started_at: string | null
          status: string | null
          summary: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          id?: string
          owner?: string | null
          postmortem?: string | null
          resolved_at?: string | null
          severity?: string | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          id?: string
          owner?: string | null
          postmortem?: string | null
          resolved_at?: string | null
          severity?: string | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          connected_at: string | null
          created_at: string | null
          credentials_ref: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: string
          scopes: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          credentials_ref?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          scopes?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          credentials_ref?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          scopes?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          date: string
          fees: number | null
          id: string
          iso_currency_code: string | null
          name: string
          plaid_investment_txn_id: string
          price: number | null
          quantity: number | null
          security_id: string | null
          subtype: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          date: string
          fees?: number | null
          id?: string
          iso_currency_code?: string | null
          name: string
          plaid_investment_txn_id: string
          price?: number | null
          quantity?: number | null
          security_id?: string | null
          subtype?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          date?: string
          fees?: number | null
          id?: string
          iso_currency_code?: string | null
          name?: string
          plaid_investment_txn_id?: string
          price?: number | null
          quantity?: number | null
          security_id?: string | null
          subtype?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "investment_transactions_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          as_of: string | null
          dashboard_key: string
          id: string
          meta: Json | null
          metric_key: string
          unit: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          as_of?: string | null
          dashboard_key: string
          id?: string
          meta?: Json | null
          metric_key: string
          unit?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          as_of?: string | null
          dashboard_key?: string
          id?: string
          meta?: Json | null
          metric_key?: string
          unit?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      memory_entries: {
        Row: {
          body: string | null
          created_at: string | null
          description: string | null
          id: string
          memory_type: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          memory_type?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          memory_type?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      plaid_items: {
        Row: {
          access_token_enc: string
          account_scope: string
          consent_expires_at: string | null
          created_at: string
          cursor: string | null
          entity_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          institution_id: string
          institution_name: string
          item_id: string
          last_synced_at: string | null
          products: string[]
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          access_token_enc: string
          account_scope?: string
          consent_expires_at?: string | null
          created_at?: string
          cursor?: string | null
          entity_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          institution_id: string
          institution_name: string
          item_id: string
          last_synced_at?: string | null
          products?: string[]
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          access_token_enc?: string
          account_scope?: string
          consent_expires_at?: string | null
          created_at?: string
          cursor?: string | null
          entity_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string
          institution_name?: string
          item_id?: string
          last_synced_at?: string | null
          products?: string[]
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          active_count: number | null
          agents: string[] | null
          created_at: string | null
          dependency: string | null
          description: string | null
          done_count: number | null
          id: string
          models_used: string[] | null
          name: string
          priority: string | null
          status: string
          tags: string[] | null
          task_count: number | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          active_count?: number | null
          agents?: string[] | null
          created_at?: string | null
          dependency?: string | null
          description?: string | null
          done_count?: number | null
          id: string
          models_used?: string[] | null
          name: string
          priority?: string | null
          status?: string
          tags?: string[] | null
          task_count?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          active_count?: number | null
          agents?: string[] | null
          created_at?: string | null
          dependency?: string | null
          description?: string | null
          done_count?: number | null
          id?: string
          models_used?: string[] | null
          name?: string
          priority?: string | null
          status?: string
          tags?: string[] | null
          task_count?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      property_assets: {
        Row: {
          address: string
          city: string
          created_at: string
          current_value: number | null
          entity_id: string | null
          entity_name: string | null
          equity: number | null
          id: string
          is_rental: boolean | null
          lodgify_id: string | null
          monthly_expenses: number | null
          mortgage_balance: number | null
          mortgage_payment: number | null
          mortgage_rate: number | null
          mortgage_updated_at: string | null
          notes: string | null
          owned_equity: number | null
          ownership_pct: number
          property_type: string
          purchase_date: string | null
          purchase_price: number | null
          state: string
          updated_at: string
          valuation_source: string | null
          zestimate: number | null
          zestimate_high: number | null
          zestimate_low: number | null
          zestimate_updated_at: string | null
          zillow_zpid: string | null
          zip: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          current_value?: number | null
          entity_id?: string | null
          entity_name?: string | null
          equity?: number | null
          id?: string
          is_rental?: boolean | null
          lodgify_id?: string | null
          monthly_expenses?: number | null
          mortgage_balance?: number | null
          mortgage_payment?: number | null
          mortgage_rate?: number | null
          mortgage_updated_at?: string | null
          notes?: string | null
          owned_equity?: number | null
          ownership_pct?: number
          property_type?: string
          purchase_date?: string | null
          purchase_price?: number | null
          state: string
          updated_at?: string
          valuation_source?: string | null
          zestimate?: number | null
          zestimate_high?: number | null
          zestimate_low?: number | null
          zestimate_updated_at?: string | null
          zillow_zpid?: string | null
          zip?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          current_value?: number | null
          entity_id?: string | null
          entity_name?: string | null
          equity?: number | null
          id?: string
          is_rental?: boolean | null
          lodgify_id?: string | null
          monthly_expenses?: number | null
          mortgage_balance?: number | null
          mortgage_payment?: number | null
          mortgage_rate?: number | null
          mortgage_updated_at?: string | null
          notes?: string | null
          owned_equity?: number | null
          ownership_pct?: number
          property_type?: string
          purchase_date?: string | null
          purchase_price?: number | null
          state?: string
          updated_at?: string
          valuation_source?: string | null
          zestimate?: number | null
          zestimate_high?: number | null
          zestimate_low?: number | null
          zestimate_updated_at?: string | null
          zillow_zpid?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          alt: string | null
          created_at: string | null
          id: string
          property_id: string
          sort_order: number
          src: string
          updated_at: string | null
        }
        Insert: {
          alt?: string | null
          created_at?: string | null
          id?: string
          property_id: string
          sort_order?: number
          src: string
          updated_at?: string | null
        }
        Update: {
          alt?: string | null
          created_at?: string | null
          id?: string
          property_id?: string
          sort_order?: number
          src?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quickbooks_connections: {
        Row: {
          access_token: string
          company_key: string
          connected_at: string
          expires_at: string
          id: string
          realm_id: string | null
          refresh_token: string
          refresh_token_expires_at: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          company_key: string
          connected_at?: string
          expires_at: string
          id?: string
          realm_id?: string | null
          refresh_token: string
          refresh_token_expires_at?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_key?: string
          connected_at?: string
          expires_at?: string
          id?: string
          realm_id?: string | null
          refresh_token?: string
          refresh_token_expires_at?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rental_bookings: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          guest_name: string | null
          id: string
          meta: Json | null
          nights: number | null
          property_id: string | null
          source: string | null
          status: string | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          guest_name?: string | null
          id: string
          meta?: Json | null
          nights?: number | null
          property_id?: string | null
          source?: string | null
          status?: string | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          guest_name?: string | null
          id?: string
          meta?: Json | null
          nights?: number | null
          property_id?: string | null
          source?: string | null
          status?: string | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      securities: {
        Row: {
          close_price: number | null
          close_price_as_of: string | null
          created_at: string
          cusip: string | null
          id: string
          isin: string | null
          iso_currency_code: string | null
          name: string | null
          plaid_security_id: string
          sedol: string | null
          ticker_symbol: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          close_price?: number | null
          close_price_as_of?: string | null
          created_at?: string
          cusip?: string | null
          id?: string
          isin?: string | null
          iso_currency_code?: string | null
          name?: string | null
          plaid_security_id: string
          sedol?: string | null
          ticker_symbol?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          close_price?: number | null
          close_price_as_of?: string | null
          created_at?: string
          cusip?: string | null
          id?: string
          isin?: string | null
          iso_currency_code?: string | null
          name?: string | null
          plaid_security_id?: string
          sedol?: string | null
          ticker_symbol?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          cost: number | null
          ended_at: string | null
          id: string
          message_count: number | null
          started_at: string | null
          summary: string | null
          title: string | null
          tokens: number | null
          transcript_path: string | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          ended_at?: string | null
          id: string
          message_count?: number | null
          started_at?: string | null
          summary?: string | null
          title?: string | null
          tokens?: number | null
          transcript_path?: string | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          ended_at?: string | null
          id?: string
          message_count?: number | null
          started_at?: string | null
          summary?: string | null
          title?: string | null
          tokens?: number | null
          transcript_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          slug: string
          source_path: string | null
          user_id: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          slug: string
          source_path?: string | null
          user_id?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          slug?: string
          source_path?: string | null
          user_id?: string | null
          version?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          agent: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          model: string | null
          name: string
          phase: string | null
          priority: string | null
          project_id: string | null
          session_id: string | null
          status: string
          tokens: number | null
          total_cost: number | null
          transcript_path: string | null
          updated_at: string | null
        }
        Insert: {
          agent?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string | null
          name: string
          phase?: string | null
          priority?: string | null
          project_id?: string | null
          session_id?: string | null
          status?: string
          tokens?: number | null
          total_cost?: number | null
          transcript_path?: string | null
          updated_at?: string | null
        }
        Update: {
          agent?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string | null
          name?: string
          phase?: string | null
          priority?: string | null
          project_id?: string | null
          session_id?: string | null
          status?: string
          tokens?: number | null
          total_cost?: number | null
          transcript_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_deadlines: {
        Row: {
          amount_due: number | null
          created_at: string | null
          deadline_date: string
          entity_id: string | null
          id: string
          kind: string | null
          notes: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount_due?: number | null
          created_at?: string | null
          deadline_date: string
          entity_id?: string | null
          id?: string
          kind?: string | null
          notes?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount_due?: number | null
          created_at?: string | null
          deadline_date?: string
          entity_id?: string | null
          id?: string
          kind?: string | null
          notes?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_deadlines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_ownership"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_entities_meta: {
        Row: {
          deductions: number | null
          entity_id: string
          est_owed: number | null
          filing_freq: string | null
          next_due: string | null
          notes: string | null
          updated_at: string | null
          ytd_income: number | null
          ytd_paid: number | null
        }
        Insert: {
          deductions?: number | null
          entity_id: string
          est_owed?: number | null
          filing_freq?: string | null
          next_due?: string | null
          notes?: string | null
          updated_at?: string | null
          ytd_income?: number | null
          ytd_paid?: number | null
        }
        Update: {
          deductions?: number | null
          entity_id?: string
          est_owed?: number | null
          filing_freq?: string | null
          next_due?: string | null
          notes?: string | null
          updated_at?: string | null
          ytd_income?: number | null
          ytd_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_entities_meta_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entity_ownership"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_moves: {
        Row: {
          action: string
          created_at: string | null
          deadline: string | null
          detail: string | null
          id: string
          priority: string | null
          savings_label: string | null
          savings_num: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          xp: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          deadline?: string | null
          detail?: string | null
          id?: string
          priority?: string | null
          savings_label?: string | null
          savings_num?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          deadline?: string | null
          detail?: string | null
          id?: string
          priority?: string | null
          savings_label?: string | null
          savings_num?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      users_profile: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          level: number | null
          role: string | null
          settings: Json | null
          since: string | null
          updated_at: string | null
          user_id: string
          xp: number | null
          xp_next: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          level?: number | null
          role?: string | null
          settings?: Json | null
          since?: string | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
          xp_next?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          level?: number | null
          role?: string | null
          settings?: Json | null
          since?: string | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
          xp_next?: number | null
        }
        Relationships: []
      }
      visions: {
        Row: {
          category: string | null
          created_at: string | null
          deadline: string | null
          id: string
          img: string | null
          months_out: number | null
          name: string
          note: string | null
          priority: number | null
          progress_pct: number | null
          status: string | null
          target_high: number | null
          target_label: string | null
          target_low: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deadline?: string | null
          id: string
          img?: string | null
          months_out?: number | null
          name: string
          note?: string | null
          priority?: number | null
          progress_pct?: number | null
          status?: string | null
          target_high?: number | null
          target_label?: string | null
          target_low?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          img?: string | null
          months_out?: number | null
          name?: string
          note?: string | null
          priority?: number | null
          progress_pct?: number | null
          status?: string | null
          target_high?: number | null
          target_label?: string | null
          target_low?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_financial_summary: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_scope: string | null
          balance_available: number | null
          balance_current: number | null
          entity_id: string | null
          error_code: string | null
          institution_name: string | null
          last_synced_at: string | null
          mask: string | null
          subtype: string | null
          type: string | null
        }
        Relationships: []
      }
      v_property_summary: {
        Row: {
          entity_name: string | null
          equity: number | null
          full_address: string | null
          id: string | null
          is_rental: boolean | null
          market_value: number | null
          mortgage_balance: number | null
          owned_equity: number | null
          ownership_pct: number | null
          purchase_price: number | null
          updated_at: string | null
          valuation_source: string | null
          zestimate_updated_at: string | null
        }
        Insert: {
          entity_name?: string | null
          equity?: number | null
          full_address?: never
          id?: string | null
          is_rental?: boolean | null
          market_value?: never
          mortgage_balance?: number | null
          owned_equity?: number | null
          ownership_pct?: number | null
          purchase_price?: number | null
          updated_at?: string | null
          valuation_source?: string | null
          zestimate_updated_at?: string | null
        }
        Update: {
          entity_name?: string | null
          equity?: number | null
          full_address?: never
          id?: string | null
          is_rental?: boolean | null
          market_value?: never
          mortgage_balance?: number | null
          owned_equity?: number | null
          ownership_pct?: number | null
          purchase_price?: number | null
          updated_at?: string | null
          valuation_source?: string | null
          zestimate_updated_at?: string | null
        }
        Relationships: []
      }
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
    Enums: {},
  },
} as const

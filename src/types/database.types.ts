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
      _claude_context: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          feedback_score: number | null
          id: string
          message_type: string | null
          role: string
          session_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          message_type?: string | null
          role: string
          session_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          message_type?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_chat_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_allocations: {
        Row: {
          allocated_at: string | null
          allocated_weight_grams: number
          allocation_stage: string
          batch_id: string
          created_at: string | null
          fulfilled_at: string | null
          id: string
          notes: string | null
          order_item_id: string
          projected_final_weight_grams: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allocated_at?: string | null
          allocated_weight_grams: number
          allocation_stage: string
          batch_id: string
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          order_item_id: string
          projected_final_weight_grams?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allocated_at?: string | null
          allocated_weight_grams?: number
          allocation_stage?: string
          batch_id?: string
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string
          projected_final_weight_grams?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "batch_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      batch_id_backfill_log: {
        Row: {
          backfill_method: string | null
          batch_text: string | null
          created_at: string | null
          id: string
          inventory_item_id: string
          new_batch_id: string | null
          old_batch_id: string | null
        }
        Insert: {
          backfill_method?: string | null
          batch_text?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id: string
          new_batch_id?: string | null
          old_batch_id?: string | null
        }
        Update: {
          backfill_method?: string | null
          batch_text?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          new_batch_id?: string | null
          old_batch_id?: string | null
        }
        Relationships: []
      }
      batch_lifecycle_events: {
        Row: {
          batch_id: string
          created_at: string | null
          event_timestamp: string | null
          event_type: string
          from_state: string | null
          id: string
          metadata: Json | null
          notes: string | null
          to_state: string | null
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          event_timestamp?: string | null
          event_type: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_state?: string | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          event_timestamp?: string | null
          event_type?: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_state?: string | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_package_lineage: {
        Row: {
          batch_id: string
          created_at: string | null
          created_from_session_id: string | null
          created_from_session_type: string | null
          id: string
          is_current: boolean | null
          package_id: string
          package_type: string
          stage: string
          weight_grams: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          created_from_session_id?: string | null
          created_from_session_type?: string | null
          id?: string
          is_current?: boolean | null
          package_id: string
          package_type: string
          stage: string
          weight_grams?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          created_from_session_id?: string | null
          created_from_session_type?: string | null
          id?: string
          is_current?: boolean | null
          package_id?: string
          package_type?: string
          stage?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_production_history: {
        Row: {
          batch_id: string
          created_at: string | null
          destination_package_ids: string[] | null
          destination_stage: string | null
          destination_weight_grams: number | null
          event_timestamp: string | null
          event_type: string
          id: string
          notes: string | null
          performed_by: string | null
          session_id: string | null
          session_type: string | null
          source_package_id: string | null
          source_stage: string | null
          source_weight_grams: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          destination_package_ids?: string[] | null
          destination_stage?: string | null
          destination_weight_grams?: number | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          session_id?: string | null
          session_type?: string | null
          source_package_id?: string | null
          source_stage?: string | null
          source_weight_grams?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          destination_package_ids?: string[] | null
          destination_stage?: string | null
          destination_weight_grams?: number | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          session_id?: string | null
          session_type?: string | null
          source_package_id?: string | null
          source_stage?: string | null
          source_weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_projections: {
        Row: {
          actual_weight_grams: number | null
          batch_id: string
          created_at: string | null
          id: string
          notes: string | null
          projected_weight_grams: number
          projection_date: string | null
          source_stage: string
          source_weight_grams: number
          target_stage: string
          variance_percentage: number | null
        }
        Insert: {
          actual_weight_grams?: number | null
          batch_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          projected_weight_grams: number
          projection_date?: string | null
          source_stage: string
          source_weight_grams: number
          target_stage: string
          variance_percentage?: number | null
        }
        Update: {
          actual_weight_grams?: number | null
          batch_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          projected_weight_grams?: number
          projection_date?: string | null
          source_stage?: string
          source_weight_grams?: number
          target_stage?: string
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_registry: {
        Row: {
          archived_at: string | null
          batch_number: string
          bucking_started_at: string | null
          clone_date: string | null
          coa_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          depleted_at: string | null
          drying_started_at: string | null
          flower_started_at: string | null
          fresh_frozen_at: string | null
          fresh_frozen_weight_grams: number
          harvest_date: string | null
          id: string
          initial_weight_grams: number | null
          is_quarantined: boolean | null
          lab_started_at: string | null
          lifecycle_state: string | null
          mother_plant_group_ids: string[] | null
          notes: string | null
          packaging_started_at: string | null
          parent_batch_id: string | null
          production_path: string | null
          quality_grade_id: string | null
          quarantine_reason: string | null
          quarantined_at: string | null
          room: string | null
          status: string | null
          strain: string
          strain_id: string | null
          trimming_started_at: string | null
          updated_at: string | null
          veg_started_at: string | null
        }
        Insert: {
          archived_at?: string | null
          batch_number: string
          bucking_started_at?: string | null
          clone_date?: string | null
          coa_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          depleted_at?: string | null
          drying_started_at?: string | null
          flower_started_at?: string | null
          fresh_frozen_at?: string | null
          fresh_frozen_weight_grams?: number
          harvest_date?: string | null
          id?: string
          initial_weight_grams?: number | null
          is_quarantined?: boolean | null
          lab_started_at?: string | null
          lifecycle_state?: string | null
          mother_plant_group_ids?: string[] | null
          notes?: string | null
          packaging_started_at?: string | null
          parent_batch_id?: string | null
          production_path?: string | null
          quality_grade_id?: string | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          room?: string | null
          status?: string | null
          strain: string
          strain_id?: string | null
          trimming_started_at?: string | null
          updated_at?: string | null
          veg_started_at?: string | null
        }
        Update: {
          archived_at?: string | null
          batch_number?: string
          bucking_started_at?: string | null
          clone_date?: string | null
          coa_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          depleted_at?: string | null
          drying_started_at?: string | null
          flower_started_at?: string | null
          fresh_frozen_at?: string | null
          fresh_frozen_weight_grams?: number
          harvest_date?: string | null
          id?: string
          initial_weight_grams?: number | null
          is_quarantined?: boolean | null
          lab_started_at?: string | null
          lifecycle_state?: string | null
          mother_plant_group_ids?: string[] | null
          notes?: string | null
          packaging_started_at?: string | null
          parent_batch_id?: string | null
          production_path?: string | null
          quality_grade_id?: string | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          room?: string | null
          status?: string | null
          strain?: string
          strain_id?: string | null
          trimming_started_at?: string | null
          updated_at?: string | null
          veg_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["coa_id"]
          },
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "certificates_of_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["coa_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_parent_batch_id_fkey"
            columns: ["parent_batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_registry_quality_grade_id_fkey"
            columns: ["quality_grade_id"]
            isOneToOne: false
            referencedRelation: "quality_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      batch_stage_tracking: {
        Row: {
          allocated_weight_grams: number
          available_weight_grams: number | null
          batch_id: string
          created_at: string | null
          id: string
          location: string | null
          stage: string
          updated_at: string | null
          weight_grams: number
        }
        Insert: {
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          batch_id: string
          created_at?: string | null
          id?: string
          location?: string | null
          stage: string
          updated_at?: string | null
          weight_grams?: number
        }
        Update: {
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          batch_id?: string
          created_at?: string | null
          id?: string
          location?: string | null
          stage?: string
          updated_at?: string | null
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_tank_mix_log: {
        Row: {
          actual_ec: number | null
          actual_gallons: number | null
          actual_ph: number | null
          actual_ppm: number | null
          actual_products: Json | null
          batch_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          feed_program_id: string | null
          id: string
          ppm_scale: string | null
          prescribed_at: string | null
          prescribed_by: string | null
          prescribed_ec: number | null
          prescribed_gallons: number | null
          prescribed_ph_max: number | null
          prescribed_ph_min: number | null
          prescribed_ppm: number | null
          prescribed_products: Json | null
          prescription_notes: string | null
          program_week_id: string | null
          room_id: string
          stage: string | null
          status: string
          task_instance_id: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          actual_ec?: number | null
          actual_gallons?: number | null
          actual_ph?: number | null
          actual_ppm?: number | null
          actual_products?: Json | null
          batch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          feed_program_id?: string | null
          id?: string
          ppm_scale?: string | null
          prescribed_at?: string | null
          prescribed_by?: string | null
          prescribed_ec?: number | null
          prescribed_gallons?: number | null
          prescribed_ph_max?: number | null
          prescribed_ph_min?: number | null
          prescribed_ppm?: number | null
          prescribed_products?: Json | null
          prescription_notes?: string | null
          program_week_id?: string | null
          room_id: string
          stage?: string | null
          status?: string
          task_instance_id?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          actual_ec?: number | null
          actual_gallons?: number | null
          actual_ph?: number | null
          actual_ppm?: number | null
          actual_products?: Json | null
          batch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          feed_program_id?: string | null
          id?: string
          ppm_scale?: string | null
          prescribed_at?: string | null
          prescribed_by?: string | null
          prescribed_ec?: number | null
          prescribed_gallons?: number | null
          prescribed_ph_max?: number | null
          prescribed_ph_min?: number | null
          prescribed_ppm?: number | null
          prescribed_products?: Json | null
          prescription_notes?: string | null
          program_week_id?: string | null
          room_id?: string
          stage?: string | null
          status?: string
          task_instance_id?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_tank_mix_log_feed_program_id_fkey"
            columns: ["feed_program_id"]
            isOneToOne: false
            referencedRelation: "feed_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_tank_mix_log_program_week_id_fkey"
            columns: ["program_week_id"]
            isOneToOne: false
            referencedRelation: "feed_program_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_tank_mix_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_tank_mix_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "batch_tank_mix_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "batch_tank_mix_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "batch_tank_mix_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          recorded_by: string | null
          reference_number: string | null
          updated_at: string | null
          vendor_bill_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
          vendor_bill_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bin_entries: {
        Row: {
          bin_weight_grams: number
          binning_session_id: string
          created_at: string
          created_by: string | null
          entry_order: number
          id: string
          notes: string | null
        }
        Insert: {
          bin_weight_grams: number
          binning_session_id: string
          created_at?: string
          created_by?: string | null
          entry_order?: number
          id?: string
          notes?: string | null
        }
        Update: {
          bin_weight_grams?: number
          binning_session_id?: string
          created_at?: string
          created_by?: string | null
          entry_order?: number
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bin_entries_binning_session_id_fkey"
            columns: ["binning_session_id"]
            isOneToOne: false
            referencedRelation: "binning_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bin_entries_binning_session_id_fkey"
            columns: ["binning_session_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["binning_session_id"]
          },
        ]
      }
      binning_sessions: {
        Row: {
          batch_registry_id: string
          bin_date: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          dry_room_id: string
          dry_weight_grams: number
          harvest_session_id: string
          id: string
          notes: string | null
          session_status: string
          water_loss_grams: number | null
        }
        Insert: {
          batch_registry_id: string
          bin_date: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          dry_room_id: string
          dry_weight_grams: number
          harvest_session_id: string
          id?: string
          notes?: string | null
          session_status?: string
          water_loss_grams?: number | null
        }
        Update: {
          batch_registry_id?: string
          bin_date?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          dry_room_id?: string
          dry_weight_grams?: number
          harvest_session_id?: string
          id?: string
          notes?: string | null
          session_status?: string
          water_loss_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "binning_sessions_dry_room_id_fkey"
            columns: ["dry_room_id"]
            isOneToOne: false
            referencedRelation: "dry_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binning_sessions_harvest_session_id_fkey"
            columns: ["harvest_session_id"]
            isOneToOne: false
            referencedRelation: "harvest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binning_sessions_harvest_session_id_fkey"
            columns: ["harvest_session_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["harvest_session_id"]
          },
        ]
      }
      bucked_inventory: {
        Row: {
          batch_id: string
          batch_number: string | null
          created_at: string | null
          current_weight_grams: number
          harvest_date: string | null
          id: string
          initial_weight_grams: number
          location: string | null
          notes: string | null
          package_id: string
          room: string | null
          status: string
          strain: string
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          batch_number?: string | null
          created_at?: string | null
          current_weight_grams: number
          harvest_date?: string | null
          id?: string
          initial_weight_grams: number
          location?: string | null
          notes?: string | null
          package_id: string
          room?: string | null
          status?: string
          strain: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          batch_number?: string | null
          created_at?: string | null
          current_weight_grams?: number
          harvest_date?: string | null
          id?: string
          initial_weight_grams?: number
          location?: string | null
          notes?: string | null
          package_id?: string
          room?: string | null
          status?: string
          strain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bucking_sessions: {
        Row: {
          batch_id: string
          batch_registry_id: string | null
          binned_package_id: string
          binned_weight_grams: number
          bucked_flower_grams: number | null
          bucked_smalls_grams: number | null
          bucker_name: string
          bucker_staff_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalization_status_bucked: Database["public"]["Enums"]["finalization_status"]
          finalization_status_smalls: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_at_bucked: string | null
          finalized_at_smalls: string | null
          finalized_by: string | null
          finalized_by_bucked: string | null
          finalized_by_smalls: string | null
          id: string
          is_paused: boolean
          kg_per_hour: number | null
          minutes_bucked: number | null
          notes: string | null
          output_product_flower_name: string | null
          output_product_smalls_name: string | null
          recorded_in_dutchie: boolean | null
          session_date: string
          session_status: string
          started_at: string | null
          strain: string
          strain_id: string | null
          total_pause_minutes: number
          updated_at: string | null
          variance_grams: number | null
          void_reason: string | null
          void_reason_bucked: string | null
          void_reason_smalls: string | null
          waste_grams: number | null
        }
        Insert: {
          batch_id: string
          batch_registry_id?: string | null
          binned_package_id: string
          binned_weight_grams: number
          bucked_flower_grams?: number | null
          bucked_smalls_grams?: number | null
          bucker_name: string
          bucker_staff_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_bucked?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_at_bucked?: string | null
          finalized_at_smalls?: string | null
          finalized_by?: string | null
          finalized_by_bucked?: string | null
          finalized_by_smalls?: string | null
          id?: string
          is_paused?: boolean
          kg_per_hour?: number | null
          minutes_bucked?: number | null
          notes?: string | null
          output_product_flower_name?: string | null
          output_product_smalls_name?: string | null
          recorded_in_dutchie?: boolean | null
          session_date?: string
          session_status?: string
          started_at?: string | null
          strain: string
          strain_id?: string | null
          total_pause_minutes?: number
          updated_at?: string | null
          variance_grams?: number | null
          void_reason?: string | null
          void_reason_bucked?: string | null
          void_reason_smalls?: string | null
          waste_grams?: number | null
        }
        Update: {
          batch_id?: string
          batch_registry_id?: string | null
          binned_package_id?: string
          binned_weight_grams?: number
          bucked_flower_grams?: number | null
          bucked_smalls_grams?: number | null
          bucker_name?: string
          bucker_staff_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_bucked?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_at_bucked?: string | null
          finalized_at_smalls?: string | null
          finalized_by?: string | null
          finalized_by_bucked?: string | null
          finalized_by_smalls?: string | null
          id?: string
          is_paused?: boolean
          kg_per_hour?: number | null
          minutes_bucked?: number | null
          notes?: string | null
          output_product_flower_name?: string | null
          output_product_smalls_name?: string | null
          recorded_in_dutchie?: boolean | null
          session_date?: string
          session_status?: string
          started_at?: string | null
          strain?: string
          strain_id?: string | null
          total_pause_minutes?: number
          updated_at?: string | null
          variance_grams?: number | null
          void_reason?: string | null
          void_reason_bucked?: string | null
          void_reason_smalls?: string | null
          waste_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "bucking_sessions_bucker_staff_id_fkey"
            columns: ["bucker_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucking_sessions_bucker_staff_id_fkey"
            columns: ["bucker_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "bucking_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      bulk_inventory: {
        Row: {
          batch_id: string
          batch_number: string | null
          created_at: string | null
          id: string
          location: string | null
          notes: string | null
          product_type: string
          quality_grade: string | null
          status: string
          strain: string
          trim_date: string | null
          updated_at: string | null
          weight_grams: number
        }
        Insert: {
          batch_id: string
          batch_number?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          product_type: string
          quality_grade?: string | null
          status?: string
          strain: string
          trim_date?: string | null
          updated_at?: string | null
          weight_grams?: number
        }
        Update: {
          batch_id?: string
          batch_number?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          product_type?: string
          quality_grade?: string | null
          status?: string
          strain?: string
          trim_date?: string | null
          updated_at?: string | null
          weight_grams?: number
        }
        Relationships: []
      }
      certificates_of_analysis: {
        Row: {
          batch_id: string | null
          batch_number: string
          cbd_percentage: number | null
          created_at: string | null
          harvest_date: string | null
          id: string
          is_active: boolean | null
          manufacture_date: string | null
          pdf_file_path: string | null
          sample_date: string | null
          strain_name: string
          terpene_1_name: string | null
          terpene_1_percentage: number | null
          terpene_1_value: number | null
          terpene_2_name: string | null
          terpene_2_percentage: number | null
          terpene_2_value: number | null
          terpene_3_name: string | null
          terpene_3_percentage: number | null
          terpene_3_value: number | null
          thc_percentage: number | null
          total_cannabinoids_percentage: number | null
          total_terpenes_mg_g: number | null
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          batch_number: string
          cbd_percentage?: number | null
          created_at?: string | null
          harvest_date?: string | null
          id?: string
          is_active?: boolean | null
          manufacture_date?: string | null
          pdf_file_path?: string | null
          sample_date?: string | null
          strain_name: string
          terpene_1_name?: string | null
          terpene_1_percentage?: number | null
          terpene_1_value?: number | null
          terpene_2_name?: string | null
          terpene_2_percentage?: number | null
          terpene_2_value?: number | null
          terpene_3_name?: string | null
          terpene_3_percentage?: number | null
          terpene_3_value?: number | null
          thc_percentage?: number | null
          total_cannabinoids_percentage?: number | null
          total_terpenes_mg_g?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          batch_number?: string
          cbd_percentage?: number | null
          created_at?: string | null
          harvest_date?: string | null
          id?: string
          is_active?: boolean | null
          manufacture_date?: string | null
          pdf_file_path?: string | null
          sample_date?: string | null
          strain_name?: string
          terpene_1_name?: string | null
          terpene_1_percentage?: number | null
          terpene_1_value?: number | null
          terpene_2_name?: string | null
          terpene_2_percentage?: number | null
          terpene_2_value?: number | null
          terpene_3_name?: string | null
          terpene_3_percentage?: number | null
          terpene_3_value?: number | null
          thc_percentage?: number | null
          total_cannabinoids_percentage?: number | null
          total_terpenes_mg_g?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      chat_knowledge_candidates: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          merged_to_id: string | null
          proposed_category: string | null
          proposed_key: string | null
          proposed_value: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_messages: Json | null
          source_session: string | null
          status: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          merged_to_id?: string | null
          proposed_category?: string | null
          proposed_key?: string | null
          proposed_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_messages?: Json | null
          source_session?: string | null
          status?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          merged_to_id?: string | null
          proposed_category?: string | null
          proposed_key?: string | null
          proposed_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_messages?: Json | null
          source_session?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_knowledge_candidates_source_session_fkey"
            columns: ["source_session"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_knowledge_candidates_source_session_fkey"
            columns: ["source_session"]
            isOneToOne: false
            referencedRelation: "v_chat_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      cleaning_log: {
        Row: {
          cleaned_at: string
          cleaned_by: string | null
          cleaning_type: string
          created_at: string
          id: string
          notes: string | null
          room_id: string
          task_instance_id: string | null
        }
        Insert: {
          cleaned_at?: string
          cleaned_by?: string | null
          cleaning_type: string
          created_at?: string
          id?: string
          notes?: string | null
          room_id: string
          task_instance_id?: string | null
        }
        Update: {
          cleaned_at?: string
          cleaned_by?: string | null
          cleaning_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          room_id?: string
          task_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_log_cleaned_by_fkey"
            columns: ["cleaned_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_log_cleaned_by_fkey"
            columns: ["cleaned_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cleaning_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "cleaning_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "cleaning_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "cleaning_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_documents: {
        Row: {
          batch_id: string
          cbd_percentage: number | null
          cbda_percentage: number | null
          coa_number: string
          created_at: string | null
          file_size_kb: number | null
          file_type: string | null
          file_url: string
          heavy_metals_status: string | null
          id: string
          is_public: boolean | null
          lab_license: string | null
          lab_name: string
          microbial_status: string | null
          notes: string | null
          pass_fail: string | null
          pesticides_status: string | null
          strain: string
          tags: string[] | null
          terpene_profile: Json | null
          test_date: string
          thc_percentage: number | null
          thca_percentage: number | null
          total_cannabinoids: number | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          batch_id: string
          cbd_percentage?: number | null
          cbda_percentage?: number | null
          coa_number: string
          created_at?: string | null
          file_size_kb?: number | null
          file_type?: string | null
          file_url: string
          heavy_metals_status?: string | null
          id?: string
          is_public?: boolean | null
          lab_license?: string | null
          lab_name: string
          microbial_status?: string | null
          notes?: string | null
          pass_fail?: string | null
          pesticides_status?: string | null
          strain: string
          tags?: string[] | null
          terpene_profile?: Json | null
          test_date: string
          thc_percentage?: number | null
          thca_percentage?: number | null
          total_cannabinoids?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          batch_id?: string
          cbd_percentage?: number | null
          cbda_percentage?: number | null
          coa_number?: string
          created_at?: string | null
          file_size_kb?: number | null
          file_type?: string | null
          file_url?: string
          heavy_metals_status?: string | null
          id?: string
          is_public?: boolean | null
          lab_license?: string | null
          lab_name?: string
          microbial_status?: string | null
          notes?: string | null
          pass_fail?: string | null
          pesticides_status?: string | null
          strain?: string
          tags?: string[] | null
          terpene_profile?: Json | null
          test_date?: string
          thc_percentage?: number | null
          thca_percentage?: number | null
          total_cannabinoids?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      consolidated_package_sources: {
        Row: {
          consolidated_package_id: string
          contribution_units: number | null
          contribution_weight_grams: number | null
          created_at: string | null
          id: string
          session_date: string
          session_id: string
          session_type: string
        }
        Insert: {
          consolidated_package_id: string
          contribution_units?: number | null
          contribution_weight_grams?: number | null
          created_at?: string | null
          id?: string
          session_date: string
          session_id: string
          session_type: string
        }
        Update: {
          consolidated_package_id?: string
          contribution_units?: number | null
          contribution_weight_grams?: number | null
          created_at?: string | null
          id?: string
          session_date?: string
          session_id?: string
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidated_package_sources_consolidated_package_id_fkey"
            columns: ["consolidated_package_id"]
            isOneToOne: false
            referencedRelation: "consolidated_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidated_packages: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          package_date: string
          package_id: string
          product_stage: string
          product_type: string
          room: string | null
          session_count: number | null
          session_type: string
          source_session_ids: string[] | null
          strain: string
          strain_abbreviation: string
          total_units: number | null
          total_weight_grams: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          package_date?: string
          package_id: string
          product_stage: string
          product_type: string
          room?: string | null
          session_count?: number | null
          session_type: string
          source_session_ids?: string[] | null
          strain: string
          strain_abbreviation: string
          total_units?: number | null
          total_weight_grams?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          package_date?: string
          package_id?: string
          product_stage?: string
          product_type?: string
          room?: string | null
          session_count?: number | null
          session_type?: string
          source_session_ids?: string[] | null
          strain?: string
          strain_abbreviation?: string
          total_units?: number | null
          total_weight_grams?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consumable_usage: {
        Row: {
          batch_registry_id: string | null
          consumable_id: string
          cost_calculated: number | null
          created_at: string | null
          grow_room_id: string | null
          id: string
          logged_by: string | null
          notes: string | null
          quantity_used: number
          session_id: string | null
          session_type: string | null
          used_date: string
        }
        Insert: {
          batch_registry_id?: string | null
          consumable_id: string
          cost_calculated?: number | null
          created_at?: string | null
          grow_room_id?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          quantity_used: number
          session_id?: string | null
          session_type?: string | null
          used_date?: string
        }
        Update: {
          batch_registry_id?: string | null
          consumable_id?: string
          cost_calculated?: number | null
          created_at?: string | null
          grow_room_id?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          quantity_used?: number
          session_id?: string | null
          session_type?: string | null
          used_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usage_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usage_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "consumable_usage_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "consumable_usage_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "consumable_usage_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usage_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      consumables: {
        Row: {
          category: string
          cost_per_unit: number
          created_at: string | null
          id: string
          is_active: boolean | null
          is_cogs: boolean | null
          name: string
          unit: string
          vendor_name: string | null
        }
        Insert: {
          category: string
          cost_per_unit: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_cogs?: boolean | null
          name: string
          unit: string
          vendor_name?: string | null
        }
        Update: {
          category?: string
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_cogs?: boolean | null
          name?: string
          unit?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      conversion_analytics: {
        Row: {
          actual_percentage: number
          analysis_date: string
          created_at: string | null
          expected_percentage: number | null
          from_stage: string
          id: string
          notes: string | null
          sample_size: number
          strain: string
          to_stage: string
          total_input_grams: number | null
          total_output_grams: number | null
          variance_percentage: number | null
        }
        Insert: {
          actual_percentage: number
          analysis_date?: string
          created_at?: string | null
          expected_percentage?: number | null
          from_stage: string
          id?: string
          notes?: string | null
          sample_size?: number
          strain: string
          to_stage: string
          total_input_grams?: number | null
          total_output_grams?: number | null
          variance_percentage?: number | null
        }
        Update: {
          actual_percentage?: number
          analysis_date?: string
          created_at?: string | null
          expected_percentage?: number | null
          from_stage?: string
          id?: string
          notes?: string | null
          sample_size?: number
          strain?: string
          to_stage?: string
          total_input_grams?: number | null
          total_output_grams?: number | null
          variance_percentage?: number | null
        }
        Relationships: []
      }
      conversion_packages: {
        Row: {
          aggregation_id: string | null
          batch_id: string
          conversion_lot_id: string | null
          created_at: string
          created_by: string
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_by: string | null
          id: string
          inventory_stage_id: string | null
          package_id: string
          packaged_at: string | null
          product_id: string | null
          source_session_ids: Json
          units: number | null
          weight: number | null
        }
        Insert: {
          aggregation_id?: string | null
          batch_id: string
          conversion_lot_id?: string | null
          created_at?: string
          created_by: string
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          inventory_stage_id?: string | null
          package_id: string
          packaged_at?: string | null
          product_id?: string | null
          source_session_ids?: Json
          units?: number | null
          weight?: number | null
        }
        Update: {
          aggregation_id?: string | null
          batch_id?: string
          conversion_lot_id?: string | null
          created_at?: string
          created_by?: string
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          inventory_stage_id?: string | null
          package_id?: string
          packaged_at?: string | null
          product_id?: string | null
          source_session_ids?: Json
          units?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_inventory_stage_id_fkey"
            columns: ["inventory_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
        ]
      }
      conversion_rates: {
        Row: {
          created_at: string | null
          effective_date: string | null
          from_stage: string
          id: string
          notes: string | null
          rate_percentage: number | null
          split_percentage: number | null
          strain: string | null
          to_stage: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          effective_date?: string | null
          from_stage: string
          id?: string
          notes?: string | null
          rate_percentage?: number | null
          split_percentage?: number | null
          strain?: string | null
          to_stage: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          effective_date?: string | null
          from_stage?: string
          id?: string
          notes?: string | null
          rate_percentage?: number | null
          split_percentage?: number | null
          strain?: string | null
          to_stage?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversion_variance_log: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string
          acknowledged_by: string
          actual_units: number | null
          actual_weight: number | null
          batch_id: string
          conversion_lot_id: string | null
          expected_units: number | null
          expected_weight: number | null
          id: string
          product_id: string | null
          unit_variance: number | null
          variance_note: string | null
          variance_reason: Database["public"]["Enums"]["variance_reason"]
          weight_variance: number | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string
          acknowledged_by: string
          actual_units?: number | null
          actual_weight?: number | null
          batch_id: string
          conversion_lot_id?: string | null
          expected_units?: number | null
          expected_weight?: number | null
          id?: string
          product_id?: string | null
          unit_variance?: number | null
          variance_note?: string | null
          variance_reason: Database["public"]["Enums"]["variance_reason"]
          weight_variance?: number | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string
          acknowledged_by?: string
          actual_units?: number | null
          actual_weight?: number | null
          batch_id?: string
          conversion_lot_id?: string | null
          expected_units?: number | null
          expected_weight?: number | null
          id?: string
          product_id?: string | null
          unit_variance?: number | null
          variance_note?: string | null
          variance_reason?: Database["public"]["Enums"]["variance_reason"]
          weight_variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
        ]
      }
      coversheets: {
        Row: {
          access_token: string
          accessed_count: number | null
          batch_compliance_data: Json | null
          compliance_header: Json | null
          coversheet_number: string
          created_at: string | null
          customer_name: string
          delivery_date: string | null
          distributed_to_data: Json | null
          id: string
          is_active: boolean | null
          is_outdated: boolean | null
          items_summary: Json
          last_accessed_at: string | null
          last_order_update: string | null
          manufacture_date: string | null
          order_id: string | null
          package_manifest_data: Json | null
          qr_code_data: string
          qr_code_url: string | null
          total_packages: number | null
          total_weight_grams: number | null
        }
        Insert: {
          access_token: string
          accessed_count?: number | null
          batch_compliance_data?: Json | null
          compliance_header?: Json | null
          coversheet_number: string
          created_at?: string | null
          customer_name: string
          delivery_date?: string | null
          distributed_to_data?: Json | null
          id?: string
          is_active?: boolean | null
          is_outdated?: boolean | null
          items_summary?: Json
          last_accessed_at?: string | null
          last_order_update?: string | null
          manufacture_date?: string | null
          order_id?: string | null
          package_manifest_data?: Json | null
          qr_code_data: string
          qr_code_url?: string | null
          total_packages?: number | null
          total_weight_grams?: number | null
        }
        Update: {
          access_token?: string
          accessed_count?: number | null
          batch_compliance_data?: Json | null
          compliance_header?: Json | null
          coversheet_number?: string
          created_at?: string | null
          customer_name?: string
          delivery_date?: string | null
          distributed_to_data?: Json | null
          id?: string
          is_active?: boolean | null
          is_outdated?: boolean | null
          items_summary?: Json
          last_accessed_at?: string | null
          last_order_update?: string | null
          manufacture_date?: string | null
          order_id?: string | null
          package_manifest_data?: Json | null
          qr_code_data?: string
          qr_code_url?: string | null
          total_packages?: number | null
          total_weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_user_id: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string | null
          due_date: string
          focus_today: boolean | null
          id: string
          priority: string
          related_activity_id: string | null
          status: string
          task_type: string
          title: string
          trigger_key: string | null
          trigger_source: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          due_date: string
          focus_today?: boolean | null
          id?: string
          priority?: string
          related_activity_id?: string | null
          status?: string
          task_type?: string
          title: string
          trigger_key?: string | null
          trigger_source?: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          due_date?: string
          focus_today?: boolean | null
          id?: string
          priority?: string
          related_activity_id?: string | null
          status?: string
          task_type?: string
          title?: string
          trigger_key?: string | null
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "vw_manager_review_performance"
            referencedColumns: ["manager_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_related_activity_id_fkey"
            columns: ["related_activity_id"]
            isOneToOne: false
            referencedRelation: "customer_activity_log"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_visit_schedule: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          linked_activity_id: string | null
          location_notes: string | null
          outcome_notes: string | null
          status: string
          updated_at: string
          user_id: string | null
          visit_date: string
          visit_time_window: string | null
          visit_type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          linked_activity_id?: string | null
          location_notes?: string | null
          outcome_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          visit_date: string
          visit_time_window?: string | null
          visit_type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          linked_activity_id?: string | null
          location_notes?: string | null
          outcome_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          visit_date?: string
          visit_time_window?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_linked_activity_id_fkey"
            columns: ["linked_activity_id"]
            isOneToOne: false
            referencedRelation: "customer_activity_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visit_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_manager_review_performance"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      custom_task_log: {
        Row: {
          created_at: string
          description: string | null
          id: string
          notes: string | null
          performed_at: string
          performed_by: string | null
          room_id: string | null
          task_instance_id: string | null
          task_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          room_id?: string | null
          task_instance_id?: string | null
          task_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          room_id?: string | null
          task_instance_id?: string | null
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_task_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_task_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "custom_task_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_task_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "custom_task_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "custom_task_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "custom_task_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity_log: {
        Row: {
          activity_type: string
          body: string | null
          completed: boolean
          created_at: string
          customer_id: string
          follow_up_date: string | null
          id: string
          linked_order_id: string | null
          linked_task_id: string | null
          pinned: boolean
          subject: string
          user_id: string | null
          visit_id: string | null
        }
        Insert: {
          activity_type?: string
          body?: string | null
          completed?: boolean
          created_at?: string
          customer_id: string
          follow_up_date?: string | null
          id?: string
          linked_order_id?: string | null
          linked_task_id?: string | null
          pinned?: boolean
          subject: string
          user_id?: string | null
          visit_id?: string | null
        }
        Update: {
          activity_type?: string
          body?: string | null
          completed?: boolean
          created_at?: string
          customer_id?: string
          follow_up_date?: string | null
          id?: string
          linked_order_id?: string | null
          linked_task_id?: string | null
          pinned?: boolean
          subject?: string
          user_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "crm_task_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_manager_review_performance"
            referencedColumns: ["manager_id"]
          },
          {
            foreignKeyName: "customer_activity_log_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_price_lists: {
        Row: {
          created_at: string
          custom_price: number
          customer_id: string
          effective_date: string
          expires_at: string | null
          id: string
          notes: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          custom_price: number
          customer_id: string
          effective_date?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          custom_price?: number
          customer_id?: string
          effective_date?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
        ]
      }
      customers: {
        Row: {
          account_credit_balance: number | null
          account_status: string
          account_type: string
          address: string | null
          ato_number: string | null
          city: string | null
          contact_name: string | null
          created_at: string | null
          credit_limit: number | null
          default_payment_terms: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_model: string
          delivery_postal_code: string | null
          delivery_state: string | null
          dispensary_code: string
          email: string | null
          formatted_address: string | null
          geocoded_at: string | null
          geocoding_error: string | null
          id: string
          last_order_date: string | null
          latitude: number | null
          license_name: string | null
          license_number: string | null
          lifetime_revenue: number
          longitude: number | null
          name: string
          notes: string | null
          parent_customer_id: string | null
          phone: string | null
          pipeline_stage: string | null
          pipeline_updated_at: string | null
          postal_code: string | null
          preferred_delivery_day: string | null
          state: string | null
          tags: string[]
          updated_at: string | null
        }
        Insert: {
          account_credit_balance?: number | null
          account_status?: string
          account_type?: string
          address?: string | null
          ato_number?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          default_payment_terms?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_model?: string
          delivery_postal_code?: string | null
          delivery_state?: string | null
          dispensary_code: string
          email?: string | null
          formatted_address?: string | null
          geocoded_at?: string | null
          geocoding_error?: string | null
          id?: string
          last_order_date?: string | null
          latitude?: number | null
          license_name?: string | null
          license_number?: string | null
          lifetime_revenue?: number
          longitude?: number | null
          name: string
          notes?: string | null
          parent_customer_id?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pipeline_updated_at?: string | null
          postal_code?: string | null
          preferred_delivery_day?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string | null
        }
        Update: {
          account_credit_balance?: number | null
          account_status?: string
          account_type?: string
          address?: string | null
          ato_number?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          default_payment_terms?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_model?: string
          delivery_postal_code?: string | null
          delivery_state?: string | null
          dispensary_code?: string
          email?: string | null
          formatted_address?: string | null
          geocoded_at?: string | null
          geocoding_error?: string | null
          id?: string
          last_order_date?: string | null
          latitude?: number | null
          license_name?: string | null
          license_number?: string | null
          lifetime_revenue?: number
          longitude?: number | null
          name?: string
          notes?: string | null
          parent_customer_id?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pipeline_updated_at?: string | null
          postal_code?: string | null
          preferred_delivery_day?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      daily_attendance: {
        Row: {
          attendance_date: string
          checked_in_by: string | null
          created_at: string
          hours_worked: number | null
          id: string
          is_present: boolean
          room_assignments: string[] | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          checked_in_by?: string | null
          created_at?: string
          hours_worked?: number | null
          id?: string
          is_present?: boolean
          room_assignments?: string[] | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          checked_in_by?: string | null
          created_at?: string
          hours_worked?: number | null
          id?: string
          is_present?: boolean
          room_assignments?: string[] | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      daily_log_annotations: {
        Row: {
          annotation_date: string
          body: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          photo_urls: string[] | null
          related_task_id: string | null
          room_id: string
          severity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          annotation_date?: string
          body?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_urls?: string[] | null
          related_task_id?: string | null
          room_id: string
          severity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          annotation_date?: string
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_urls?: string[] | null
          related_task_id?: string | null
          room_id?: string
          severity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "daily_log_annotations_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_annotations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_annotations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "daily_log_annotations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "daily_log_annotations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
        ]
      }
      daily_task_instances: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          completion_ref_id: string | null
          completion_ref_table: string | null
          created_at: string
          estimated_duration: string | null
          id: string
          notes: string | null
          progress_data: Json | null
          room_id: string
          schedule_id: string | null
          scope: string
          status: string
          task_config: Json | null
          task_date: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completion_ref_id?: string | null
          completion_ref_table?: string | null
          created_at?: string
          estimated_duration?: string | null
          id?: string
          notes?: string | null
          progress_data?: Json | null
          room_id: string
          schedule_id?: string | null
          scope?: string
          status?: string
          task_config?: Json | null
          task_date?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completion_ref_id?: string | null
          completion_ref_table?: string | null
          created_at?: string
          estimated_duration?: string | null
          id?: string
          notes?: string | null
          progress_data?: Json | null
          room_id?: string
          schedule_id?: string | null
          scope?: string
          status?: string
          task_config?: Json | null
          task_date?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "daily_task_instances_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_instances_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "daily_task_instances_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "daily_task_instances_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "daily_task_instances_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "room_task_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      defoliation_log: {
        Row: {
          created_at: string
          defoliation_type: string
          id: string
          notes: string | null
          performed_at: string
          performed_by: string | null
          room_id: string
          sections_completed: string[] | null
          sections_total: string[] | null
          task_instance_id: string | null
        }
        Insert: {
          created_at?: string
          defoliation_type: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          room_id: string
          sections_completed?: string[] | null
          sections_total?: string[] | null
          task_instance_id?: string | null
        }
        Update: {
          created_at?: string
          defoliation_type?: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          room_id?: string
          sections_completed?: string[] | null
          sections_total?: string[] | null
          task_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "defoliation_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defoliation_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "defoliation_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defoliation_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "defoliation_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "defoliation_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "defoliation_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          created_at: string | null
          fa_number: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fa_number: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fa_number?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          created_at: string | null
          destination_customer_id: string
          distance_meters: number
          duration_seconds: number
          id: string
          last_calculated_at: string | null
          origin_customer_id: string | null
          origin_location_id: string | null
          route_geometry: Json | null
          summary: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          destination_customer_id: string
          distance_meters: number
          duration_seconds: number
          id?: string
          last_calculated_at?: string | null
          origin_customer_id?: string | null
          origin_location_id?: string | null
          route_geometry?: Json | null
          summary?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          destination_customer_id?: string
          distance_meters?: number
          duration_seconds?: number
          id?: string
          last_calculated_at?: string | null
          origin_customer_id?: string | null
          origin_location_id?: string | null
          route_geometry?: Json | null
          summary?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      delivery_schedule: {
        Row: {
          actual_delivery_time: string | null
          created_at: string | null
          driver_name: string | null
          id: string
          notes: string | null
          order_id: string
          route_number: string | null
          scheduled_date: string
          scheduled_time_window: string | null
          signature: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          created_at?: string | null
          driver_name?: string | null
          id?: string
          notes?: string | null
          order_id: string
          route_number?: string | null
          scheduled_date: string
          scheduled_time_window?: string | null
          signature?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          created_at?: string | null
          driver_name?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          route_number?: string | null
          scheduled_date?: string
          scheduled_time_window?: string | null
          signature?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      delivery_vehicles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          license_plate: string
          make: string
          model: string
          updated_at: string | null
          vin: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate: string
          make: string
          model: string
          updated_at?: string | null
          vin: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string
          make?: string
          model?: string
          updated_at?: string | null
          vin?: string
          year?: number
        }
        Relationships: []
      }
      draft_orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          delivery_notes: string | null
          expires_at: string | null
          id: string
          internal_notes: string | null
          order_items: Json | null
          priority: string | null
          requested_delivery_date: string | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          delivery_notes?: string | null
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          order_items?: Json | null
          priority?: string | null
          requested_delivery_date?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          delivery_notes?: string | null
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          order_items?: Json | null
          priority?: string | null
          requested_delivery_date?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      dry_rooms: {
        Row: {
          capacity_lbs: number | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          room_code: string
        }
        Insert: {
          capacity_lbs?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          room_code: string
        }
        Update: {
          capacity_lbs?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          room_code?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          email_from: string
          email_to: string
          error_message: string | null
          id: string
          order_id: string | null
          order_number: string
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_from: string
          email_to: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_number: string
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_from?: string
          email_to?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_number?: string
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "email_send_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      facility_overhead_config: {
        Row: {
          created_at: string | null
          effective_month: string
          id: string
          insurance: number | null
          license_fees: number | null
          monthly_overhead: number
          notes: string | null
          other: number | null
          rent: number | null
          updated_at: string | null
          utilities: number | null
        }
        Insert: {
          created_at?: string | null
          effective_month: string
          id?: string
          insurance?: number | null
          license_fees?: number | null
          monthly_overhead: number
          notes?: string | null
          other?: number | null
          rent?: number | null
          updated_at?: string | null
          utilities?: number | null
        }
        Update: {
          created_at?: string | null
          effective_month?: string
          id?: string
          insurance?: number | null
          license_fees?: number | null
          monthly_overhead?: number
          notes?: string | null
          other?: number | null
          rent?: number | null
          updated_at?: string | null
          utilities?: number | null
        }
        Relationships: []
      }
      feed_products: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          is_active: boolean
          mixing_order_hint: number | null
          name: string
          notes: string | null
          product_type: string
          unit: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mixing_order_hint?: number | null
          name: string
          notes?: string | null
          product_type?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mixing_order_hint?: number | null
          name?: string
          notes?: string | null
          product_type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_program_entries: {
        Row: {
          amount_max: number | null
          amount_per_unit: number
          created_at: string
          feed_product_id: string
          id: string
          mixing_order: number
          notes: string | null
          program_week_id: string
          updated_at: string
        }
        Insert: {
          amount_max?: number | null
          amount_per_unit: number
          created_at?: string
          feed_product_id: string
          id?: string
          mixing_order?: number
          notes?: string | null
          program_week_id: string
          updated_at?: string
        }
        Update: {
          amount_max?: number | null
          amount_per_unit?: number
          created_at?: string
          feed_product_id?: string
          id?: string
          mixing_order?: number
          notes?: string | null
          program_week_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_program_entries_feed_product_id_fkey"
            columns: ["feed_product_id"]
            isOneToOne: false
            referencedRelation: "feed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_program_entries_program_week_id_fkey"
            columns: ["program_week_id"]
            isOneToOne: false
            referencedRelation: "feed_program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_program_weeks: {
        Row: {
          created_at: string
          feed_program_id: string
          id: string
          notes: string | null
          phase: string
          target_ec: number | null
          target_ph_max: number | null
          target_ph_min: number | null
          target_ppm_500: number | null
          target_ppm_700: number | null
          updated_at: string
          week_number: number
        }
        Insert: {
          created_at?: string
          feed_program_id: string
          id?: string
          notes?: string | null
          phase: string
          target_ec?: number | null
          target_ph_max?: number | null
          target_ph_min?: number | null
          target_ppm_500?: number | null
          target_ppm_700?: number | null
          updated_at?: string
          week_number: number
        }
        Update: {
          created_at?: string
          feed_program_id?: string
          id?: string
          notes?: string | null
          phase?: string
          target_ec?: number | null
          target_ph_max?: number | null
          target_ph_min?: number | null
          target_ppm_500?: number | null
          target_ppm_700?: number | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_program_weeks_feed_program_id_fkey"
            columns: ["feed_program_id"]
            isOneToOne: false
            referencedRelation: "feed_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_programs: {
        Row: {
          base_unit: string
          brand: string | null
          concentrate_ratio: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_unit?: string
          brand?: string | null
          concentrate_ratio?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_unit?: string
          brand?: string | null
          concentrate_ratio?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      feeding_log: {
        Row: {
          created_at: string
          ec_value: number | null
          fed_at: string
          fed_by: string | null
          id: string
          notes: string | null
          nutrient_mix: string | null
          ph_value: number | null
          reservoir_id: string | null
          room_id: string
          task_instance_id: string | null
          volume_gallons: number | null
          water_temp_f: number | null
        }
        Insert: {
          created_at?: string
          ec_value?: number | null
          fed_at?: string
          fed_by?: string | null
          id?: string
          notes?: string | null
          nutrient_mix?: string | null
          ph_value?: number | null
          reservoir_id?: string | null
          room_id: string
          task_instance_id?: string | null
          volume_gallons?: number | null
          water_temp_f?: number | null
        }
        Update: {
          created_at?: string
          ec_value?: number | null
          fed_at?: string
          fed_by?: string | null
          id?: string
          notes?: string | null
          nutrient_mix?: string | null
          ph_value?: number | null
          reservoir_id?: string | null
          room_id?: string
          task_instance_id?: string | null
          volume_gallons?: number | null
          water_temp_f?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feeding_log_fed_by_fkey"
            columns: ["fed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feeding_log_fed_by_fkey"
            columns: ["fed_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "feeding_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feeding_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "feeding_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "feeding_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "feeding_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      freeze_dry_runs: {
        Row: {
          created_at: string
          end_time: string | null
          equipment_id: string | null
          id: string
          input_weight_grams: number
          moisture_loss_percentage: number | null
          notes: string | null
          output_weight_grams: number | null
          start_time: string | null
          status: string
          temperature_f: number | null
          updated_at: string
          wash_run_id: string
          waste_weight_grams: number | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          equipment_id?: string | null
          id?: string
          input_weight_grams: number
          moisture_loss_percentage?: number | null
          notes?: string | null
          output_weight_grams?: number | null
          start_time?: string | null
          status?: string
          temperature_f?: number | null
          updated_at?: string
          wash_run_id: string
          waste_weight_grams?: number | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          equipment_id?: string | null
          id?: string
          input_weight_grams?: number
          moisture_loss_percentage?: number | null
          notes?: string | null
          output_weight_grams?: number | null
          start_time?: string | null
          status?: string
          temperature_f?: number | null
          updated_at?: string
          wash_run_id?: string
          waste_weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freeze_dry_runs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "rosin_lab_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freeze_dry_runs_wash_run_id_fkey"
            columns: ["wash_run_id"]
            isOneToOne: false
            referencedRelation: "wash_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      fresh_frozen_packages: {
        Row: {
          batch_id: string
          created_at: string
          created_by: string | null
          freezer_location: string | null
          frozen_at: string | null
          id: string
          notes: string | null
          package_number: number
          sold_price_per_gram: number | null
          status: string
          strain_id: string | null
          updated_at: string
          vacuum_sealed_at: string | null
          weight_grams: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_by?: string | null
          freezer_location?: string | null
          frozen_at?: string | null
          id?: string
          notes?: string | null
          package_number?: number
          sold_price_per_gram?: number | null
          status?: string
          strain_id?: string | null
          updated_at?: string
          vacuum_sealed_at?: string | null
          weight_grams: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_by?: string | null
          freezer_location?: string | null
          frozen_at?: string | null
          id?: string
          notes?: string | null
          package_number?: number
          sold_price_per_gram?: number | null
          status?: string
          strain_id?: string | null
          updated_at?: string
          vacuum_sealed_at?: string | null
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      grow_rooms: {
        Row: {
          capacity_plants: number | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          room_code: string
          room_type: string
          square_footage: number | null
        }
        Insert: {
          capacity_plants?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          room_code: string
          room_type?: string
          square_footage?: number | null
        }
        Update: {
          capacity_plants?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          room_code?: string
          room_type?: string
          square_footage?: number | null
        }
        Relationships: []
      }
      harvest_sessions: {
        Row: {
          adjusted_weight_grams: number | null
          adjustment_reason: string | null
          batch_registry_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          grow_room_id: string | null
          harvest_date: string
          id: string
          notes: string | null
          plant_count_harvested: number
          plant_group_id: string | null
          session_status: string
          waste_grams: number | null
          wet_weight_grams: number
        }
        Insert: {
          adjusted_weight_grams?: number | null
          adjustment_reason?: string | null
          batch_registry_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          grow_room_id?: string | null
          harvest_date: string
          id?: string
          notes?: string | null
          plant_count_harvested: number
          plant_group_id?: string | null
          session_status?: string
          waste_grams?: number | null
          wet_weight_grams: number
        }
        Update: {
          adjusted_weight_grams?: number | null
          adjustment_reason?: string | null
          batch_registry_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          grow_room_id?: string | null
          harvest_date?: string
          id?: string
          notes?: string | null
          plant_count_harvested?: number
          plant_group_id?: string | null
          session_status?: string
          waste_grams?: number | null
          wet_weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "harvest_sessions_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_sessions_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "harvest_sessions_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "harvest_sessions_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "harvest_sessions_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_weight_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          destination: string | null
          entry_order: number
          harvest_session_id: string
          id: string
          location_id: string | null
          notes: string | null
          plant_count: number
          weight_grams: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          entry_order?: number
          harvest_session_id: string
          id?: string
          location_id?: string | null
          notes?: string | null
          plant_count: number
          weight_grams: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          entry_order?: number
          harvest_session_id?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          plant_count?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "harvest_weight_entries_harvest_session_id_fkey"
            columns: ["harvest_session_id"]
            isOneToOne: false
            referencedRelation: "harvest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_weight_entries_harvest_session_id_fkey"
            columns: ["harvest_session_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["harvest_session_id"]
          },
          {
            foreignKeyName: "harvest_weight_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "dry_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hash_packages: {
        Row: {
          created_at: string
          dried_date: string | null
          freeze_dry_run_id: string | null
          id: string
          notes: string | null
          package_id: string
          remaining_weight_grams: number
          status: string
          strain_id: string
          updated_at: string
          wash_run_id: string
          weight_grams: number
        }
        Insert: {
          created_at?: string
          dried_date?: string | null
          freeze_dry_run_id?: string | null
          id?: string
          notes?: string | null
          package_id: string
          remaining_weight_grams: number
          status?: string
          strain_id: string
          updated_at?: string
          wash_run_id: string
          weight_grams: number
        }
        Update: {
          created_at?: string
          dried_date?: string | null
          freeze_dry_run_id?: string | null
          id?: string
          notes?: string | null
          package_id?: string
          remaining_weight_grams?: number
          status?: string
          strain_id?: string
          updated_at?: string
          wash_run_id?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "hash_packages_freeze_dry_run_id_fkey"
            columns: ["freeze_dry_run_id"]
            isOneToOne: false
            referencedRelation: "freeze_dry_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "hash_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "hash_packages_wash_run_id_fkey"
            columns: ["wash_run_id"]
            isOneToOne: false
            referencedRelation: "wash_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_plants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          plant_group_id: string
          state_plant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          plant_group_id: string
          state_plant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          plant_group_id?: string
          state_plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_plants_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_bucked_inventory: {
        Row: {
          allocated_weight_grams: number
          available_weight_grams: number | null
          batch_id: string | null
          created_at: string | null
          current_weight_grams: number
          initial_weight_grams: number
          last_session_date: string | null
          notes: string | null
          package_id: string
          room: string | null
          status: string | null
          strain: string
          strain_id: string | null
          synced_from_snapshot_id: string | null
          updated_at: string | null
        }
        Insert: {
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          batch_id?: string | null
          created_at?: string | null
          current_weight_grams?: number
          initial_weight_grams?: number
          last_session_date?: string | null
          notes?: string | null
          package_id: string
          room?: string | null
          status?: string | null
          strain: string
          strain_id?: string | null
          synced_from_snapshot_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          batch_id?: string | null
          created_at?: string | null
          current_weight_grams?: number
          initial_weight_grams?: number
          last_session_date?: string | null
          notes?: string | null
          package_id?: string
          room?: string | null
          status?: string | null
          strain?: string
          strain_id?: string | null
          synced_from_snapshot_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bucked_inventory_synced_from_snapshot_id_fkey"
            columns: ["synced_from_snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_bulk_inventory: {
        Row: {
          allocated_weight_grams: number
          available_weight_grams: number | null
          batch_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_type: string
          quality_grade: string | null
          source_package_id: string | null
          strain: string
          strain_id: string | null
          trim_date: string | null
          updated_at: string | null
          weight_grams: number
        }
        Insert: {
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_type: string
          quality_grade?: string | null
          source_package_id?: string | null
          strain: string
          strain_id?: string | null
          trim_date?: string | null
          updated_at?: string | null
          weight_grams?: number
        }
        Update: {
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_type?: string
          quality_grade?: string | null
          source_package_id?: string | null
          strain?: string
          strain_id?: string | null
          trim_date?: string | null
          updated_at?: string | null
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      internal_packaged_inventory: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          package_date: string | null
          packaging_session_id: string | null
          product_type: string
          strain: string
          unit_size: string
          units_allocated: number
          units_available: number | null
          units_count: number
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          package_date?: string | null
          packaging_session_id?: string | null
          product_type: string
          strain: string
          unit_size: string
          units_allocated?: number
          units_available?: number | null
          units_count?: number
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          package_date?: string | null
          packaging_session_id?: string | null
          product_type?: string
          strain?: string
          unit_size?: string
          units_allocated?: number
          units_available?: number | null
          units_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_packaged_inventory_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "active_packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_packaged_inventory_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "ghost_finalized_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "internal_packaged_inventory_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_packaged_inventory_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "vw_packaging_sessions_strain_quality"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_lines: {
        Row: {
          actual_qty: number | null
          audit_id: string
          batch: string | null
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          expected_qty: number
          id: string
          inventory_item_id: string | null
          line_order: number | null
          package_id: string
          product_name: string
          room: string | null
          stage: string
          strain: string | null
          unit: string
          updated_at: string | null
          variance_notes: string | null
          variance_percentage: number | null
          variance_qty: number | null
          variance_reason: Database["public"]["Enums"]["variance_reason"] | null
        }
        Insert: {
          actual_qty?: number | null
          audit_id: string
          batch?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          expected_qty: number
          id?: string
          inventory_item_id?: string | null
          line_order?: number | null
          package_id: string
          product_name: string
          room?: string | null
          stage: string
          strain?: string | null
          unit: string
          updated_at?: string | null
          variance_notes?: string | null
          variance_percentage?: number | null
          variance_qty?: number | null
          variance_reason?:
            | Database["public"]["Enums"]["variance_reason"]
            | null
        }
        Update: {
          actual_qty?: number | null
          audit_id?: string
          batch?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          expected_qty?: number
          id?: string
          inventory_item_id?: string | null
          line_order?: number | null
          package_id?: string
          product_name?: string
          room?: string | null
          stage?: string
          strain?: string | null
          unit?: string
          updated_at?: string | null
          variance_notes?: string | null
          variance_percentage?: number | null
          variance_qty?: number | null
          variance_reason?:
            | Database["public"]["Enums"]["variance_reason"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_lines_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
        ]
      }
      inventory_audits: {
        Row: {
          audit_number: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          is_locked: boolean | null
          notes: string | null
          packages_with_variance: number | null
          selected_stages: string[]
          status: Database["public"]["Enums"]["audit_status"]
          total_packages: number | null
          total_variance_amount: number | null
          updated_at: string | null
        }
        Insert: {
          audit_number: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          is_locked?: boolean | null
          notes?: string | null
          packages_with_variance?: number | null
          selected_stages: string[]
          status?: Database["public"]["Enums"]["audit_status"]
          total_packages?: number | null
          total_variance_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          audit_number?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          is_locked?: boolean | null
          notes?: string | null
          packages_with_variance?: number | null
          selected_stages?: string[]
          status?: Database["public"]["Enums"]["audit_status"]
          total_packages?: number | null
          total_variance_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_changes: {
        Row: {
          change_date: string | null
          change_type: string
          created_at: string | null
          id: string
          new_qty: number | null
          new_value: string | null
          notes: string | null
          package_id: string
          previous_qty: number | null
          previous_value: string | null
          snapshot_id: string | null
        }
        Insert: {
          change_date?: string | null
          change_type: string
          created_at?: string | null
          id?: string
          new_qty?: number | null
          new_value?: string | null
          notes?: string | null
          package_id: string
          previous_qty?: number | null
          previous_value?: string | null
          snapshot_id?: string | null
        }
        Update: {
          change_date?: string | null
          change_type?: string
          created_at?: string | null
          id?: string
          new_qty?: number | null
          new_value?: string | null
          notes?: string | null
          package_id?: string
          previous_qty?: number | null
          previous_value?: string | null
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_changes_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_conversions: {
        Row: {
          conversion_date: string | null
          created_at: string | null
          destination_id: string | null
          destination_type: string
          destination_weight_grams: number
          id: string
          source_id: string | null
          source_type: string
          source_weight_grams: number
          trim_session_id: string | null
        }
        Insert: {
          conversion_date?: string | null
          created_at?: string | null
          destination_id?: string | null
          destination_type: string
          destination_weight_grams: number
          id?: string
          source_id?: string | null
          source_type: string
          source_weight_grams: number
          trim_session_id?: string | null
        }
        Update: {
          conversion_date?: string | null
          created_at?: string | null
          destination_id?: string | null
          destination_type?: string
          destination_weight_grams?: number
          id?: string
          source_id?: string | null
          source_type?: string
          source_weight_grams?: number
          trim_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_conversions_trim_session_id_fkey"
            columns: ["trim_session_id"]
            isOneToOne: false
            referencedRelation: "active_trim_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_trim_session_id_fkey"
            columns: ["trim_session_id"]
            isOneToOne: false
            referencedRelation: "trim_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_trim_session_id_fkey"
            columns: ["trim_session_id"]
            isOneToOne: false
            referencedRelation: "vw_trim_sessions_strain_quality"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_internal_labels: {
        Row: {
          created_at: string | null
          id: string
          label_data: Json
          package_id: string
          printed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_data: Json
          package_id: string
          printed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label_data?: Json
          package_id?: string
          printed_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          available_qty: number | null
          batch: string | null
          batch_id: string
          batch_number: string | null
          category: string | null
          cbd_percentage: number | null
          created_at: string | null
          id: string
          last_updated: string | null
          net_weight: number | null
          on_hand_qty: number | null
          package_date: string | null
          package_id: string
          parent_item_id: string | null
          product_name: string | null
          product_stage_id: string | null
          quality_grade_id: string | null
          quantity_with_allocated: number | null
          reserved_qty: number
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          room: string | null
          sku: string | null
          snapshot_id: string | null
          status: string | null
          strain: string | null
          strain_id: string | null
          tags: string | null
          test_mode: boolean
          thc_percentage: number | null
          unit: string | null
          vendor: string | null
        }
        Insert: {
          available_qty?: number | null
          batch?: string | null
          batch_id: string
          batch_number?: string | null
          category?: string | null
          cbd_percentage?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          net_weight?: number | null
          on_hand_qty?: number | null
          package_date?: string | null
          package_id: string
          parent_item_id?: string | null
          product_name?: string | null
          product_stage_id?: string | null
          quality_grade_id?: string | null
          quantity_with_allocated?: number | null
          reserved_qty?: number
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room?: string | null
          sku?: string | null
          snapshot_id?: string | null
          status?: string | null
          strain?: string | null
          strain_id?: string | null
          tags?: string | null
          test_mode?: boolean
          thc_percentage?: number | null
          unit?: string | null
          vendor?: string | null
        }
        Update: {
          available_qty?: number | null
          batch?: string | null
          batch_id?: string
          batch_number?: string | null
          category?: string | null
          cbd_percentage?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          net_weight?: number | null
          on_hand_qty?: number | null
          package_date?: string | null
          package_id?: string
          parent_item_id?: string | null
          product_name?: string | null
          product_stage_id?: string | null
          quality_grade_id?: string | null
          quantity_with_allocated?: number | null
          reserved_qty?: number
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room?: string | null
          sku?: string | null
          snapshot_id?: string | null
          status?: string | null
          strain?: string | null
          strain_id?: string | null
          tags?: string | null
          test_mode?: boolean
          thc_percentage?: number | null
          unit?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_quality_grade_id_fkey"
            columns: ["quality_grade_id"]
            isOneToOne: false
            referencedRelation: "quality_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      inventory_movement_errors: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_context: Json | null
          error_message: string
          id: string
          movement_data: Json | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message: string
          id?: string
          movement_data?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message?: string
          id?: string
          movement_data?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          dest_item_id: string | null
          id: string
          movement_date: string | null
          movement_kind: string | null
          notes: string | null
          qty: number | null
          reason_code: string | null
          reference_id: string | null
          reference_type: string | null
          session_id: string | null
          source_item_id: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dest_item_id?: string | null
          id?: string
          movement_date?: string | null
          movement_kind?: string | null
          notes?: string | null
          qty?: number | null
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          session_id?: string | null
          source_item_id?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dest_item_id?: string | null
          id?: string
          movement_date?: string | null
          movement_kind?: string | null
          notes?: string | null
          qty?: number | null
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          session_id?: string | null
          source_item_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
        ]
      }
      inventory_reconciliation: {
        Row: {
          created_at: string | null
          current_snapshot_id: string | null
          id: string
          notes: string | null
          packages_compared: number | null
          packages_matched: number | null
          packages_with_variance: number | null
          previous_snapshot_id: string | null
          reconciliation_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          total_variance_grams: number | null
        }
        Insert: {
          created_at?: string | null
          current_snapshot_id?: string | null
          id?: string
          notes?: string | null
          packages_compared?: number | null
          packages_matched?: number | null
          packages_with_variance?: number | null
          previous_snapshot_id?: string | null
          reconciliation_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_variance_grams?: number | null
        }
        Update: {
          created_at?: string | null
          current_snapshot_id?: string | null
          id?: string
          notes?: string | null
          packages_compared?: number | null
          packages_matched?: number | null
          packages_with_variance?: number | null
          previous_snapshot_id?: string | null
          reconciliation_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_variance_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliation_current_snapshot_id_fkey"
            columns: ["current_snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliation_previous_snapshot_id_fkey"
            columns: ["previous_snapshot_id"]
            isOneToOne: false
            referencedRelation: "inventory_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_name: string
          id: string
          import_date: string | null
          imported_by: string | null
          row_count: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_name: string
          id?: string
          import_date?: string | null
          imported_by?: string | null
          row_count?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          id?: string
          import_date?: string | null
          imported_by?: string | null
          row_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      inventory_variances: {
        Row: {
          actual_quantity: number | null
          created_at: string | null
          expected_quantity: number | null
          id: string
          inventory_type: string | null
          package_id: string | null
          reconciliation_id: string | null
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          strain: string | null
          variance_category: string | null
          variance_quantity: number | null
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string | null
          expected_quantity?: number | null
          id?: string
          inventory_type?: string | null
          package_id?: string | null
          reconciliation_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          strain?: string | null
          variance_category?: string | null
          variance_quantity?: number | null
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string | null
          expected_quantity?: number | null
          id?: string
          inventory_type?: string | null
          package_id?: string | null
          reconciliation_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          strain?: string | null
          variance_category?: string | null
          variance_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_variances_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reconciliation"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ar_status: string | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string | null
          order_id: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_terms: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          ar_status?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_terms?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          ar_status?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_terms?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      ipm_spray_log: {
        Row: {
          application_method: string
          applied_at: string
          applied_by: string | null
          concentration: string | null
          created_at: string
          id: string
          notes: string | null
          pre_harvest_days: number | null
          product_name: string
          product_type: string
          re_entry_hours: number | null
          room_id: string
          tables_sprayed: string[] | null
          target_pest: string | null
          task_instance_id: string | null
          volume_applied: string | null
        }
        Insert: {
          application_method: string
          applied_at?: string
          applied_by?: string | null
          concentration?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pre_harvest_days?: number | null
          product_name: string
          product_type: string
          re_entry_hours?: number | null
          room_id: string
          tables_sprayed?: string[] | null
          target_pest?: string | null
          task_instance_id?: string | null
          volume_applied?: string | null
        }
        Update: {
          application_method?: string
          applied_at?: string
          applied_by?: string | null
          concentration?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pre_harvest_days?: number | null
          product_name?: string
          product_type?: string
          re_entry_hours?: number | null
          room_id?: string
          tables_sprayed?: string[] | null
          target_pest?: string | null
          task_instance_id?: string | null
          volume_applied?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipm_spray_log_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipm_spray_log_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "ipm_spray_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipm_spray_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "ipm_spray_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "ipm_spray_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "ipm_spray_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      label_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_coa: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_coa?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_coa?: boolean | null
        }
        Relationships: []
      }
      labels: {
        Row: {
          barcode_format: string | null
          barcode_url: string | null
          batch_id: string
          batch_number: string | null
          cbd_percentage: number | null
          compliance_uid: string | null
          created_at: string | null
          customer_license_name: string | null
          customer_license_number: string | null
          dominance_type: string | null
          expiration_date: string | null
          harvest_date: string | null
          id: string
          lab_name: string | null
          label_number: string
          label_type_id: string | null
          last_printed_at: string | null
          lineage: string | null
          net_weight_grams: number
          package_date: string | null
          package_id: string
          print_count: number | null
          print_history: Json | null
          printed_at: string | null
          product_id: string | null
          product_name: string
          product_type: string
          qr_code_data: string
          qr_code_url: string | null
          strain: string
          strain_id: string | null
          terpene_profile: Json | null
          test_date: string | null
          thc_percentage: number | null
          total_cannabinoids: number | null
          unit_count: number | null
          upc_code: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          warnings: string[] | null
        }
        Insert: {
          barcode_format?: string | null
          barcode_url?: string | null
          batch_id: string
          batch_number?: string | null
          cbd_percentage?: number | null
          compliance_uid?: string | null
          created_at?: string | null
          customer_license_name?: string | null
          customer_license_number?: string | null
          dominance_type?: string | null
          expiration_date?: string | null
          harvest_date?: string | null
          id?: string
          lab_name?: string | null
          label_number: string
          label_type_id?: string | null
          last_printed_at?: string | null
          lineage?: string | null
          net_weight_grams: number
          package_date?: string | null
          package_id: string
          print_count?: number | null
          print_history?: Json | null
          printed_at?: string | null
          product_id?: string | null
          product_name: string
          product_type: string
          qr_code_data: string
          qr_code_url?: string | null
          strain: string
          strain_id?: string | null
          terpene_profile?: Json | null
          test_date?: string | null
          thc_percentage?: number | null
          total_cannabinoids?: number | null
          unit_count?: number | null
          upc_code?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warnings?: string[] | null
        }
        Update: {
          barcode_format?: string | null
          barcode_url?: string | null
          batch_id?: string
          batch_number?: string | null
          cbd_percentage?: number | null
          compliance_uid?: string | null
          created_at?: string | null
          customer_license_name?: string | null
          customer_license_number?: string | null
          dominance_type?: string | null
          expiration_date?: string | null
          harvest_date?: string | null
          id?: string
          lab_name?: string | null
          label_number?: string
          label_type_id?: string | null
          last_printed_at?: string | null
          lineage?: string | null
          net_weight_grams?: number
          package_date?: string | null
          package_id?: string
          print_count?: number | null
          print_history?: Json | null
          printed_at?: string | null
          product_id?: string | null
          product_name?: string
          product_type?: string
          qr_code_data?: string
          qr_code_url?: string | null
          strain?: string
          strain_id?: string | null
          terpene_profile?: Json | null
          test_date?: string | null
          thc_percentage?: number | null
          total_cannabinoids?: number | null
          unit_count?: number | null
          upc_code?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_label_type_id_fkey"
            columns: ["label_type_id"]
            isOneToOne: false
            referencedRelation: "label_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      manifests: {
        Row: {
          actual_delivery_time: string | null
          compliance_notes: string | null
          created_at: string | null
          departure_time: string | null
          driver_name: string | null
          estimated_delivery_time: string | null
          id: string
          manifest_date: string
          manifest_number: string
          order_ids: string[]
          route_number: string | null
          signature_data: string | null
          status: string
          total_packages: number | null
          total_units: number | null
          total_weight_grams: number | null
          updated_at: string | null
          vehicle_info: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          compliance_notes?: string | null
          created_at?: string | null
          departure_time?: string | null
          driver_name?: string | null
          estimated_delivery_time?: string | null
          id?: string
          manifest_date?: string
          manifest_number: string
          order_ids?: string[]
          route_number?: string | null
          signature_data?: string | null
          status?: string
          total_packages?: number | null
          total_units?: number | null
          total_weight_grams?: number | null
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          compliance_notes?: string | null
          created_at?: string | null
          departure_time?: string | null
          driver_name?: string | null
          estimated_delivery_time?: string | null
          id?: string
          manifest_date?: string
          manifest_number?: string
          order_ids?: string[]
          route_number?: string | null
          signature_data?: string | null
          status?: string
          total_packages?: number | null
          total_units?: number | null
          total_weight_grams?: number | null
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Relationships: []
      }
      monthly_performance_metrics: {
        Row: {
          average_fulfillment_days: number | null
          created_at: string | null
          id: string
          month: string
          orders_fulfilled: number | null
          total_units_packaged: number | null
          total_weight_trimmed_grams: number | null
          updated_at: string | null
        }
        Insert: {
          average_fulfillment_days?: number | null
          created_at?: string | null
          id?: string
          month: string
          orders_fulfilled?: number | null
          total_units_packaged?: number | null
          total_weight_trimmed_grams?: number | null
          updated_at?: string | null
        }
        Update: {
          average_fulfillment_days?: number | null
          created_at?: string | null
          id?: string
          month?: string
          orders_fulfilled?: number | null
          total_units_packaged?: number | null
          total_weight_trimmed_grams?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: string
          created_at: string | null
          enabled: boolean | null
          event_type: string
          id: string
          message_template: string | null
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          enabled?: boolean | null
          event_type: string
          id?: string
          message_template?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          enabled?: boolean | null
          event_type?: string
          id?: string
          message_template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_forecasts: {
        Row: {
          created_at: string | null
          earliest_due_date: string | null
          forecast_date: string
          grams_available: number | null
          grams_shortfall: number | null
          id: string
          notes: string | null
          priority_score: number | null
          product_type: string
          strain: string
          total_grams_needed: number | null
          total_units_needed: number | null
        }
        Insert: {
          created_at?: string | null
          earliest_due_date?: string | null
          forecast_date?: string
          grams_available?: number | null
          grams_shortfall?: number | null
          id?: string
          notes?: string | null
          priority_score?: number | null
          product_type: string
          strain: string
          total_grams_needed?: number | null
          total_units_needed?: number | null
        }
        Update: {
          created_at?: string | null
          earliest_due_date?: string | null
          forecast_date?: string
          grams_available?: number | null
          grams_shortfall?: number | null
          id?: string
          notes?: string | null
          priority_score?: number | null
          product_type?: string
          strain?: string
          total_grams_needed?: number | null
          total_units_needed?: number | null
        }
        Relationships: []
      }
      order_fulfillment_checklist: {
        Row: {
          coa_attached_at: string | null
          created_at: string | null
          id: string
          inventory_allocated: boolean | null
          label_applied_at: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          coa_attached_at?: string | null
          created_at?: string | null
          id?: string
          inventory_allocated?: boolean | null
          label_applied_at?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coa_attached_at?: string | null
          created_at?: string | null
          id?: string
          inventory_allocated?: boolean | null
          label_applied_at?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      order_fulfillment_items: {
        Row: {
          assignment_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          packaged_inventory_id: string | null
          packaging_session_id: string | null
          product_type: string
          status: string | null
          strain: string
          unit_size: string
          units_assigned: number
          updated_at: string | null
        }
        Insert: {
          assignment_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          packaged_inventory_id?: string | null
          packaging_session_id?: string | null
          product_type: string
          status?: string | null
          strain: string
          unit_size: string
          units_assigned?: number
          updated_at?: string | null
        }
        Update: {
          assignment_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          packaged_inventory_id?: string | null
          packaging_session_id?: string | null
          product_type?: string
          status?: string | null
          strain?: string
          unit_size?: string
          units_assigned?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_packaged_inventory_id_fkey"
            columns: ["packaged_inventory_id"]
            isOneToOne: false
            referencedRelation: "internal_packaged_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "active_packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "ghost_finalized_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "vw_packaging_sessions_strain_quality"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          demand_unit: string | null
          discount_amount: number | null
          id: string
          is_sample: boolean
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          status: Database["public"]["Enums"]["order_item_status"] | null
          strain: string | null
          strain_id: string | null
          subtotal: number | null
          test_mode: boolean
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          demand_unit?: string | null
          discount_amount?: number | null
          id?: string
          is_sample?: boolean
          notes?: string | null
          order_id: string
          product_id: string
          quantity: number
          status?: Database["public"]["Enums"]["order_item_status"] | null
          strain?: string | null
          strain_id?: string | null
          subtotal?: number | null
          test_mode?: boolean
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          demand_unit?: string | null
          discount_amount?: number | null
          id?: string
          is_sample?: boolean
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_item_status"] | null
          strain?: string | null
          strain_id?: string | null
          subtotal?: number | null
          test_mode?: boolean
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      orders: {
        Row: {
          archived: boolean | null
          coversheet_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_notes: string | null
          id: string
          internal_notes: string | null
          is_sample: boolean
          order_date: string | null
          order_number: string
          order_source: string | null
          priority: string
          public_token: string | null
          requested_delivery_date: string | null
          scheduled_at: string | null
          scheduled_by: string | null
          scheduled_delivery_date: string | null
          status: string
          test_mode: boolean
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          coversheet_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_notes?: string | null
          id?: string
          internal_notes?: string | null
          is_sample?: boolean
          order_date?: string | null
          order_number: string
          order_source?: string | null
          priority?: string
          public_token?: string | null
          requested_delivery_date?: string | null
          scheduled_at?: string | null
          scheduled_by?: string | null
          scheduled_delivery_date?: string | null
          status?: string
          test_mode?: boolean
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          coversheet_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_notes?: string | null
          id?: string
          internal_notes?: string | null
          is_sample?: boolean
          order_date?: string | null
          order_number?: string
          order_source?: string | null
          priority?: string
          public_token?: string | null
          requested_delivery_date?: string | null
          scheduled_at?: string | null
          scheduled_by?: string | null
          scheduled_delivery_date?: string | null
          status?: string
          test_mode?: boolean
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      package_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          label_id: string | null
          notes: string | null
          order_id: string
          order_item_id: string
          package_id: string
          quantity_assigned: number
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          label_id?: string | null
          notes?: string | null
          order_id: string
          order_item_id: string
          package_id: string
          quantity_assigned: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          label_id?: string | null
          notes?: string | null
          order_id?: string
          order_item_id?: string
          package_id?: string
          quantity_assigned?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      packaging_schedule: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assigned_to: string | null
          created_at: string | null
          estimated_duration_minutes: number | null
          id: string
          notes: string | null
          order_id: string
          quality_check_passed: boolean | null
          scheduled_date: string
          scheduled_start_time: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_to?: string | null
          created_at?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          order_id: string
          quality_check_passed?: boolean | null
          scheduled_date: string
          scheduled_start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_to?: string | null
          created_at?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          quality_check_passed?: boolean | null
          scheduled_date?: string
          scheduled_start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      packaging_sessions: {
        Row: {
          batch_id: string
          batch_registry_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          conversion_metadata: Json | null
          created_at: string | null
          ending_weight: number | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalization_status_14g: string
          finalization_status_1lb: string
          finalization_status_3_5g: string
          finalization_status_packaged: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_at_14g: string | null
          finalized_at_1lb: string | null
          finalized_at_3_5g: string | null
          finalized_at_packaged: string | null
          finalized_by: string | null
          finalized_by_14g: string | null
          finalized_by_1lb: string | null
          finalized_by_3_5g: string | null
          finalized_by_packaged: string | null
          id: string
          is_paused: boolean
          minutes_packaged: number | null
          notes: string | null
          output_product_14g_name: string | null
          output_product_1lb_name: string | null
          output_product_3_5g_name: string | null
          output_product_name: string | null
          package_id: string
          package_weight: number | null
          packager_name: string
          packager_staff_id: string | null
          pull_weight: number | null
          recorded_in_dutchie: boolean | null
          session_date: string
          session_status: string | null
          started_at: string | null
          strain: string
          strain_id: string | null
          test_mode: boolean
          total_pause_minutes: number
          trim_grams: number | null
          units_14g: number | null
          units_3_5g: number | null
          units_454g: number | null
          units_per_hour: number | null
          updated_at: string | null
          variance_grams: number | null
          void_reason: string | null
          void_reason_14g: string | null
          void_reason_1lb: string | null
          void_reason_3_5g: string | null
          void_reason_packaged: string | null
          waste_grams: number | null
        }
        Insert: {
          batch_id: string
          batch_registry_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          conversion_metadata?: Json | null
          created_at?: string | null
          ending_weight?: number | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_14g?: string
          finalization_status_1lb?: string
          finalization_status_3_5g?: string
          finalization_status_packaged?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_at_14g?: string | null
          finalized_at_1lb?: string | null
          finalized_at_3_5g?: string | null
          finalized_at_packaged?: string | null
          finalized_by?: string | null
          finalized_by_14g?: string | null
          finalized_by_1lb?: string | null
          finalized_by_3_5g?: string | null
          finalized_by_packaged?: string | null
          id?: string
          is_paused?: boolean
          minutes_packaged?: number | null
          notes?: string | null
          output_product_14g_name?: string | null
          output_product_1lb_name?: string | null
          output_product_3_5g_name?: string | null
          output_product_name?: string | null
          package_id: string
          package_weight?: number | null
          packager_name: string
          packager_staff_id?: string | null
          pull_weight?: number | null
          recorded_in_dutchie?: boolean | null
          session_date?: string
          session_status?: string | null
          started_at?: string | null
          strain: string
          strain_id?: string | null
          test_mode?: boolean
          total_pause_minutes?: number
          trim_grams?: number | null
          units_14g?: number | null
          units_3_5g?: number | null
          units_454g?: number | null
          units_per_hour?: number | null
          updated_at?: string | null
          variance_grams?: number | null
          void_reason?: string | null
          void_reason_14g?: string | null
          void_reason_1lb?: string | null
          void_reason_3_5g?: string | null
          void_reason_packaged?: string | null
          waste_grams?: number | null
        }
        Update: {
          batch_id?: string
          batch_registry_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          conversion_metadata?: Json | null
          created_at?: string | null
          ending_weight?: number | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_14g?: string
          finalization_status_1lb?: string
          finalization_status_3_5g?: string
          finalization_status_packaged?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_at_14g?: string | null
          finalized_at_1lb?: string | null
          finalized_at_3_5g?: string | null
          finalized_at_packaged?: string | null
          finalized_by?: string | null
          finalized_by_14g?: string | null
          finalized_by_1lb?: string | null
          finalized_by_3_5g?: string | null
          finalized_by_packaged?: string | null
          id?: string
          is_paused?: boolean
          minutes_packaged?: number | null
          notes?: string | null
          output_product_14g_name?: string | null
          output_product_1lb_name?: string | null
          output_product_3_5g_name?: string | null
          output_product_name?: string | null
          package_id?: string
          package_weight?: number | null
          packager_name?: string
          packager_staff_id?: string | null
          pull_weight?: number | null
          recorded_in_dutchie?: boolean | null
          session_date?: string
          session_status?: string | null
          started_at?: string | null
          strain?: string
          strain_id?: string | null
          test_mode?: boolean
          total_pause_minutes?: number
          trim_grams?: number | null
          units_14g?: number | null
          units_3_5g?: number | null
          units_454g?: number | null
          units_per_hour?: number | null
          updated_at?: string | null
          variance_grams?: number | null
          void_reason?: string | null
          void_reason_14g?: string | null
          void_reason_1lb?: string | null
          void_reason_3_5g?: string | null
          void_reason_packaged?: string | null
          waste_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_packager_staff_id_fkey"
            columns: ["packager_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_packager_staff_id_fkey"
            columns: ["packager_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      packaging_yield_history: {
        Row: {
          average_yield_percentage: number
          confidence_interval_lower: number | null
          confidence_interval_upper: number | null
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          sample_size: number
          source_type: string
          standard_deviation: number | null
          strain: string
          target_type: string
        }
        Insert: {
          average_yield_percentage: number
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          sample_size?: number
          source_type: string
          standard_deviation?: number | null
          strain: string
          target_type: string
        }
        Update: {
          average_yield_percentage?: number
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          sample_size?: number
          source_type?: string
          standard_deviation?: number | null
          strain?: string
          target_type?: string
        }
        Relationships: []
      }
      packaging_yields: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          input_weight_grams: number
          notes: string | null
          output_quantity_units: number
          packaging_date: string | null
          packaging_session_id: string | null
          source_type: string
          strain: string
          target_type: string
          yield_percentage: number | null
          yield_rate_units_per_gram: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          input_weight_grams: number
          notes?: string | null
          output_quantity_units: number
          packaging_date?: string | null
          packaging_session_id?: string | null
          source_type: string
          strain: string
          target_type: string
          yield_percentage?: number | null
          yield_rate_units_per_gram?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          input_weight_grams?: number
          notes?: string | null
          output_quantity_units?: number
          packaging_date?: string | null
          packaging_session_id?: string | null
          source_type?: string
          strain?: string
          target_type?: string
          yield_percentage?: number | null
          yield_rate_units_per_gram?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_yields_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "active_packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_yields_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "ghost_finalized_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "packaging_yields_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_yields_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "vw_packaging_sessions_strain_quality"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          recorded_by: string | null
          reference_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_group_cut_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          cut_count: number
          cut_date: string | null
          id: string
          mother_plant_group_id: string
          notes: string | null
          plant_group_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cut_count: number
          cut_date?: string | null
          id?: string
          mother_plant_group_id: string
          notes?: string | null
          plant_group_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cut_count?: number
          cut_date?: string | null
          id?: string
          mother_plant_group_id?: string
          notes?: string | null
          plant_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_group_cut_sessions_mother_plant_group_id_fkey"
            columns: ["mother_plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_group_cut_sessions_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_group_room_history: {
        Row: {
          from_room_id: string
          id: string
          moved_at: string
          moved_by: string | null
          notes: string | null
          plant_group_id: string
          to_room_id: string
        }
        Insert: {
          from_room_id: string
          id?: string
          moved_at?: string
          moved_by?: string | null
          notes?: string | null
          plant_group_id: string
          to_room_id: string
        }
        Update: {
          from_room_id?: string
          id?: string
          moved_at?: string
          moved_by?: string | null
          notes?: string | null
          plant_group_id?: string
          to_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_group_room_history_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_group_room_history_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "plant_group_room_history_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_group_room_history_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_group_room_history_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_group_room_history_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_group_room_history_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "plant_group_room_history_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_group_room_history_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
        ]
      }
      plant_group_stage_history: {
        Row: {
          from_stage: string | null
          id: string
          notes: string | null
          plant_group_id: string
          to_stage: string
          transitioned_at: string
          transitioned_by: string | null
        }
        Insert: {
          from_stage?: string | null
          id?: string
          notes?: string | null
          plant_group_id: string
          to_stage: string
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Update: {
          from_stage?: string | null
          id?: string
          notes?: string | null
          plant_group_id?: string
          to_stage?: string
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_group_stage_history_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_groups: {
        Row: {
          batch_registry_id: string | null
          created_at: string
          created_by: string | null
          estimated_harvest_date: string | null
          grow_room_id: string
          growth_stage: string
          id: string
          is_mother: boolean
          mother_plant_group_id: string | null
          name: string | null
          notes: string | null
          phenotype: string | null
          plant_count: number
          planted_date: string | null
          room_section_id: string | null
          room_table_id: string | null
          source_type: string
          stage_entered_at: string
          strain_id: string
          updated_at: string
        }
        Insert: {
          batch_registry_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_harvest_date?: string | null
          grow_room_id: string
          growth_stage?: string
          id?: string
          is_mother?: boolean
          mother_plant_group_id?: string | null
          name?: string | null
          notes?: string | null
          phenotype?: string | null
          plant_count: number
          planted_date?: string | null
          room_section_id?: string | null
          room_table_id?: string | null
          source_type?: string
          stage_entered_at?: string
          strain_id: string
          updated_at?: string
        }
        Update: {
          batch_registry_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_harvest_date?: string | null
          grow_room_id?: string
          growth_stage?: string
          id?: string
          is_mother?: boolean
          mother_plant_group_id?: string | null
          name?: string | null
          notes?: string | null
          phenotype?: string | null
          plant_count?: number
          planted_date?: string | null
          room_section_id?: string | null
          room_table_id?: string | null
          source_type?: string
          stage_entered_at?: string
          strain_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_groups_mother_plant_group_id_fkey"
            columns: ["mother_plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_room_section_id_fkey"
            columns: ["room_section_id"]
            isOneToOne: false
            referencedRelation: "room_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_room_table_id_fkey"
            columns: ["room_table_id"]
            isOneToOne: false
            referencedRelation: "room_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      plant_mortality_log: {
        Row: {
          cause: string | null
          cause_detail: string | null
          created_at: string
          id: string
          mortality_date: string
          notes: string | null
          plant_group_id: string
          quantity: number
          reported_by: string | null
          room_id: string
        }
        Insert: {
          cause?: string | null
          cause_detail?: string | null
          created_at?: string
          id?: string
          mortality_date?: string
          notes?: string | null
          plant_group_id: string
          quantity?: number
          reported_by?: string | null
          room_id: string
        }
        Update: {
          cause?: string | null
          cause_detail?: string | null
          created_at?: string
          id?: string
          mortality_date?: string
          notes?: string | null
          plant_group_id?: string
          quantity?: number
          reported_by?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_mortality_log_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_mortality_log_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_mortality_log_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "plant_mortality_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_mortality_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "plant_mortality_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_mortality_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
        ]
      }
      press_run_inputs: {
        Row: {
          created_at: string | null
          hash_package_id: string
          id: string
          press_run_id: string
          weight_grams: number
        }
        Insert: {
          created_at?: string | null
          hash_package_id: string
          id?: string
          press_run_id: string
          weight_grams: number
        }
        Update: {
          created_at?: string | null
          hash_package_id?: string
          id?: string
          press_run_id?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "press_run_inputs_hash_package_id_fkey"
            columns: ["hash_package_id"]
            isOneToOne: false
            referencedRelation: "hash_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "press_run_inputs_press_run_id_fkey"
            columns: ["press_run_id"]
            isOneToOne: false
            referencedRelation: "press_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      press_runs: {
        Row: {
          bag_micron: number | null
          batch_id: string | null
          created_at: string
          equipment_id: string | null
          freeze_dry_run_id: string
          id: string
          input_weight_grams: number
          notes: string | null
          operator_id: string | null
          output_weight_grams: number | null
          press_date: string
          press_time_seconds: number | null
          pressure_psi: number | null
          status: string
          temperature_f: number | null
          updated_at: string
          wash_run_id: string
          waste_weight_grams: number | null
          yield_percentage: number | null
        }
        Insert: {
          bag_micron?: number | null
          batch_id?: string | null
          created_at?: string
          equipment_id?: string | null
          freeze_dry_run_id: string
          id?: string
          input_weight_grams: number
          notes?: string | null
          operator_id?: string | null
          output_weight_grams?: number | null
          press_date?: string
          press_time_seconds?: number | null
          pressure_psi?: number | null
          status?: string
          temperature_f?: number | null
          updated_at?: string
          wash_run_id: string
          waste_weight_grams?: number | null
          yield_percentage?: number | null
        }
        Update: {
          bag_micron?: number | null
          batch_id?: string | null
          created_at?: string
          equipment_id?: string | null
          freeze_dry_run_id?: string
          id?: string
          input_weight_grams?: number
          notes?: string | null
          operator_id?: string | null
          output_weight_grams?: number | null
          press_date?: string
          press_time_seconds?: number | null
          pressure_psi?: number | null
          status?: string
          temperature_f?: number | null
          updated_at?: string
          wash_run_id?: string
          waste_weight_grams?: number | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "press_runs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "rosin_lab_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "press_runs_freeze_dry_run_id_fkey"
            columns: ["freeze_dry_run_id"]
            isOneToOne: false
            referencedRelation: "freeze_dry_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "press_runs_wash_run_id_fkey"
            columns: ["wash_run_id"]
            isOneToOne: false
            referencedRelation: "wash_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_labels: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          label_data: Json
          label_number: string
          package_assignment_id: string
          printed_at: string | null
          printed_by: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          label_data: Json
          label_number: string
          package_assignment_id: string
          printed_at?: string | null
          printed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          label_data?: Json
          label_number?: string
          package_assignment_id?: string
          printed_at?: string | null
          printed_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_labels_package_assignment_id_fkey"
            columns: ["package_assignment_id"]
            isOneToOne: false
            referencedRelation: "package_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_labels_package_assignment_id_fkey"
            columns: ["package_assignment_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_labels_package_assignment_id_fkey"
            columns: ["package_assignment_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stages: {
        Row: {
          allows_fractional_quantity: boolean
          created_at: string | null
          default_pricing_unit: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          allows_fractional_quantity?: boolean
          created_at?: string | null
          default_pricing_unit?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          allows_fractional_quantity?: boolean
          created_at?: string | null
          default_pricing_unit?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_types: {
        Row: {
          applicable_stages: string[]
          base_unit: string | null
          base_weight: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          applicable_stages?: string[]
          base_unit?: string | null
          base_weight?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          applicable_stages?: string[]
          base_unit?: string | null
          base_weight?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          allows_fractional_quantity: boolean | null
          archive_reason: string | null
          archived_at: string | null
          available_quantity: number | null
          created_at: string | null
          generated_at: string | null
          generation_batch_id: string | null
          gross_weight: number | null
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          net_weight: number | null
          notes: string | null
          packaging_time_minutes: number | null
          price_per_unit: number | null
          pricing_unit: string | null
          product_category: string | null
          replaced_by_product_id: string | null
          sku: string | null
          stage_id: string | null
          strain: string | null
          strain_id: string | null
          trim_time_minutes: number | null
          type: string
          type_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          allows_fractional_quantity?: boolean | null
          archive_reason?: string | null
          archived_at?: string | null
          available_quantity?: number | null
          created_at?: string | null
          generated_at?: string | null
          generation_batch_id?: string | null
          gross_weight?: number | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          net_weight?: number | null
          notes?: string | null
          packaging_time_minutes?: number | null
          price_per_unit?: number | null
          pricing_unit?: string | null
          product_category?: string | null
          replaced_by_product_id?: string | null
          sku?: string | null
          stage_id?: string | null
          strain?: string | null
          strain_id?: string | null
          trim_time_minutes?: number | null
          type?: string
          type_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          allows_fractional_quantity?: boolean | null
          archive_reason?: string | null
          archived_at?: string | null
          available_quantity?: number | null
          created_at?: string | null
          generated_at?: string | null
          generation_batch_id?: string | null
          gross_weight?: number | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          net_weight?: number | null
          notes?: string | null
          packaging_time_minutes?: number | null
          price_per_unit?: number | null
          pricing_unit?: string | null
          product_category?: string | null
          replaced_by_product_id?: string | null
          sku?: string | null
          stage_id?: string | null
          strain?: string | null
          strain_id?: string | null
          trim_time_minutes?: number | null
          type?: string
          type_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "products_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_grade_history: {
        Row: {
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_grade_id: string | null
          previous_grade_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_grade_id?: string | null
          previous_grade_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_grade_id?: string | null
          previous_grade_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_grade_history_new_grade_id_fkey"
            columns: ["new_grade_id"]
            isOneToOne: false
            referencedRelation: "quality_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_grade_history_previous_grade_id_fkey"
            columns: ["previous_grade_id"]
            isOneToOne: false
            referencedRelation: "quality_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_grades: {
        Row: {
          code: string
          color_class: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color_class?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color_class?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      quarantine_violation_log: {
        Row: {
          attempted_operation: string
          batch_id: string | null
          blocked_at: string | null
          blocked_by: string | null
          id: string
          item_id: string | null
          movement_kind: string | null
          order_id: string | null
          quarantine_reason: string | null
          violation_details: Json | null
        }
        Insert: {
          attempted_operation: string
          batch_id?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          id?: string
          item_id?: string | null
          movement_kind?: string | null
          order_id?: string | null
          quarantine_reason?: string | null
          violation_details?: Json | null
        }
        Update: {
          attempted_operation?: string
          batch_id?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          id?: string
          item_id?: string | null
          movement_kind?: string | null
          order_id?: string | null
          quarantine_reason?: string | null
          violation_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      recurring_bills: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          frequency: string
          id: string
          is_active: boolean | null
          is_cogs: boolean
          last_generated_date: string | null
          next_bill_date: string
          notes: string | null
          payment_terms: string | null
          updated_at: string | null
          vendor_category: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_cogs?: boolean
          last_generated_date?: string | null
          next_bill_date: string
          notes?: string | null
          payment_terms?: string | null
          updated_at?: string | null
          vendor_category: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_cogs?: boolean
          last_generated_date?: string | null
          next_bill_date?: string
          notes?: string | null
          payment_terms?: string | null
          updated_at?: string | null
          vendor_category?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "recurring_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      room_schedule_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          room_type: string
          schedules: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          room_type?: string
          schedules?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          room_type?: string
          schedules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      room_sections: {
        Row: {
          created_at: string
          created_by: string | null
          flip_date: string | null
          id: string
          is_active: boolean
          projected_harvest_date: string | null
          room_table_id: string
          section_label: string
          section_sqft: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          flip_date?: string | null
          id?: string
          is_active?: boolean
          projected_harvest_date?: string | null
          room_table_id: string
          section_label: string
          section_sqft?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          flip_date?: string | null
          id?: string
          is_active?: boolean
          projected_harvest_date?: string | null
          room_table_id?: string
          section_label?: string
          section_sqft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_sections_room_table_id_fkey"
            columns: ["room_table_id"]
            isOneToOne: false
            referencedRelation: "room_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      room_tables: {
        Row: {
          created_at: string
          created_by: string | null
          grow_room_id: string
          id: string
          is_active: boolean
          table_name: string | null
          table_number: number
          total_sqft: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grow_room_id: string
          id?: string
          is_active?: boolean
          table_name?: string | null
          table_number: number
          total_sqft?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grow_room_id?: string
          id?: string
          is_active?: boolean
          table_name?: string | null
          table_number?: number
          total_sqft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_tables_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_tables_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "room_tables_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "room_tables_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
        ]
      }
      room_task_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number[] | null
          default_config: Json | null
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          priority: string
          recurrence: string
          room_id: string
          scope: string
          start_date: string
          task_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number[] | null
          default_config?: Json | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          priority?: string
          recurrence: string
          room_id: string
          scope?: string
          start_date: string
          task_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number[] | null
          default_config?: Json | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          priority?: string
          recurrence?: string
          room_id?: string
          scope?: string
          start_date?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_task_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_task_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "room_task_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "room_task_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
        ]
      }
      rosin_cure_sessions: {
        Row: {
          actual_consistency: string | null
          created_at: string
          cure_loss_percentage: number | null
          cure_temp_f: number | null
          end_time: string | null
          id: string
          input_weight_grams: number
          notes: string | null
          output_weight_grams: number | null
          press_run_id: string
          start_date: string | null
          start_time: string | null
          status: string
          target_consistency: string | null
          target_end_date: string | null
          updated_at: string
          wash_run_id: string
          waste_weight_grams: number | null
        }
        Insert: {
          actual_consistency?: string | null
          created_at?: string
          cure_loss_percentage?: number | null
          cure_temp_f?: number | null
          end_time?: string | null
          id?: string
          input_weight_grams: number
          notes?: string | null
          output_weight_grams?: number | null
          press_run_id: string
          start_date?: string | null
          start_time?: string | null
          status?: string
          target_consistency?: string | null
          target_end_date?: string | null
          updated_at?: string
          wash_run_id: string
          waste_weight_grams?: number | null
        }
        Update: {
          actual_consistency?: string | null
          created_at?: string
          cure_loss_percentage?: number | null
          cure_temp_f?: number | null
          end_time?: string | null
          id?: string
          input_weight_grams?: number
          notes?: string | null
          output_weight_grams?: number | null
          press_run_id?: string
          start_date?: string | null
          start_time?: string | null
          status?: string
          target_consistency?: string | null
          target_end_date?: string | null
          updated_at?: string
          wash_run_id?: string
          waste_weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rosin_cure_sessions_press_run_id_fkey"
            columns: ["press_run_id"]
            isOneToOne: false
            referencedRelation: "press_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosin_cure_sessions_wash_run_id_fkey"
            columns: ["wash_run_id"]
            isOneToOne: false
            referencedRelation: "wash_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      rosin_lab_equipment: {
        Row: {
          created_at: string
          equipment_type: string
          id: string
          last_maintenance_date: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_type: string
          id?: string
          last_maintenance_date?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_type?: string
          id?: string
          last_maintenance_date?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rosin_packages: {
        Row: {
          created_at: string
          cure_session_id: string | null
          destination: string
          id: string
          inventory_item_id: string | null
          notes: string | null
          package_id: string
          press_run_id: string
          status: string
          strain_id: string
          updated_at: string
          weight_grams: number
        }
        Insert: {
          created_at?: string
          cure_session_id?: string | null
          destination: string
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          package_id: string
          press_run_id: string
          status?: string
          strain_id: string
          updated_at?: string
          weight_grams: number
        }
        Update: {
          created_at?: string
          cure_session_id?: string | null
          destination?: string
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          package_id?: string
          press_run_id?: string
          status?: string
          strain_id?: string
          updated_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "rosin_packages_cure_session_id_fkey"
            columns: ["cure_session_id"]
            isOneToOne: false
            referencedRelation: "rosin_cure_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosin_packages_press_run_id_fkey"
            columns: ["press_run_id"]
            isOneToOne: false
            referencedRelation: "press_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "rosin_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      route_waypoints: {
        Row: {
          created_at: string | null
          direction: string | null
          distance_meters: number
          duration_seconds: number
          id: string
          instruction_text: string
          route_id: string
          step_number: number
          street_name: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          distance_meters: number
          duration_seconds: number
          id?: string
          instruction_text: string
          route_id: string
          step_number: number
          street_name?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          distance_meters?: number
          duration_seconds?: number
          id?: string
          instruction_text?: string
          route_id?: string
          step_number?: number
          street_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_waypoints_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_rep_assignments: {
        Row: {
          assigned_at: string
          customer_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          customer_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          customer_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_rep_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      scouting_log: {
        Row: {
          created_at: string
          disease_found: boolean
          disease_type: string | null
          id: string
          notes: string | null
          nutrient_issues: string | null
          overall_health: string | null
          pest_found: boolean
          pest_severity: string | null
          pest_type: string | null
          room_id: string
          scouted_at: string
          scouted_by: string | null
          sections_scouted: string[] | null
          task_instance_id: string | null
        }
        Insert: {
          created_at?: string
          disease_found?: boolean
          disease_type?: string | null
          id?: string
          notes?: string | null
          nutrient_issues?: string | null
          overall_health?: string | null
          pest_found?: boolean
          pest_severity?: string | null
          pest_type?: string | null
          room_id: string
          scouted_at?: string
          scouted_by?: string | null
          sections_scouted?: string[] | null
          task_instance_id?: string | null
        }
        Update: {
          created_at?: string
          disease_found?: boolean
          disease_type?: string | null
          id?: string
          notes?: string | null
          nutrient_issues?: string | null
          overall_health?: string | null
          pest_found?: boolean
          pest_severity?: string | null
          pest_type?: string | null
          room_id?: string
          scouted_at?: string
          scouted_by?: string | null
          sections_scouted?: string[] | null
          task_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouting_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "scouting_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "scouting_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "scouting_log_scouted_by_fkey"
            columns: ["scouted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_log_scouted_by_fkey"
            columns: ["scouted_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "scouting_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      session_pauses: {
        Row: {
          created_at: string | null
          id: string
          pause_duration_minutes: number | null
          paused_at: string
          resumed_at: string | null
          session_id: string
          session_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pause_duration_minutes?: number | null
          paused_at?: string
          resumed_at?: string | null
          session_id: string
          session_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pause_duration_minutes?: number | null
          paused_at?: string
          resumed_at?: string | null
          session_id?: string
          session_type?: string
        }
        Relationships: []
      }
      slack_notifications: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          message: string
          order_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message: string
          order_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message?: string
          order_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      slack_thread_map: {
        Row: {
          chat_session_id: string | null
          created_at: string | null
          id: string
          slack_channel_id: string
          slack_thread_ts: string
          slack_user_id: string
        }
        Insert: {
          chat_session_id?: string | null
          created_at?: string | null
          id?: string
          slack_channel_id: string
          slack_thread_ts: string
          slack_user_id: string
        }
        Update: {
          chat_session_id?: string | null
          created_at?: string | null
          id?: string
          slack_channel_id?: string
          slack_thread_ts?: string
          slack_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_thread_map_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_thread_map_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "v_chat_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          employer_cost_multiplier: number | null
          end_date: string | null
          first_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          last_name: string | null
          notes: string | null
          phone: string | null
          pin_code: string | null
          position_title: string | null
          reports_to: string | null
          role: string | null
          slack_id: string | null
          start_date: string | null
          updated_at: string | null
          user_profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employer_cost_multiplier?: number | null
          end_date?: string | null
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          pin_code?: string | null
          position_title?: string | null
          reports_to?: string | null
          role?: string | null
          slack_id?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employer_cost_multiplier?: number | null
          end_date?: string | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          pin_code?: string | null
          position_title?: string | null
          reports_to?: string | null
          role?: string | null
          slack_id?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: true
            referencedRelation: "vw_manager_review_performance"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      staff_department_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          can_perform: string[]
          department: string
          id: string
          is_primary: boolean
          notes: string | null
          staff_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          can_perform?: string[]
          department: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          staff_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          can_perform?: string[]
          department?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_assignments_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "valid_departments"
            referencedColumns: ["department"]
          },
          {
            foreignKeyName: "staff_department_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_department_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      strain_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          strain_id: string
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          strain_id: string
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          strain_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      strain_intelligence_log: {
        Row: {
          created_at: string | null
          deviation_pct: number | null
          historical_avg: number | null
          id: string
          is_anomalous: boolean | null
          metric_name: string
          metric_value: number | null
          notes: string | null
          session_date: string
          session_id: string
          session_type: string
          strain_id: string | null
          strain_name: string
        }
        Insert: {
          created_at?: string | null
          deviation_pct?: number | null
          historical_avg?: number | null
          id?: string
          is_anomalous?: boolean | null
          metric_name: string
          metric_value?: number | null
          notes?: string | null
          session_date: string
          session_id: string
          session_type: string
          strain_id?: string | null
          strain_name: string
        }
        Update: {
          created_at?: string | null
          deviation_pct?: number | null
          historical_avg?: number | null
          id?: string
          is_anomalous?: boolean | null
          metric_name?: string
          metric_value?: number | null
          notes?: string | null
          session_date?: string
          session_id?: string
          session_type?: string
          strain_id?: string | null
          strain_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_intelligence_log_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      strain_metadata: {
        Row: {
          abbreviation: string | null
          avg_bucked_to_flower_ratio: number | null
          avg_bucked_to_smalls_ratio: number | null
          avg_bucked_to_trim_ratio: number | null
          avg_trim_grams_per_hour: number | null
          avg_waste_percentage: number | null
          created_at: string | null
          genetics: string | null
          id: string
          name: string
          notes: string | null
          over_allocation_critical_threshold: number | null
          over_allocation_warning_threshold: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_trim_grams_per_hour?: number | null
          avg_waste_percentage?: number | null
          created_at?: string | null
          genetics?: string | null
          id?: string
          name: string
          notes?: string | null
          over_allocation_critical_threshold?: number | null
          over_allocation_warning_threshold?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_trim_grams_per_hour?: number | null
          avg_waste_percentage?: number | null
          created_at?: string | null
          genetics?: string | null
          id?: string
          name?: string
          notes?: string | null
          over_allocation_critical_threshold?: number | null
          over_allocation_warning_threshold?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strains: {
        Row: {
          abbreviation: string | null
          avg_bucked_to_flower_ratio: number | null
          avg_bucked_to_smalls_ratio: number | null
          avg_bucked_to_trim_ratio: number | null
          avg_trim_grams_per_hour: number | null
          avg_waste_percentage: number | null
          bucked_to_bulk_ratio: number | null
          bulk_to_packaged_ratio: number | null
          category: string | null
          cbd_range: string | null
          created_at: string | null
          cultivation_notes: string | null
          description: string | null
          display_name: string
          dominance_type: string | null
          feed_group: string | null
          flowering_time_class: string | null
          flowering_time_days: number | null
          genetics_description: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          terpene_profile: Json | null
          thc_range: string | null
          typical_yield_percentage: number | null
          updated_at: string | null
          veg_days_avg: number | null
        }
        Insert: {
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_trim_grams_per_hour?: number | null
          avg_waste_percentage?: number | null
          bucked_to_bulk_ratio?: number | null
          bulk_to_packaged_ratio?: number | null
          category?: string | null
          cbd_range?: string | null
          created_at?: string | null
          cultivation_notes?: string | null
          description?: string | null
          display_name?: string
          dominance_type?: string | null
          feed_group?: string | null
          flowering_time_class?: string | null
          flowering_time_days?: number | null
          genetics_description?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          terpene_profile?: Json | null
          thc_range?: string | null
          typical_yield_percentage?: number | null
          updated_at?: string | null
          veg_days_avg?: number | null
        }
        Update: {
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_trim_grams_per_hour?: number | null
          avg_waste_percentage?: number | null
          bucked_to_bulk_ratio?: number | null
          bulk_to_packaged_ratio?: number | null
          category?: string | null
          cbd_range?: string | null
          created_at?: string | null
          cultivation_notes?: string | null
          description?: string | null
          display_name?: string
          dominance_type?: string | null
          feed_group?: string | null
          flowering_time_class?: string | null
          flowering_time_days?: number | null
          genetics_description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          terpene_profile?: Json | null
          thc_range?: string | null
          typical_yield_percentage?: number | null
          updated_at?: string | null
          veg_days_avg?: number | null
        }
        Relationships: []
      }
      system_metadata: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      test_mode_audit_log: {
        Row: {
          action: string
          context: Json | null
          created_at: string | null
          id: string
          user_id: string | null
          validation_bypassed: string
        }
        Insert: {
          action: string
          context?: Json | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          validation_bypassed: string
        }
        Update: {
          action?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          validation_bypassed?: string
        }
        Relationships: []
      }
      throughput_metrics: {
        Row: {
          avg_grams_per_hour: number | null
          avg_units_per_hour: number | null
          created_at: string | null
          id: string
          metric_date: string
          sessions_completed: number
          staff_id: string | null
          strain: string | null
          total_minutes_worked: number
          total_units_produced: number
          total_weight_processed: number
          worker_name: string
          worker_type: string
        }
        Insert: {
          avg_grams_per_hour?: number | null
          avg_units_per_hour?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          sessions_completed?: number
          staff_id?: string | null
          strain?: string | null
          total_minutes_worked?: number
          total_units_produced?: number
          total_weight_processed?: number
          worker_name: string
          worker_type: string
        }
        Update: {
          avg_grams_per_hour?: number | null
          avg_units_per_hour?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          sessions_completed?: number
          staff_id?: string | null
          strain?: string | null
          total_minutes_worked?: number
          total_units_produced?: number
          total_weight_processed?: number
          worker_name?: string
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "throughput_metrics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "throughput_metrics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      tickets: {
        Row: {
          affected_area: string | null
          ai_analysis: string | null
          ai_classification: Json | null
          attachments: Json | null
          bug_category: string | null
          business_case: string | null
          chat_session_id: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          reported_by: string | null
          request_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          affected_area?: string | null
          ai_analysis?: string | null
          ai_classification?: Json | null
          attachments?: Json | null
          bug_category?: string | null
          business_case?: string | null
          chat_session_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          reported_by?: string | null
          request_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          affected_area?: string | null
          ai_analysis?: string | null
          ai_classification?: Json | null
          attachments?: Json | null
          bug_category?: string | null
          business_case?: string | null
          chat_session_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          reported_by?: string | null
          request_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "v_chat_session_overview"
            referencedColumns: ["session_id"]
          },
        ]
      }
      training_log: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          plant_count: number | null
          room_id: string
          sections_trained: string[] | null
          task_instance_id: string | null
          trained_at: string
          trained_by: string | null
          training_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          plant_count?: number | null
          room_id: string
          sections_trained?: string[] | null
          task_instance_id?: string | null
          trained_at?: string
          trained_by?: string | null
          training_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          plant_count?: number | null
          room_id?: string
          sections_trained?: string[] | null
          task_instance_id?: string | null
          trained_at?: string
          trained_by?: string | null
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "training_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "training_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "training_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_log_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_log_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      trim_schedule: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assigned_to: string | null
          created_at: string | null
          estimated_duration_minutes: number | null
          id: string
          notes: string | null
          order_id: string
          scheduled_date: string
          scheduled_start_time: string | null
          station_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_to?: string | null
          created_at?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          order_id: string
          scheduled_date: string
          scheduled_start_time?: string | null
          station_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_to?: string | null
          created_at?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          scheduled_date?: string
          scheduled_start_time?: string | null
          station_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      trim_sessions: {
        Row: {
          batch_id: string
          batch_registry_id: string | null
          big_buds_grams: number | null
          bucked_inventory_id: string | null
          bucked_smalls_grams: number | null
          bucked_smalls_inventory_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalization_status_bigs: Database["public"]["Enums"]["finalization_status"]
          finalization_status_smalls: Database["public"]["Enums"]["finalization_status"]
          finalization_status_trim: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_at_bigs: string | null
          finalized_at_smalls: string | null
          finalized_at_trim: string | null
          finalized_by: string | null
          finalized_by_bigs: string | null
          finalized_by_smalls: string | null
          finalized_by_trim: string | null
          grams_per_hour: number | null
          id: string
          is_paused: boolean
          minutes_trimmed: number | null
          notes: string | null
          output_product_bigs_name: string | null
          output_product_smalls_name: string | null
          output_product_trim_name: string | null
          package_id: string
          package_total_weight: number | null
          pulled_weight: number
          recorded_in_dutchie: boolean | null
          session_date: string
          session_status: string | null
          small_buds_grams: number | null
          started_at: string | null
          strain: string
          strain_id: string | null
          test_mode: boolean
          time_ended: string | null
          time_started: string | null
          total_pause_minutes: number
          trim_grams: number | null
          trim_method: string | null
          trimmer_name: string
          trimmer_staff_id: string | null
          updated_at: string | null
          variance_grams: number | null
          void_reason: string | null
          void_reason_bigs: string | null
          void_reason_smalls: string | null
          void_reason_trim: string | null
          waste_grams: number | null
        }
        Insert: {
          batch_id: string
          batch_registry_id?: string | null
          big_buds_grams?: number | null
          bucked_inventory_id?: string | null
          bucked_smalls_grams?: number | null
          bucked_smalls_inventory_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_bigs?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_trim?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_at_bigs?: string | null
          finalized_at_smalls?: string | null
          finalized_at_trim?: string | null
          finalized_by?: string | null
          finalized_by_bigs?: string | null
          finalized_by_smalls?: string | null
          finalized_by_trim?: string | null
          grams_per_hour?: number | null
          id?: string
          is_paused?: boolean
          minutes_trimmed?: number | null
          notes?: string | null
          output_product_bigs_name?: string | null
          output_product_smalls_name?: string | null
          output_product_trim_name?: string | null
          package_id: string
          package_total_weight?: number | null
          pulled_weight: number
          recorded_in_dutchie?: boolean | null
          session_date?: string
          session_status?: string | null
          small_buds_grams?: number | null
          started_at?: string | null
          strain: string
          strain_id?: string | null
          test_mode?: boolean
          time_ended?: string | null
          time_started?: string | null
          total_pause_minutes?: number
          trim_grams?: number | null
          trim_method?: string | null
          trimmer_name: string
          trimmer_staff_id?: string | null
          updated_at?: string | null
          variance_grams?: number | null
          void_reason?: string | null
          void_reason_bigs?: string | null
          void_reason_smalls?: string | null
          void_reason_trim?: string | null
          waste_grams?: number | null
        }
        Update: {
          batch_id?: string
          batch_registry_id?: string | null
          big_buds_grams?: number | null
          bucked_inventory_id?: string | null
          bucked_smalls_grams?: number | null
          bucked_smalls_inventory_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_bigs?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalization_status_trim?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_at_bigs?: string | null
          finalized_at_smalls?: string | null
          finalized_at_trim?: string | null
          finalized_by?: string | null
          finalized_by_bigs?: string | null
          finalized_by_smalls?: string | null
          finalized_by_trim?: string | null
          grams_per_hour?: number | null
          id?: string
          is_paused?: boolean
          minutes_trimmed?: number | null
          notes?: string | null
          output_product_bigs_name?: string | null
          output_product_smalls_name?: string | null
          output_product_trim_name?: string | null
          package_id?: string
          package_total_weight?: number | null
          pulled_weight?: number
          recorded_in_dutchie?: boolean | null
          session_date?: string
          session_status?: string | null
          small_buds_grams?: number | null
          started_at?: string | null
          strain?: string
          strain_id?: string | null
          test_mode?: boolean
          time_ended?: string | null
          time_started?: string | null
          total_pause_minutes?: number
          trim_grams?: number | null
          trim_method?: string | null
          trimmer_name?: string
          trimmer_staff_id?: string | null
          updated_at?: string | null
          variance_grams?: number | null
          void_reason?: string | null
          void_reason_bigs?: string | null
          void_reason_smalls?: string | null
          void_reason_trim?: string | null
          waste_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_inventory_id_fkey"
            columns: ["bucked_inventory_id"]
            isOneToOne: false
            referencedRelation: "bucked_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "trim_sessions_bucked_smalls_inventory_id_fkey"
            columns: ["bucked_smalls_inventory_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_trimmer_staff_id_fkey"
            columns: ["trimmer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_trimmer_staff_id_fkey"
            columns: ["trimmer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          avg_message_length: string | null
          created_at: string | null
          custom_instructions: string | null
          detail_level: string | null
          frequent_intents: Json | null
          frequent_topics: Json | null
          id: string
          intent_counts: Json | null
          last_active_at: string | null
          pinned_context_ids: Json | null
          preferred_categories: Json | null
          tone_preference: string | null
          topic_counts: Json | null
          total_messages: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_message_length?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          detail_level?: string | null
          frequent_intents?: Json | null
          frequent_topics?: Json | null
          id?: string
          intent_counts?: Json | null
          last_active_at?: string | null
          pinned_context_ids?: Json | null
          preferred_categories?: Json | null
          tone_preference?: string | null
          topic_counts?: Json | null
          total_messages?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_message_length?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          detail_level?: string | null
          frequent_intents?: Json | null
          frequent_topics?: Json | null
          id?: string
          intent_counts?: Json | null
          last_active_at?: string | null
          pinned_context_ids?: Json | null
          preferred_categories?: Json | null
          tone_preference?: string | null
          topic_counts?: Json | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string
          slack_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string
          slack_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          slack_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      valid_categories: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          is_active: boolean
          product_type: string
          sort_order: number
          stage: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          is_active?: boolean
          product_type: string
          sort_order?: number
          stage: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          is_active?: boolean
          product_type?: string
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      valid_departments: {
        Row: {
          created_at: string
          department: string
          description: string | null
          display_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          department: string
          description?: string | null
          display_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          department?: string
          description?: string | null
          display_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      variance_log: {
        Row: {
          actual_qty: number
          batch: string | null
          created_at: string | null
          expected_qty: number
          id: string
          inventory_item_id: string | null
          inventory_stage: string | null
          movement_id: string | null
          notes: string | null
          package_id: string
          product_name: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["variance_source"]
          strain: string | null
          timestamp: string | null
          unit: string
          user_id: string | null
          variance_percentage: number
          variance_qty: number
          variance_reason: Database["public"]["Enums"]["variance_reason"]
        }
        Insert: {
          actual_qty: number
          batch?: string | null
          created_at?: string | null
          expected_qty: number
          id?: string
          inventory_item_id?: string | null
          inventory_stage?: string | null
          movement_id?: string | null
          notes?: string | null
          package_id: string
          product_name?: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["variance_source"]
          strain?: string | null
          timestamp?: string | null
          unit: string
          user_id?: string | null
          variance_percentage: number
          variance_qty: number
          variance_reason: Database["public"]["Enums"]["variance_reason"]
        }
        Update: {
          actual_qty?: number
          batch?: string | null
          created_at?: string | null
          expected_qty?: number
          id?: string
          inventory_item_id?: string | null
          inventory_stage?: string | null
          movement_id?: string | null
          notes?: string | null
          package_id?: string
          product_name?: string | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["variance_source"]
          strain?: string | null
          timestamp?: string | null
          unit?: string
          user_id?: string | null
          variance_percentage?: number
          variance_qty?: number
          variance_reason?: Database["public"]["Enums"]["variance_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "variance_log_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bills: {
        Row: {
          amount: number
          bill_date: string
          bill_number: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          is_cogs: boolean | null
          line_items: Json | null
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          vendor_category: string
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          bill_date: string
          bill_number?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_cogs?: boolean | null
          line_items?: Json | null
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_category: string
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          bill_date?: string
          bill_number?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_cogs?: boolean | null
          line_items?: Json | null
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_category?: string
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          category: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          default_is_cogs: boolean
          default_payment_terms: string | null
          id: string
          is_1099_eligible: boolean | null
          is_active: boolean | null
          name: string
          notes: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_is_cogs?: boolean
          default_payment_terms?: string | null
          id?: string
          is_1099_eligible?: boolean | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_is_cogs?: boolean
          default_payment_terms?: string | null
          id?: string
          is_1099_eligible?: boolean | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wash_run_inputs: {
        Row: {
          created_at: string
          fresh_frozen_package_id: string
          id: string
          wash_run_id: string
          weight_grams: number
        }
        Insert: {
          created_at?: string
          fresh_frozen_package_id: string
          id?: string
          wash_run_id: string
          weight_grams: number
        }
        Update: {
          created_at?: string
          fresh_frozen_package_id?: string
          id?: string
          wash_run_id?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "wash_run_inputs_fresh_frozen_package_id_fkey"
            columns: ["fresh_frozen_package_id"]
            isOneToOne: false
            referencedRelation: "fresh_frozen_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_run_inputs_wash_run_id_fkey"
            columns: ["wash_run_id"]
            isOneToOne: false
            referencedRelation: "wash_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      wash_runs: {
        Row: {
          batch_id: string
          created_at: string
          equipment_id: string | null
          id: string
          input_grams: number | null
          micron_grades: Json | null
          notes: string | null
          num_washes: number | null
          operator_id: string | null
          output_grams: number | null
          started_at: string | null
          status: string
          strain_id: string | null
          total_input_weight_grams: number | null
          total_output_weight_grams: number | null
          updated_at: string
          wash_date: string
          waste_weight_grams: number | null
          water_temp_f: number | null
          yield_percentage: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          input_grams?: number | null
          micron_grades?: Json | null
          notes?: string | null
          num_washes?: number | null
          operator_id?: string | null
          output_grams?: number | null
          started_at?: string | null
          status?: string
          strain_id?: string | null
          total_input_weight_grams?: number | null
          total_output_weight_grams?: number | null
          updated_at?: string
          wash_date?: string
          waste_weight_grams?: number | null
          water_temp_f?: number | null
          yield_percentage?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          input_grams?: number | null
          micron_grades?: Json | null
          notes?: string | null
          num_washes?: number | null
          operator_id?: string | null
          output_grams?: number | null
          started_at?: string | null
          status?: string
          strain_id?: string | null
          total_input_weight_grams?: number | null
          total_output_weight_grams?: number | null
          updated_at?: string
          wash_date?: string
          waste_weight_grams?: number | null
          water_temp_f?: number | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "wash_runs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "rosin_lab_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "wash_runs_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
    }
    Views: {
      active_packaging_sessions: {
        Row: {
          batch_id: string | null
          completed_at: string | null
          created_at: string | null
          ending_weight: number | null
          id: string | null
          minutes_elapsed: number | null
          minutes_packaged: number | null
          notes: string | null
          package_id: string | null
          package_weight: number | null
          packager_name: string | null
          pull_weight: number | null
          recorded_in_dutchie: boolean | null
          session_date: string | null
          session_status: string | null
          started_at: string | null
          strain: string | null
          trim_grams: number | null
          units_14g: number | null
          units_3_5g: number | null
          units_454g: number | null
          units_per_hour: number | null
          updated_at: string | null
          variance_grams: number | null
          waste_grams: number | null
        }
        Insert: {
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          ending_weight?: number | null
          id?: string | null
          minutes_elapsed?: never
          minutes_packaged?: number | null
          notes?: string | null
          package_id?: string | null
          package_weight?: number | null
          packager_name?: string | null
          pull_weight?: number | null
          recorded_in_dutchie?: boolean | null
          session_date?: string | null
          session_status?: string | null
          started_at?: string | null
          strain?: string | null
          trim_grams?: number | null
          units_14g?: number | null
          units_3_5g?: number | null
          units_454g?: number | null
          units_per_hour?: number | null
          updated_at?: string | null
          variance_grams?: number | null
          waste_grams?: number | null
        }
        Update: {
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          ending_weight?: number | null
          id?: string | null
          minutes_elapsed?: never
          minutes_packaged?: number | null
          notes?: string | null
          package_id?: string | null
          package_weight?: number | null
          packager_name?: string | null
          pull_weight?: number | null
          recorded_in_dutchie?: boolean | null
          session_date?: string | null
          session_status?: string | null
          started_at?: string | null
          strain?: string | null
          trim_grams?: number | null
          units_14g?: number | null
          units_3_5g?: number | null
          units_454g?: number | null
          units_per_hour?: number | null
          updated_at?: string | null
          variance_grams?: number | null
          waste_grams?: number | null
        }
        Relationships: []
      }
      active_trim_sessions: {
        Row: {
          batch_id: string | null
          big_buds_grams: number | null
          bucked_inventory_id: string | null
          bucked_remaining: number | null
          completed_at: string | null
          created_at: string | null
          grams_per_hour: number | null
          id: string | null
          minutes_elapsed: number | null
          minutes_trimmed: number | null
          notes: string | null
          package_id: string | null
          package_total_weight: number | null
          pulled_weight: number | null
          recorded_in_dutchie: boolean | null
          session_date: string | null
          session_status: string | null
          small_buds_grams: number | null
          started_at: string | null
          strain: string | null
          time_ended: string | null
          time_started: string | null
          trim_grams: number | null
          trim_method: string | null
          trimmer_name: string | null
          updated_at: string | null
          variance_grams: number | null
          waste_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trim_sessions_bucked_inventory_id_fkey"
            columns: ["bucked_inventory_id"]
            isOneToOne: false
            referencedRelation: "bucked_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_products_report: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          id: string | null
          name: string | null
          product_type: string | null
          replaced_by_product_id: string | null
          replaced_by_product_name: string | null
          stage: string | null
          strain: string | null
        }
        Relationships: []
      }
      backend_bulk_inventory: {
        Row: {
          allocated_weight_grams: number | null
          available_weight_grams: number | null
          batch_id: string | null
          batch_number: string | null
          batch_status: string | null
          created_at: string | null
          harvest_date: string | null
          location: string | null
          room: string | null
          stage: string | null
          strain: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Relationships: []
      }
      batch_allocation_overview: {
        Row: {
          allocation_status: string | null
          batch_id: string | null
          current_stage: string | null
          current_weight_grams: number | null
          eighths_capacity: number | null
          eighths_demand: number | null
          eighths_remaining: number | null
          eighths_utilization_pct: number | null
          estimated_final_weight_grams: number | null
          halves_capacity: number | null
          halves_demand: number | null
          halves_remaining: number | null
          halves_utilization_pct: number | null
          orders_assigned: number | null
          pounds_capacity: number | null
          pounds_demand: number | null
          pounds_remaining: number | null
          pounds_utilization_pct: number | null
          strain: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["current_stage"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
        ]
      }
      batch_allocation_summary: {
        Row: {
          allocation_percentage: number | null
          batch_id: string | null
          batch_number: string | null
          batch_status: string | null
          bucked_allocated: number | null
          bucked_available: number | null
          bucked_weight: number | null
          coa_id: string | null
          coa_status: string | null
          created_at: string | null
          flower_allocated: number | null
          flower_available: number | null
          flower_weight: number | null
          harvest_date: string | null
          over_allocation_critical_threshold: number | null
          over_allocation_warning_threshold: number | null
          packaged_allocated: number | null
          packaged_available: number | null
          packaged_weight: number | null
          smalls_allocated: number | null
          smalls_available: number | null
          smalls_weight: number | null
          strain: string | null
          strain_id: string | null
          total_allocated: number | null
          total_weight: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["coa_id"]
          },
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "certificates_of_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["coa_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      batch_availability_enriched: {
        Row: {
          allocated_weight_grams: number | null
          available_weight_grams: number | null
          batch_id: string | null
          batch_number: string | null
          coa_id: string | null
          coa_pass_fail: string | null
          coa_test_date: string | null
          grade_code: string | null
          grade_color: string | null
          grade_label: string | null
          grade_sort_order: number | null
          harvest_date: string | null
          has_coa: boolean | null
          lifecycle_state: string | null
          stage: string | null
          strain: string | null
          thc_percentage: number | null
          thca_percentage: number | null
          total_cannabinoids: number | null
          tracking_id: string | null
          weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["coa_id"]
          },
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "certificates_of_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["coa_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_capacity_estimates: {
        Row: {
          batch_id: string | null
          conversion_confidence: string | null
          current_stage: string | null
          current_weight_grams: number | null
          estimated_eighths_capacity: number | null
          estimated_final_weight_grams: number | null
          estimated_halves_capacity: number | null
          estimated_pounds_capacity: number | null
          strain: string | null
          strain_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["current_stage"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      batch_inventory_health: {
        Row: {
          batch_number: string | null
          batch_registry_id: string | null
          issue_type: string | null
          package_count: number | null
          strain: string | null
          total_weight_grams: number | null
        }
        Relationships: []
      }
      batch_order_demand: {
        Row: {
          batch_id: string | null
          order_count: number | null
          order_numbers: string[] | null
          product_category: string | null
          product_name: string | null
          product_type: string | null
          sku: string | null
          strain: string | null
          total_quantity_needed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_selection_options: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          created_at: string | null
          current_stage: string | null
          status: string | null
          strain: string | null
          total_available_weight_grams: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      batch_stage_allocation_status: {
        Row: {
          allocated_weight_grams: number | null
          allocation_warning_level: string | null
          available_weight_grams: number | null
          batch_id: string | null
          batch_number: string | null
          created_at: string | null
          id: string | null
          is_over_allocated: boolean | null
          location: string | null
          over_allocation_critical_threshold: number | null
          over_allocation_grams: number | null
          over_allocation_warning_threshold: number | null
          stage: string | null
          stage_allocation_percentage: number | null
          strain: string | null
          strain_id: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      batch_stage_availability: {
        Row: {
          allocated_weight_grams: number | null
          availability_status: string | null
          available_weight_grams: number | null
          batch_number: string | null
          location: string | null
          stage: string | null
          strain: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Relationships: []
      }
      batch_with_coa_status: {
        Row: {
          batch_id: string | null
          batch_notes: string | null
          batch_number: string | null
          batch_status: string | null
          cbd_percentage: number | null
          coa_id: string | null
          coa_is_active: boolean | null
          coa_status: string | null
          created_at: string | null
          harvest_date: string | null
          initial_weight_grams: number | null
          lifecycle_state: string | null
          manufacture_date: string | null
          pdf_file_path: string | null
          quality_grade_id: string | null
          room: string | null
          sample_date: string | null
          strain: string | null
          terpene_1_name: string | null
          terpene_1_percentage: number | null
          terpene_1_value: number | null
          terpene_2_name: string | null
          terpene_2_percentage: number | null
          terpene_2_value: number | null
          terpene_3_name: string | null
          terpene_3_percentage: number | null
          terpene_3_value: number | null
          thc_percentage: number | null
          total_cannabinoids_percentage: number | null
          total_terpenes_mg_g: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_quality_grade_id_fkey"
            columns: ["quality_grade_id"]
            isOneToOne: false
            referencedRelation: "quality_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      bucking_productivity_by_strain: {
        Row: {
          avg_flower_output: number | null
          avg_flower_yield_percentage: number | null
          avg_input_grams: number | null
          avg_kg_per_hour: number | null
          avg_minutes: number | null
          avg_smalls_output: number | null
          avg_smalls_yield_percentage: number | null
          avg_variance: number | null
          avg_waste: number | null
          avg_waste_percentage: number | null
          bucker_name: string | null
          bucker_staff_id: string | null
          session_count: number | null
          strain: string | null
          total_flower_output: number | null
          total_input_grams: number | null
          total_smalls_output: number | null
          total_waste: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bucking_sessions_bucker_staff_id_fkey"
            columns: ["bucker_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucking_sessions_bucker_staff_id_fkey"
            columns: ["bucker_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      conversion_history_view: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          finalization_status:
            | Database["public"]["Enums"]["finalization_status"]
            | null
          finalized_at: string | null
          finalized_by: string | null
          finalized_by_name: string | null
          id: string | null
          in_inventory: boolean | null
          package_id: string | null
          packaged_at: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          source_session_ids: Json | null
          stage_name: string | null
          strain_id: string | null
          strain_name: string | null
          units: number | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
        ]
      }
      conversion_packages_detail_view: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          conversion_lot_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          current_quantity: number | null
          inventory_item_id: string | null
          inventory_status: string | null
          last_movement_at: string | null
          package_id: string | null
          package_record_id: string | null
          packaged_at: string | null
          product_category: string | null
          product_id: string | null
          product_name: string | null
          source_session_ids: Json | null
          stage_name: string | null
          strain_code: string | null
          strain_name: string | null
          units: number | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
        ]
      }
      conversion_summary_view: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          completed_at: string | null
          has_packages: boolean | null
          is_finalized: boolean | null
          package_count: number | null
          pending_package_count: number | null
          session_date: string | null
          session_id: string | null
          session_type: string | null
          strain_code: string | null
          strain_id: string | null
          strain_name: string | null
          total_units: number | null
          total_weight: number | null
        }
        Relationships: []
      }
      crm_account_health_dashboard: {
        Row: {
          account_status: string | null
          account_type: string | null
          avg_order_value_90d: number | null
          city: string | null
          contact_name: string | null
          customer_id: string | null
          customer_name: string | null
          days_since_last_order: number | null
          dispensary_code: string | null
          email: string | null
          engagement_score: number | null
          frequency_score: number | null
          health_label: string | null
          health_score: number | null
          last_activity_at: string | null
          last_visit_date: string | null
          lifetime_revenue: number | null
          next_scheduled_visit: string | null
          oldest_overdue_task: string | null
          open_task_count: number | null
          orders_30d: number | null
          orders_90d: number | null
          phone: string | null
          recency_score: number | null
          revenue_30d: number | null
          revenue_90d: number | null
          revenue_trend: string | null
          state: string | null
          tags: string[] | null
          tasks_completed_30d: number | null
          trend_score: number | null
          visits_30d: number | null
        }
        Relationships: []
      }
      crm_account_scores: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          days_since_last_order: number | null
          dispensary_code: string | null
          health_label: string | null
          health_score: number | null
          last_visit_date: string | null
          open_task_count: number | null
          order_frequency_30d: number | null
          order_frequency_90d: number | null
          revenue_trend: string | null
        }
        Relationships: []
      }
      crm_chain_location_performance: {
        Row: {
          account_status: string | null
          avg_order_value: number | null
          child_code: string | null
          child_id: string | null
          child_name: string | null
          city: string | null
          days_since_last_order: number | null
          delivery_model: string | null
          health_label: string | null
          last_order_date: string | null
          order_count: number | null
          parent_code: string | null
          parent_customer_id: string | null
          parent_name: string | null
          revenue: number | null
          revenue_rank: number | null
          revenue_share_pct: number | null
          state: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      crm_customer_summary: {
        Row: {
          account_credit_balance: number | null
          account_status: string | null
          account_type: string | null
          address: string | null
          ato_number: string | null
          avg_order_value: number | null
          child_account_count: number | null
          child_total_orders: number | null
          child_total_revenue: number | null
          city: string | null
          completed_orders: number | null
          contact_count: number | null
          contact_name: string | null
          credit_limit: number | null
          days_since_last_order: number | null
          default_payment_terms: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_model: string | null
          delivery_postal_code: string | null
          delivery_state: string | null
          dispensary_code: string | null
          email: string | null
          first_order_date: string | null
          id: string | null
          last_order_date: string | null
          license_name: string | null
          license_number: string | null
          name: string | null
          notes: string | null
          open_order_value: number | null
          open_orders: number | null
          order_count: number | null
          parent_customer_id: string | null
          phone: string | null
          postal_code: string | null
          preferred_delivery_day: string | null
          state: string | null
          tags: string[] | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      crm_monthly_revenue_by_customer: {
        Row: {
          cumulative_revenue: number | null
          customer_id: string | null
          customer_name: string | null
          dispensary_code: string | null
          month: string | null
          monthly_revenue: number | null
          order_count: number | null
        }
        Relationships: []
      }
      crm_product_mix_by_customer: {
        Row: {
          avg_unit_price: number | null
          customer_id: string | null
          customer_name: string | null
          first_order_date: string | null
          last_order_date: string | null
          order_count: number | null
          product_category: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          strain: string | null
          total_revenue: number | null
          total_units: number | null
        }
        Relationships: []
      }
      crm_prospect_pipeline: {
        Row: {
          account_status: string | null
          city: string | null
          contact_name: string | null
          created_at: string | null
          days_in_stage: number | null
          email: string | null
          id: string | null
          last_activity_at: string | null
          name: string | null
          notes: string | null
          open_task_count: number | null
          phone: string | null
          pipeline_stage: string | null
          pipeline_updated_at: string | null
          stage_order: number | null
          state: string | null
          tags: string[] | null
          task_count: number | null
        }
        Insert: {
          account_status?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          days_in_stage?: never
          email?: string | null
          id?: string | null
          last_activity_at?: never
          name?: string | null
          notes?: string | null
          open_task_count?: never
          phone?: string | null
          pipeline_stage?: string | null
          pipeline_updated_at?: string | null
          stage_order?: never
          state?: string | null
          tags?: string[] | null
          task_count?: never
        }
        Update: {
          account_status?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          days_in_stage?: never
          email?: string | null
          id?: string | null
          last_activity_at?: never
          name?: string | null
          notes?: string | null
          open_task_count?: never
          phone?: string | null
          pipeline_stage?: string | null
          pipeline_updated_at?: string | null
          stage_order?: never
          state?: string | null
          tags?: string[] | null
          task_count?: never
        }
        Relationships: []
      }
      crm_revenue_pipeline: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          dispensary_code: string | null
          order_date: string | null
          order_id: string | null
          order_number: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          status: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      crm_revenue_tracking: {
        Row: {
          current_month_orders: number | null
          current_month_realized: number | null
          current_month_tentative: number | null
          current_month_unresolved: number | null
          customer_id: string | null
          customer_name: string | null
          dispensary_code: string | null
          first_order_date: string | null
          last_order_date: string | null
          lifetime_order_count: number | null
          lifetime_revenue: number | null
          mom_change_pct: number | null
          prior_month_orders: number | null
          prior_month_realized: number | null
          rolling_90d_order_count: number | null
          rolling_90d_realized: number | null
          rolling_90d_tentative: number | null
          total_unresolved_orders: number | null
          total_unresolved_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      crm_revenue_weekly: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          realized_orders: number | null
          realized_revenue: number | null
          revenue_week: string | null
          tentative_orders: number | null
          tentative_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      crm_sku_performance: {
        Row: {
          avg_unit_price: number | null
          first_sold_date: string | null
          last_sold_date: string | null
          order_count: number | null
          product_category: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          sku: string | null
          strain: string | null
          total_revenue: number | null
          total_units_sold: number | null
          unique_customers: number | null
        }
        Relationships: []
      }
      crm_store_scorecard: {
        Row: {
          account_status: string | null
          account_tier: string | null
          account_type: string | null
          avg_order_value_90d: number | null
          city: string | null
          contact_name: string | null
          customer_id: string | null
          customer_name: string | null
          days_since_last_order: number | null
          days_since_last_visit: number | null
          dispensary_code: string | null
          distinct_skus_purchased: number | null
          email: string | null
          health_label: string | null
          health_score: number | null
          last_activity_at: string | null
          last_completed_visit: string | null
          last_visit_date: string | null
          lifetime_revenue: number | null
          open_task_count: number | null
          order_frequency_label: string | null
          orders_30d: number | null
          orders_90d: number | null
          phone: string | null
          product_mix_label: string | null
          product_types_purchased: number | null
          revenue_30d: number | null
          revenue_90d: number | null
          revenue_trend: string | null
          state: string | null
          tags: string[] | null
          tasks_completed_30d: number | null
          visit_compliance_pct: number | null
          visit_compliance_status: string | null
          visit_frequency_required: string | null
          visits_30d: number | null
        }
        Relationships: []
      }
      crm_task_summary: {
        Row: {
          assigned_user_id: string | null
          assigned_user_name: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          days_overdue: number | null
          description: string | null
          dispensary_code: string | null
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          priority: string | null
          related_activity_id: string | null
          status: string | null
          task_type: string | null
          title: string | null
          trigger_key: string | null
          trigger_source: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "vw_manager_review_performance"
            referencedColumns: ["manager_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_related_activity_id_fkey"
            columns: ["related_activity_id"]
            isOneToOne: false
            referencedRelation: "customer_activity_log"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_visit_cadence: {
        Row: {
          account_status: string | null
          account_tier: string | null
          account_type: string | null
          city: string | null
          compliance_pct_30d: number | null
          compliance_status: string | null
          contact_name: string | null
          customer_id: string | null
          customer_name: string | null
          days_since_last_order: number | null
          days_since_last_visit: number | null
          days_until_due: number | null
          dispensary_code: string | null
          email: string | null
          frequency_label: string | null
          last_completed_visit: string | null
          last_order_date: string | null
          last_visit_outcome: string | null
          lifetime_revenue: number | null
          next_scheduled_visit: string | null
          phone: string | null
          required_frequency_days: number | null
          revenue_rank: number | null
          state: string | null
          tags: string[] | null
          total_visits_completed: number | null
          upcoming_scheduled: number | null
          visits_completed_30d: number | null
          visits_completed_7d: number | null
        }
        Relationships: []
      }
      current_inventory_status: {
        Row: {
          bucked_totes: number | null
          flower_grams: number | null
          smalls_grams: number | null
          strain: string | null
          total_bucked_grams: number | null
          trim_grams: number | null
        }
        Relationships: []
      }
      daily_throughput_summary: {
        Row: {
          avg_grams_per_hour: number | null
          avg_units_per_hour: number | null
          metric_date: string | null
          total_minutes: number | null
          total_sessions: number | null
          total_units: number | null
          total_weight_grams: number | null
          total_workers: number | null
          worker_type: string | null
        }
        Relationships: []
      }
      daily_workload: {
        Row: {
          delivery_orders: number | null
          packaging_minutes: number | null
          packaging_orders: number | null
          trim_minutes: number | null
          trim_orders: number | null
          work_date: string | null
        }
        Relationships: []
      }
      deprecated_table_status: {
        Row: {
          row_count: number | null
          status: string | null
          table_name: string | null
        }
        Relationships: []
      }
      finalization_status_summary: {
        Row: {
          finalized_count: number | null
          pending_count: number | null
          pending_weight: number | null
          session_type: string | null
          voided_count: number | null
        }
        Relationships: []
      }
      ghost_finalized_sessions: {
        Row: {
          batch_number: string | null
          batch_registry_id: string | null
          completed_at: string | null
          finalization_status_packaged:
            | Database["public"]["Enums"]["finalization_status"]
            | null
          finalized_at_packaged: string | null
          issue: string | null
          output_product_name: string | null
          session_id: string | null
          strain_name: string | null
          total_units: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      inventory_discrepancies: {
        Row: {
          abs_discrepancy: number | null
          batch_id: string | null
          created_at: string | null
          current_qty: number | null
          discrepancy: number | null
          id: string | null
          last_updated: string | null
          ledger_qty: number | null
          package_id: string | null
          product_name: string | null
          product_stage_id: string | null
          strain: string | null
        }
        Insert: {
          abs_discrepancy?: never
          batch_id?: string | null
          created_at?: string | null
          current_qty?: number | null
          discrepancy?: never
          id?: string | null
          last_updated?: string | null
          ledger_qty?: never
          package_id?: string | null
          product_name?: string | null
          product_stage_id?: string | null
          strain?: string | null
        }
        Update: {
          abs_discrepancy?: never
          batch_id?: string | null
          created_at?: string | null
          current_qty?: number | null
          discrepancy?: never
          id?: string | null
          last_updated?: string | null
          ledger_qty?: never
          package_id?: string | null
          product_name?: string | null
          product_stage_id?: string | null
          strain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_qty_health: {
        Row: {
          available_qty: number | null
          batch_number: string | null
          expected_available_qty: number | null
          health_status: string | null
          last_updated: string | null
          on_hand_qty: number | null
          package_id: string | null
          product_name: string | null
          reserved_qty: number | null
        }
        Insert: {
          available_qty?: number | null
          batch_number?: string | null
          expected_available_qty?: never
          health_status?: never
          last_updated?: string | null
          on_hand_qty?: number | null
          package_id?: string | null
          product_name?: string | null
          reserved_qty?: never
        }
        Update: {
          available_qty?: number | null
          batch_number?: string | null
          expected_available_qty?: never
          health_status?: never
          last_updated?: string | null
          on_hand_qty?: number | null
          package_id?: string | null
          product_name?: string | null
          reserved_qty?: never
        }
        Relationships: []
      }
      inventory_reservation_summary: {
        Row: {
          active_assignments: number | null
          assigned_order_ids: string[] | null
          available_qty: number | null
          batch_number: string | null
          inventory_item_id: string | null
          inventory_status: string | null
          package_id: string | null
          product_name: string | null
          reserved_qty: number | null
          strain: string | null
          total_qty: number | null
          unit: string | null
        }
        Relationships: []
      }
      label_print_analytics: {
        Row: {
          avg_prints_per_label: number | null
          labels_printed: number | null
          max_prints_for_single_label: number | null
          print_date: string | null
          reprinted_labels: number | null
          total_prints: number | null
        }
        Relationships: []
      }
      monthly_sku_deliveries: {
        Row: {
          month: string | null
          orders_count: number | null
          product_name: string | null
          product_type: string | null
          strain: string | null
          total_units_delivered: number | null
        }
        Relationships: []
      }
      order_age_metrics: {
        Row: {
          age_color_code: string | null
          created_at: string | null
          customer_id: string | null
          days_since_created: number | null
          fulfillment_days: number | null
          order_id: string | null
          order_number: string | null
          requested_delivery_date: string | null
          status: string | null
        }
        Insert: {
          age_color_code?: never
          created_at?: string | null
          customer_id?: string | null
          days_since_created?: never
          fulfillment_days?: never
          order_id?: string | null
          order_number?: string | null
          requested_delivery_date?: string | null
          status?: string | null
        }
        Update: {
          age_color_code?: never
          created_at?: string | null
          customer_id?: string | null
          days_since_created?: never
          fulfillment_days?: never
          order_id?: string | null
          order_number?: string | null
          requested_delivery_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      order_demand_by_sku: {
        Row: {
          earliest_delivery_date: string | null
          latest_delivery_date: string | null
          order_count: number | null
          order_numbers: string | null
          product_category: string | null
          product_name: string | null
          product_type: string | null
          sku: string | null
          strain: string | null
          total_units_needed: number | null
          total_value: number | null
        }
        Relationships: []
      }
      order_items_with_testing_data: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          batch_strain: string | null
          cbd_percentage: number | null
          coa_id: string | null
          coa_pdf_path: string | null
          coa_strain: string | null
          harvest_date: string | null
          order_id: string | null
          order_item_id: string | null
          product_id: string | null
          quantity: number | null
          sample_date: string | null
          subtotal: number | null
          terpene_1_name: string | null
          terpene_1_percentage: number | null
          terpene_1_value: number | null
          terpene_2_name: string | null
          terpene_2_percentage: number | null
          terpene_2_value: number | null
          terpene_3_name: string | null
          terpene_3_percentage: number | null
          terpene_3_value: number | null
          thc_percentage: number | null
          total_cannabinoids_percentage: number | null
          total_terpenes_mg_g: number | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "archived_products_report"
            referencedColumns: ["replaced_by_product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_sku_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orderable_packaged_inventory"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["product_id"]
          },
        ]
      }
      order_material_requirements: {
        Row: {
          bulk_product_type: string | null
          grams_needed_with_overage: number | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          product_type: string | null
          quantity: number | null
          requested_delivery_date: string | null
          strain: string | null
        }
        Relationships: []
      }
      order_pipeline: {
        Row: {
          archived: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_notes: string | null
          id: string | null
          internal_notes: string | null
          is_sample: boolean | null
          item_count: number | null
          order_number: string | null
          order_source: string | null
          priority: string | null
          requested_delivery_date: string | null
          scheduled_at: string | null
          scheduled_by: string | null
          scheduled_delivery_date: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      orderable_packaged_inventory: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          price_per_unit: number | null
          pricing_unit: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          sku: string | null
          strain: string | null
          strain_code: string | null
          total_grams_available: number | null
          unit_weight_grams: number | null
          units_available: number | null
        }
        Relationships: []
      }
      orders_by_delivery_month: {
        Row: {
          archived: boolean | null
          customer_id: string | null
          customer_name: string | null
          delivery_month: string | null
          delivery_month_name: string | null
          delivery_month_num: number | null
          delivery_notes: string | null
          delivery_year: number | null
          dispensary_code: string | null
          entry_date: string | null
          id: string | null
          internal_notes: string | null
          item_count: number | null
          order_date: string | null
          order_number: string | null
          priority: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          status: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      package_assignments_details: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_status: string | null
          available_qty: number | null
          barcode_data: string | null
          batch: string | null
          batch_number: string | null
          created_at: string | null
          customer_id: string | null
          id: string | null
          inventory_item_id: string | null
          inventory_product_name: string | null
          label_id: string | null
          label_number: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          order_item_quantity: number | null
          order_item_strain: string | null
          order_number: string | null
          order_status: string | null
          package_date: string | null
          package_id: string | null
          printed_at: string | null
          product_name: string | null
          product_type: string | null
          quantity_assigned: number | null
          room: string | null
          scheduled_delivery_date: string | null
          status: string | null
          strain: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          voided_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "package_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      package_assignments_with_reservations: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_status: string | null
          available_qty: number | null
          barcode_data: string | null
          batch: string | null
          batch_number: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string | null
          inventory_item_id: string | null
          inventory_product_name: string | null
          label_id: string | null
          label_number: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          order_item_quantity: number | null
          order_item_strain: string | null
          order_number: string | null
          order_status: string | null
          package_date: string | null
          package_id: string | null
          printed_at: string | null
          product_name: string | null
          product_type: string | null
          quantity_assigned: number | null
          reserved_qty: number | null
          room: string | null
          scheduled_delivery_date: string | null
          status: string | null
          strain: string | null
          total_qty: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          voided_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "package_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_with_testing_data"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      packaging_yield_statistics: {
        Row: {
          avg_units_per_gram: number | null
          avg_yield_percentage: number | null
          first_conversion_date: string | null
          last_conversion_date: string | null
          max_yield: number | null
          min_yield: number | null
          source_type: string | null
          std_dev_yield: number | null
          strain: string | null
          target_type: string | null
          total_conversions: number | null
        }
        Relationships: []
      }
      pending_conversion_sessions: {
        Row: {
          aggregation_id: string | null
          batch_id: string | null
          batch_name: string | null
          finalization_status:
            | Database["public"]["Enums"]["finalization_status"]
            | null
          first_completed_at: string | null
          has_partial_packages: boolean | null
          last_completed_at: string | null
          output_units: number | null
          output_weight: number | null
          product_id: string | null
          product_name: string | null
          session_count: number | null
          session_ids: string[] | null
          session_type: string | null
          strain_id: string | null
          strain_name: string | null
        }
        Relationships: []
      }
      pending_conversions: {
        Row: {
          batch_id: string | null
          batch_registry_id: string | null
          completed_at: string | null
          created_at: string | null
          finalization_status:
            | Database["public"]["Enums"]["finalization_status"]
            | null
          input_weight: number | null
          loss_weight: number | null
          output_stage: string | null
          output_weight: number | null
          product_name: string | null
          remaining_weight: number | null
          session_id: string | null
          session_status: string | null
          session_type: string | null
          started_at: string | null
          strain_id: string | null
        }
        Relationships: []
      }
      pending_invoices: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          has_invoice: boolean | null
          invoice_number: string | null
          invoice_status: string | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          scheduled_delivery_date: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      projected_inventory_requirements: {
        Row: {
          bucked_grams_needed: number | null
          bulk_grams_available: number | null
          conversion_confidence: string | null
          earliest_delivery_date: string | null
          grams_needed_from_pipeline: number | null
          order_count: number | null
          order_numbers: string | null
          packaged_units_available: number | null
          product_category: string | null
          product_name: string | null
          product_type: string | null
          strain: string | null
          strain_id: string | null
          total_units_needed: number | null
          units_still_needed: number | null
        }
        Relationships: []
      }
      route_statistics: {
        Row: {
          avg_route_distance: number | null
          avg_route_duration: number | null
          fresh_routes: number | null
          stale_routes: number | null
          total_cached_routes: number | null
          total_distance_cached: number | null
        }
        Relationships: []
      }
      sales_demand_summary: {
        Row: {
          demand_category: string | null
          demand_qty: number | null
          demand_revenue: number | null
          demand_unit: string | null
          order_count: number | null
          product_name: string | null
          product_type: string | null
          strain: string | null
        }
        Relationships: []
      }
      sales_inventory_summary: {
        Row: {
          available_qty: number | null
          category: string | null
          display_group: string | null
          display_group_sort: number | null
          display_label: string | null
          grade_code: string | null
          grade_color: string | null
          item_count: number | null
          on_hand_qty: number | null
          reserved_qty: number | null
          stage_name: string | null
          stage_sort: number | null
          strain: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
        ]
      }
      sales_supply_demand_gap: {
        Row: {
          byproduct_grams: number | null
          demand_bulk_flower_qty: number | null
          demand_bulk_smalls_qty: number | null
          demand_packaged_units: number | null
          packaged_units: number | null
          pipeline_grams: number | null
          sellable_flower_grams: number | null
          sellable_smalls_grams: number | null
          strain: string | null
          supply_health: string | null
          total_demand_revenue: number | null
          total_orders: number | null
        }
        Relationships: []
      }
      staff_performance_summary: {
        Row: {
          attendance_days_logged: number | null
          avg_buck_kg_per_hour: number | null
          avg_pack_units_per_hour: number | null
          avg_trim_grams_per_hour: number | null
          buck_waste_grams: number | null
          bucking_sessions: number | null
          cleaning_count: number | null
          custom_tasks: number | null
          days_present: number | null
          defoliation_count: number | null
          department: string | null
          feeding_count: number | null
          first_buck_date: string | null
          first_cultivation_date: string | null
          first_name: string | null
          first_pack_date: string | null
          first_trim_date: string | null
          ipm_spray_count: number | null
          is_active: boolean | null
          last_buck_date: string | null
          last_cultivation_date: string | null
          last_name: string | null
          last_pack_date: string | null
          last_trim_date: string | null
          manager_first_name: string | null
          manager_last_name: string | null
          mortality_reports: number | null
          pack_waste_grams: number | null
          packaging_sessions: number | null
          position_title: string | null
          reports_to: string | null
          role: string | null
          scouting_count: number | null
          staff_created_at: string | null
          staff_id: string | null
          start_date: string | null
          task_completion_rate: number | null
          tasks_assigned: number | null
          tasks_completed: number | null
          tasks_pending: number | null
          throughput_avg_grams_per_hour: number | null
          throughput_records: number | null
          throughput_total_minutes: number | null
          throughput_total_units: number | null
          throughput_total_weight: number | null
          total_buck_minutes: number | null
          total_bucked_grams: number | null
          total_cultivation_activities: number | null
          total_cultivation_touchpoints: number | null
          total_hours_logged: number | null
          total_pack_minutes: number | null
          total_post_production_sessions: number | null
          total_trim_minutes: number | null
          total_trimmed_grams: number | null
          total_units_packaged: number | null
          training_count: number | null
          trim_sessions: number | null
          trim_waste_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "staff_performance_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      strain_conversion_analysis: {
        Row: {
          actual_percentage: number | null
          analysis_date: string | null
          expected_percentage: number | null
          from_stage: string | null
          performance_status: string | null
          sample_size: number | null
          strain: string | null
          to_stage: string | null
          variance_percentage: number | null
        }
        Insert: {
          actual_percentage?: number | null
          analysis_date?: string | null
          expected_percentage?: number | null
          from_stage?: string | null
          performance_status?: never
          sample_size?: number | null
          strain?: string | null
          to_stage?: string | null
          variance_percentage?: number | null
        }
        Update: {
          actual_percentage?: number | null
          analysis_date?: string | null
          expected_percentage?: number | null
          from_stage?: string | null
          performance_status?: never
          sample_size?: number | null
          strain?: string | null
          to_stage?: string | null
          variance_percentage?: number | null
        }
        Relationships: []
      }
      strain_data_quality: {
        Row: {
          entity_id: string | null
          entity_name: string | null
          issue_type: string | null
          table_name: string | null
        }
        Relationships: []
      }
      strain_demand_pressure: {
        Row: {
          pending_order_count: number | null
          pending_order_details: Json | null
          size_breakdown: Json | null
          strain: string | null
          total_committed_quantity: number | null
          total_committed_weight_grams: number | null
        }
        Relationships: []
      }
      strain_inventory_summary: {
        Row: {
          active_batch_count: number | null
          bucked_grams: number | null
          bulk_flower_grams: number | null
          bulk_smalls_grams: number | null
          bulk_trim_grams: number | null
          has_active_batches: boolean | null
          most_recent_harvest: string | null
          packaged_units_available: number | null
          strain: string | null
          total_available_grams: number | null
        }
        Relationships: []
      }
      strain_metadata_compat: {
        Row: {
          abbreviation: string | null
          avg_bucked_to_flower_ratio: number | null
          avg_bucked_to_smalls_ratio: number | null
          avg_bucked_to_trim_ratio: number | null
          avg_trim_grams_per_hour: number | null
          avg_waste_percentage: number | null
          created_at: string | null
          genetics: string | null
          id: string | null
          name: string | null
          notes: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_trim_grams_per_hour?: number | null
          avg_waste_percentage?: number | null
          created_at?: string | null
          genetics?: string | null
          id?: string | null
          name?: string | null
          notes?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_trim_grams_per_hour?: number | null
          avg_waste_percentage?: number | null
          created_at?: string | null
          genetics?: string | null
          id?: string | null
          name?: string | null
          notes?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strain_throughput_stats: {
        Row: {
          avg_duration_minutes: number | null
          avg_grams_per_hour: number | null
          avg_waste_pct: number | null
          first_processed: string | null
          last_processed: string | null
          median_grams_per_hour: number | null
          session_type: string | null
          strain: string | null
          total_input_grams: number | null
          total_output_grams: number | null
          total_sessions: number | null
          unique_workers: number | null
        }
        Relationships: []
      }
      test_mode_status: {
        Row: {
          audit_entries_last_24h: number | null
          enabled: boolean | null
          retention_days: number | null
          total_audit_entries: number | null
          unique_validations_bypassed: number | null
        }
        Relationships: []
      }
      trim_productivity_by_strain: {
        Row: {
          avg_flower_output: number | null
          avg_flower_yield_percentage: number | null
          avg_grams_per_hour: number | null
          avg_smalls_output: number | null
          avg_smalls_yield_percentage: number | null
          avg_trim_output: number | null
          avg_waste: number | null
          session_count: number | null
          strain: string | null
          trimmer_name: string | null
        }
        Relationships: []
      }
      v_280e_labor_allocation: {
        Row: {
          bucking: number | null
          cogs_labor_pct: number | null
          estimated_monthly_cogs_labor: number | null
          estimated_monthly_operating_labor: number | null
          packaging: number | null
          period: string | null
          production_hours: number | null
          production_workers: number | null
          session_tracked_cogs: number | null
          trimming: number | null
        }
        Relationships: []
      }
      v_280e_summary: {
        Row: {
          cogs_pct: number | null
          penalty_280e: number | null
          period: string | null
          taxable_income_estimate: number | null
          total_cogs: number | null
          total_expenses: number | null
          total_operating_expense: number | null
          total_revenue: number | null
          vs_standard_accounting: number | null
        }
        Relationships: []
      }
      v_ap_aging: {
        Row: {
          age_bucket: string | null
          amount_due: number | null
          bill_date: string | null
          bill_number: string | null
          created_at: string | null
          days_outstanding: number | null
          due_date: string | null
          id: string | null
          is_cogs: boolean | null
          notes: string | null
          paid_amount: number | null
          payment_count: number | null
          status: string | null
          total_amount: number | null
          vendor_category: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
      v_ap_overview: {
        Row: {
          active_recurring_bills: number | null
          bucket_1_30: number | null
          bucket_31_60: number | null
          bucket_61_90: number | null
          bucket_90_plus: number | null
          current_amount: number | null
          monthly_recurring_total: number | null
          outstanding_cogs: number | null
          outstanding_operating: number | null
          total_open_bills: number | null
          total_outstanding: number | null
          total_overdue: number | null
          vendors_with_open_ap: number | null
        }
        Relationships: []
      }
      v_ap_summary_by_vendor: {
        Row: {
          bucket_1_30: number | null
          bucket_31_60: number | null
          bucket_61_90: number | null
          bucket_90_plus: number | null
          current_amount: number | null
          oldest_days_outstanding: number | null
          open_bill_count: number | null
          outstanding_cogs: number | null
          outstanding_operating: number | null
          total_billed: number | null
          total_outstanding: number | null
          total_paid: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
      v_ar_aging: {
        Row: {
          age_bucket: string | null
          amount_due: number | null
          ar_status: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          days_outstanding: number | null
          due_date: string | null
          id: string | null
          invoice_number: string | null
          invoice_status: string | null
          issue_date: string | null
          notes: string | null
          order_id: string | null
          order_number: string | null
          paid_amount: number | null
          payment_count: number | null
          payment_terms: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_health_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_account_scores"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_chain_location_performance"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customer_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_monthly_revenue_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_product_mix_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_prospect_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_store_scorecard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_visit_cadence"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_customer_behavior"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_summary_by_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_revenue_pipeline"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_age_metrics"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_material_requirements"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_by_delivery_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pending_invoices"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_by_order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      v_ar_customer_behavior: {
        Row: {
          avg_days_to_pay: number | null
          current_outstanding: number | null
          customer_id: string | null
          customer_name: string | null
          last_payment_date: string | null
          lifetime_invoiced: number | null
          lifetime_paid: number | null
          open_invoices: number | null
          paid_invoices: number | null
          total_invoices: number | null
        }
        Relationships: []
      }
      v_ar_overview: {
        Row: {
          bucket_1_30: number | null
          bucket_31_60: number | null
          bucket_61_90: number | null
          bucket_90_plus: number | null
          current_amount: number | null
          customers_with_open_ar: number | null
          drafts_pending_review: number | null
          drafts_total_value: number | null
          total_open_invoices: number | null
          total_outstanding: number | null
          total_overdue: number | null
        }
        Relationships: []
      }
      v_ar_payment_history: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          reference_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ar_summary_by_customer: {
        Row: {
          bucket_1_30: number | null
          bucket_31_60: number | null
          bucket_61_90: number | null
          bucket_90_plus: number | null
          current_amount: number | null
          customer_id: string | null
          customer_name: string | null
          oldest_days_outstanding: number | null
          open_invoice_count: number | null
          overdue_amount: number | null
          overdue_count: number | null
          total_invoiced: number | null
          total_outstanding: number | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_atp: {
        Row: {
          atp_qty: number | null
          batch_id: string | null
          batch_number: string | null
          item_id: string | null
          on_hand_qty: number | null
          package_id: string | null
          product_name: string | null
          product_stage_id: string | null
          reserved_qty: number | null
          stage_name: string | null
          strain: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_badge_counts: {
        Row: {
          active_audit: boolean | null
          batches: number | null
          inventory_binned: number | null
          inventory_bucked: number | null
          inventory_bulk: number | null
          inventory_packaged: number | null
          inventory_total: number | null
          orders: number | null
          packaging_sessions: number | null
          pending_conversions: number | null
          trim_sessions: number | null
        }
        Relationships: []
      }
      v_batch_consumable_cost: {
        Row: {
          batch_registry_id: string | null
          nutrient_cost: number | null
          other_cost: number | null
          packaging_cost: number | null
          strain: string | null
          total_consumable_cost: number | null
          usage_entries: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      v_batch_intelligence: {
        Row: {
          age_days: number | null
          allocated_lines: number | null
          allocated_orders: number | null
          allocated_revenue: number | null
          allocated_units: number | null
          batch_id: string | null
          batch_number: string | null
          binned_g: number | null
          bucked_g: number | null
          bucking_flower_pct: number | null
          bucking_smalls_pct: number | null
          bulk_flower_g: number | null
          bulk_smalls_g: number | null
          confidence: string | null
          conversion_sessions: number | null
          flower_plants: number | null
          harvest_date: string | null
          initial_weight_grams: number | null
          lifecycle_state: string | null
          next_harvest_date: string | null
          packaged_g: number | null
          packaged_units: number | null
          pipeline_raw_g: number | null
          projected_from_binned_g: number | null
          projected_from_bucked_g: number | null
          quality_grade: string | null
          sellable_now_g: number | null
          strain: string | null
          strain_id: string | null
          strain_unalloc_demand_g: number | null
          strain_unalloc_lines: number | null
          strain_unalloc_orders: number | null
          strain_unalloc_revenue: number | null
          strain_unalloc_units: number | null
          total_potential_g: number | null
          trim_g: number | null
          trimming_big_bud_pct: number | null
          trimming_small_bud_pct: number | null
          veg_plants: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_batch_lifecycle_mismatches: {
        Row: {
          active_items: number | null
          batch_number: string | null
          batch_status: string | null
          current_lifecycle: string | null
          expected_lifecycle: string | null
          furthest_inventory_stage: string | null
        }
        Relationships: []
      }
      v_batch_overhead_allocation: {
        Row: {
          allocated_overhead: number | null
          allocation_pct: number | null
          batch_output_g: number | null
          batch_registry_id: string | null
          facility_total_output_g: number | null
          overhead_per_gram: number | null
          period: string | null
        }
        Relationships: []
      }
      v_batch_stage_balances: {
        Row: {
          available_weight_grams: number | null
          batch_id: string | null
          batch_number: string | null
          item_count: number | null
          last_updated: string | null
          product_stage_id: string | null
          sort_order: number | null
          stage: string | null
          strain: string | null
          unit_count: number | null
          weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_chat_session_overview: {
        Row: {
          assistant_messages: number | null
          distilled: boolean | null
          last_activity: string | null
          message_count: number | null
          request_messages: number | null
          session_id: string | null
          session_started: string | null
          ticket_messages: number | null
          title: string | null
          user_id: string | null
          user_messages: number | null
          user_name: string | null
        }
        Relationships: []
      }
      v_ci_customer_revenue_health: {
        Row: {
          account_status: string | null
          calculated_at: string | null
          customer_name: string | null
          days_since_last_order: number | null
          health_status: string | null
          last_order_date: string | null
          lifetime_revenue: number | null
          pct_of_total_revenue: number | null
          pipeline_stage: string | null
          revenue_last_30d: number | null
          revenue_last_90d: number | null
          total_orders: number | null
        }
        Relationships: []
      }
      v_ci_financial_pulse: {
        Row: {
          ap_cogs: number | null
          ap_monthly_recurring: number | null
          ap_operating: number | null
          ap_outstanding: number | null
          ap_overdue: number | null
          ar_aging_1_30: number | null
          ar_aging_31_60: number | null
          ar_aging_61_90: number | null
          ar_aging_90_plus: number | null
          ar_open_invoices: number | null
          ar_outstanding: number | null
          ar_overdue: number | null
          burn_rate_monthly: number | null
          calculated_at: string | null
          customers_last_30d: number | null
          labor_cogs_tracked: number | null
          labor_cost_per_gram: number | null
          monthly_surplus_deficit: number | null
          open_orders: number | null
          open_pipeline_value: number | null
          orders_last_30d: number | null
          orders_mtd: number | null
          overdue_orders: number | null
          overdue_value: number | null
          production_hours: number | null
          revenue_last_30d: number | null
          revenue_mtd: number | null
        }
        Relationships: []
      }
      v_ci_inventory_revenue_potential: {
        Row: {
          calculated_at: string | null
          estimated_revenue_potential: number | null
          grams_available: number | null
          item_count: number | null
          lbs_available: number | null
          stage: string | null
          steps_to_revenue: number | null
        }
        Relationships: []
      }
      v_ci_production_velocity: {
        Row: {
          avg_bucking_output_per_week: number | null
          avg_grams_packaged_per_week: number | null
          avg_packaging_sessions_per_week: number | null
          avg_trim_sellable_per_week: number | null
          binned_grams_remaining: number | null
          calculated_at: string | null
          grams_packaged_this_week: number | null
          grams_per_week_for_breakeven: number | null
          pct_of_breakeven_velocity: number | null
          weeks_of_binned_inventory: number | null
        }
        Relationships: []
      }
      v_cogs_by_batch: {
        Row: {
          batch_number: string | null
          batch_registry_id: string | null
          bucking_cost: number | null
          bucking_sessions: number | null
          direct_labor_cost: number | null
          labor_cost_per_output_gram: number | null
          loaded_labor_cost: number | null
          packaging_cost: number | null
          packaging_sessions: number | null
          strain_name: string | null
          total_hours: number | null
          total_input_grams: number | null
          total_minutes: number | null
          total_output_grams: number | null
          total_sessions: number | null
          trim_cost: number | null
          trim_sessions: number | null
        }
        Relationships: []
      }
      v_cogs_overview: {
        Row: {
          avg_session_cost: number | null
          batches_with_cost_data: number | null
          overall_labor_cost_per_gram: number | null
          total_bucking_cost: number | null
          total_loaded_labor_cost: number | null
          total_output_grams: number | null
          total_packaging_cost: number | null
          total_production_hours: number | null
          total_production_sessions: number | null
          total_trim_cost: number | null
        }
        Relationships: []
      }
      v_consumable_cost_per_gram: {
        Row: {
          batch_registry_id: string | null
          consumable_cost_per_gram: number | null
          consumable_cost_per_lb: number | null
          nutrient_cost: number | null
          packaging_cost: number | null
          strain: string | null
          total_consumable_cost: number | null
          total_output_g: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumable_usage_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      v_daily_movement_volume: {
        Row: {
          avg_qty: number | null
          count: number | null
          movement_date: string | null
          movement_kind: string | null
          total_qty: number | null
        }
        Relationships: []
      }
      v_harvest_metrics: {
        Row: {
          avg_dry_per_plant: number | null
          avg_wet_per_plant: number | null
          batch_number: string | null
          batch_registry_id: string | null
          bin_date: string | null
          binning_completed_at: string | null
          binning_session_id: string | null
          binning_status: string | null
          days_in_dry: number | null
          dry_room_code: string | null
          dry_room_id: string | null
          dry_weight_grams: number | null
          effective_wet_weight_grams: number | null
          fresh_frozen_weight_grams: number | null
          grow_room_capacity: number | null
          grow_room_code: string | null
          grow_room_id: string | null
          grow_room_type: string | null
          harvest_completed_at: string | null
          harvest_date: string | null
          harvest_notes: string | null
          harvest_session_id: string | null
          harvest_status: string | null
          harvest_type: string | null
          plant_count_harvested: number | null
          strain_abbreviation: string | null
          strain_id: string | null
          strain_name: string | null
          waste_grams: number | null
          water_loss_grams: number | null
          wet_weight_grams: number | null
          yield_percentage: number | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_weight_entries_location_id_fkey"
            columns: ["dry_room_id"]
            isOneToOne: false
            referencedRelation: "dry_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_atp: {
        Row: {
          atp_qty: number | null
          batch_id: string | null
          created_at: string | null
          item_id: string | null
          on_hand_qty: number | null
          package_id: string | null
          product_name: string | null
          product_stage_id: string | null
          released_qty: number | null
          reserved_qty: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          atp_qty?: never
          batch_id?: string | null
          created_at?: string | null
          item_id?: string | null
          on_hand_qty?: number | null
          package_id?: string | null
          product_name?: string | null
          product_stage_id?: string | null
          released_qty?: never
          reserved_qty?: never
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          atp_qty?: never
          batch_id?: string | null
          created_at?: string | null
          item_id?: string | null
          on_hand_qty?: number | null
          package_id?: string | null
          product_name?: string | null
          product_stage_id?: string | null
          released_qty?: never
          reserved_qty?: never
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_balances: {
        Row: {
          batch: string | null
          batch_id: string | null
          batch_number: string | null
          category: string | null
          created_at: string | null
          item_id: string | null
          last_updated: string | null
          on_hand_qty: number | null
          package_id: string | null
          parent_item_id: string | null
          product_name: string | null
          product_stage_id: string | null
          room: string | null
          sku: string | null
          stage_name: string | null
          status: string | null
          strain: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "conversion_packages_detail_view"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservation_summary"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_details"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "package_assignments_with_reservations"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_atp"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_balances"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_strain_data_quality"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_batch_stages: {
        Row: {
          available_qty: number | null
          batch_number: string | null
          category: string | null
          display_group: string | null
          item_count: number | null
          stage_name: string | null
          stage_sort: number | null
          strain: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
        ]
      }
      v_inventory_pipeline_by_strain: {
        Row: {
          binned_g: number | null
          bucked_g: number | null
          bulk_flower_g: number | null
          bulk_smalls_g: number | null
          packaged_g: number | null
          packaged_units: number | null
          strain_id: string | null
          trim_g: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_inventory_sales: {
        Row: {
          available_lbs: number | null
          available_qty: number | null
          batch_number: string | null
          category: string | null
          display_group: string | null
          grade_code: string | null
          grade_color: string | null
          harvest_date: string | null
          item_count: number | null
          stage_name: string | null
          stage_sort: number | null
          strain: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "valid_categories"
            referencedColumns: ["category"]
          },
        ]
      }
      v_knowledge_candidates_review: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string | null
          proposed_category: string | null
          proposed_key: string | null
          proposed_value: string | null
          reviewed_at: string | null
          session_date: string | null
          source_session_title: string | null
          status: string | null
        }
        Relationships: []
      }
      v_labor_cost_by_session: {
        Row: {
          batch_number: string | null
          batch_registry_id: string | null
          department: string | null
          employer_cost_multiplier: number | null
          hourly_rate: number | null
          input_grams: number | null
          labor_cost: number | null
          loaded_labor_cost: number | null
          minutes_worked: number | null
          output_grams: number | null
          session_date: string | null
          session_id: string | null
          session_type: string | null
          staff_id: string | null
          staff_name: string | null
          strain_id: string | null
          strain_name: string | null
        }
        Relationships: []
      }
      v_lineage: {
        Row: {
          batch_id: string | null
          depth: number | null
          item_id: string | null
          parent_item_id: string | null
          path: string[] | null
        }
        Relationships: []
      }
      v_movement_error_rate: {
        Row: {
          date: string | null
          error_percentage: number | null
          total_errors: number | null
          total_movements: number | null
        }
        Relationships: []
      }
      v_movement_stats: {
        Row: {
          active_days: number | null
          avg_qty: number | null
          first_movement: string | null
          last_movement: string | null
          max_qty: number | null
          min_qty: number | null
          movement_kind: string | null
          total_count: number | null
          total_qty: number | null
          unique_items: number | null
        }
        Relationships: []
      }
      v_open_order_demand: {
        Row: {
          format: string | null
          open_orders: number | null
          strain: string | null
          total_assigned: number | null
          total_ordered: number | null
          unassigned_demand: number | null
        }
        Relationships: []
      }
      v_plant_groups_by_batch: {
        Row: {
          batch_number: string | null
          batch_registry_id: string | null
          created_at: string | null
          estimated_harvest_date: string | null
          grow_room_id: string | null
          growth_stage: string | null
          is_mother: boolean | null
          planted_date: string | null
          room_code: string | null
          source_type: string | null
          stage_entered_at: string | null
          strain_abbreviation: string | null
          strain_id: string | null
          strain_name: string | null
          table_section_count: number | null
          total_plants: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["grow_room_id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_occupancy"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "v_room_operational_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_production_queue_batch_planning: {
        Row: {
          allocated_order_items: number | null
          allocated_order_numbers: string[] | null
          batch_id: string | null
          batch_number: string | null
          batch_status: string | null
          binned_g: number | null
          bucked_g: number | null
          bulk_g: number | null
          est_eighths_from_bulk: number | null
          est_lbs_from_bulk: number | null
          packaged_g: number | null
          strain_demand_g: number | null
          strain_id: string | null
          strain_name: string | null
          strain_order_count: number | null
          strain_units_needed: number | null
          strain_urgency: string | null
          total_allocated_g: number | null
          total_available_g: number | null
          total_weight_g: number | null
          trim_g: number | null
        }
        Relationships: []
      }
      v_production_queue_by_order: {
        Row: {
          batch_grade_code: string | null
          batch_grade_color: string | null
          batch_harvest_date: string | null
          batch_lifecycle_state: string | null
          batch_number: string | null
          batch_quality_grade: string | null
          batch_quarantined: boolean | null
          batch_stage_label: string | null
          batch_status: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_notes: string | null
          demand_unit: string | null
          format_label: string | null
          is_sample: boolean | null
          item_status: Database["public"]["Enums"]["order_item_status"] | null
          line_demand_g: number | null
          order_id: string | null
          order_item_id: string | null
          order_number: string | null
          order_status: string | null
          product_category: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          strain_id: string | null
          strain_name: string | null
          subtotal: number | null
          unit_price: number | null
          urgency: string | null
          weight_per_unit_g: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_production_queue_by_strain: {
        Row: {
          already_packaged_g: number | null
          already_packaged_units: number | null
          bucking_flower_pct: number | null
          bucking_smalls_pct: number | null
          confidence: string | null
          conversion_sessions: number | null
          demand_unit: string | null
          earliest_delivery_date: string | null
          format_label: string | null
          order_count: number | null
          packaging_efficiency_pct: number | null
          pipeline_binned_g: number | null
          pipeline_bucked_g: number | null
          pipeline_lbs: number | null
          product_category: string | null
          ready_flower_g: number | null
          ready_lbs: number | null
          ready_smalls_g: number | null
          ready_trim_g: number | null
          stock_status: string | null
          strain_id: string | null
          strain_name: string | null
          total_demand_g: number | null
          total_demand_lbs: number | null
          total_units_assigned: number | null
          total_units_needed: number | null
          total_units_ordered: number | null
          trimming_big_bud_pct: number | null
          trimming_small_bud_pct: number | null
          urgency: string | null
          weight_per_unit_g: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_production_queue_strain_summary: {
        Row: {
          available_g: number | null
          available_lbs: number | null
          earliest_delivery: string | null
          fill_rate_pct: number | null
          line_item_count: number | null
          order_count: number | null
          stock_status: string | null
          strain_id: string | null
          strain_name: string | null
          total_demand_g: number | null
          total_demand_lbs: number | null
          urgency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_quarantined_batches: {
        Row: {
          affected_item_count: number | null
          batch_id: string | null
          batch_number: string | null
          blocked_operation_count: number | null
          created_at: string | null
          is_quarantined: boolean | null
          lifecycle_state: string | null
          quarantine_reason: string | null
          quarantined_at: string | null
          strain: string | null
          total_on_hand_qty: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_room_occupancy: {
        Row: {
          capacity_plants: number | null
          capacity_utilization_pct: number | null
          days_in_stage: number | null
          earliest_planted_date: string | null
          estimated_harvest_date: string | null
          growth_stage: string | null
          is_mother: boolean | null
          plant_count: number | null
          room_id: string | null
          room_name: string | null
          room_type: string | null
          square_footage: number | null
          stage_entered_at: string | null
          strain_count: number | null
          strain_id: string | null
          strain_name: string | null
          total_plants: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "plant_groups_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_room_operational_state: {
        Row: {
          capacity_plants: number | null
          days_in_stage: number | null
          days_to_harvest: number | null
          dominant_stage: string | null
          earliest_harvest_date: string | null
          groups_near_harvest: number | null
          is_active: boolean | null
          last_harvest_date: string | null
          last_harvest_wet_grams: number | null
          latest_harvest_date: string | null
          newest_stage_entry: string | null
          next_harvest_date: string | null
          occupancy_pct: number | null
          occupancy_status: string | null
          oldest_stage_entry: string | null
          plant_group_count: number | null
          room_code: string | null
          room_id: string | null
          room_type: string | null
          strain_count: number | null
          strain_names: string[] | null
          tasks_completed_today: number | null
          tasks_in_progress_today: number | null
          tasks_pending_today: number | null
          tasks_today: number | null
          total_plants: number | null
          urgency_score: number | null
        }
        Relationships: []
      }
      v_rosin_pipeline_status: {
        Row: {
          batch_number: string | null
          expected_completion: string | null
          input_grams: number | null
          output_grams: number | null
          run_id: string | null
          stage: string | null
          started_date: string | null
          status: string | null
          strain_name: string | null
        }
        Relationships: []
      }
      v_rosin_strain_yields: {
        Row: {
          avg_cure_loss_pct: number | null
          avg_freeze_dry_loss_pct: number | null
          avg_overall_yield_pct: number | null
          avg_press_yield_pct: number | null
          avg_wash_yield_pct: number | null
          last_wash_date: string | null
          strain_id: string | null
          strain_name: string | null
          total_wash_runs: number | null
          total_waste_grams: number | null
        }
        Relationships: []
      }
      v_sales_dashboard: {
        Row: {
          byproduct_grams: number | null
          demand_orders: number | null
          demand_units: number | null
          demand_value: number | null
          grade_code: string | null
          grade_color: string | null
          health_sort: number | null
          health_status: string | null
          packaged_units: number | null
          pipeline_binned_grams: number | null
          pipeline_bucked_grams: number | null
          pipeline_grams: number | null
          sellable_flower_grams: number | null
          sellable_grams: number | null
          sellable_smalls_grams: number | null
          strain: string | null
          total_sellable: number | null
        }
        Relationships: []
      }
      v_session_labor_cost: {
        Row: {
          batch_registry_id: string | null
          duration_minutes: number | null
          employer_hourly_cost: number | null
          hourly_rate: number | null
          input_g: number | null
          labor_cost_dollars: number | null
          labor_cost_per_gram: number | null
          labor_cost_per_lb: number | null
          output_g: number | null
          session_date: string | null
          session_id: string | null
          session_type: string | null
          strain: string | null
          worker_name: string | null
        }
        Relationships: []
      }
      v_sku_yield: {
        Row: {
          age_days: number | null
          age_pressure: string | null
          batch_id: string | null
          batch_number: string | null
          binned_g: number | null
          buck_confidence: string | null
          buck_flower_pct: number | null
          buck_sessions: number | null
          buck_smalls_pct: number | null
          buck_waste_pct: number | null
          bucked_flower_g: number | null
          bucked_smalls_g: number | null
          bulk_flower_g: number | null
          bulk_smalls_g: number | null
          est_loose_bulk_g: number | null
          est_packageable_g: number | null
          existing_14g: number | null
          existing_1lb: number | null
          existing_3_5g: number | null
          existing_other_units: number | null
          existing_preroll: number | null
          harvest_date: string | null
          lifecycle_state: string | null
          packaged_g: number | null
          pkg_confidence: string | null
          pkg_pct_14g: number | null
          pkg_pct_1lb: number | null
          pkg_pct_3_5g: number | null
          pkg_sessions: number | null
          proj_14g: number | null
          proj_1lb: number | null
          proj_3_5g: number | null
          proj_preroll: number | null
          proj_trim_g: number | null
          strain: string | null
          strain_id: string | null
          total_remaining_g: number | null
          trim_bigs_pct: number | null
          trim_confidence: string | null
          trim_g: number | null
          trim_sessions: number | null
          trim_smalls_pct: number | null
          trim_trim_pct: number | null
          trim_waste_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_strain_analytics_summary: {
        Row: {
          avg_big_bud_pct: number | null
          avg_bucking_kg_per_hr: number | null
          avg_revenue_per_gram: number | null
          avg_rosin_yield_pct: number | null
          avg_small_bud_pct: number | null
          avg_thc_pct: number | null
          avg_total_terpenes_mg_g: number | null
          avg_trim_g_per_hr: number | null
          avg_trim_pct: number | null
          avg_units_per_hr: number | null
          avg_variance_pct: number | null
          avg_waste_pct: number | null
          avg_wet_g_per_sqft: number | null
          avg_wet_weight_per_plant_g: number | null
          bucking_session_count: number | null
          category: string | null
          coa_count: number | null
          conversion_confidence: string | null
          conversion_sessions: number | null
          demand_total_units: number | null
          demand_unassigned_units: number | null
          display_name: string | null
          dominance_type: string | null
          feed_group: string | null
          flowering_time_class: string | null
          flowering_time_days: number | null
          grade_confidence: string | null
          graded_count: number | null
          harvest_count: number | null
          inventory_item_count: number | null
          labor_cost_per_gram: number | null
          last_bucking_date: string | null
          last_harvest_date: string | null
          last_packaging_date: string | null
          last_trim_date: string | null
          most_common_grade: string | null
          most_common_variance_reason: string | null
          order_count: number | null
          packaging_session_count: number | null
          pct_graded: number | null
          press_run_count: number | null
          runway_days: number | null
          runway_status: string | null
          strain_id: string | null
          strain_name: string | null
          suggested_grade: string | null
          total_cost_per_gram: number | null
          total_pipeline_lbs: number | null
          total_sellable_lbs: number | null
          total_session_count: number | null
          trim_session_count: number | null
          true_margin_per_gram: number | null
          variance_event_count: number | null
          veg_days_avg: number | null
        }
        Relationships: []
      }
      v_strain_conversion_rates: {
        Row: {
          bucking_flower_pct: number | null
          bucking_sessions: number | null
          bucking_smalls_pct: number | null
          bucking_waste_pct: number | null
          confidence: string | null
          packaging_efficiency_pct: number | null
          packaging_pct_to_14g: number | null
          packaging_pct_to_1lb: number | null
          packaging_pct_to_3_5g: number | null
          packaging_sessions: number | null
          strain: string | null
          strain_id: string | null
          total_sessions: number | null
          trimming_big_bud_pct: number | null
          trimming_sessions: number | null
          trimming_small_bud_pct: number | null
          trimming_trim_pct: number | null
          trimming_waste_pct: number | null
        }
        Relationships: []
      }
      v_strain_cost_of_production: {
        Row: {
          avg_revenue_per_gram: number | null
          bucking_labor_cost: number | null
          labor_cost_per_gram: number | null
          labor_cost_per_lb: number | null
          labor_margin_per_gram: number | null
          overall_yield_pct: number | null
          packaging_labor_cost: number | null
          strain: string | null
          total_grams_sold: number | null
          total_input_g: number | null
          total_labor_cost: number | null
          total_output_g: number | null
          total_revenue: number | null
          total_sessions: number | null
          trim_labor_cost: number | null
        }
        Relationships: []
      }
      v_strain_cultivation_basics: {
        Row: {
          avg_wet_weight_per_plant_g: number | null
          bucking_flower_pct: number | null
          bucking_smalls_pct: number | null
          bucking_waste_pct: number | null
          category: string | null
          conversion_confidence: string | null
          conversion_sessions: number | null
          demand_total_units: number | null
          demand_unassigned_units: number | null
          display_name: string | null
          dominance_type: string | null
          feed_group: string | null
          flowering_time_class: string | null
          flowering_time_days: number | null
          harvest_count: number | null
          is_active: boolean | null
          last_harvest_date: string | null
          order_count: number | null
          strain_id: string | null
          strain_name: string | null
          trimming_big_bud_pct: number | null
          trimming_small_bud_pct: number | null
          trimming_waste_pct: number | null
          veg_days_avg: number | null
        }
        Relationships: []
      }
      v_strain_cultivation_stats: {
        Row: {
          avg_big_bud_pct: number | null
          avg_rosin_yield_pct: number | null
          avg_small_bud_pct: number | null
          avg_thc_pct: number | null
          avg_total_terpenes_mg_g: number | null
          avg_trim_grams_per_hour: number | null
          avg_trim_pct: number | null
          avg_waste_pct: number | null
          avg_wet_g_per_sqft: number | null
          avg_wet_weight_per_plant_g: number | null
          category: string | null
          coa_count: number | null
          conversion_confidence: string | null
          conversion_sessions: number | null
          demand_total_units: number | null
          demand_unassigned_units: number | null
          display_name: string | null
          dominance_type: string | null
          feed_group: string | null
          flowering_time_class: string | null
          flowering_time_days: number | null
          harvest_count: number | null
          is_active: boolean | null
          last_harvest_date: string | null
          order_count: number | null
          press_run_count: number | null
          strain_id: string | null
          strain_name: string | null
          trim_session_count: number | null
          veg_days_avg: number | null
        }
        Relationships: []
      }
      v_strain_grade_suggestions: {
        Row: {
          avg_big_bud_pct: number | null
          confidence: string | null
          session_count: number | null
          stddev_big_bud_pct: number | null
          strain_id: string | null
          strain_name: string | null
          suggested_grade: string | null
          suggestion_rationale: string | null
          ungraded_item_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      v_strain_intelligence: {
        Row: {
          avg_big_bud_pct: number | null
          avg_bucking_kg_per_hr: number | null
          avg_days_to_harvest: number | null
          avg_trim_g_per_hr: number | null
          avg_units_per_hr: number | null
          avg_variance_pct: number | null
          avg_waste_pct: number | null
          bucking_session_count: number | null
          graded_count: number | null
          harvest_session_count: number | null
          inventory_item_count: number | null
          last_bucking_date: string | null
          last_packaging_date: string | null
          last_trim_date: string | null
          most_common_grade: string | null
          most_common_variance_reason: string | null
          packaging_session_count: number | null
          pct_graded: number | null
          strain_id: string | null
          strain_name: string | null
          total_session_count: number | null
          trim_session_count: number | null
          variance_event_count: number | null
        }
        Relationships: []
      }
      v_strain_runway: {
        Row: {
          binned_g: number | null
          binned_lbs: number | null
          bucked_g: number | null
          bucked_lbs: number | null
          bucking_flower_pct: number | null
          bucking_smalls_pct: number | null
          bulk_flower_g: number | null
          bulk_smalls_g: number | null
          confidence: string | null
          conversion_sessions: number | null
          demand_g: number | null
          demand_lbs: number | null
          demand_revenue: number | null
          demand_units: number | null
          existing_bulk_g: number | null
          existing_bulk_lbs: number | null
          flower_plants: number | null
          line_count: number | null
          next_harvest_date: string | null
          order_count: number | null
          overall_conversion_pct: number | null
          packaged_g: number | null
          packaged_units: number | null
          packaging_efficiency_pct: number | null
          pipeline_g: number | null
          projected_from_binned_g: number | null
          projected_from_bucked_g: number | null
          rate_source: string | null
          strain_id: string | null
          strain_name: string | null
          total_projected_bulk_g: number | null
          total_projected_bulk_lbs: number | null
          trim_g: number | null
          trimming_big_bud_pct: number | null
          trimming_small_bud_pct: number | null
          veg_plants: number | null
        }
        Relationships: []
      }
      v_strain_true_cost: {
        Row: {
          avg_revenue_per_gram: number | null
          consumable_cost_per_gram: number | null
          labor_cost_per_gram: number | null
          labor_margin_per_gram: number | null
          overall_yield_pct: number | null
          overhead_cost_per_gram: number | null
          strain: string | null
          total_cost_per_gram: number | null
          total_labor_cost: number | null
          total_output_g: number | null
          total_sessions: number | null
          true_margin_per_gram: number | null
        }
        Relationships: []
      }
      v_strain_yield_metrics: {
        Row: {
          avg_buck_flower_ratio: number | null
          avg_buck_smalls_ratio: number | null
          avg_buck_yield_ratio: number | null
          avg_dry_wet_ratio: number | null
          avg_overall_conversion_ratio: number | null
          avg_trim_bigs_ratio: number | null
          avg_trim_smalls_ratio: number | null
          avg_trim_yield_ratio: number | null
          avg_wet_per_plant: number | null
          avg_wet_per_sqft_room: number | null
          bucking_batch_count: number | null
          drying_batch_count: number | null
          harvest_batch_count: number | null
          stddev_dry_wet_ratio: number | null
          stddev_wet_per_plant: number | null
          strain: string | null
          trim_batch_count: number | null
        }
        Relationships: []
      }
      v_throughput_daily: {
        Row: {
          bucked_grams: number | null
          bucked_lbs: number | null
          packaged_grams: number | null
          packaged_lbs: number | null
          production_date: string | null
          strains_packaged: number | null
          trimmed_grams: number | null
          trimmed_lbs: number | null
        }
        Relationships: []
      }
      v_ticket_triage: {
        Row: {
          affected_area: string | null
          ai_analysis: string | null
          ai_classification: Json | null
          attachments: Json | null
          bug_category: string | null
          business_case: string | null
          created_at: string | null
          description: string | null
          id: string | null
          priority: string | null
          priority_rank: number | null
          reported_by_email: string | null
          reported_by_name: string | null
          request_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_conversion_rates_by_session: {
        Row: {
          batch_number: string | null
          conversion_date: string | null
          packages_created: number | null
          session_id: string | null
          strain_name: string | null
          total_units: number | null
          total_weight_grams: number | null
        }
        Relationships: []
      }
      vw_inventory_strain_data_quality: {
        Row: {
          batch_id: string | null
          batch_strain_id: string | null
          batch_strain_name: string | null
          batch_text_strain: string | null
          data_quality_status: string | null
          inventory_item_id: string | null
          matched_strain_name: string | null
          package_id: string | null
          strain_id: string | null
          text_strain: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      vw_manager_review_performance: {
        Row: {
          avg_hours_to_review: number | null
          first_review: string | null
          latest_review: string | null
          manager_id: string | null
          manager_name: string | null
          packages_reviewed: number | null
          reviewed_today: number | null
        }
        Relationships: []
      }
      vw_packaging_sessions_strain_quality: {
        Row: {
          batch_strain_id: string | null
          batch_strain_name: string | null
          data_quality_status: string | null
          id: string | null
          matched_strain_name: string | null
          package_id: string | null
          strain_id: string | null
          text_strain: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      vw_pending_review_summary: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          item_ids: string[] | null
          newest_package: string | null
          oldest_package: string | null
          package_count: number | null
          product_name: string | null
          product_stage_id: string | null
          stage_name: string | null
          strain_code: string | null
          strain_name: string | null
          total_qty: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "backend_bulk_inventory"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_allocation_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_selection_options"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_with_coa_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_batch_intelligence"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["batch_registry_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_queue_batch_planning"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_quarantined_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_sku_yield"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_trim_sessions_strain_quality: {
        Row: {
          batch_strain_id: string | null
          batch_strain_name: string | null
          data_quality_status: string | null
          id: string | null
          matched_strain_name: string | null
          package_id: string | null
          strain_id: string | null
          text_strain: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["batch_strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "projected_inventory_requirements"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_metadata_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_metrics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_rosin_strain_yields"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_analytics_summary"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_basics"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "v_strain_cultivation_stats"
            referencedColumns: ["strain_id"]
          },
        ]
      }
      vw_variance_trends: {
        Row: {
          avg_unit_variance: number | null
          avg_weight_variance_grams: number | null
          batch_number: string | null
          occurrence_count: number | null
          total_abs_variance_grams: number | null
          variance_reason: Database["public"]["Enums"]["variance_reason"] | null
          week: string | null
        }
        Relationships: []
      }
      worker_session_detail: {
        Row: {
          completed_at: string | null
          duration_minutes: number | null
          first_name: string | null
          grams_per_hour: number | null
          input_grams: number | null
          last_name: string | null
          output_grams: number | null
          session_date: string | null
          session_id: string | null
          session_status: string | null
          session_type: string | null
          staff_id: string | null
          started_at: string | null
          strain: string | null
          units_per_hour: number | null
          units_produced: number | null
          waste_grams: number | null
          waste_pct: number | null
          worker_name: string | null
        }
        Relationships: []
      }
      worker_throughput_leaderboard: {
        Row: {
          active_days: number | null
          avg_duration_minutes: number | null
          avg_grams_per_hour: number | null
          avg_units_per_hour: number | null
          avg_waste_pct: number | null
          day_span: number | null
          fastest_session_minutes: number | null
          first_name: string | null
          first_session: string | null
          last_name: string | null
          last_session: string | null
          median_duration_minutes: number | null
          median_grams_per_hour: number | null
          peak_grams_per_hour: number | null
          session_type: string | null
          sessions_per_day: number | null
          staff_id: string | null
          total_input_grams: number | null
          total_minutes_worked: number | null
          total_output_grams: number | null
          total_sessions: number | null
          total_units_produced: number | null
          total_waste_grams: number | null
          worker_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_product: {
        Args: {
          p_product_id: string
          p_reason: string
          p_replaced_by_product_id?: string
        }
        Returns: undefined
      }
      bot_read: { Args: { sql_query: string }; Returns: Json }
      bot_write: { Args: { sql_mutation: string }; Returns: Json }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_batch_projection: {
        Args: {
          p_source_stage: string
          p_source_weight: number
          p_strain: string
          p_target_stage: string
        }
        Returns: number
      }
      calculate_ledger_quantity: {
        Args: { p_item_id: string }
        Returns: number
      }
      calculate_order_age_color: {
        Args: { order_date: string }
        Returns: string
      }
      calculate_packaging_yield_statistics: {
        Args: {
          p_days_back?: number
          p_source_type: string
          p_strain: string
          p_target_type: string
        }
        Returns: {
          avg_yield: number
          ci_lower: number
          ci_upper: number
          sample_count: number
          std_dev: number
        }[]
      }
      can_close_conversion: {
        Args: { p_session_id: string; p_session_type: string }
        Returns: boolean
      }
      check_batch_has_valid_coa: {
        Args: { batch_uuid: string }
        Returns: boolean
      }
      check_batch_over_allocation: {
        Args: { p_batch_id: string; p_stage?: string }
        Returns: {
          allocated_grams: number
          allocation_percentage: number
          available_grams: number
          stage: string
          warning_level: string
          weight_grams: number
        }[]
      }
      check_trigger_health: {
        Args: never
        Returns: {
          enabled: boolean
          error_rate_24h: number
          errors_last_24h: number
          last_execution: string
          movements_last_24h: number
          status: string
          total_movements: number
          trigger_name: string
        }[]
      }
      cleanup_old_test_mode_logs: { Args: never; Returns: number }
      consolidate_packaging_session_output: {
        Args: {
          p_session_date: string
          p_session_id: string
          p_strain: string
          p_strain_abbreviation: string
          p_units_14g: number
          p_units_3_5g: number
          p_units_454g: number
        }
        Returns: undefined
      }
      consolidate_trim_session_output: {
        Args: {
          p_flower_grams: number
          p_session_date: string
          p_session_id: string
          p_smalls_grams: number
          p_strain: string
          p_strain_abbreviation: string
          p_trim_grams: number
        }
        Returns: undefined
      }
      create_reconciliation_movement: {
        Args: {
          p_counted_qty: number
          p_item_id: string
          p_notes?: string
          p_reason_code?: string
        }
        Returns: string
      }
      crm_dashboard_stats_by_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      crm_product_mix_by_customer_range: {
        Args: {
          p_customer_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          avg_unit_price: number
          customer_id: string
          customer_name: string
          first_order_date: string
          last_order_date: string
          order_count: number
          product_category: string
          product_id: string
          product_name: string
          product_type: string
          strain: string
          total_revenue: number
          total_units: number
        }[]
      }
      crm_sku_performance_by_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          avg_unit_price: number
          order_count: number
          product_category: string
          product_id: string
          product_name: string
          product_type: string
          sku: string
          strain: string
          total_revenue: number
          total_units_sold: number
          unique_customers: number
        }[]
      }
      crm_top_accounts_by_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          account_status: string
          account_type: string
          child_period_orders: number
          child_period_revenue: number
          days_since_last_order: number
          dispensary_code: string
          id: string
          last_order_in_period: string
          name: string
          parent_customer_id: string
          period_avg_order: number
          period_orders: number
          period_revenue: number
          total_revenue: number
        }[]
      }
      dblink: { Args: { "": string }; Returns: Record<string, unknown>[] }
      dblink_cancel_query: { Args: { "": string }; Returns: string }
      dblink_close: { Args: { "": string }; Returns: string }
      dblink_connect: { Args: { "": string }; Returns: string }
      dblink_connect_u: { Args: { "": string }; Returns: string }
      dblink_current_query: { Args: never; Returns: string }
      dblink_disconnect:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      dblink_error_message: { Args: { "": string }; Returns: string }
      dblink_exec: { Args: { "": string }; Returns: string }
      dblink_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      dblink_get_connections: { Args: never; Returns: string[] }
      dblink_get_notify:
        | { Args: { conname: string }; Returns: Record<string, unknown>[] }
        | { Args: never; Returns: Record<string, unknown>[] }
      dblink_get_pkey: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["dblink_pkey_results"][]
        SetofOptions: {
          from: "*"
          to: "dblink_pkey_results"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      dblink_get_result: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      dblink_is_busy: { Args: { "": string }; Returns: number }
      disable_movement_trigger: { Args: never; Returns: string }
      drop_deprecated_inventory_tables: {
        Args: { confirm_text?: string }
        Returns: string
      }
      enable_movement_trigger: { Args: never; Returns: string }
      exec_sql: { Args: { query: string }; Returns: Json }
      execute_readonly_query: { Args: { query_text: string }; Returns: Json }
      export_table_count: { Args: { p_table_name: string }; Returns: number }
      export_table_inserts: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_order_by?: string
          p_table_name: string
        }
        Returns: {
          insert_sql: string
          row_num: number
        }[]
      }
      finalize_session_aggregated: {
        Args: {
          p_batch_id: string
          p_notes?: string
          p_product_name?: string
          p_session_type?: string
          p_variance_reason?: Database["public"]["Enums"]["variance_reason"]
        }
        Returns: Json
      }
      find_strain_by_name: {
        Args: { p_strain_name: string }
        Returns: Record<string, unknown>
      }
      fix_strain_data_quality_issues: {
        Args: never
        Returns: {
          fixed_count: number
          issue_type: string
        }[]
      }
      fn_apply_audit_adjustments: {
        Args: { p_audit_id: string; p_user_id: string }
        Returns: {
          adjustments_applied: number
          variance_logs_created: number
        }[]
      }
      fn_check_stage_locked: {
        Args: { stages: string[] }
        Returns: {
          audit_number: string
          is_locked: boolean
          locked_by_audit: string
        }[]
      }
      fn_combine_inventory_packages: {
        Args: {
          p_new_package_id: string
          p_notes?: string
          p_source_package_ids: string[]
          p_user_id: string
          p_variance_reason?: Database["public"]["Enums"]["variance_reason"]
        }
        Returns: Json
      }
      fn_generate_audit_number: { Args: never; Returns: string }
      fn_generate_plant_id: { Args: never; Returns: string }
      fn_generate_recurring_bills: { Args: never; Returns: number }
      fn_lifecycle_state_order: { Args: { state: string }; Returns: number }
      fn_lock_inventory_stages: {
        Args: { p_audit_id: string; p_stages: string[] }
        Returns: boolean
      }
      fn_rebalance_inventory_weight: {
        Args: {
          p_dest_item_id: string
          p_notes?: string
          p_reason_code?: string
          p_source_item_id: string
          p_transfer_qty: number
          p_user_id: string
        }
        Returns: Json
      }
      fn_reclassify_inventory_item: {
        Args: {
          p_item_id: string
          p_new_category: string
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
      fn_unlock_inventory_stages: {
        Args: { p_audit_id: string }
        Returns: boolean
      }
      fn_update_overdue_invoices: { Args: never; Returns: number }
      fn_validate_batch_lifecycle_transition: {
        Args: { p_batch_id: string; p_from_state: string; p_to_state: string }
        Returns: boolean
      }
      fn_validate_batch_not_quarantined: {
        Args: { p_batch_id: string; p_operation?: string }
        Returns: boolean
      }
      generate_consolidated_package_id: {
        Args: { p_package_date: string; p_strain_abbreviation: string }
        Returns: string
      }
      generate_coversheet_token: { Args: never; Returns: string }
      generate_daily_tasks: {
        Args: { target_date?: string }
        Returns: {
          priority: string
          room_code: string
          source: string
          task_id: string
          task_type: string
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_manifest_number: { Args: never; Returns: string }
      generate_next_package_id: {
        Args: { p_batch_id: string }
        Returns: string
      }
      generate_order_public_token: { Args: never; Returns: string }
      get_active_bucking_sessions: {
        Args: never
        Returns: {
          batch_id: string
          binned_package_id: string
          binned_weight_grams: number
          bucker_name: string
          elapsed_minutes: number
          id: string
          session_date: string
          started_at: string
          strain: string
        }[]
      }
      get_active_products: {
        Args: never
        Returns: {
          allows_fractional_quantity: boolean | null
          archive_reason: string | null
          archived_at: string | null
          available_quantity: number | null
          created_at: string | null
          generated_at: string | null
          generation_batch_id: string | null
          gross_weight: number | null
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          net_weight: number | null
          notes: string | null
          packaging_time_minutes: number | null
          price_per_unit: number | null
          pricing_unit: string | null
          product_category: string | null
          replaced_by_product_id: string | null
          sku: string | null
          stage_id: string | null
          strain: string | null
          strain_id: string | null
          trim_time_minutes: number | null
          type: string
          type_id: string | null
          unit: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_aggregation_details: {
        Args: {
          p_batch_id: string
          p_product_name?: string
          p_session_type?: string
        }
        Returns: Json
      }
      get_all_user_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }[]
      }
      get_batch_available_stages: {
        Args: { p_batch_id: string }
        Returns: string[]
      }
      get_batch_coa_data: {
        Args: { p_batch_number: string }
        Returns: {
          batch_number: string
          cbd_percentage: number
          coa_pdf_path: string
          coa_status: string
          harvest_date: string
          strain: string
          thc_percentage: number
          total_cannabinoids: number
          total_terpenes: number
        }[]
      }
      get_batch_strain_summary: {
        Args: never
        Returns: {
          batch_count: number
          stages_present: string[]
          strain_name: string
          total_weight_grams: number
        }[]
      }
      get_batches_for_strain: {
        Args: { p_strain: string }
        Returns: {
          batch_id: string
          batch_number: string
          bucked_available_grams: number
          bulk_flower_available_grams: number
          bulk_smalls_available_grams: number
          bulk_trim_available_grams: number
          coa_id: string
          harvest_date: string
          has_bucked: boolean
          has_bulk_flower: boolean
          has_bulk_smalls: boolean
          has_bulk_trim: boolean
          has_packaged: boolean
          packaged_available_grams: number
          status: string
          strain: string
          total_available_grams: number
        }[]
      }
      get_bucking_remaining_weight: {
        Args: { session_id: string }
        Returns: number
      }
      get_bucking_session_stats: {
        Args: { p_date?: string }
        Returns: {
          active_sessions: number
          avg_kg_per_hour: number
          completed_today: number
          total_flower_grams: number
          total_kg_processed: number
          total_smalls_grams: number
          total_waste_grams: number
        }[]
      }
      get_canonical_products_for_strain: {
        Args: { p_strain_id: string }
        Returns: {
          is_available: boolean
          product_id: string
          product_name: string
          product_type: string
        }[]
      }
      get_conversion_lot_summary: {
        Args: { p_date?: string }
        Returns: {
          batch_id: string
          batch_name: string
          has_packages: boolean
          package_count: number
          pending_review_count: number
          session_count: number
          session_date: string
          session_type: string
          status: string
          strain_code: string
          strain_id: string
          strain_name: string
          total_units: number
          total_weight: number
        }[]
      }
      get_coversheet_customer_info: {
        Args: { p_order_id: string }
        Returns: {
          customer_name: string
          license_number: string
        }[]
      }
      get_financial_summary: { Args: never; Returns: Json }
      get_inventory_discrepancies: {
        Args: { p_limit?: number; p_min_discrepancy?: number }
        Returns: {
          abs_discrepancy: number
          batch_id: string
          current_qty: number
          discrepancy: number
          item_id: string
          last_movement_at: string
          ledger_qty: number
          movement_count: number
          package_id: string
          product_name: string
          product_stage_id: string
          strain: string
        }[]
      }
      get_item_movement_history: {
        Args: { p_item_id: string; p_limit?: number }
        Returns: {
          created_at: string
          created_by: string
          movement_id: string
          movement_kind: string
          notes: string
          qty: number
          reason_code: string
          reference_id: string
          reference_type: string
          running_total: number
          unit: string
        }[]
      }
      get_movement_metrics: {
        Args: { p_hours?: number }
        Returns: {
          avg_qty: number
          error_count: number
          movement_count: number
          success_rate: number
          time_bucket: string
        }[]
      }
      get_next_package_sequence: {
        Args: { p_package_date: string; p_strain_abbreviation: string }
        Returns: number
      }
      get_or_create_batch_from_inventory: {
        Args: { p_batch_number: string; p_room?: string; p_strain_name: string }
        Returns: string
      }
      get_or_create_strain: {
        Args: { p_category?: string; p_strain_name: string }
        Returns: string
      }
      get_order_data_health: {
        Args: never
        Returns: {
          health_status: string
          orders_with_items: number
          orders_with_mismatched_totals: number
          orders_without_items: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_package_date_from_conversion: {
        Args: { p_pending_conversion_id: string }
        Returns: string
      }
      get_packaging_remaining_weight: {
        Args: { session_id: string }
        Returns: number
      }
      get_pending_conversions: {
        Args: { p_date?: string }
        Returns: {
          batch_id: string
          batch_name: string
          completed_at: string
          has_pending_packages: boolean
          output_units: number
          output_weight: number
          pending_package_count: number
          session_date: string
          session_id: string
          session_type: string
          strain_code: string
          strain_id: string
          strain_name: string
        }[]
      }
      get_product_coverage_report: {
        Args: never
        Returns: {
          coverage_percentage: number
          existing_products: number
          missing_products: number
          strain_name: string
          total_applicable_products: number
        }[]
      }
      get_product_id_by_strain_stage_and_type: {
        Args: {
          p_batch_id: string
          p_is_smalls?: boolean
          p_stage_name: string
        }
        Returns: string
      }
      get_projected_inventory: { Args: { batch_prefix: string }; Returns: Json }
      get_recent_movement_errors: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          error_code: string
          error_context: Json
          error_message: string
          id: string
          movement_data: Json
          resolved_at: string
        }[]
      }
      get_strain_abbreviation: {
        Args: { p_strain_name: string }
        Returns: string
      }
      get_trigger_performance_summary: {
        Args: never
        Returns: {
          metric: string
          status: string
          unit: string
          value: number
        }[]
      }
      get_trim_remaining_weight: {
        Args: { session_id: string }
        Returns: number
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_product_orderable: { Args: { p_product_id: string }; Returns: boolean }
      is_test_mode_enabled: { Args: never; Returns: boolean }
      log_test_mode_bypass: {
        Args: {
          p_action: string
          p_context?: Json
          p_validation_bypassed: string
        }
        Returns: string
      }
      normalize_strain_name: {
        Args: { p_strain_name: string }
        Returns: string
      }
      record_session_loss_weight: {
        Args: {
          p_loss_grams: number
          p_session_id: string
          p_session_type: string
        }
        Returns: Json
      }
      repair_order_totals: {
        Args: never
        Returns: {
          message: string
          repaired_count: number
        }[]
      }
      resolve_movement_error: {
        Args: { p_error_id: string }
        Returns: undefined
      }
      rollback_to_direct_updates: { Args: never; Returns: string }
      set_inventory_review_status: {
        Args: { p_item_id: string; p_user_id?: string; p_verified: boolean }
        Returns: Json
      }
      simulate_movement_scenario: {
        Args: { scenario_name: string }
        Returns: {
          action: string
          result: string
          step: string
        }[]
      }
      submit_chat_feedback: {
        Args: { p_message_id: string; p_score: number }
        Returns: undefined
      }
      sync_batch_stage_tracking: { Args: never; Returns: undefined }
      sync_batches_from_inventory: {
        Args: never
        Returns: {
          batches_created: number
          batches_found: number
          batches_updated: number
          stage_records_created: number
        }[]
      }
      sync_order_item_strains: {
        Args: never
        Returns: {
          order_items_updated: number
        }[]
      }
      sync_product_strain_ids: {
        Args: never
        Returns: {
          products_updated: number
        }[]
      }
      sync_products_for_all_strains: {
        Args: never
        Returns: {
          strains_processed: string[]
          total_products_created: number
          total_strains_processed: number
        }[]
      }
      sync_products_for_strain: {
        Args: { p_is_active?: boolean; p_strain_id: string }
        Returns: {
          products_created: number
          strain_name: string
        }[]
      }
      test_movement_trigger: {
        Args: never
        Returns: {
          actual_qty: number
          expected_qty: number
          passed: boolean
          status: string
          test_name: string
        }[]
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      update_allocation_workflow_stage: {
        Args: {
          allocation_id: string
          new_stage: Database["public"]["Enums"]["allocation_workflow_stage"]
        }
        Returns: undefined
      }
      update_batch_tracking_from_inventory: {
        Args: never
        Returns: {
          stage_records_updated: number
        }[]
      }
      update_user_profile: {
        Args: {
          new_full_name?: string
          new_is_active?: boolean
          new_role?: string
          target_user_id: string
        }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_batch_strain_match: {
        Args: { p_batch_id: string; p_strain: string }
        Returns: boolean
      }
      validate_canonical_product_catalog: {
        Args: never
        Returns: {
          canonical_type: string
          is_archived: boolean
          product_exists: boolean
          product_id: string
          strain_name: string
        }[]
      }
      validate_label_coa_requirement: {
        Args: { p_batch_number: string; p_label_type_code: string }
        Returns: {
          can_generate: boolean
          has_coa: boolean
          message: string
          requires_coa: boolean
        }[]
      }
      validate_order_totals: {
        Args: never
        Returns: {
          calculated_total: number
          difference: number
          order_id: string
          order_number: string
          stored_total: number
        }[]
      }
      validate_ready_for_delivery: {
        Args: { order_id_param: string }
        Returns: boolean
      }
      validate_strain_names: {
        Args: { p_strain_names: string[] }
        Returns: {
          abbreviation: string
          exists_in_db: boolean
          match_quality: string
          matched_name: string
          needs_attention: boolean
          strain_name: string
        }[]
      }
      verify_all_inventory: {
        Args: never
        Returns: {
          items_verified: number
          items_with_discrepancies: number
          max_discrepancy: number
          total_discrepancy: number
          total_items: number
        }[]
      }
      void_session_aggregated: {
        Args: {
          p_batch_id: string
          p_product_name?: string
          p_reason?: string
          p_session_type?: string
        }
        Returns: Json
      }
    }
    Enums: {
      allocation_workflow_stage:
        | "allocated"
        | "in_trimming"
        | "trimmed"
        | "in_packaging"
        | "packaged"
        | "labeled"
        | "coa_attached"
        | "ready_for_delivery"
      audit_status: "initiated" | "in_progress" | "completed" | "cancelled"
      finalization_status: "pending" | "finalized" | "voided"
      order_item_status:
        | "trimming"
        | "packaging"
        | "labeling"
        | "pending_coa"
        | "ready_for_delivery"
      variance_reason:
        | "moisture_loss"
        | "spillage"
        | "measurement_error"
        | "waste"
        | "theft_loss"
        | "other"
      variance_source:
        | "audit_reconciliation"
        | "session_conversion"
        | "manual_adjustment"
        | "combine_packages"
        | "weight_rebalance"
        | "reclassify"
    }
    CompositeTypes: {
      dblink_pkey_results: {
        position: number | null
        colname: string | null
      }
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      allocation_workflow_stage: [
        "allocated",
        "in_trimming",
        "trimmed",
        "in_packaging",
        "packaged",
        "labeled",
        "coa_attached",
        "ready_for_delivery",
      ],
      audit_status: ["initiated", "in_progress", "completed", "cancelled"],
      finalization_status: ["pending", "finalized", "voided"],
      order_item_status: [
        "trimming",
        "packaging",
        "labeling",
        "pending_coa",
        "ready_for_delivery",
      ],
      variance_reason: [
        "moisture_loss",
        "spillage",
        "measurement_error",
        "waste",
        "theft_loss",
        "other",
      ],
      variance_source: [
        "audit_reconciliation",
        "session_conversion",
        "manual_adjustment",
        "combine_packages",
        "weight_rebalance",
        "reclassify",
      ],
    },
  },
} as const

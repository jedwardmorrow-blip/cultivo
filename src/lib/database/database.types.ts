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
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          setting_type: string
          description: string | null
          category: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          setting_type?: string
          description?: string | null
          category?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          setting_type?: string
          description?: string | null
          category?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_allocations: {
        Row: {
          id: string
          batch_id: string
          order_item_id: string
          allocation_stage: string
          allocated_weight_grams: number
          projected_final_weight_grams: number | null
          status: string | null
          allocated_at: string | null
          fulfilled_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          order_item_id: string
          allocation_stage: string
          allocated_weight_grams: number
          projected_final_weight_grams?: number | null
          status?: string | null
          allocated_at?: string | null
          fulfilled_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          order_item_id?: string
          allocation_stage?: string
          allocated_weight_grams?: number
          projected_final_weight_grams?: number | null
          status?: string | null
          allocated_at?: string | null
          fulfilled_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_id_backfill_log: {
        Row: {
          id: string
          inventory_item_id: string
          old_batch_id: string | null
          new_batch_id: string | null
          backfill_method: string | null
          batch_text: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          inventory_item_id: string
          old_batch_id?: string | null
          new_batch_id?: string | null
          backfill_method?: string | null
          batch_text?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          inventory_item_id?: string
          old_batch_id?: string | null
          new_batch_id?: string | null
          backfill_method?: string | null
          batch_text?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      batch_lifecycle_events: {
        Row: {
          id: string
          batch_id: string
          event_type: string
          from_state: string | null
          to_state: string | null
          triggered_by: string | null
          trigger_source: string | null
          metadata: Json | null
          notes: string | null
          event_timestamp: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          event_type: string
          from_state?: string | null
          to_state?: string | null
          triggered_by?: string | null
          trigger_source?: string | null
          metadata?: Json | null
          notes?: string | null
          event_timestamp?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          event_type?: string
          from_state?: string | null
          to_state?: string | null
          triggered_by?: string | null
          trigger_source?: string | null
          metadata?: Json | null
          notes?: string | null
          event_timestamp?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_package_lineage: {
        Row: {
          id: string
          batch_id: string
          package_id: string
          package_type: string
          stage: string
          weight_grams: number | null
          created_from_session_id: string | null
          created_from_session_type: string | null
          is_current: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          package_id: string
          package_type: string
          stage: string
          weight_grams?: number | null
          created_from_session_id?: string | null
          created_from_session_type?: string | null
          is_current?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          package_id?: string
          package_type?: string
          stage?: string
          weight_grams?: number | null
          created_from_session_id?: string | null
          created_from_session_type?: string | null
          is_current?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_production_history: {
        Row: {
          id: string
          batch_id: string
          event_type: string
          session_id: string | null
          session_type: string | null
          source_stage: string | null
          source_weight_grams: number | null
          destination_stage: string | null
          destination_weight_grams: number | null
          source_package_id: string | null
          destination_package_ids: string[] | null
          performed_by: string | null
          notes: string | null
          event_timestamp: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          event_type: string
          session_id?: string | null
          session_type?: string | null
          source_stage?: string | null
          source_weight_grams?: number | null
          destination_stage?: string | null
          destination_weight_grams?: number | null
          source_package_id?: string | null
          destination_package_ids?: string[] | null
          performed_by?: string | null
          notes?: string | null
          event_timestamp?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          event_type?: string
          session_id?: string | null
          session_type?: string | null
          source_stage?: string | null
          source_weight_grams?: number | null
          destination_stage?: string | null
          destination_weight_grams?: number | null
          source_package_id?: string | null
          destination_package_ids?: string[] | null
          performed_by?: string | null
          notes?: string | null
          event_timestamp?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_projections: {
        Row: {
          id: string
          batch_id: string
          source_stage: string
          source_weight_grams: number
          target_stage: string
          projected_weight_grams: number
          projection_date: string | null
          actual_weight_grams: number | null
          variance_percentage: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          source_stage: string
          source_weight_grams: number
          target_stage: string
          projected_weight_grams: number
          projection_date?: string | null
          actual_weight_grams?: number | null
          variance_percentage?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          source_stage?: string
          source_weight_grams?: number
          target_stage?: string
          projected_weight_grams?: number
          projection_date?: string | null
          actual_weight_grams?: number | null
          variance_percentage?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_projections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_registry: {
        Row: {
          id: string
          batch_number: string
          strain: string
          harvest_date: string | null
          room: string | null
          initial_weight_grams: number | null
          coa_id: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          lifecycle_state: string | null
          bucking_started_at: string | null
          trimming_started_at: string | null
          packaging_started_at: string | null
          completed_at: string | null
          depleted_at: string | null
          is_quarantined: boolean | null
          quarantine_reason: string | null
          quarantined_at: string | null
          strain_id: string | null
        }
        Insert: {
          id?: string
          batch_number: string
          strain: string
          harvest_date?: string | null
          room?: string | null
          initial_weight_grams?: number | null
          coa_id?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          lifecycle_state?: string | null
          bucking_started_at?: string | null
          trimming_started_at?: string | null
          packaging_started_at?: string | null
          completed_at?: string | null
          depleted_at?: string | null
          is_quarantined?: boolean | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          strain_id?: string | null
        }
        Update: {
          id?: string
          batch_number?: string
          strain?: string
          harvest_date?: string | null
          room?: string | null
          initial_weight_grams?: number | null
          coa_id?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          lifecycle_state?: string | null
          bucking_started_at?: string | null
          trimming_started_at?: string | null
          packaging_started_at?: string | null
          completed_at?: string | null
          depleted_at?: string | null
          is_quarantined?: boolean | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          strain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "certificates_of_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_stage_tracking: {
        Row: {
          id: string
          batch_id: string
          stage: string
          weight_grams: number
          allocated_weight_grams: number
          available_weight_grams: number | null
          location: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          stage: string
          weight_grams?: number
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          stage?: string
          weight_grams?: number
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      bucked_inventory: {
        Row: {
          id: string
          strain: string
          batch_id: string
          package_id: string
          room: string | null
          harvest_date: string | null
          initial_weight_grams: number
          current_weight_grams: number
          location: string | null
          status: string
          notes: string | null
          created_at: string | null
          updated_at: string | null
          batch_number: string | null
        }
        Insert: {
          id?: string
          strain: string
          batch_id: string
          package_id: string
          room?: string | null
          harvest_date?: string | null
          initial_weight_grams: number
          current_weight_grams: number
          location?: string | null
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          batch_number?: string | null
        }
        Update: {
          id?: string
          strain?: string
          batch_id?: string
          package_id?: string
          room?: string | null
          harvest_date?: string | null
          initial_weight_grams?: number
          current_weight_grams?: number
          location?: string | null
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          batch_number?: string | null
        }
        Relationships: []
      }
      bucking_sessions: {
        Row: {
          id: string
          session_date: string
          bucker_name: string
          session_status: string
          binned_package_id: string
          binned_weight_grams: number
          strain: string
          batch_id: string
          bucked_flower_grams: number | null
          bucked_smalls_grams: number | null
          waste_grams: number | null
          variance_grams: number | null
          started_at: string | null
          completed_at: string | null
          minutes_bucked: number | null
          kg_per_hour: number | null
          notes: string | null
          recorded_in_dutchie: boolean | null
          created_at: string | null
          updated_at: string | null
          cancelled_at: string | null
          batch_registry_id: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_by: string | null
          void_reason: string | null
          output_product_flower_name: string | null
          output_product_smalls_name: string | null
          finalization_status_bucked: Database["public"]["Enums"]["finalization_status"]
          finalized_at_bucked: string | null
          finalized_by_bucked: string | null
          void_reason_bucked: string | null
          finalization_status_smalls: Database["public"]["Enums"]["finalization_status"]
          finalized_at_smalls: string | null
          finalized_by_smalls: string | null
          void_reason_smalls: string | null
        }
        Insert: {
          id?: string
          session_date?: string
          bucker_name: string
          session_status?: string
          binned_package_id: string
          binned_weight_grams: number
          strain: string
          batch_id: string
          bucked_flower_grams?: number | null
          bucked_smalls_grams?: number | null
          waste_grams?: number | null
          variance_grams?: number | null
          started_at?: string | null
          completed_at?: string | null
          minutes_bucked?: number | null
          kg_per_hour?: number | null
          notes?: string | null
          recorded_in_dutchie?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          cancelled_at?: string | null
          batch_registry_id?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          void_reason?: string | null
          output_product_flower_name?: string | null
          output_product_smalls_name?: string | null
          finalization_status_bucked?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_bucked?: string | null
          finalized_by_bucked?: string | null
          void_reason_bucked?: string | null
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_smalls?: string | null
          finalized_by_smalls?: string | null
          void_reason_smalls?: string | null
        }
        Update: {
          id?: string
          session_date?: string
          bucker_name?: string
          session_status?: string
          binned_package_id?: string
          binned_weight_grams?: number
          strain?: string
          batch_id?: string
          bucked_flower_grams?: number | null
          bucked_smalls_grams?: number | null
          waste_grams?: number | null
          variance_grams?: number | null
          started_at?: string | null
          completed_at?: string | null
          minutes_bucked?: number | null
          kg_per_hour?: number | null
          notes?: string | null
          recorded_in_dutchie?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          cancelled_at?: string | null
          batch_registry_id?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          void_reason?: string | null
          output_product_flower_name?: string | null
          output_product_smalls_name?: string | null
          finalization_status_bucked?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_bucked?: string | null
          finalized_by_bucked?: string | null
          void_reason_bucked?: string | null
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_smalls?: string | null
          finalized_by_smalls?: string | null
          void_reason_smalls?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bucking_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_inventory: {
        Row: {
          id: string
          strain: string
          batch_id: string
          product_type: string
          weight_grams: number
          location: string | null
          status: string
          quality_grade: string | null
          trim_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          batch_number: string | null
        }
        Insert: {
          id?: string
          strain: string
          batch_id: string
          product_type: string
          weight_grams?: number
          location?: string | null
          status?: string
          quality_grade?: string | null
          trim_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          batch_number?: string | null
        }
        Update: {
          id?: string
          strain?: string
          batch_id?: string
          product_type?: string
          weight_grams?: number
          location?: string | null
          status?: string
          quality_grade?: string | null
          trim_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          batch_number?: string | null
        }
        Relationships: []
      }
      certificates_of_analysis: {
        Row: {
          id: string
          strain_name: string
          batch_number: string
          harvest_date: string | null
          manufacture_date: string | null
          sample_date: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          total_cannabinoids_percentage: number | null
          total_terpenes_mg_g: number | null
          terpene_1_name: string | null
          terpene_1_value: number | null
          terpene_1_percentage: number | null
          terpene_2_name: string | null
          terpene_2_value: number | null
          terpene_2_percentage: number | null
          terpene_3_name: string | null
          terpene_3_value: number | null
          terpene_3_percentage: number | null
          pdf_file_path: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          batch_id: string | null
        }
        Insert: {
          id?: string
          strain_name: string
          batch_number: string
          harvest_date?: string | null
          manufacture_date?: string | null
          sample_date?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          total_cannabinoids_percentage?: number | null
          total_terpenes_mg_g?: number | null
          terpene_1_name?: string | null
          terpene_1_value?: number | null
          terpene_1_percentage?: number | null
          terpene_2_name?: string | null
          terpene_2_value?: number | null
          terpene_2_percentage?: number | null
          terpene_3_name?: string | null
          terpene_3_value?: number | null
          terpene_3_percentage?: number | null
          pdf_file_path?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          batch_id?: string | null
        }
        Update: {
          id?: string
          strain_name?: string
          batch_number?: string
          harvest_date?: string | null
          manufacture_date?: string | null
          sample_date?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          total_cannabinoids_percentage?: number | null
          total_terpenes_mg_g?: number | null
          terpene_1_name?: string | null
          terpene_1_value?: number | null
          terpene_1_percentage?: number | null
          terpene_2_name?: string | null
          terpene_2_value?: number | null
          terpene_2_percentage?: number | null
          terpene_3_name?: string | null
          terpene_3_value?: number | null
          terpene_3_percentage?: number | null
          pdf_file_path?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_documents: {
        Row: {
          id: string
          coa_number: string
          batch_id: string
          strain: string
          test_date: string
          lab_name: string
          lab_license: string | null
          file_url: string
          file_type: string | null
          file_size_kb: number | null
          thc_percentage: number | null
          thca_percentage: number | null
          cbd_percentage: number | null
          cbda_percentage: number | null
          total_cannabinoids: number | null
          terpene_profile: Json | null
          microbial_status: string | null
          heavy_metals_status: string | null
          pesticides_status: string | null
          pass_fail: string | null
          is_public: boolean | null
          tags: string[] | null
          notes: string | null
          uploaded_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          coa_number: string
          batch_id: string
          strain: string
          test_date: string
          lab_name: string
          lab_license?: string | null
          file_url: string
          file_type?: string | null
          file_size_kb?: number | null
          thc_percentage?: number | null
          thca_percentage?: number | null
          cbd_percentage?: number | null
          cbda_percentage?: number | null
          total_cannabinoids?: number | null
          terpene_profile?: Json | null
          microbial_status?: string | null
          heavy_metals_status?: string | null
          pesticides_status?: string | null
          pass_fail?: string | null
          is_public?: boolean | null
          tags?: string[] | null
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          coa_number?: string
          batch_id?: string
          strain?: string
          test_date?: string
          lab_name?: string
          lab_license?: string | null
          file_url?: string
          file_type?: string | null
          file_size_kb?: number | null
          thc_percentage?: number | null
          thca_percentage?: number | null
          cbd_percentage?: number | null
          cbda_percentage?: number | null
          total_cannabinoids?: number | null
          terpene_profile?: Json | null
          microbial_status?: string | null
          heavy_metals_status?: string | null
          pesticides_status?: string | null
          pass_fail?: string | null
          is_public?: boolean | null
          tags?: string[] | null
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consolidated_package_sources: {
        Row: {
          id: string
          consolidated_package_id: string
          session_id: string
          session_type: string
          session_date: string
          contribution_weight_grams: number | null
          contribution_units: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          consolidated_package_id: string
          session_id: string
          session_type: string
          session_date: string
          contribution_weight_grams?: number | null
          contribution_units?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          consolidated_package_id?: string
          session_id?: string
          session_type?: string
          session_date?: string
          contribution_weight_grams?: number | null
          contribution_units?: number | null
          created_at?: string | null
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
          id: string
          package_id: string
          package_date: string
          strain: string
          strain_abbreviation: string
          product_stage: string
          product_type: string
          total_weight_grams: number | null
          total_units: number | null
          room: string | null
          session_type: string
          session_count: number | null
          source_session_ids: string[] | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          package_date?: string
          strain: string
          strain_abbreviation: string
          product_stage: string
          product_type: string
          total_weight_grams?: number | null
          total_units?: number | null
          room?: string | null
          session_type: string
          session_count?: number | null
          source_session_ids?: string[] | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          package_date?: string
          strain?: string
          strain_abbreviation?: string
          product_stage?: string
          product_type?: string
          total_weight_grams?: number | null
          total_units?: number | null
          room?: string | null
          session_type?: string
          session_count?: number | null
          source_session_ids?: string[] | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversion_analytics: {
        Row: {
          id: string
          analysis_date: string
          strain: string
          from_stage: string
          to_stage: string
          sample_size: number
          actual_percentage: number
          expected_percentage: number | null
          variance_percentage: number | null
          total_input_grams: number | null
          total_output_grams: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          analysis_date?: string
          strain: string
          from_stage: string
          to_stage: string
          sample_size?: number
          actual_percentage: number
          expected_percentage?: number | null
          variance_percentage?: number | null
          total_input_grams?: number | null
          total_output_grams?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          analysis_date?: string
          strain?: string
          from_stage?: string
          to_stage?: string
          sample_size?: number
          actual_percentage?: number
          expected_percentage?: number | null
          variance_percentage?: number | null
          total_input_grams?: number | null
          total_output_grams?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      conversion_packages: {
        Row: {
          id: string
          conversion_lot_id: string | null
          batch_id: string
          product_id: string | null
          package_id: string
          weight: number | null
          units: number | null
          inventory_stage_id: string | null
          source_session_ids: Json
          created_at: string
          created_by: string
          packaged_at: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_by: string | null
          aggregation_id: string | null
        }
        Insert: {
          id?: string
          conversion_lot_id?: string | null
          batch_id: string
          product_id?: string | null
          package_id: string
          weight?: number | null
          units?: number | null
          inventory_stage_id?: string | null
          source_session_ids?: Json
          created_at?: string
          created_by: string
          packaged_at?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          aggregation_id?: string | null
        }
        Update: {
          id?: string
          conversion_lot_id?: string | null
          batch_id?: string
          product_id?: string | null
          package_id?: string
          weight?: number | null
          units?: number | null
          inventory_stage_id?: string | null
          source_session_ids?: Json
          created_at?: string
          created_by?: string
          packaged_at?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          aggregation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_packages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_rates: {
        Row: {
          id: string
          from_stage: string
          to_stage: string
          strain: string | null
          rate_percentage: number | null
          split_percentage: number | null
          effective_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          from_stage: string
          to_stage: string
          strain?: string | null
          rate_percentage?: number | null
          split_percentage?: number | null
          effective_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          from_stage?: string
          to_stage?: string
          strain?: string | null
          rate_percentage?: number | null
          split_percentage?: number | null
          effective_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversion_variance_log: {
        Row: {
          id: string
          conversion_lot_id: string | null
          batch_id: string
          product_id: string | null
          expected_weight: number | null
          actual_weight: number | null
          weight_variance: number | null
          expected_units: number | null
          actual_units: number | null
          unit_variance: number | null
          variance_reason: Database["public"]["Enums"]["variance_reason"]
          variance_note: string | null
          acknowledged: boolean
          acknowledged_by: string
          acknowledged_at: string
        }
        Insert: {
          id?: string
          conversion_lot_id?: string | null
          batch_id: string
          product_id?: string | null
          expected_weight?: number | null
          actual_weight?: number | null
          weight_variance?: number | null
          expected_units?: number | null
          actual_units?: number | null
          unit_variance?: number | null
          variance_reason: Database["public"]["Enums"]["variance_reason"]
          variance_note?: string | null
          acknowledged?: boolean
          acknowledged_by: string
          acknowledged_at?: string
        }
        Update: {
          id?: string
          conversion_lot_id?: string | null
          batch_id?: string
          product_id?: string | null
          expected_weight?: number | null
          actual_weight?: number | null
          weight_variance?: number | null
          expected_units?: number | null
          actual_units?: number | null
          unit_variance?: number | null
          variance_reason?: Database["public"]["Enums"]["variance_reason"]
          variance_note?: string | null
          acknowledged?: boolean
          acknowledged_by?: string
          acknowledged_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_variance_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_variance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coversheets: {
        Row: {
          id: string
          coversheet_number: string
          order_id: string | null
          access_token: string
          qr_code_data: string
          qr_code_url: string | null
          customer_name: string
          delivery_date: string | null
          total_packages: number | null
          total_weight_grams: number | null
          items_summary: Json
          is_active: boolean | null
          accessed_count: number | null
          last_accessed_at: string | null
          created_at: string | null
          compliance_header: Json | null
          manufacture_date: string | null
          is_outdated: boolean | null
          last_order_update: string | null
          batch_compliance_data: Json | null
          distributed_to_data: Json | null
          package_manifest_data: Json | null
        }
        Insert: {
          id?: string
          coversheet_number: string
          order_id?: string | null
          access_token: string
          qr_code_data: string
          qr_code_url?: string | null
          customer_name: string
          delivery_date?: string | null
          total_packages?: number | null
          total_weight_grams?: number | null
          items_summary?: Json
          is_active?: boolean | null
          accessed_count?: number | null
          last_accessed_at?: string | null
          created_at?: string | null
          compliance_header?: Json | null
          manufacture_date?: string | null
          is_outdated?: boolean | null
          last_order_update?: string | null
          batch_compliance_data?: Json | null
          distributed_to_data?: Json | null
          package_manifest_data?: Json | null
        }
        Update: {
          id?: string
          coversheet_number?: string
          order_id?: string | null
          access_token?: string
          qr_code_data?: string
          qr_code_url?: string | null
          customer_name?: string
          delivery_date?: string | null
          total_packages?: number | null
          total_weight_grams?: number | null
          items_summary?: Json
          is_active?: boolean | null
          accessed_count?: number | null
          last_accessed_at?: string | null
          created_at?: string | null
          compliance_header?: Json | null
          manufacture_date?: string | null
          is_outdated?: boolean | null
          last_order_update?: string | null
          batch_compliance_data?: Json | null
          distributed_to_data?: Json | null
          package_manifest_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          ato_number: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          dispensary_code: string
          license_number: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_state: string | null
          delivery_postal_code: string | null
          license_name: string | null
          account_credit_balance: number | null
          latitude: number | null
          longitude: number | null
          geocoded_at: string | null
          geocoding_error: string | null
          formatted_address: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          ato_number?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          dispensary_code: string
          license_number?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          delivery_postal_code?: string | null
          license_name?: string | null
          account_credit_balance?: number | null
          latitude?: number | null
          longitude?: number | null
          geocoded_at?: string | null
          geocoding_error?: string | null
          formatted_address?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          ato_number?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          dispensary_code?: string
          license_number?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          delivery_postal_code?: string | null
          license_name?: string | null
          account_credit_balance?: number | null
          latitude?: number | null
          longitude?: number | null
          geocoded_at?: string | null
          geocoding_error?: string | null
          formatted_address?: string | null
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          fa_number: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          fa_number: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          fa_number?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          id: string
          origin_customer_id: string | null
          destination_customer_id: string
          route_geometry: Json | null
          summary: Json | null
          distance_meters: number
          duration_seconds: number
          last_calculated_at: string | null
          created_at: string | null
          updated_at: string | null
          origin_location_id: string | null
        }
        Insert: {
          id?: string
          origin_customer_id?: string | null
          destination_customer_id: string
          route_geometry?: Json | null
          summary?: Json | null
          distance_meters: number
          duration_seconds: number
          last_calculated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          origin_location_id?: string | null
        }
        Update: {
          id?: string
          origin_customer_id?: string | null
          destination_customer_id?: string
          route_geometry?: Json | null
          summary?: Json | null
          distance_meters?: number
          duration_seconds?: number
          last_calculated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          origin_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_destination_customer_id_fkey"
            columns: ["destination_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_origin_customer_id_fkey"
            columns: ["origin_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_schedule: {
        Row: {
          id: string
          order_id: string
          scheduled_date: string
          scheduled_time_window: string | null
          driver_name: string | null
          route_number: string | null
          status: string
          actual_delivery_time: string | null
          signature: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          scheduled_date: string
          scheduled_time_window?: string | null
          driver_name?: string | null
          route_number?: string | null
          status?: string
          actual_delivery_time?: string | null
          signature?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          scheduled_date?: string
          scheduled_time_window?: string | null
          driver_name?: string | null
          route_number?: string | null
          status?: string
          actual_delivery_time?: string | null
          signature?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_vehicles: {
        Row: {
          id: string
          make: string
          model: string
          year: number
          license_plate: string
          vin: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          make: string
          model: string
          year: number
          license_plate: string
          vin: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          make?: string
          model?: string
          year?: number
          license_plate?: string
          vin?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      draft_orders: {
        Row: {
          id: string
          customer_id: string | null
          priority: string | null
          requested_delivery_date: string | null
          delivery_notes: string | null
          internal_notes: string | null
          order_items: Json | null
          session_id: string | null
          created_at: string | null
          updated_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          priority?: string | null
          requested_delivery_date?: string | null
          delivery_notes?: string | null
          internal_notes?: string | null
          order_items?: Json | null
          session_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          priority?: string | null
          requested_delivery_date?: string | null
          delivery_notes?: string | null
          internal_notes?: string | null
          order_items?: Json | null
          session_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_bucked_inventory: {
        Row: {
          package_id: string
          strain: string
          batch_id: string | null
          initial_weight_grams: number
          current_weight_grams: number
          allocated_weight_grams: number
          available_weight_grams: number | null
          last_session_date: string | null
          status: string | null
          room: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          synced_from_snapshot_id: string | null
          strain_id: string | null
        }
        Insert: {
          package_id: string
          strain: string
          batch_id?: string | null
          initial_weight_grams?: number
          current_weight_grams?: number
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          last_session_date?: string | null
          status?: string | null
          room?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          synced_from_snapshot_id?: string | null
          strain_id?: string | null
        }
        Update: {
          package_id?: string
          strain?: string
          batch_id?: string | null
          initial_weight_grams?: number
          current_weight_grams?: number
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          last_session_date?: string | null
          status?: string | null
          room?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          synced_from_snapshot_id?: string | null
          strain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_bucked_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
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
          id: string
          strain: string
          batch_id: string | null
          product_type: string
          weight_grams: number
          allocated_weight_grams: number
          available_weight_grams: number | null
          quality_grade: string | null
          trim_date: string | null
          source_package_id: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          strain_id: string | null
        }
        Insert: {
          id?: string
          strain: string
          batch_id?: string | null
          product_type: string
          weight_grams?: number
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          quality_grade?: string | null
          trim_date?: string | null
          source_package_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          strain_id?: string | null
        }
        Update: {
          id?: string
          strain?: string
          batch_id?: string | null
          product_type?: string
          weight_grams?: number
          allocated_weight_grams?: number
          available_weight_grams?: number | null
          quality_grade?: string | null
          trim_date?: string | null
          source_package_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          strain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_bulk_inventory_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_packaged_inventory: {
        Row: {
          id: string
          strain: string
          batch_id: string | null
          product_type: string
          unit_size: string
          units_count: number
          units_allocated: number
          units_available: number | null
          packaging_session_id: string | null
          package_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          strain: string
          batch_id?: string | null
          product_type: string
          unit_size: string
          units_count?: number
          units_allocated?: number
          units_available?: number | null
          packaging_session_id?: string | null
          package_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          strain?: string
          batch_id?: string | null
          product_type?: string
          unit_size?: string
          units_count?: number
          units_allocated?: number
          units_available?: number | null
          packaging_session_id?: string | null
          package_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_packaged_inventory_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_lines: {
        Row: {
          id: string
          audit_id: string
          inventory_item_id: string | null
          package_id: string
          product_name: string
          strain: string | null
          batch: string | null
          room: string | null
          stage: string
          expected_qty: number
          unit: string
          actual_qty: number | null
          variance_qty: number | null
          variance_percentage: number | null
          variance_reason: Database["public"]["Enums"]["variance_reason"] | null
          variance_notes: string | null
          confirmed: boolean | null
          confirmed_at: string | null
          line_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          audit_id: string
          inventory_item_id?: string | null
          package_id: string
          product_name: string
          strain?: string | null
          batch?: string | null
          room?: string | null
          stage: string
          expected_qty: number
          unit: string
          actual_qty?: number | null
          variance_qty?: number | null
          variance_percentage?: number | null
          variance_reason?: Database["public"]["Enums"]["variance_reason"] | null
          variance_notes?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          line_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          audit_id?: string
          inventory_item_id?: string | null
          package_id?: string
          product_name?: string
          strain?: string | null
          batch?: string | null
          room?: string | null
          stage?: string
          expected_qty?: number
          unit?: string
          actual_qty?: number | null
          variance_qty?: number | null
          variance_percentage?: number | null
          variance_reason?: Database["public"]["Enums"]["variance_reason"] | null
          variance_notes?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          line_order?: number | null
          created_at?: string | null
          updated_at?: string | null
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
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audits: {
        Row: {
          id: string
          audit_number: string
          status: Database["public"]["Enums"]["audit_status"]
          selected_stages: string[]
          notes: string | null
          total_packages: number | null
          packages_with_variance: number | null
          total_variance_amount: number | null
          is_locked: boolean | null
          initiated_by: string | null
          initiated_at: string | null
          completed_at: string | null
          completed_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          audit_number: string
          status?: Database["public"]["Enums"]["audit_status"]
          selected_stages: string[]
          notes?: string | null
          total_packages?: number | null
          packages_with_variance?: number | null
          total_variance_amount?: number | null
          is_locked?: boolean | null
          initiated_by?: string | null
          initiated_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          audit_number?: string
          status?: Database["public"]["Enums"]["audit_status"]
          selected_stages?: string[]
          notes?: string | null
          total_packages?: number | null
          packages_with_variance?: number | null
          total_variance_amount?: number | null
          is_locked?: boolean | null
          initiated_by?: string | null
          initiated_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_changes: {
        Row: {
          id: string
          package_id: string
          change_date: string | null
          change_type: string
          previous_value: string | null
          new_value: string | null
          previous_qty: number | null
          new_qty: number | null
          snapshot_id: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          change_date?: string | null
          change_type: string
          previous_value?: string | null
          new_value?: string | null
          previous_qty?: number | null
          new_qty?: number | null
          snapshot_id?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          change_date?: string | null
          change_type?: string
          previous_value?: string | null
          new_value?: string | null
          previous_qty?: number | null
          new_qty?: number | null
          snapshot_id?: string | null
          notes?: string | null
          created_at?: string | null
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
          id: string
          trim_session_id: string | null
          source_type: string
          source_id: string | null
          source_weight_grams: number
          destination_type: string
          destination_id: string | null
          destination_weight_grams: number
          conversion_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          trim_session_id?: string | null
          source_type: string
          source_id?: string | null
          source_weight_grams: number
          destination_type: string
          destination_id?: string | null
          destination_weight_grams: number
          conversion_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          trim_session_id?: string | null
          source_type?: string
          source_id?: string | null
          source_weight_grams?: number
          destination_type?: string
          destination_id?: string | null
          destination_weight_grams?: number
          conversion_date?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_conversions_trim_session_id_fkey"
            columns: ["trim_session_id"]
            isOneToOne: false
            referencedRelation: "trim_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_internal_labels: {
        Row: {
          id: string
          package_id: string
          label_data: Json
          printed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          label_data: Json
          printed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          label_data?: Json
          printed_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          package_id: string
          sku: string | null
          product_name: string | null
          batch: string | null
          strain: string | null
          status: string | null
          category: string | null
          tags: string | null
          vendor: string | null
          room: string | null
          available_qty: number | null
          net_weight: number | null
          unit: string | null
          quantity_with_allocated: number | null
          snapshot_id: string | null
          last_updated: string | null
          created_at: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          batch_number: string | null
          batch_id: string
          product_stage_id: string | null
          parent_item_id: string | null
          on_hand_qty: number | null
          package_date: string | null
          reserved_qty: number
          test_mode: boolean
          strain_id: string | null
          review_status: string | null
          reviewed_by: string | null
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          sku?: string | null
          product_name?: string | null
          batch?: string | null
          strain?: string | null
          status?: string | null
          category?: string | null
          tags?: string | null
          vendor?: string | null
          room?: string | null
          available_qty?: number | null
          net_weight?: number | null
          unit?: string | null
          quantity_with_allocated?: number | null
          snapshot_id?: string | null
          last_updated?: string | null
          created_at?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          batch_number?: string | null
          batch_id: string
          product_stage_id?: string | null
          parent_item_id?: string | null
          on_hand_qty?: number | null
          package_date?: string | null
          reserved_qty?: number
          test_mode?: boolean
          strain_id?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          sku?: string | null
          product_name?: string | null
          batch?: string | null
          strain?: string | null
          status?: string | null
          category?: string | null
          tags?: string | null
          vendor?: string | null
          room?: string | null
          available_qty?: number | null
          net_weight?: number | null
          unit?: string | null
          quantity_with_allocated?: number | null
          snapshot_id?: string | null
          last_updated?: string | null
          created_at?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          batch_number?: string | null
          batch_id?: string
          product_stage_id?: string | null
          parent_item_id?: string | null
          on_hand_qty?: number | null
          package_date?: string | null
          reserved_qty?: number
          test_mode?: boolean
          strain_id?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
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
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            isOneToOne: false
            referencedRelation: "product_stages"
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
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movement_errors: {
        Row: {
          id: string
          movement_data: Json | null
          error_message: string
          error_code: string | null
          error_context: Json | null
          created_at: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          movement_data?: Json | null
          error_message: string
          error_code?: string | null
          error_context?: Json | null
          created_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          movement_data?: Json | null
          error_message?: string
          error_code?: string | null
          error_context?: Json | null
          created_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          id: string
          movement_date: string | null
          session_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          movement_kind: string | null
          source_item_id: string | null
          dest_item_id: string | null
          qty: number | null
          unit: string | null
          reason_code: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          id?: string
          movement_date?: string | null
          session_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          movement_kind?: string | null
          source_item_id?: string | null
          dest_item_id?: string | null
          qty?: number | null
          unit?: string | null
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          id?: string
          movement_date?: string | null
          session_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          movement_kind?: string | null
          source_item_id?: string | null
          dest_item_id?: string | null
          qty?: number | null
          unit?: string | null
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliation: {
        Row: {
          id: string
          reconciliation_date: string | null
          previous_snapshot_id: string | null
          current_snapshot_id: string | null
          packages_compared: number | null
          packages_matched: number | null
          packages_with_variance: number | null
          total_variance_grams: number | null
          status: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          reconciliation_date?: string | null
          previous_snapshot_id?: string | null
          current_snapshot_id?: string | null
          packages_compared?: number | null
          packages_matched?: number | null
          packages_with_variance?: number | null
          total_variance_grams?: number | null
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          reconciliation_date?: string | null
          previous_snapshot_id?: string | null
          current_snapshot_id?: string | null
          packages_compared?: number | null
          packages_matched?: number | null
          packages_with_variance?: number | null
          total_variance_grams?: number | null
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string | null
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
          id: string
          import_date: string | null
          file_name: string
          imported_by: string | null
          row_count: number | null
          status: string | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          import_date?: string | null
          file_name: string
          imported_by?: string | null
          row_count?: number | null
          status?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          import_date?: string | null
          file_name?: string
          imported_by?: string | null
          row_count?: number | null
          status?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          id: string
          transaction_type: string
          order_id: string | null
          order_item_id: string | null
          allocation_id: string | null
          inventory_type: string
          inventory_id: string
          strain: string
          product_type: string
          quantity_change: number
          previous_quantity: number | null
          new_quantity: number | null
          transaction_reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          transaction_type: string
          order_id?: string | null
          order_item_id?: string | null
          allocation_id?: string | null
          inventory_type: string
          inventory_id: string
          strain: string
          product_type: string
          quantity_change: number
          previous_quantity?: number | null
          new_quantity?: number | null
          transaction_reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          transaction_type?: string
          order_id?: string | null
          order_item_id?: string | null
          allocation_id?: string | null
          inventory_type?: string
          inventory_id?: string
          strain?: string
          product_type?: string
          quantity_change?: number
          previous_quantity?: number | null
          new_quantity?: number | null
          transaction_reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "order_item_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_variances: {
        Row: {
          id: string
          reconciliation_id: string | null
          package_id: string | null
          inventory_type: string | null
          strain: string | null
          expected_quantity: number | null
          actual_quantity: number | null
          variance_quantity: number | null
          variance_category: string | null
          resolution_status: string | null
          resolution_notes: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          reconciliation_id?: string | null
          package_id?: string | null
          inventory_type?: string | null
          strain?: string | null
          expected_quantity?: number | null
          actual_quantity?: number | null
          variance_quantity?: number | null
          variance_category?: string | null
          resolution_status?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          reconciliation_id?: string | null
          package_id?: string | null
          inventory_type?: string | null
          strain?: string | null
          expected_quantity?: number | null
          actual_quantity?: number | null
          variance_quantity?: number | null
          variance_category?: string | null
          resolution_status?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string | null
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
          id: string
          invoice_number: string
          order_id: string | null
          customer_id: string | null
          issue_date: string
          due_date: string | null
          payment_terms: string | null
          line_items: Json
          subtotal: number
          tax_rate: number | null
          tax_amount: number | null
          total_amount: number
          status: string
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          invoice_number: string
          order_id?: string | null
          customer_id?: string | null
          issue_date?: string
          due_date?: string | null
          payment_terms?: string | null
          line_items?: Json
          subtotal?: number
          tax_rate?: number | null
          tax_amount?: number | null
          total_amount?: number
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          invoice_number?: string
          order_id?: string | null
          customer_id?: string | null
          issue_date?: string
          due_date?: string | null
          payment_terms?: string | null
          line_items?: Json
          subtotal?: number
          tax_rate?: number | null
          tax_amount?: number | null
          total_amount?: number
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      label_types: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          requires_coa: boolean | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          requires_coa?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          requires_coa?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      labels: {
        Row: {
          id: string
          label_number: string
          product_id: string | null
          package_id: string
          batch_id: string
          strain: string
          product_name: string
          product_type: string
          net_weight_grams: number
          unit_count: number | null
          qr_code_data: string
          qr_code_url: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          total_cannabinoids: number | null
          terpene_profile: Json | null
          test_date: string | null
          lab_name: string | null
          harvest_date: string | null
          package_date: string | null
          expiration_date: string | null
          compliance_uid: string | null
          warnings: string[] | null
          printed_at: string | null
          created_at: string | null
          lineage: string | null
          upc_code: string | null
          barcode_url: string | null
          barcode_format: string | null
          label_type_id: string | null
          batch_number: string | null
          voided_at: string | null
          print_count: number | null
          last_printed_at: string | null
          print_history: Json | null
          voided_by: string | null
          void_reason: string | null
          strain_id: string | null
          dominance_type: string | null
        }
        Insert: {
          id?: string
          label_number: string
          product_id?: string | null
          package_id: string
          batch_id: string
          strain: string
          product_name: string
          product_type: string
          net_weight_grams: number
          unit_count?: number | null
          qr_code_data: string
          qr_code_url?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          total_cannabinoids?: number | null
          terpene_profile?: Json | null
          test_date?: string | null
          lab_name?: string | null
          harvest_date?: string | null
          package_date?: string | null
          expiration_date?: string | null
          compliance_uid?: string | null
          warnings?: string[] | null
          printed_at?: string | null
          created_at?: string | null
          lineage?: string | null
          upc_code?: string | null
          barcode_url?: string | null
          barcode_format?: string | null
          label_type_id?: string | null
          batch_number?: string | null
          voided_at?: string | null
          print_count?: number | null
          last_printed_at?: string | null
          print_history?: Json | null
          voided_by?: string | null
          void_reason?: string | null
          strain_id?: string | null
          dominance_type?: string | null
        }
        Update: {
          id?: string
          label_number?: string
          product_id?: string | null
          package_id?: string
          batch_id?: string
          strain?: string
          product_name?: string
          product_type?: string
          net_weight_grams?: number
          unit_count?: number | null
          qr_code_data?: string
          qr_code_url?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          total_cannabinoids?: number | null
          terpene_profile?: Json | null
          test_date?: string | null
          lab_name?: string | null
          harvest_date?: string | null
          package_date?: string | null
          expiration_date?: string | null
          compliance_uid?: string | null
          warnings?: string[] | null
          printed_at?: string | null
          created_at?: string | null
          lineage?: string | null
          upc_code?: string | null
          barcode_url?: string | null
          barcode_format?: string | null
          label_type_id?: string | null
          batch_number?: string | null
          voided_at?: string | null
          print_count?: number | null
          last_printed_at?: string | null
          print_history?: Json | null
          voided_by?: string | null
          void_reason?: string | null
          strain_id?: string | null
          dominance_type?: string | null
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      manifests: {
        Row: {
          id: string
          manifest_number: string
          manifest_date: string
          driver_name: string | null
          vehicle_info: string | null
          route_number: string | null
          order_ids: string[]
          total_packages: number | null
          total_weight_grams: number | null
          total_units: number | null
          departure_time: string | null
          estimated_delivery_time: string | null
          actual_delivery_time: string | null
          status: string
          compliance_notes: string | null
          signature_data: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          manifest_number: string
          manifest_date?: string
          driver_name?: string | null
          vehicle_info?: string | null
          route_number?: string | null
          order_ids?: string[]
          total_packages?: number | null
          total_weight_grams?: number | null
          total_units?: number | null
          departure_time?: string | null
          estimated_delivery_time?: string | null
          actual_delivery_time?: string | null
          status?: string
          compliance_notes?: string | null
          signature_data?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          manifest_number?: string
          manifest_date?: string
          driver_name?: string | null
          vehicle_info?: string | null
          route_number?: string | null
          order_ids?: string[]
          total_packages?: number | null
          total_weight_grams?: number | null
          total_units?: number | null
          departure_time?: string | null
          estimated_delivery_time?: string | null
          actual_delivery_time?: string | null
          status?: string
          compliance_notes?: string | null
          signature_data?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_performance_metrics: {
        Row: {
          id: string
          month: string
          orders_fulfilled: number | null
          average_fulfillment_days: number | null
          total_weight_trimmed_grams: number | null
          total_units_packaged: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          month: string
          orders_fulfilled?: number | null
          average_fulfillment_days?: number | null
          total_weight_trimmed_grams?: number | null
          total_units_packaged?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          month?: string
          orders_fulfilled?: number | null
          average_fulfillment_days?: number | null
          total_weight_trimmed_grams?: number | null
          total_units_packaged?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          event_type: string
          channel: string
          enabled: boolean | null
          message_template: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          channel: string
          enabled?: boolean | null
          message_template?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          channel?: string
          enabled?: boolean | null
          message_template?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_forecasts: {
        Row: {
          id: string
          forecast_date: string
          strain: string
          product_type: string
          total_grams_needed: number | null
          total_units_needed: number | null
          grams_available: number | null
          grams_shortfall: number | null
          priority_score: number | null
          earliest_due_date: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          forecast_date?: string
          strain: string
          product_type: string
          total_grams_needed?: number | null
          total_units_needed?: number | null
          grams_available?: number | null
          grams_shortfall?: number | null
          priority_score?: number | null
          earliest_due_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          forecast_date?: string
          strain?: string
          product_type?: string
          total_grams_needed?: number | null
          total_units_needed?: number | null
          grams_available?: number | null
          grams_shortfall?: number | null
          priority_score?: number | null
          earliest_due_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      order_fulfillment_checklist: {
        Row: {
          id: string
          order_id: string | null
          order_item_id: string | null
          inventory_allocated: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          label_applied_at: string | null
          coa_attached_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          inventory_allocated?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          label_applied_at?: string | null
          coa_attached_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          inventory_allocated?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          label_applied_at?: string | null
          coa_attached_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillment_checklist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_checklist_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_fulfillment_items: {
        Row: {
          id: string
          order_id: string | null
          order_item_id: string | null
          packaging_session_id: string | null
          packaged_inventory_id: string | null
          strain: string
          product_type: string
          unit_size: string
          units_assigned: number
          assignment_date: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          packaging_session_id?: string | null
          packaged_inventory_id?: string | null
          strain: string
          product_type: string
          unit_size: string
          units_assigned?: number
          assignment_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          packaging_session_id?: string | null
          packaged_inventory_id?: string | null
          strain?: string
          product_type?: string
          unit_size?: string
          units_assigned?: number
          assignment_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillment_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
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
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_allocations: {
        Row: {
          id: string
          order_id: string | null
          order_item_id: string | null
          inventory_type: string
          inventory_id: string
          strain: string
          product_type: string
          allocated_quantity: number
          allocation_status: string | null
          allocated_by: string | null
          allocated_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          partial_quantity: number | null
          workflow_stage: Database["public"]["Enums"]["allocation_workflow_stage"] | null
          active_trim_session_id: string | null
          active_packaging_session_id: string | null
          stage_entered_at: string | null
          trimming_started_at: string | null
          trimming_completed_at: string | null
          packaging_started_at: string | null
          packaging_completed_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          inventory_type: string
          inventory_id: string
          strain: string
          product_type: string
          allocated_quantity?: number
          allocation_status?: string | null
          allocated_by?: string | null
          allocated_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          partial_quantity?: number | null
          workflow_stage?: Database["public"]["Enums"]["allocation_workflow_stage"] | null
          active_trim_session_id?: string | null
          active_packaging_session_id?: string | null
          stage_entered_at?: string | null
          trimming_started_at?: string | null
          trimming_completed_at?: string | null
          packaging_started_at?: string | null
          packaging_completed_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          inventory_type?: string
          inventory_id?: string
          strain?: string
          product_type?: string
          allocated_quantity?: number
          allocation_status?: string | null
          allocated_by?: string | null
          allocated_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          partial_quantity?: number | null
          workflow_stage?: Database["public"]["Enums"]["allocation_workflow_stage"] | null
          active_trim_session_id?: string | null
          active_packaging_session_id?: string | null
          stage_entered_at?: string | null
          trimming_started_at?: string | null
          trimming_completed_at?: string | null
          packaging_started_at?: string | null
          packaging_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_allocations_active_packaging_session_id_fkey"
            columns: ["active_packaging_session_id"]
            isOneToOne: false
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_allocations_active_trim_session_id_fkey"
            columns: ["active_trim_session_id"]
            isOneToOne: false
            referencedRelation: "trim_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number | null
          notes: string | null
          created_at: string | null
          status: Database["public"]["Enums"]["order_item_status"] | null
          updated_at: string | null
          discount_amount: number | null
          strain: string | null
          strain_id: string | null
          demand_unit: string | null
          batch_id: string | null
          test_mode: boolean
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal?: number | null
          notes?: string | null
          created_at?: string | null
          status?: Database["public"]["Enums"]["order_item_status"] | null
          updated_at?: string | null
          discount_amount?: number | null
          strain?: string | null
          strain_id?: string | null
          demand_unit?: string | null
          batch_id?: string | null
          test_mode?: boolean
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          subtotal?: number | null
          notes?: string | null
          created_at?: string | null
          status?: Database["public"]["Enums"]["order_item_status"] | null
          updated_at?: string | null
          discount_amount?: number | null
          strain?: string | null
          strain_id?: string | null
          demand_unit?: string | null
          batch_id?: string | null
          test_mode?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string | null
          status: string
          priority: string
          order_date: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          delivery_notes: string | null
          internal_notes: string | null
          total_amount: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          archived: boolean | null
          coversheet_enabled: boolean | null
          public_token: string | null
          order_source: string | null
          test_mode: boolean
        }
        Insert: {
          id?: string
          order_number: string
          customer_id?: string | null
          status?: string
          priority?: string
          order_date?: string | null
          requested_delivery_date?: string | null
          scheduled_delivery_date?: string | null
          delivery_notes?: string | null
          internal_notes?: string | null
          total_amount?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          archived?: boolean | null
          coversheet_enabled?: boolean | null
          public_token?: string | null
          order_source?: string | null
          test_mode?: boolean
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string | null
          status?: string
          priority?: string
          order_date?: string | null
          requested_delivery_date?: string | null
          scheduled_delivery_date?: string | null
          delivery_notes?: string | null
          internal_notes?: string | null
          total_amount?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          archived?: boolean | null
          coversheet_enabled?: boolean | null
          public_token?: string | null
          order_source?: string | null
          test_mode?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_assignments: {
        Row: {
          id: string
          order_id: string
          order_item_id: string
          package_id: string
          quantity_assigned: number
          assigned_by: string | null
          assigned_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          label_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          order_item_id: string
          package_id: string
          quantity_assigned: number
          assigned_by?: string | null
          assigned_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          label_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          order_item_id?: string
          package_id?: string
          quantity_assigned?: number
          assigned_by?: string | null
          assigned_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          label_id?: string | null
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_schedule: {
        Row: {
          id: string
          order_id: string
          scheduled_date: string
          scheduled_start_time: string | null
          estimated_duration_minutes: number | null
          assigned_to: string | null
          status: string
          actual_start_time: string | null
          actual_end_time: string | null
          quality_check_passed: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          scheduled_date: string
          scheduled_start_time?: string | null
          estimated_duration_minutes?: number | null
          assigned_to?: string | null
          status?: string
          actual_start_time?: string | null
          actual_end_time?: string | null
          quality_check_passed?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          scheduled_date?: string
          scheduled_start_time?: string | null
          estimated_duration_minutes?: number | null
          assigned_to?: string | null
          status?: string
          actual_start_time?: string | null
          actual_end_time?: string | null
          quality_check_passed?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_sessions: {
        Row: {
          id: string
          session_date: string
          packager_name: string
          package_id: string
          strain: string
          batch_id: string
          package_weight: number | null
          pull_weight: number | null
          ending_weight: number | null
          units_3_5g: number | null
          units_14g: number | null
          units_454g: number | null
          trim_grams: number | null
          waste_grams: number | null
          recorded_in_dutchie: boolean | null
          notes: string | null
          session_status: string | null
          started_at: string | null
          completed_at: string | null
          minutes_packaged: number | null
          units_per_hour: number | null
          variance_grams: number | null
          created_at: string | null
          updated_at: string | null
          conversion_metadata: Json | null
          test_mode: boolean
          cancelled_at: string | null
          batch_registry_id: string | null
          strain_id: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_by: string | null
          void_reason: string | null
          output_product_name: string | null
          finalization_status_packaged: Database["public"]["Enums"]["finalization_status"]
          finalized_at_packaged: string | null
          finalized_by_packaged: string | null
          void_reason_packaged: string | null
          finalization_status_3_5g: string
          finalization_status_14g: string
          finalization_status_1lb: string
          finalized_at_3_5g: string | null
          finalized_at_14g: string | null
          finalized_at_1lb: string | null
          finalized_by_3_5g: string | null
          finalized_by_14g: string | null
          finalized_by_1lb: string | null
          output_product_3_5g_name: string | null
          output_product_14g_name: string | null
          output_product_1lb_name: string | null
          void_reason_3_5g: string | null
          void_reason_14g: string | null
          void_reason_1lb: string | null
        }
        Insert: {
          id?: string
          session_date?: string
          packager_name: string
          package_id: string
          strain: string
          batch_id: string
          package_weight?: number | null
          pull_weight?: number | null
          ending_weight?: number | null
          units_3_5g?: number | null
          units_14g?: number | null
          units_454g?: number | null
          trim_grams?: number | null
          waste_grams?: number | null
          recorded_in_dutchie?: boolean | null
          notes?: string | null
          session_status?: string | null
          started_at?: string | null
          completed_at?: string | null
          minutes_packaged?: number | null
          units_per_hour?: number | null
          variance_grams?: number | null
          created_at?: string | null
          updated_at?: string | null
          conversion_metadata?: Json | null
          test_mode?: boolean
          cancelled_at?: string | null
          batch_registry_id?: string | null
          strain_id?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          void_reason?: string | null
          output_product_name?: string | null
          finalization_status_packaged?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_packaged?: string | null
          finalized_by_packaged?: string | null
          void_reason_packaged?: string | null
          finalization_status_3_5g?: string
          finalization_status_14g?: string
          finalization_status_1lb?: string
          finalized_at_3_5g?: string | null
          finalized_at_14g?: string | null
          finalized_at_1lb?: string | null
          finalized_by_3_5g?: string | null
          finalized_by_14g?: string | null
          finalized_by_1lb?: string | null
          output_product_3_5g_name?: string | null
          output_product_14g_name?: string | null
          output_product_1lb_name?: string | null
          void_reason_3_5g?: string | null
          void_reason_14g?: string | null
          void_reason_1lb?: string | null
        }
        Update: {
          id?: string
          session_date?: string
          packager_name?: string
          package_id?: string
          strain?: string
          batch_id?: string
          package_weight?: number | null
          pull_weight?: number | null
          ending_weight?: number | null
          units_3_5g?: number | null
          units_14g?: number | null
          units_454g?: number | null
          trim_grams?: number | null
          waste_grams?: number | null
          recorded_in_dutchie?: boolean | null
          notes?: string | null
          session_status?: string | null
          started_at?: string | null
          completed_at?: string | null
          minutes_packaged?: number | null
          units_per_hour?: number | null
          variance_grams?: number | null
          created_at?: string | null
          updated_at?: string | null
          conversion_metadata?: Json | null
          test_mode?: boolean
          cancelled_at?: string | null
          batch_registry_id?: string | null
          strain_id?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          void_reason?: string | null
          output_product_name?: string | null
          finalization_status_packaged?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_packaged?: string | null
          finalized_by_packaged?: string | null
          void_reason_packaged?: string | null
          finalization_status_3_5g?: string
          finalization_status_14g?: string
          finalization_status_1lb?: string
          finalized_at_3_5g?: string | null
          finalized_at_14g?: string | null
          finalized_at_1lb?: string | null
          finalized_by_3_5g?: string | null
          finalized_by_14g?: string | null
          finalized_by_1lb?: string | null
          output_product_3_5g_name?: string | null
          output_product_14g_name?: string | null
          output_product_1lb_name?: string | null
          void_reason_3_5g?: string | null
          void_reason_14g?: string | null
          void_reason_1lb?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_yield_history: {
        Row: {
          id: string
          strain: string
          source_type: string
          target_type: string
          average_yield_percentage: number
          standard_deviation: number | null
          confidence_interval_lower: number | null
          confidence_interval_upper: number | null
          sample_size: number
          date_range_start: string | null
          date_range_end: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          strain: string
          source_type: string
          target_type: string
          average_yield_percentage: number
          standard_deviation?: number | null
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          sample_size?: number
          date_range_start?: string | null
          date_range_end?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          strain?: string
          source_type?: string
          target_type?: string
          average_yield_percentage?: number
          standard_deviation?: number | null
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          sample_size?: number
          date_range_start?: string | null
          date_range_end?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      packaging_yields: {
        Row: {
          id: string
          strain: string
          source_type: string
          target_type: string
          input_weight_grams: number
          output_quantity_units: number
          yield_percentage: number | null
          yield_rate_units_per_gram: number | null
          packaging_date: string | null
          batch_id: string | null
          packaging_session_id: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          strain: string
          source_type: string
          target_type: string
          input_weight_grams: number
          output_quantity_units: number
          yield_percentage?: number | null
          yield_rate_units_per_gram?: number | null
          packaging_date?: string | null
          batch_id?: string | null
          packaging_session_id?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          strain?: string
          source_type?: string
          target_type?: string
          input_weight_grams?: number
          output_quantity_units?: number
          yield_percentage?: number | null
          yield_rate_units_per_gram?: number | null
          packaging_date?: string | null
          batch_id?: string | null
          packaging_session_id?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_yields_packaging_session_id_fkey"
            columns: ["packaging_session_id"]
            isOneToOne: false
            referencedRelation: "packaging_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_labels: {
        Row: {
          id: string
          package_assignment_id: string
          label_number: string
          label_data: Json
          generated_at: string | null
          printed_at: string | null
          printed_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          package_assignment_id: string
          label_number: string
          label_data: Json
          generated_at?: string | null
          printed_at?: string | null
          printed_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          package_assignment_id?: string
          label_number?: string
          label_data?: Json
          generated_at?: string | null
          printed_at?: string | null
          printed_by?: string | null
          created_at?: string | null
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
        ]
      }
      product_stages: {
        Row: {
          id: string
          name: string
          sort_order: number
          default_pricing_unit: string
          allows_fractional_quantity: boolean
          description: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          default_pricing_unit?: string
          allows_fractional_quantity?: boolean
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          default_pricing_unit?: string
          allows_fractional_quantity?: boolean
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_types: {
        Row: {
          id: string
          name: string
          base_weight: number | null
          base_unit: string | null
          sort_order: number
          applicable_stages: string[]
          description: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          base_weight?: number | null
          base_unit?: string | null
          sort_order?: number
          applicable_stages?: string[]
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          base_weight?: number | null
          base_unit?: string | null
          sort_order?: number
          applicable_stages?: string[]
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          type: string
          strain: string | null
          unit: string
          available_quantity: number | null
          price_per_unit: number | null
          trim_time_minutes: number | null
          packaging_time_minutes: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          sku: string | null
          pricing_unit: string | null
          product_category: string | null
          allows_fractional_quantity: boolean | null
          stage_id: string | null
          type_id: string | null
          strain_id: string | null
          generated_at: string | null
          generation_batch_id: string | null
          is_active: boolean
          gross_weight: number | null
          net_weight: number | null
          is_archived: boolean
          archived_at: string | null
          replaced_by_product_id: string | null
          archive_reason: string | null
        }
        Insert: {
          id?: string
          name: string
          type?: string
          strain?: string | null
          unit?: string
          available_quantity?: number | null
          price_per_unit?: number | null
          trim_time_minutes?: number | null
          packaging_time_minutes?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          sku?: string | null
          pricing_unit?: string | null
          product_category?: string | null
          allows_fractional_quantity?: boolean | null
          stage_id?: string | null
          type_id?: string | null
          strain_id?: string | null
          generated_at?: string | null
          generation_batch_id?: string | null
          is_active?: boolean
          gross_weight?: number | null
          net_weight?: number | null
          is_archived?: boolean
          archived_at?: string | null
          replaced_by_product_id?: string | null
          archive_reason?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          strain?: string | null
          unit?: string
          available_quantity?: number | null
          price_per_unit?: number | null
          trim_time_minutes?: number | null
          packaging_time_minutes?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          sku?: string | null
          pricing_unit?: string | null
          product_category?: string | null
          allows_fractional_quantity?: boolean | null
          stage_id?: string | null
          type_id?: string | null
          strain_id?: string | null
          generated_at?: string | null
          generation_batch_id?: string | null
          is_active?: boolean
          gross_weight?: number | null
          net_weight?: number | null
          is_archived?: boolean
          archived_at?: string | null
          replaced_by_product_id?: string | null
          archive_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_replaced_by_product_id_fkey"
            columns: ["replaced_by_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
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
            referencedRelation: "strains"
            referencedColumns: ["id"]
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
      quarantine_violation_log: {
        Row: {
          id: string
          batch_id: string | null
          attempted_operation: string
          movement_kind: string | null
          order_id: string | null
          item_id: string | null
          blocked_at: string | null
          blocked_by: string | null
          quarantine_reason: string | null
          violation_details: Json | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          attempted_operation: string
          movement_kind?: string | null
          order_id?: string | null
          item_id?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          quarantine_reason?: string | null
          violation_details?: Json | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          attempted_operation?: string
          movement_kind?: string | null
          order_id?: string | null
          item_id?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          quarantine_reason?: string | null
          violation_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      route_waypoints: {
        Row: {
          id: string
          route_id: string
          step_number: number
          instruction_text: string
          distance_meters: number
          duration_seconds: number
          street_name: string | null
          direction: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          route_id: string
          step_number: number
          instruction_text: string
          distance_meters: number
          duration_seconds: number
          street_name?: string | null
          direction?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          route_id?: string
          step_number?: number
          instruction_text?: string
          distance_meters?: number
          duration_seconds?: number
          street_name?: string | null
          direction?: string | null
          created_at?: string | null
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
      slack_notifications: {
        Row: {
          id: string
          event_type: string
          order_id: string | null
          channel: string
          message: string
          status: string
          sent_at: string | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          order_id?: string | null
          channel: string
          message: string
          status?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          order_id?: string | null
          channel?: string
          message?: string
          status?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      strain_aliases: {
        Row: {
          id: string
          strain_id: string
          alias: string
          created_at: string | null
        }
        Insert: {
          id?: string
          strain_id: string
          alias: string
          created_at?: string | null
        }
        Update: {
          id?: string
          strain_id?: string
          alias?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strain_aliases_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      strain_metadata: {
        Row: {
          id: string
          name: string
          type: string | null
          genetics: string | null
          abbreviation: string | null
          avg_bucked_to_flower_ratio: number | null
          avg_bucked_to_smalls_ratio: number | null
          avg_bucked_to_trim_ratio: number | null
          avg_waste_percentage: number | null
          avg_trim_grams_per_hour: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          over_allocation_warning_threshold: number | null
          over_allocation_critical_threshold: number | null
        }
        Insert: {
          id?: string
          name: string
          type?: string | null
          genetics?: string | null
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_waste_percentage?: number | null
          avg_trim_grams_per_hour?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          over_allocation_warning_threshold?: number | null
          over_allocation_critical_threshold?: number | null
        }
        Update: {
          id?: string
          name?: string
          type?: string | null
          genetics?: string | null
          abbreviation?: string | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_waste_percentage?: number | null
          avg_trim_grams_per_hour?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          over_allocation_warning_threshold?: number | null
          over_allocation_critical_threshold?: number | null
        }
        Relationships: []
      }
      strains: {
        Row: {
          id: string
          name: string
          abbreviation: string | null
          dominance_type: string | null
          genetics_description: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
          display_name: string
          category: string | null
          thc_range: string | null
          cbd_range: string | null
          terpene_profile: Json | null
          description: string | null
          cultivation_notes: string | null
          typical_yield_percentage: number | null
          bucked_to_bulk_ratio: number | null
          bulk_to_packaged_ratio: number | null
          avg_bucked_to_flower_ratio: number | null
          avg_bucked_to_smalls_ratio: number | null
          avg_bucked_to_trim_ratio: number | null
          avg_waste_percentage: number | null
          avg_trim_grams_per_hour: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          name: string
          abbreviation?: string | null
          dominance_type?: string | null
          genetics_description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
          display_name: string
          category?: string | null
          thc_range?: string | null
          cbd_range?: string | null
          terpene_profile?: Json | null
          description?: string | null
          cultivation_notes?: string | null
          typical_yield_percentage?: number | null
          bucked_to_bulk_ratio?: number | null
          bulk_to_packaged_ratio?: number | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_waste_percentage?: number | null
          avg_trim_grams_per_hour?: number | null
          notes?: string | null
        }
        Update: {
          id?: string
          name?: string
          abbreviation?: string | null
          dominance_type?: string | null
          genetics_description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
          display_name?: string
          category?: string | null
          thc_range?: string | null
          cbd_range?: string | null
          terpene_profile?: Json | null
          description?: string | null
          cultivation_notes?: string | null
          typical_yield_percentage?: number | null
          bucked_to_bulk_ratio?: number | null
          bulk_to_packaged_ratio?: number | null
          avg_bucked_to_flower_ratio?: number | null
          avg_bucked_to_smalls_ratio?: number | null
          avg_bucked_to_trim_ratio?: number | null
          avg_waste_percentage?: number | null
          avg_trim_grams_per_hour?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      system_metadata: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_mode_audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          validation_bypassed: string
          context: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          validation_bypassed: string
          context?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          validation_bypassed?: string
          context?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      throughput_metrics: {
        Row: {
          id: string
          metric_date: string
          worker_name: string
          worker_type: string
          strain: string | null
          total_weight_processed: number
          total_units_produced: number
          total_minutes_worked: number
          avg_grams_per_hour: number | null
          avg_units_per_hour: number | null
          sessions_completed: number
          created_at: string | null
        }
        Insert: {
          id?: string
          metric_date: string
          worker_name: string
          worker_type: string
          strain?: string | null
          total_weight_processed?: number
          total_units_produced?: number
          total_minutes_worked?: number
          avg_grams_per_hour?: number | null
          avg_units_per_hour?: number | null
          sessions_completed?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          metric_date?: string
          worker_name?: string
          worker_type?: string
          strain?: string | null
          total_weight_processed?: number
          total_units_produced?: number
          total_minutes_worked?: number
          avg_grams_per_hour?: number | null
          avg_units_per_hour?: number | null
          sessions_completed?: number
          created_at?: string | null
        }
        Relationships: []
      }
      trim_schedule: {
        Row: {
          id: string
          order_id: string
          scheduled_date: string
          scheduled_start_time: string | null
          estimated_duration_minutes: number | null
          assigned_to: string | null
          station_number: string | null
          status: string
          actual_start_time: string | null
          actual_end_time: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          scheduled_date: string
          scheduled_start_time?: string | null
          estimated_duration_minutes?: number | null
          assigned_to?: string | null
          station_number?: string | null
          status?: string
          actual_start_time?: string | null
          actual_end_time?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          scheduled_date?: string
          scheduled_start_time?: string | null
          estimated_duration_minutes?: number | null
          assigned_to?: string | null
          station_number?: string | null
          status?: string
          actual_start_time?: string | null
          actual_end_time?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trim_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      trim_sessions: {
        Row: {
          id: string
          session_date: string
          trimmer_name: string
          package_id: string
          strain: string
          batch_id: string
          bucked_inventory_id: string | null
          package_total_weight: number | null
          pulled_weight: number
          time_started: string | null
          time_ended: string | null
          minutes_trimmed: number | null
          grams_per_hour: number | null
          big_buds_grams: number | null
          small_buds_grams: number | null
          trim_grams: number | null
          waste_grams: number | null
          variance_grams: number | null
          trim_method: string | null
          recorded_in_dutchie: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          session_status: string | null
          started_at: string | null
          completed_at: string | null
          bucked_smalls_grams: number | null
          bucked_smalls_inventory_id: string | null
          test_mode: boolean
          cancelled_at: string | null
          batch_registry_id: string | null
          strain_id: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"]
          finalized_at: string | null
          finalized_by: string | null
          void_reason: string | null
          output_product_bigs_name: string | null
          output_product_smalls_name: string | null
          output_product_trim_name: string | null
          finalization_status_bigs: Database["public"]["Enums"]["finalization_status"]
          finalized_at_bigs: string | null
          finalized_by_bigs: string | null
          void_reason_bigs: string | null
          finalization_status_smalls: Database["public"]["Enums"]["finalization_status"]
          finalized_at_smalls: string | null
          finalized_by_smalls: string | null
          void_reason_smalls: string | null
          finalization_status_trim: Database["public"]["Enums"]["finalization_status"]
          finalized_at_trim: string | null
          finalized_by_trim: string | null
          void_reason_trim: string | null
        }
        Insert: {
          id?: string
          session_date?: string
          trimmer_name: string
          package_id: string
          strain: string
          batch_id: string
          bucked_inventory_id?: string | null
          package_total_weight?: number | null
          pulled_weight: number
          time_started?: string | null
          time_ended?: string | null
          minutes_trimmed?: number | null
          grams_per_hour?: number | null
          big_buds_grams?: number | null
          small_buds_grams?: number | null
          trim_grams?: number | null
          waste_grams?: number | null
          variance_grams?: number | null
          trim_method?: string | null
          recorded_in_dutchie?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          session_status?: string | null
          started_at?: string | null
          completed_at?: string | null
          bucked_smalls_grams?: number | null
          bucked_smalls_inventory_id?: string | null
          test_mode?: boolean
          cancelled_at?: string | null
          batch_registry_id?: string | null
          strain_id?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          void_reason?: string | null
          output_product_bigs_name?: string | null
          output_product_smalls_name?: string | null
          output_product_trim_name?: string | null
          finalization_status_bigs?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_bigs?: string | null
          finalized_by_bigs?: string | null
          void_reason_bigs?: string | null
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_smalls?: string | null
          finalized_by_smalls?: string | null
          void_reason_smalls?: string | null
          finalization_status_trim?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_trim?: string | null
          finalized_by_trim?: string | null
          void_reason_trim?: string | null
        }
        Update: {
          id?: string
          session_date?: string
          trimmer_name?: string
          package_id?: string
          strain?: string
          batch_id?: string
          bucked_inventory_id?: string | null
          package_total_weight?: number | null
          pulled_weight?: number
          time_started?: string | null
          time_ended?: string | null
          minutes_trimmed?: number | null
          grams_per_hour?: number | null
          big_buds_grams?: number | null
          small_buds_grams?: number | null
          trim_grams?: number | null
          waste_grams?: number | null
          variance_grams?: number | null
          trim_method?: string | null
          recorded_in_dutchie?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          session_status?: string | null
          started_at?: string | null
          completed_at?: string | null
          bucked_smalls_grams?: number | null
          bucked_smalls_inventory_id?: string | null
          test_mode?: boolean
          cancelled_at?: string | null
          batch_registry_id?: string | null
          strain_id?: string | null
          finalization_status?: Database["public"]["Enums"]["finalization_status"]
          finalized_at?: string | null
          finalized_by?: string | null
          void_reason?: string | null
          output_product_bigs_name?: string | null
          output_product_smalls_name?: string | null
          output_product_trim_name?: string | null
          finalization_status_bigs?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_bigs?: string | null
          finalized_by_bigs?: string | null
          void_reason_bigs?: string | null
          finalization_status_smalls?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_smalls?: string | null
          finalized_by_smalls?: string | null
          void_reason_smalls?: string | null
          finalization_status_trim?: Database["public"]["Enums"]["finalization_status"]
          finalized_at_trim?: string | null
          finalized_by_trim?: string | null
          void_reason_trim?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trim_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
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
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trim_sessions_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      variance_log: {
        Row: {
          id: string
          source_type: Database["public"]["Enums"]["variance_source"]
          source_id: string
          inventory_item_id: string | null
          package_id: string
          expected_qty: number
          actual_qty: number
          variance_qty: number
          variance_percentage: number
          unit: string
          variance_reason: Database["public"]["Enums"]["variance_reason"]
          notes: string | null
          inventory_stage: string | null
          strain: string | null
          batch: string | null
          product_name: string | null
          user_id: string | null
          timestamp: string | null
          movement_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source_type: Database["public"]["Enums"]["variance_source"]
          source_id: string
          inventory_item_id?: string | null
          package_id: string
          expected_qty: number
          actual_qty: number
          variance_qty: number
          variance_percentage: number
          unit: string
          variance_reason: Database["public"]["Enums"]["variance_reason"]
          notes?: string | null
          inventory_stage?: string | null
          strain?: string | null
          batch?: string | null
          product_name?: string | null
          user_id?: string | null
          timestamp?: string | null
          movement_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source_type?: Database["public"]["Enums"]["variance_source"]
          source_id?: string
          inventory_item_id?: string | null
          package_id?: string
          expected_qty?: number
          actual_qty?: number
          variance_qty?: number
          variance_percentage?: number
          unit?: string
          variance_reason?: Database["public"]["Enums"]["variance_reason"]
          notes?: string | null
          inventory_stage?: string | null
          strain?: string | null
          batch?: string | null
          product_name?: string | null
          user_id?: string | null
          timestamp?: string | null
          movement_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variance_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
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
    }
    Views: {
      active_packaging_sessions: {
        Row: {
          id: string | null
          session_date: string | null
          packager_name: string | null
          package_id: string | null
          strain: string | null
          batch_id: string | null
          package_weight: number | null
          pull_weight: number | null
          ending_weight: number | null
          units_3_5g: number | null
          units_14g: number | null
          units_454g: number | null
          trim_grams: number | null
          waste_grams: number | null
          recorded_in_dutchie: boolean | null
          notes: string | null
          session_status: string | null
          started_at: string | null
          completed_at: string | null
          minutes_packaged: number | null
          units_per_hour: number | null
          variance_grams: number | null
          created_at: string | null
          updated_at: string | null
          minutes_elapsed: number | null
        }
        Relationships: []
      }
      active_trim_sessions: {
        Row: {
          id: string | null
          session_date: string | null
          trimmer_name: string | null
          package_id: string | null
          strain: string | null
          batch_id: string | null
          bucked_inventory_id: string | null
          package_total_weight: number | null
          pulled_weight: number | null
          time_started: string | null
          time_ended: string | null
          minutes_trimmed: number | null
          grams_per_hour: number | null
          big_buds_grams: number | null
          small_buds_grams: number | null
          trim_grams: number | null
          waste_grams: number | null
          variance_grams: number | null
          trim_method: string | null
          recorded_in_dutchie: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          session_status: string | null
          started_at: string | null
          completed_at: string | null
          minutes_elapsed: number | null
          bucked_remaining: number | null
        }
        Relationships: []
      }
      archived_products_report: {
        Row: {
          id: string | null
          name: string | null
          archived_at: string | null
          archive_reason: string | null
          product_type: string | null
          stage: string | null
          strain: string | null
          replaced_by_product_name: string | null
          replaced_by_product_id: string | null
        }
        Relationships: []
      }
      backend_bulk_inventory: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          harvest_date: string | null
          room: string | null
          batch_status: string | null
          stage: string | null
          weight_grams: number | null
          allocated_weight_grams: number | null
          available_weight_grams: number | null
          location: string | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      batch_allocation_overview: {
        Row: {
          batch_id: string | null
          strain: string | null
          current_stage: string | null
          current_weight_grams: number | null
          estimated_final_weight_grams: number | null
          orders_assigned: number | null
          eighths_demand: number | null
          eighths_capacity: number | null
          eighths_remaining: number | null
          eighths_utilization_pct: number | null
          halves_demand: number | null
          halves_capacity: number | null
          halves_remaining: number | null
          halves_utilization_pct: number | null
          pounds_demand: number | null
          pounds_capacity: number | null
          pounds_remaining: number | null
          pounds_utilization_pct: number | null
          allocation_status: string | null
        }
        Relationships: []
      }
      batch_allocation_summary: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          harvest_date: string | null
          batch_status: string | null
          coa_id: string | null
          coa_status: string | null
          bucked_weight: number | null
          bucked_allocated: number | null
          bucked_available: number | null
          flower_weight: number | null
          flower_allocated: number | null
          flower_available: number | null
          smalls_weight: number | null
          smalls_allocated: number | null
          smalls_available: number | null
          packaged_weight: number | null
          packaged_allocated: number | null
          packaged_available: number | null
          total_weight: number | null
          total_allocated: number | null
          allocation_percentage: number | null
          over_allocation_warning_threshold: number | null
          over_allocation_critical_threshold: number | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      batch_capacity_estimates: {
        Row: {
          batch_id: string | null
          strain: string | null
          current_stage: string | null
          current_weight_grams: number | null
          estimated_final_weight_grams: number | null
          estimated_eighths_capacity: number | null
          estimated_halves_capacity: number | null
          estimated_pounds_capacity: number | null
        }
        Relationships: []
      }
      batch_hierarchical_allocation_flower: {
        Row: {
          batch_id: string | null
          strain: string | null
          product_category: string | null
          packaged_total_units: number | null
          packaged_available_units: number | null
          bulk_total_grams: number | null
          bulk_available_grams: number | null
          bucked_total_grams: number | null
          bucked_available_grams: number | null
          projected_flower_from_bucked_grams: number | null
          total_capacity_35g_units: number | null
        }
        Relationships: []
      }
      batch_hierarchical_allocation_smalls: {
        Row: {
          batch_id: string | null
          strain: string | null
          product_category: string | null
          packaged_total_units: number | null
          packaged_available_units: number | null
          bulk_total_grams: number | null
          bulk_available_grams: number | null
          bucked_total_grams: number | null
          bucked_available_grams: number | null
          projected_smalls_from_bucked_grams: number | null
          total_capacity_14g_units: number | null
        }
        Relationships: []
      }
      batch_inventory_consolidated: {
        Row: {
          batch_id: string | null
          strain: string | null
          packaged_units_available: number | null
          bulk_grams_available: number | null
          bucked_grams_available: number | null
          packaged_units_total: number | null
          bulk_grams_total: number | null
          bucked_grams_total: number | null
        }
        Relationships: []
      }
      batch_inventory_health: {
        Row: {
          issue_type: string | null
          batch_number: string | null
          strain: string | null
          package_count: number | null
          total_weight_grams: number | null
          batch_registry_id: string | null
        }
        Relationships: []
      }
      batch_order_demand: {
        Row: {
          batch_id: string | null
          product_name: string | null
          sku: string | null
          strain: string | null
          product_type: string | null
          product_category: string | null
          order_count: number | null
          total_quantity_needed: number | null
          order_numbers: string[] | null
        }
        Relationships: []
      }
      batch_selection_options: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          current_stage: string | null
          total_available_weight_grams: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      batch_stage_allocation_status: {
        Row: {
          id: string | null
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          stage: string | null
          weight_grams: number | null
          allocated_weight_grams: number | null
          available_weight_grams: number | null
          location: string | null
          stage_allocation_percentage: number | null
          is_over_allocated: boolean | null
          over_allocation_grams: number | null
          allocation_warning_level: string | null
          over_allocation_warning_threshold: number | null
          over_allocation_critical_threshold: number | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      batch_stage_availability: {
        Row: {
          batch_number: string | null
          strain: string | null
          stage: string | null
          weight_grams: number | null
          allocated_weight_grams: number | null
          available_weight_grams: number | null
          availability_status: string | null
          location: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      batch_with_coa_status: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          harvest_date: string | null
          room: string | null
          initial_weight_grams: number | null
          batch_status: string | null
          batch_notes: string | null
          coa_id: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          total_cannabinoids_percentage: number | null
          total_terpenes_mg_g: number | null
          sample_date: string | null
          manufacture_date: string | null
          terpene_1_name: string | null
          terpene_1_value: number | null
          terpene_1_percentage: number | null
          terpene_2_name: string | null
          terpene_2_value: number | null
          terpene_2_percentage: number | null
          terpene_3_name: string | null
          terpene_3_value: number | null
          terpene_3_percentage: number | null
          pdf_file_path: string | null
          coa_is_active: boolean | null
          coa_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      bulk_inventory_availability: {
        Row: {
          id: string | null
          strain: string | null
          product_type: string | null
          total_weight: number | null
          allocated_weight: number | null
          available_weight: number | null
          batch_id: string | null
          quality_grade: string | null
          trim_date: string | null
          created_at: string | null
        }
        Relationships: []
      }
      conversion_history_view: {
        Row: {
          id: string | null
          package_id: string | null
          batch_id: string | null
          batch_name: string | null
          strain_id: string | null
          strain_name: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          stage_name: string | null
          weight: number | null
          units: number | null
          source_session_ids: Json | null
          finalization_status: Database["public"]["Enums"]["finalization_status"] | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finalized_by_name: string | null
          packaged_at: string | null
          in_inventory: boolean | null
        }
        Relationships: []
      }
      conversion_packages_detail_view: {
        Row: {
          package_record_id: string | null
          package_id: string | null
          conversion_lot_id: string | null
          weight: number | null
          units: number | null
          packaged_at: string | null
          created_at: string | null
          created_by: string | null
          batch_id: string | null
          batch_number: string | null
          strain_name: string | null
          strain_code: string | null
          product_id: string | null
          product_name: string | null
          product_category: string | null
          stage_name: string | null
          inventory_item_id: string | null
          current_quantity: number | null
          inventory_status: string | null
          last_movement_at: string | null
          source_session_ids: Json | null
          created_by_name: string | null
          created_by_email: string | null
        }
        Relationships: []
      }
      conversion_summary_view: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          strain_id: string | null
          strain_name: string | null
          strain_code: string | null
          session_type: string | null
          session_id: string | null
          session_date: string | null
          total_weight: number | null
          total_units: number | null
          has_packages: boolean | null
          is_finalized: boolean | null
          package_count: number | null
          pending_package_count: number | null
          completed_at: string | null
        }
        Relationships: []
      }
      current_inventory_status: {
        Row: {
          strain: string | null
          bucked_totes: number | null
          total_bucked_grams: number | null
          flower_grams: number | null
          smalls_grams: number | null
          trim_grams: number | null
        }
        Relationships: []
      }
      daily_throughput_summary: {
        Row: {
          metric_date: string | null
          worker_type: string | null
          total_workers: number | null
          total_weight_grams: number | null
          total_units: number | null
          total_minutes: number | null
          avg_grams_per_hour: number | null
          avg_units_per_hour: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      daily_workload: {
        Row: {
          work_date: string | null
          trim_orders: number | null
          trim_minutes: number | null
          packaging_orders: number | null
          packaging_minutes: number | null
          delivery_orders: number | null
        }
        Relationships: []
      }
      deprecated_table_status: {
        Row: {
          table_name: string | null
          row_count: number | null
          status: string | null
        }
        Relationships: []
      }
      finalization_status_summary: {
        Row: {
          session_type: string | null
          pending_count: number | null
          finalized_count: number | null
          voided_count: number | null
          pending_weight: number | null
        }
        Relationships: []
      }
      ghost_finalized_sessions: {
        Row: {
          session_id: string | null
          batch_registry_id: string | null
          batch_number: string | null
          strain_name: string | null
          output_product_name: string | null
          finalization_status_packaged: Database["public"]["Enums"]["finalization_status"] | null
          finalized_at_packaged: string | null
          completed_at: string | null
          total_units: number | null
          issue: string | null
        }
        Relationships: []
      }
      inventory_allocation_summary: {
        Row: {
          strain: string | null
          product_type: string | null
          inventory_type: string | null
          total_allocated: number | null
          orders_with_allocations: number | null
        }
        Relationships: []
      }
      inventory_discrepancies: {
        Row: {
          id: string | null
          package_id: string | null
          batch_id: string | null
          product_name: string | null
          strain: string | null
          current_qty: number | null
          ledger_qty: number | null
          discrepancy: number | null
          abs_discrepancy: number | null
          product_stage_id: string | null
          created_at: string | null
          last_updated: string | null
        }
        Relationships: []
      }
      inventory_qty_health: {
        Row: {
          package_id: string | null
          product_name: string | null
          batch_number: string | null
          on_hand_qty: number | null
          available_qty: number | null
          reserved_qty: number | null
          expected_available_qty: number | null
          health_status: string | null
          last_updated: string | null
        }
        Relationships: []
      }
      label_print_analytics: {
        Row: {
          print_date: string | null
          labels_printed: number | null
          total_prints: number | null
          reprinted_labels: number | null
          avg_prints_per_label: number | null
          max_prints_for_single_label: number | null
        }
        Relationships: []
      }
      monthly_sku_deliveries: {
        Row: {
          month: string | null
          product_name: string | null
          product_type: string | null
          strain: string | null
          total_units_delivered: number | null
          orders_count: number | null
        }
        Relationships: []
      }
      order_age_metrics: {
        Row: {
          order_id: string | null
          order_number: string | null
          customer_id: string | null
          status: string | null
          created_at: string | null
          requested_delivery_date: string | null
          days_since_created: number | null
          age_color_code: string | null
          fulfillment_days: number | null
        }
        Relationships: []
      }
      order_demand_by_sku: {
        Row: {
          sku: string | null
          strain: string | null
          product_name: string | null
          product_type: string | null
          product_category: string | null
          order_count: number | null
          total_units_needed: number | null
          total_value: number | null
          order_numbers: string | null
          earliest_delivery_date: string | null
          latest_delivery_date: string | null
        }
        Relationships: []
      }
      order_item_workflow_status: {
        Row: {
          order_item_id: string | null
          order_id: string | null
          product_id: string | null
          requested_quantity: number | null
          total_allocations: number | null
          total_allocated_quantity: number | null
          current_stage: string | null
          needs_allocation: boolean | null
          allocated_count: number | null
          in_trimming_count: number | null
          trimmed_count: number | null
          in_packaging_count: number | null
          packaged_count: number | null
          labeled_count: number | null
          coa_attached_count: number | null
          ready_count: number | null
          progress_percentage: number | null
          active_trim_sessions: string | null
          active_packaging_sessions: string | null
          last_stage_change: string | null
        }
        Relationships: []
      }
      order_items_with_testing_data: {
        Row: {
          order_item_id: string | null
          order_id: string | null
          product_id: string | null
          quantity: number | null
          unit_price: number | null
          subtotal: number | null
          batch_id: string | null
          batch_number: string | null
          batch_strain: string | null
          harvest_date: string | null
          coa_id: string | null
          coa_strain: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          total_cannabinoids_percentage: number | null
          total_terpenes_mg_g: number | null
          terpene_1_name: string | null
          terpene_1_value: number | null
          terpene_1_percentage: number | null
          terpene_2_name: string | null
          terpene_2_value: number | null
          terpene_2_percentage: number | null
          terpene_3_name: string | null
          terpene_3_value: number | null
          terpene_3_percentage: number | null
          sample_date: string | null
          coa_pdf_path: string | null
        }
        Relationships: []
      }
      order_material_requirements: {
        Row: {
          order_id: string | null
          order_number: string | null
          requested_delivery_date: string | null
          order_status: string | null
          strain: string | null
          product_type: string | null
          quantity: number | null
          grams_needed_with_overage: number | null
          bulk_product_type: string | null
        }
        Relationships: []
      }
      order_pipeline: {
        Row: {
          id: string | null
          order_number: string | null
          status: string | null
          priority: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          delivery_notes: string | null
          internal_notes: string | null
          created_at: string | null
          updated_at: string | null
          archived: boolean | null
          order_source: string | null
          customer_name: string | null
          total_amount: number | null
          item_count: number | null
        }
        Relationships: []
      }
      order_workflow_summary: {
        Row: {
          order_id: string | null
          order_number: string | null
          customer_id: string | null
          order_status: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          archived: boolean | null
          total_items: number | null
          items_awaiting_allocation: number | null
          items_allocated: number | null
          items_in_trimming: number | null
          items_trimmed: number | null
          items_in_packaging: number | null
          items_packaged: number | null
          items_labeled: number | null
          items_with_coa: number | null
          items_ready: number | null
          overall_stage: string | null
          overall_progress_percentage: number | null
          has_items_awaiting_allocation: boolean | null
          has_items_in_production: boolean | null
          has_items_ready_for_labeling: boolean | null
          has_items_ready_to_ship: boolean | null
          ready_to_ship: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      orderable_packaged_inventory: {
        Row: {
          product_id: string | null
          product_name: string | null
          sku: string | null
          product_type: string | null
          unit_weight_grams: number | null
          strain: string | null
          strain_code: string | null
          price_per_unit: number | null
          pricing_unit: string | null
          units_available: number | null
          total_grams_available: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Relationships: []
      }
      orders_by_delivery_month: {
        Row: {
          delivery_month: string | null
          delivery_month_name: string | null
          id: string | null
          order_number: string | null
          customer_id: string | null
          customer_name: string | null
          dispensary_code: string | null
          order_date: string | null
          entry_date: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          status: string | null
          priority: string | null
          total_amount: number | null
          delivery_notes: string | null
          internal_notes: string | null
          archived: boolean | null
          delivery_year: number | null
          delivery_month_num: number | null
          item_count: number | null
        }
        Relationships: []
      }
      package_assignments_details: {
        Row: {
          id: string | null
          order_id: string | null
          order_item_id: string | null
          package_id: string | null
          quantity_assigned: number | null
          label_id: string | null
          notes: string | null
          assigned_by: string | null
          assigned_at: string | null
          created_at: string | null
          updated_at: string | null
          order_number: string | null
          customer_id: string | null
          scheduled_delivery_date: string | null
          order_status: string | null
          order_item_quantity: number | null
          unit_price: number | null
          order_item_strain: string | null
          product_name: string | null
          product_type: string | null
          inventory_item_id: string | null
          inventory_product_name: string | null
          strain: string | null
          batch_number: string | null
          batch: string | null
          status: string | null
          available_qty: number | null
          unit: string | null
          room: string | null
          package_date: string | null
          label_number: string | null
          barcode_data: string | null
          printed_at: string | null
          voided_at: string | null
        }
        Relationships: []
      }
      packaged_inventory_availability: {
        Row: {
          id: string | null
          strain: string | null
          product_type: string | null
          unit_size: string | null
          total_units: number | null
          allocated_units: number | null
          available_units: number | null
          batch_id: string | null
          package_date: string | null
          created_at: string | null
        }
        Relationships: []
      }
      packaging_yield_statistics: {
        Row: {
          strain: string | null
          source_type: string | null
          target_type: string | null
          total_conversions: number | null
          avg_yield_percentage: number | null
          std_dev_yield: number | null
          min_yield: number | null
          max_yield: number | null
          avg_units_per_gram: number | null
          first_conversion_date: string | null
          last_conversion_date: string | null
        }
        Relationships: []
      }
      pending_conversion_sessions: {
        Row: {
          aggregation_id: string | null
          session_type: string | null
          batch_id: string | null
          batch_name: string | null
          strain_id: string | null
          strain_name: string | null
          product_id: string | null
          product_name: string | null
          output_weight: number | null
          output_units: number | null
          first_completed_at: string | null
          last_completed_at: string | null
          session_count: number | null
          session_ids: string[] | null
          finalization_status: Database["public"]["Enums"]["finalization_status"] | null
          has_partial_packages: boolean | null
        }
        Relationships: []
      }
      pending_conversions: {
        Row: {
          session_id: string | null
          session_type: string | null
          batch_registry_id: string | null
          batch_id: string | null
          strain_id: string | null
          input_weight: number | null
          output_weight: number | null
          loss_weight: number | null
          remaining_weight: number | null
          product_name: string | null
          output_stage: string | null
          session_status: string | null
          finalization_status: Database["public"]["Enums"]["finalization_status"] | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Relationships: []
      }
      pending_invoices: {
        Row: {
          order_id: string | null
          order_number: string | null
          order_status: string | null
          customer_name: string | null
          customer_id: string | null
          total_amount: number | null
          scheduled_delivery_date: string | null
          has_invoice: boolean | null
          invoice_number: string | null
          invoice_status: string | null
        }
        Relationships: []
      }
      projected_inventory_requirements: {
        Row: {
          strain: string | null
          product_type: string | null
          product_category: string | null
          product_name: string | null
          total_units_needed: number | null
          packaged_units_available: number | null
          units_still_needed: number | null
          bulk_grams_available: number | null
          grams_needed_from_bulk: number | null
          bucked_grams_needed: number | null
          order_count: number | null
          earliest_delivery_date: string | null
          order_numbers: string | null
        }
        Relationships: []
      }
      route_statistics: {
        Row: {
          total_cached_routes: number | null
          fresh_routes: number | null
          stale_routes: number | null
          total_distance_cached: number | null
          avg_route_distance: number | null
          avg_route_duration: number | null
        }
        Relationships: []
      }
      session_order_links: {
        Row: {
          session_id: string | null
          session_type: string | null
          session_status: string | null
          worker_name: string | null
          strain: string | null
          order_id: string | null
          order_number: string | null
          affected_items: number | null
          session_started_at: string | null
          session_completed_at: string | null
        }
        Relationships: []
      }
      strain_conversion_analysis: {
        Row: {
          strain: string | null
          from_stage: string | null
          to_stage: string | null
          actual_percentage: number | null
          expected_percentage: number | null
          variance_percentage: number | null
          sample_size: number | null
          analysis_date: string | null
          performance_status: string | null
        }
        Relationships: []
      }
      strain_data_quality: {
        Row: {
          issue_type: string | null
          entity_id: string | null
          entity_name: string | null
          table_name: string | null
        }
        Relationships: []
      }
      strain_metadata_compat: {
        Row: {
          id: string | null
          name: string | null
          type: string | null
          genetics: string | null
          abbreviation: string | null
          avg_bucked_to_flower_ratio: number | null
          avg_bucked_to_smalls_ratio: number | null
          avg_bucked_to_trim_ratio: number | null
          avg_waste_percentage: number | null
          avg_trim_grams_per_hour: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      test_mode_status: {
        Row: {
          enabled: boolean | null
          retention_days: number | null
          total_audit_entries: number | null
          audit_entries_last_24h: number | null
          unique_validations_bypassed: number | null
        }
        Relationships: []
      }
      trim_productivity_by_strain: {
        Row: {
          strain: string | null
          trimmer_name: string | null
          session_count: number | null
          avg_grams_per_hour: number | null
          avg_flower_output: number | null
          avg_smalls_output: number | null
          avg_trim_output: number | null
          avg_waste: number | null
          avg_flower_yield_percentage: number | null
          avg_smalls_yield_percentage: number | null
        }
        Relationships: []
      }
      v_atp: {
        Row: {
          item_id: string | null
          package_id: string | null
          product_name: string | null
          strain: string | null
          batch_id: string | null
          batch_number: string | null
          product_stage_id: string | null
          stage_name: string | null
          unit: string | null
          on_hand_qty: number | null
          reserved_qty: number | null
          atp_qty: number | null
        }
        Relationships: []
      }
      v_batch_stage_balances: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          product_stage_id: string | null
          stage: string | null
          sort_order: number | null
          weight_grams: number | null
          unit_count: number | null
          available_weight_grams: number | null
          item_count: number | null
          last_updated: string | null
        }
        Relationships: []
      }
      v_daily_movement_volume: {
        Row: {
          movement_date: string | null
          movement_kind: string | null
          count: number | null
          total_qty: number | null
          avg_qty: number | null
        }
        Relationships: []
      }
      v_inventory_atp: {
        Row: {
          item_id: string | null
          package_id: string | null
          product_name: string | null
          product_stage_id: string | null
          batch_id: string | null
          on_hand_qty: number | null
          reserved_qty: number | null
          released_qty: number | null
          atp_qty: number | null
          unit: string | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_inventory_balances: {
        Row: {
          item_id: string | null
          package_id: string | null
          sku: string | null
          product_name: string | null
          batch: string | null
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          product_stage_id: string | null
          stage_name: string | null
          parent_item_id: string | null
          unit: string | null
          on_hand_qty: number | null
          status: string | null
          category: string | null
          room: string | null
          created_at: string | null
          last_updated: string | null
        }
        Relationships: []
      }
      v_lineage: {
        Row: {
          item_id: string | null
          parent_item_id: string | null
          batch_id: string | null
          depth: number | null
          path: string[] | null
        }
        Relationships: []
      }
      v_movement_error_rate: {
        Row: {
          date: string | null
          total_movements: number | null
          total_errors: number | null
          error_percentage: number | null
        }
        Relationships: []
      }
      v_movement_stats: {
        Row: {
          movement_kind: string | null
          total_count: number | null
          total_qty: number | null
          avg_qty: number | null
          min_qty: number | null
          max_qty: number | null
          unique_items: number | null
          active_days: number | null
          first_movement: string | null
          last_movement: string | null
        }
        Relationships: []
      }
      v_quarantined_batches: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain: string | null
          lifecycle_state: string | null
          is_quarantined: boolean | null
          quarantine_reason: string | null
          quarantined_at: string | null
          affected_item_count: number | null
          total_on_hand_qty: number | null
          blocked_operation_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_conversion_rates_by_session: {
        Row: {
          conversion_date: string | null
          session_id: string | null
          packages_created: number | null
          total_weight_grams: number | null
          total_units: number | null
          batch_number: string | null
          strain_name: string | null
        }
        Relationships: []
      }
      vw_inventory_strain_data_quality: {
        Row: {
          inventory_item_id: string | null
          package_id: string | null
          batch_id: string | null
          text_strain: string | null
          strain_id: string | null
          matched_strain_name: string | null
          batch_text_strain: string | null
          batch_strain_id: string | null
          batch_strain_name: string | null
          data_quality_status: string | null
        }
        Relationships: []
      }
      vw_manager_review_performance: {
        Row: {
          manager_id: string | null
          manager_name: string | null
          packages_reviewed: number | null
          avg_hours_to_review: number | null
          first_review: string | null
          latest_review: string | null
          reviewed_today: number | null
        }
        Relationships: []
      }
      vw_packaging_sessions_strain_quality: {
        Row: {
          id: string | null
          package_id: string | null
          text_strain: string | null
          strain_id: string | null
          matched_strain_name: string | null
          batch_strain_id: string | null
          batch_strain_name: string | null
          data_quality_status: string | null
        }
        Relationships: []
      }
      vw_pending_review_summary: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          strain_name: string | null
          strain_code: string | null
          product_stage_id: string | null
          stage_name: string | null
          product_name: string | null
          package_count: number | null
          total_qty: number | null
          unit: string | null
          oldest_package: string | null
          newest_package: string | null
          item_ids: string[] | null
        }
        Relationships: []
      }
      vw_trim_sessions_strain_quality: {
        Row: {
          id: string | null
          package_id: string | null
          text_strain: string | null
          strain_id: string | null
          matched_strain_name: string | null
          batch_strain_id: string | null
          batch_strain_name: string | null
          data_quality_status: string | null
        }
        Relationships: []
      }
      vw_variance_trends: {
        Row: {
          week: string | null
          variance_reason: Database["public"]["Enums"]["variance_reason"] | null
          occurrence_count: number | null
          avg_weight_variance_grams: number | null
          total_abs_variance_grams: number | null
          avg_unit_variance: number | null
          batch_number: string | null
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
      calculate_batch_projection: {
        Args: {
          p_strain: string
          p_source_stage: string
          p_source_weight: number
          p_target_stage: string
        }
        Returns: number
      }
      calculate_ledger_quantity: {
        Args: {
          p_item_id: string
        }
        Returns: number
      }
      calculate_order_age_color: {
        Args: {
          order_date: string
        }
        Returns: string
      }
      calculate_packaging_yield_statistics: {
        Args: {
          p_strain: string
          p_source_type: string
          p_target_type: string
          p_days_back?: number
        }
        Returns: Record<string, unknown>[]
      }
      can_close_conversion: {
        Args: {
          p_session_type: string
          p_session_id: string
        }
        Returns: boolean
      }
      check_batch_has_valid_coa: {
        Args: {
          batch_uuid: string
        }
        Returns: boolean
      }
      check_batch_over_allocation: {
        Args: {
          p_batch_id: string
          p_stage?: string
        }
        Returns: Record<string, unknown>[]
      }
      check_trigger_health: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      cleanup_old_test_mode_logs: {
        Args: Record<string, never>
        Returns: number
      }
      consolidate_packaging_session_output: {
        Args: {
          p_session_id: string
          p_strain: string
          p_strain_abbreviation: string
          p_session_date: string
          p_units_3_5g: number
          p_units_14g: number
          p_units_454g: number
        }
        Returns: undefined
      }
      consolidate_trim_session_output: {
        Args: {
          p_session_id: string
          p_strain: string
          p_strain_abbreviation: string
          p_session_date: string
          p_flower_grams: number
          p_smalls_grams: number
          p_trim_grams: number
        }
        Returns: undefined
      }
      create_reconciliation_movement: {
        Args: {
          p_item_id: string
          p_counted_qty: number
          p_reason_code?: string
          p_notes?: string
        }
        Returns: string
      }
      deduct_inventory_for_order: {
        Args: {
          order_id_param: string
        }
        Returns: undefined
      }
      disable_movement_trigger: {
        Args: Record<string, never>
        Returns: string
      }
      drop_deprecated_inventory_tables: {
        Args: {
          confirm_text?: string
        }
        Returns: string
      }
      enable_movement_trigger: {
        Args: Record<string, never>
        Returns: string
      }
      finalize_session_aggregated: {
        Args: {
          p_batch_id: string
          p_product_name?: string
          p_session_type?: string
        }
        Returns: Json
      }
      find_strain_by_name: {
        Args: {
          p_strain_name: string
        }
        Returns: Record<string, unknown>
      }
      fix_strain_data_quality_issues: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      fn_apply_audit_adjustments: {
        Args: {
          p_audit_id: string
          p_user_id: string
        }
        Returns: Record<string, unknown>[]
      }
      fn_check_stage_locked: {
        Args: {
          stages: string[]
        }
        Returns: Record<string, unknown>[]
      }
      fn_generate_audit_number: {
        Args: Record<string, never>
        Returns: string
      }
      fn_lock_inventory_stages: {
        Args: {
          p_audit_id: string
          p_stages: string[]
        }
        Returns: boolean
      }
      fn_unlock_inventory_stages: {
        Args: {
          p_audit_id: string
        }
        Returns: boolean
      }
      fn_validate_batch_lifecycle_transition: {
        Args: {
          p_batch_id: string
          p_from_state: string
          p_to_state: string
        }
        Returns: boolean
      }
      fn_validate_batch_not_quarantined: {
        Args: {
          p_batch_id: string
          p_operation?: string
        }
        Returns: boolean
      }
      generate_consolidated_package_id: {
        Args: {
          p_package_date: string
          p_strain_abbreviation: string
        }
        Returns: string
      }
      generate_coversheet_token: {
        Args: Record<string, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<string, never>
        Returns: string
      }
      generate_manifest_number: {
        Args: Record<string, never>
        Returns: string
      }
      generate_next_package_id: {
        Args: {
          p_batch_id: string
        }
        Returns: string
      }
      generate_order_public_token: {
        Args: Record<string, never>
        Returns: string
      }
      get_active_bucking_sessions: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_active_products: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
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
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_batch_available_stages: {
        Args: {
          p_batch_id: string
        }
        Returns: string[]
      }
      get_batch_coa_data: {
        Args: {
          p_batch_number: string
        }
        Returns: Record<string, unknown>[]
      }
      get_batch_strain_summary: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_batches_for_strain: {
        Args: {
          p_strain: string
        }
        Returns: Record<string, unknown>[]
      }
      get_bucking_remaining_weight: {
        Args: {
          session_id: string
        }
        Returns: number
      }
      get_bucking_session_stats: {
        Args: {
          p_date?: string
        }
        Returns: Record<string, unknown>[]
      }
      get_canonical_products_for_strain: {
        Args: {
          p_strain_id: string
        }
        Returns: Record<string, unknown>[]
      }
      get_conversion_lot_summary: {
        Args: {
          p_date?: string
        }
        Returns: Record<string, unknown>[]
      }
      get_coversheet_customer_info: {
        Args: {
          p_order_id: string
        }
        Returns: Record<string, unknown>[]
      }
      get_inventory_discrepancies: {
        Args: {
          p_min_discrepancy?: number
          p_limit?: number
        }
        Returns: Record<string, unknown>[]
      }
      get_item_movement_history: {
        Args: {
          p_item_id: string
          p_limit?: number
        }
        Returns: Record<string, unknown>[]
      }
      get_movement_metrics: {
        Args: {
          p_hours?: number
        }
        Returns: Record<string, unknown>[]
      }
      get_next_package_sequence: {
        Args: {
          p_package_date: string
          p_strain_abbreviation: string
        }
        Returns: number
      }
      get_or_create_batch_from_inventory: {
        Args: {
          p_batch_number: string
          p_strain_name: string
          p_room?: string
        }
        Returns: string
      }
      get_or_create_strain: {
        Args: {
          p_strain_name: string
          p_category?: string
        }
        Returns: string
      }
      get_order_data_health: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_package_date_from_conversion: {
        Args: {
          p_pending_conversion_id: string
        }
        Returns: string
      }
      get_packaging_remaining_weight: {
        Args: {
          session_id: string
        }
        Returns: number
      }
      get_pending_conversions: {
        Args: {
          p_date?: string
        }
        Returns: Record<string, unknown>[]
      }
      get_product_coverage_report: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_product_id_by_strain_stage_and_type: {
        Args: {
          p_batch_id: string
          p_stage_name: string
          p_is_smalls?: boolean
        }
        Returns: string
      }
      get_recent_movement_errors: {
        Args: {
          p_limit?: number
        }
        Returns: Record<string, unknown>[]
      }
      get_strain_abbreviation: {
        Args: {
          p_strain_name: string
        }
        Returns: string
      }
      get_trigger_performance_summary: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_trim_remaining_weight: {
        Args: {
          session_id: string
        }
        Returns: number
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_product_orderable: {
        Args: {
          p_product_id: string
        }
        Returns: boolean
      }
      is_test_mode_enabled: {
        Args: Record<string, never>
        Returns: boolean
      }
      log_test_mode_bypass: {
        Args: {
          p_action: string
          p_validation_bypassed: string
          p_context?: Json
        }
        Returns: string
      }
      normalize_strain_name: {
        Args: {
          p_strain_name: string
        }
        Returns: string
      }
      record_session_loss_weight: {
        Args: {
          p_session_type: string
          p_session_id: string
          p_loss_grams: number
        }
        Returns: Json
      }
      repair_order_totals: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      resolve_movement_error: {
        Args: {
          p_error_id: string
        }
        Returns: undefined
      }
      restore_inventory_for_order: {
        Args: {
          order_id_param: string
        }
        Returns: undefined
      }
      rollback_to_direct_updates: {
        Args: Record<string, never>
        Returns: string
      }
      simulate_movement_scenario: {
        Args: {
          scenario_name: string
        }
        Returns: Record<string, unknown>[]
      }
      sync_batch_stage_tracking: {
        Args: Record<string, never>
        Returns: undefined
      }
      sync_batches_from_inventory: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      sync_order_item_strains: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      sync_product_strain_ids: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      sync_products_for_all_strains: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      sync_products_for_strain: {
        Args: {
          p_strain_id: string
          p_is_active?: boolean
        }
        Returns: Record<string, unknown>[]
      }
      test_movement_trigger: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      update_allocation_workflow_stage: {
        Args: {
          allocation_id: string
          new_stage: Database["public"]["Enums"]["allocation_workflow_stage"]
        }
        Returns: undefined
      }
      update_batch_tracking_from_inventory: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      update_user_profile: {
        Args: {
          target_user_id: string
          new_full_name?: string
          new_role?: string
          new_is_active?: boolean
        }
        Returns: undefined
      }
      validate_batch_strain_match: {
        Args: {
          p_batch_id: string
          p_strain: string
        }
        Returns: boolean
      }
      validate_canonical_product_catalog: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      validate_label_coa_requirement: {
        Args: {
          p_batch_number: string
          p_label_type_code: string
        }
        Returns: Record<string, unknown>[]
      }
      validate_order_totals: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      validate_ready_for_delivery: {
        Args: {
          order_id_param: string
        }
        Returns: boolean
      }
      validate_strain_names: {
        Args: {
          p_strain_names: string[]
        }
        Returns: Record<string, unknown>[]
      }
      verify_all_inventory: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      void_session_aggregated: {
        Args: {
          p_batch_id: string
          p_product_name?: string
          p_session_type?: string
          p_reason?: string
        }
        Returns: Json
      }
    }
    Enums: {
      allocation_workflow_stage: 'allocated' | 'in_trimming' | 'trimmed' | 'in_packaging' | 'packaged' | 'labeled' | 'coa_attached' | 'ready_for_delivery'
      audit_status: 'initiated' | 'in_progress' | 'completed' | 'cancelled'
      finalization_status: 'pending' | 'finalized' | 'voided'
      order_item_status: 'trimming' | 'packaging' | 'labeling' | 'pending_coa' | 'ready_for_delivery'
      variance_reason: 'moisture_loss' | 'spillage' | 'measurement_error' | 'waste' | 'theft_loss' | 'other'
      variance_source: 'audit_reconciliation' | 'session_conversion' | 'manual_adjustment'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

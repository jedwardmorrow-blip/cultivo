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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      batch_registry: {
        Row: {
          batch_number: string
          bucking_started_at: string | null
          coa_id: string | null
          completed_at: string | null
          created_at: string | null
          depleted_at: string | null
          harvest_date: string | null
          id: string
          initial_weight_grams: number | null
          is_quarantined: boolean | null
          lifecycle_state: string | null
          notes: string | null
          packaging_started_at: string | null
          quarantine_reason: string | null
          quarantined_at: string | null
          room: string | null
          status: string | null
          strain: string
          strain_id: string | null
          trimming_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          bucking_started_at?: string | null
          coa_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          depleted_at?: string | null
          harvest_date?: string | null
          id?: string
          initial_weight_grams?: number | null
          is_quarantined?: boolean | null
          lifecycle_state?: string | null
          notes?: string | null
          packaging_started_at?: string | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          room?: string | null
          status?: string | null
          strain: string
          strain_id?: string | null
          trimming_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          bucking_started_at?: string | null
          coa_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          depleted_at?: string | null
          harvest_date?: string | null
          id?: string
          initial_weight_grams?: number | null
          is_quarantined?: boolean | null
          lifecycle_state?: string | null
          notes?: string | null
          packaging_started_at?: string | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          room?: string | null
          status?: string | null
          strain?: string
          strain_id?: string | null
          trimming_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_tank_mix_log: {
        Row: {
          actual_ec: number | null
          actual_gallons: number | null
          actual_ph: number | null
          actual_products: Json | null
          batch_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          feed_program_id: string | null
          id: string
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
          status: string
          task_instance_id: string | null
          updated_at: string
        }
        Insert: {
          actual_ec?: number | null
          actual_gallons?: number | null
          actual_ph?: number | null
          actual_products?: Json | null
          batch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          feed_program_id?: string | null
          id?: string
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
          status?: string
          task_instance_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_ec?: number | null
          actual_gallons?: number | null
          actual_ph?: number | null
          actual_products?: Json | null
          batch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          feed_program_id?: string | null
          id?: string
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
          status?: string
          task_instance_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_tank_mix_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "batch_tank_mix_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
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
          entry_order: number | null
          id: string
          notes: string | null
        }
        Insert: {
          bin_weight_grams: number
          binning_session_id: string
          created_at?: string
          created_by?: string | null
          entry_order?: number | null
          id?: string
          notes?: string | null
        }
        Update: {
          bin_weight_grams?: number
          binning_session_id?: string
          created_at?: string
          created_by?: string | null
          entry_order?: number | null
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
          dry_weight_grams?: number
          harvest_session_id: string
          id?: string
          notes?: string | null
          session_status?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "binning_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
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
        ]
      }
      business_context: {
        Row: {
          category: string
          confidence: string
          created_at: string
          design_rationale: string | null
          embedded_at: string | null
          embedding: string | null
          id: string
          key: string
          last_accessed_at: string | null
          metadata: Json | null
          row_type: string
          source: string
          source_detail: string | null
          subcategory: string | null
          subject_user_id: string | null
          summary: string | null
          superseded_by: string | null
          updated_at: string
          value: string
          visibility: string
        }
        Insert: {
          category: string
          confidence?: string
          created_at?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          key: string
          last_accessed_at?: string | null
          metadata?: Json | null
          row_type?: string
          source: string
          source_detail?: string | null
          subcategory?: string | null
          subject_user_id?: string | null
          summary?: string | null
          superseded_by?: string | null
          updated_at?: string
          value: string
          visibility?: string
        }
        Update: {
          category?: string
          confidence?: string
          created_at?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          key?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          row_type?: string
          source?: string
          source_detail?: string | null
          subcategory?: string | null
          subject_user_id?: string | null
          summary?: string | null
          superseded_by?: string | null
          updated_at?: string
          value?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_context_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "business_context"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_categories: {
        Row: {
          created_at: string | null
          description: string | null
          domain: string
          label: string
          slug: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domain: string
          label: string
          slug: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domain?: string
          label?: string
          slug?: string
          visibility?: string
        }
        Relationships: []
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
          cleaning_type?: string
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
            foreignKeyName: "cleaning_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
      concentrate_mix_log: {
        Row: {
          actual_products: Json | null
          actual_volume_gal: number | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          concentrate_ratio: string | null
          created_at: string
          feed_program_id: string | null
          id: string
          prescribed_at: string | null
          prescribed_by: string | null
          prescribed_products: Json | null
          prescribed_volume_gal: number | null
          prescription_notes: string | null
          status: string
          task_instance_id: string | null
          updated_at: string
        }
        Insert: {
          actual_products?: Json | null
          actual_volume_gal?: number | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          concentrate_ratio?: string | null
          created_at?: string
          feed_program_id?: string | null
          id?: string
          prescribed_at?: string | null
          prescribed_by?: string | null
          prescribed_products?: Json | null
          prescribed_volume_gal?: number | null
          prescription_notes?: string | null
          status?: string
          task_instance_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_products?: Json | null
          actual_volume_gal?: number | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          concentrate_ratio?: string | null
          created_at?: string
          feed_program_id?: string | null
          id?: string
          prescribed_at?: string | null
          prescribed_by?: string | null
          prescribed_products?: Json | null
          prescribed_volume_gal?: number | null
          prescription_notes?: string | null
          status?: string
          task_instance_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concentrate_mix_log_feed_program_id_fkey"
            columns: ["feed_program_id"]
            isOneToOne: false
            referencedRelation: "feed_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concentrate_mix_log_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "daily_task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      cowork_queue: {
        Row: {
          blocked_by: string | null
          confidence: string
          context_db_keys: string[] | null
          created_at: string
          created_by_session: string | null
          description: string
          executed_at: string | null
          executed_by: string | null
          execution_notes: string | null
          id: string
          priority: string
          proposed_code: string | null
          proposed_sql: string | null
          result: string | null
          status: string
          target_identifier: string | null
          target_system: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          blocked_by?: string | null
          confidence?: string
          context_db_keys?: string[] | null
          created_at?: string
          created_by_session?: string | null
          description: string
          executed_at?: string | null
          executed_by?: string | null
          execution_notes?: string | null
          id?: string
          priority?: string
          proposed_code?: string | null
          proposed_sql?: string | null
          result?: string | null
          status?: string
          target_identifier?: string | null
          target_system?: string | null
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          blocked_by?: string | null
          confidence?: string
          context_db_keys?: string[] | null
          created_at?: string
          created_by_session?: string | null
          description?: string
          executed_at?: string | null
          executed_by?: string | null
          execution_notes?: string | null
          id?: string
          priority?: string
          proposed_code?: string | null
          proposed_sql?: string | null
          result?: string | null
          status?: string
          target_identifier?: string | null
          target_system?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cultivation_plan_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          plan_id: string
          snapshot_data: Json
          snapshot_reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          plan_id: string
          snapshot_data: Json
          snapshot_reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          plan_id?: string
          snapshot_data?: Json
          snapshot_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultivation_plan_snapshots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cultivation_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cultivation_plans: {
        Row: {
          actual_clone_date: string | null
          actual_dry_date: string | null
          actual_flower_date: string | null
          actual_harvest_date: string | null
          actual_veg_start_date: string | null
          batch_id: string | null
          clone_date: string | null
          clone_days: number | null
          created_at: string
          created_by: string | null
          dry_date: string | null
          dry_days: number | null
          feed_program_id: string | null
          flower_date: string | null
          flower_days: number | null
          harvest_date: string | null
          id: string
          mother_plant_group_id: string | null
          notes: string | null
          plan_name: string | null
          plan_status: string
          planned_clone_count: number | null
          planned_plant_count: number | null
          projected_dry_weight_g: number | null
          projected_packaged_weight_g: number | null
          projected_wet_weight_g: number | null
          room_id: string
          strain_id: string | null
          turnaround_days: number | null
          updated_at: string
          veg_days: number | null
          veg_start_date: string | null
        }
        Insert: {
          actual_clone_date?: string | null
          actual_dry_date?: string | null
          actual_flower_date?: string | null
          actual_harvest_date?: string | null
          actual_veg_start_date?: string | null
          batch_id?: string | null
          clone_date?: string | null
          clone_days?: number | null
          created_at?: string
          created_by?: string | null
          dry_date?: string | null
          dry_days?: number | null
          feed_program_id?: string | null
          flower_date?: string | null
          flower_days?: number | null
          harvest_date?: string | null
          id?: string
          mother_plant_group_id?: string | null
          notes?: string | null
          plan_name?: string | null
          plan_status?: string
          planned_clone_count?: number | null
          planned_plant_count?: number | null
          projected_dry_weight_g?: number | null
          projected_packaged_weight_g?: number | null
          projected_wet_weight_g?: number | null
          room_id: string
          strain_id?: string | null
          turnaround_days?: number | null
          updated_at?: string
          veg_days?: number | null
          veg_start_date?: string | null
        }
        Update: {
          actual_clone_date?: string | null
          actual_dry_date?: string | null
          actual_flower_date?: string | null
          actual_harvest_date?: string | null
          actual_veg_start_date?: string | null
          batch_id?: string | null
          clone_date?: string | null
          clone_days?: number | null
          created_at?: string
          created_by?: string | null
          dry_date?: string | null
          dry_days?: number | null
          feed_program_id?: string | null
          flower_date?: string | null
          flower_days?: number | null
          harvest_date?: string | null
          id?: string
          mother_plant_group_id?: string | null
          notes?: string | null
          plan_name?: string | null
          plan_status?: string
          planned_clone_count?: number | null
          planned_plant_count?: number | null
          projected_dry_weight_g?: number | null
          projected_packaged_weight_g?: number | null
          projected_wet_weight_g?: number | null
          room_id?: string
          strain_id?: string | null
          turnaround_days?: number | null
          updated_at?: string
          veg_days?: number | null
          veg_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultivation_plans_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultivation_plans_feed_program_id_fkey"
            columns: ["feed_program_id"]
            isOneToOne: false
            referencedRelation: "feed_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultivation_plans_mother_plant_group_id_fkey"
            columns: ["mother_plant_group_id"]
            isOneToOne: false
            referencedRelation: "plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultivation_plans_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultivation_plans_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
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
            foreignKeyName: "custom_task_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
          attendance_date: string
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
            foreignKeyName: "daily_attendance_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
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
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          annotation_date?: string
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_urls?: string[] | null
          related_task_id?: string | null
          room_id: string
          severity?: string
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
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
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
          progress_data: Json
          room_id: string
          schedule_id: string | null
          scope: string
          status: string
          task_config: Json
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
          progress_data?: Json
          room_id: string
          schedule_id?: string | null
          scope?: string
          status?: string
          task_config?: Json
          task_date: string
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
          progress_data?: Json
          room_id?: string
          schedule_id?: string | null
          scope?: string
          status?: string
          task_config?: Json
          task_date?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_instances_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_instances_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
      db_health_snapshot: {
        Row: {
          created_at: string
          embedded_rows: number
          id: string
          missing_embeddings: number
          row_count: number
          snapshot_at: string
          superseded_rows: number
          table_name: string
          visibility: string
        }
        Insert: {
          created_at?: string
          embedded_rows?: number
          id?: string
          missing_embeddings?: number
          row_count?: number
          snapshot_at?: string
          superseded_rows?: number
          table_name: string
          visibility?: string
        }
        Update: {
          created_at?: string
          embedded_rows?: number
          id?: string
          missing_embeddings?: number
          row_count?: number
          snapshot_at?: string
          superseded_rows?: number
          table_name?: string
          visibility?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          alternatives_considered: Json | null
          category: string
          created_at: string
          decided_by: string
          decision: string
          design_rationale: string | null
          embedded_at: string | null
          embedding: string | null
          id: string
          impact: string | null
          metadata: Json | null
          rationale: string
          related_task_ids: string[] | null
          reversible: boolean | null
          session_id: string | null
          visibility: string
        }
        Insert: {
          alternatives_considered?: Json | null
          category: string
          created_at?: string
          decided_by?: string
          decision: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          impact?: string | null
          metadata?: Json | null
          rationale: string
          related_task_ids?: string[] | null
          reversible?: boolean | null
          session_id?: string | null
          visibility?: string
        }
        Update: {
          alternatives_considered?: Json | null
          category?: string
          created_at?: string
          decided_by?: string
          decision?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          impact?: string | null
          metadata?: Json | null
          rationale?: string
          related_task_ids?: string[] | null
          reversible?: boolean | null
          session_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_log"
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
          defoliation_type?: string
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
            foreignKeyName: "defoliation_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
      documents: {
        Row: {
          category: string
          content: string
          created_at: string | null
          embedded_at: string | null
          embedding: string | null
          id: string
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
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
      feed_products: {
        Row: {
          brand: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mixing_order_hint: number | null
          name: string
          notes: string | null
          product_type: string
          sku: string | null
          unit: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mixing_order_hint?: number | null
          name: string
          notes?: string | null
          product_type?: string
          sku?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mixing_order_hint?: number | null
          name?: string
          notes?: string | null
          product_type?: string
          sku?: string | null
          unit?: string
          unit_cost?: number | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
            foreignKeyName: "feeding_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
      fresh_frozen_packages: {
        Row: {
          batch_id: string
          created_at: string
          created_by: string | null
          freezer_location: string | null
          frozen_at: string | null
          id: string
          notes: string | null
          package_number: number | null
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
          package_number?: number | null
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
          package_number?: number | null
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
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fresh_frozen_packages_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
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
          plant_group_id: string
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
          plant_group_id: string
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
          plant_group_id?: string
          session_status?: string
          waste_grams?: number | null
          wet_weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "harvest_sessions_batch_registry_id_fkey"
            columns: ["batch_registry_id"]
            isOneToOne: false
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_sessions_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
          created_at: string
          created_by: string | null
          destination: string | null
          entry_order: number | null
          harvest_session_id: string
          id: string
          location_id: string | null
          notes: string | null
          plant_count: number
          weight_grams: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          entry_order?: number | null
          harvest_session_id: string
          id?: string
          location_id?: string | null
          notes?: string | null
          plant_count?: number
          weight_grams: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          entry_order?: number | null
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
          application_method?: string
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
            foreignKeyName: "ipm_spray_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
      issue_log: {
        Row: {
          auto_triage_suggestion: string | null
          component: string | null
          created_at: string
          description: string
          id: string
          lessons_learned_id: string | null
          reported_at: string
          reported_by: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          status: string
          visibility: string
        }
        Insert: {
          auto_triage_suggestion?: string | null
          component?: string | null
          created_at?: string
          description: string
          id?: string
          lessons_learned_id?: string | null
          reported_at?: string
          reported_by?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          visibility?: string
        }
        Update: {
          auto_triage_suggestion?: string | null
          component?: string | null
          created_at?: string
          description?: string
          id?: string
          lessons_learned_id?: string | null
          reported_at?: string
          reported_by?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_log_lessons_learned_id_fkey"
            columns: ["lessons_learned_id"]
            isOneToOne: false
            referencedRelation: "lessons_learned"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph: {
        Row: {
          confidence: string
          created_at: string
          design_rationale: string | null
          domains: string[]
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          last_verified: string
          properties: Json | null
          relationships: Json | null
          session_notes: string | null
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          design_rationale?: string | null
          domains?: string[]
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          last_verified?: string
          properties?: Json | null
          relationships?: Json | null
          session_notes?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          design_rationale?: string | null
          domains?: string[]
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          last_verified?: string
          properties?: Json | null
          relationships?: Json | null
          session_notes?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      lessons_learned: {
        Row: {
          applies_to: string[]
          category: string
          created_at: string
          design_rationale: string | null
          embedded_at: string | null
          embedding: string | null
          id: string
          incident_date: string | null
          lesson: string
          prevention: string
          session_id: string | null
          severity: string
          visibility: string
        }
        Insert: {
          applies_to?: string[]
          category: string
          created_at?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          incident_date?: string | null
          lesson: string
          prevention: string
          session_id?: string | null
          severity: string
          visibility?: string
        }
        Update: {
          applies_to?: string[]
          category?: string
          created_at?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          incident_date?: string | null
          lesson?: string
          prevention?: string
          session_id?: string | null
          severity?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_learned_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_log"
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
          grow_room_id: string
          growth_stage: string
          id: string
          is_mother: boolean
          mother_plant_group_id: string | null
          name: string | null
          notes: string | null
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
          grow_room_id: string
          growth_stage?: string
          id?: string
          is_mother?: boolean
          mother_plant_group_id?: string | null
          name?: string | null
          notes?: string | null
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
          grow_room_id?: string
          growth_stage?: string
          id?: string
          is_mother?: boolean
          mother_plant_group_id?: string | null
          name?: string | null
          notes?: string | null
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
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_groups_grow_room_id_fkey"
            columns: ["grow_room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
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
            referencedRelation: "strains"
            referencedColumns: ["id"]
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
            foreignKeyName: "plant_mortality_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "grow_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      proposed_context_updates: {
        Row: {
          agent_id: string
          created_at: string
          files_touched: string[] | null
          id: string
          merge_notes: string | null
          next_steps: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string
        }
        Insert: {
          agent_id?: string
          created_at?: string
          files_touched?: string[] | null
          id?: string
          merge_notes?: string | null
          next_steps?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          files_touched?: string[] | null
          id?: string
          merge_notes?: string | null
          next_steps?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
        }
        Relationships: []
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
          room_type: string
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
        ]
      }
      room_task_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number[] | null
          default_config: Json
          end_date: string | null
          id: string
          interval_days: number | null
          is_active: boolean
          notes: string | null
          phase_day_end: number | null
          phase_day_start: number | null
          priority: string
          recurrence: string
          room_id: string
          scheduling_mode: string
          scope: string
          start_date: string
          task_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number[] | null
          default_config?: Json
          end_date?: string | null
          id?: string
          interval_days?: number | null
          is_active?: boolean
          notes?: string | null
          phase_day_end?: number | null
          phase_day_start?: number | null
          priority?: string
          recurrence?: string
          room_id: string
          scheduling_mode?: string
          scope?: string
          start_date?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number[] | null
          default_config?: Json
          end_date?: string | null
          id?: string
          interval_days?: number | null
          is_active?: boolean
          notes?: string | null
          phase_day_end?: number | null
          phase_day_start?: number | null
          priority?: string
          recurrence?: string
          room_id?: string
          scheduling_mode?: string
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
            foreignKeyName: "scouting_log_scouted_by_fkey"
            columns: ["scouted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
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
      session_log: {
        Row: {
          blockers_found: Json | null
          created_at: string
          design_rationale: string | null
          embedded_at: string | null
          embedding: string | null
          ended_at: string | null
          id: string
          key_decisions: Json | null
          next_actions: Json | null
          session_date: string
          session_number: number
          started_at: string
          status: string
          summary: string
          tools_used: string[] | null
          visibility: string
          work_performed: Json | null
        }
        Insert: {
          blockers_found?: Json | null
          created_at?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          ended_at?: string | null
          id?: string
          key_decisions?: Json | null
          next_actions?: Json | null
          session_date?: string
          session_number?: number
          started_at?: string
          status?: string
          summary: string
          tools_used?: string[] | null
          visibility?: string
          work_performed?: Json | null
        }
        Update: {
          blockers_found?: Json | null
          created_at?: string
          design_rationale?: string | null
          embedded_at?: string | null
          embedding?: string | null
          ended_at?: string | null
          id?: string
          key_decisions?: Json | null
          next_actions?: Json | null
          session_date?: string
          session_number?: number
          started_at?: string
          status?: string
          summary?: string
          tools_used?: string[] | null
          visibility?: string
          work_performed?: Json | null
        }
        Relationships: []
      }
      sprint_plan: {
        Row: {
          actual_sessions: number | null
          completed_at: string | null
          created_at: string | null
          goal: string
          horizon: string
          id: string
          name: string
          notes: string | null
          sprint_number: number
          started_at: string | null
          status: string
          target_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          actual_sessions?: number | null
          completed_at?: string | null
          created_at?: string | null
          goal: string
          horizon: string
          id?: string
          name: string
          notes?: string | null
          sprint_number: number
          started_at?: string | null
          status?: string
          target_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_sessions?: number | null
          completed_at?: string | null
          created_at?: string | null
          goal?: string
          horizon?: string
          id?: string
          name?: string
          notes?: string | null
          sprint_number?: number
          started_at?: string | null
          status?: string
          target_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sprint_ticket: {
        Row: {
          acceptance_criteria: string
          actual_sessions: number | null
          blocked_reason: string | null
          completed_at: string | null
          context_db_keys: string[] | null
          created_at: string | null
          db_objects: string[] | null
          depends_on: string[] | null
          estimated_sessions: number
          executed_by: string | null
          execution_notes: string | null
          executor: string
          files_to_touch: string[] | null
          horizon: string
          id: string
          known_traps: string | null
          priority: number
          result: string | null
          session_log_ids: string[] | null
          spec: string
          sprint_id: string
          started_at: string | null
          status: string
          task_type: string
          ticket_number: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria: string
          actual_sessions?: number | null
          blocked_reason?: string | null
          completed_at?: string | null
          context_db_keys?: string[] | null
          created_at?: string | null
          db_objects?: string[] | null
          depends_on?: string[] | null
          estimated_sessions?: number
          executed_by?: string | null
          execution_notes?: string | null
          executor?: string
          files_to_touch?: string[] | null
          horizon: string
          id?: string
          known_traps?: string | null
          priority?: number
          result?: string | null
          session_log_ids?: string[] | null
          spec: string
          sprint_id: string
          started_at?: string | null
          status?: string
          task_type: string
          ticket_number?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string
          actual_sessions?: number | null
          blocked_reason?: string | null
          completed_at?: string | null
          context_db_keys?: string[] | null
          created_at?: string | null
          db_objects?: string[] | null
          depends_on?: string[] | null
          estimated_sessions?: number
          executed_by?: string | null
          execution_notes?: string | null
          executor?: string
          files_to_touch?: string[] | null
          horizon?: string
          id?: string
          known_traps?: string | null
          priority?: number
          result?: string | null
          session_log_ids?: string[] | null
          spec?: string
          sprint_id?: string
          started_at?: string | null
          status?: string
          task_type?: string
          ticket_number?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_ticket_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_ticket_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "v_sprint_active"
            referencedColumns: ["sprint_id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          last_name: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
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
          avg_yield_per_plant_g: number | null
          bucked_to_bulk_ratio: number | null
          bulk_to_packaged_ratio: number | null
          category: string | null
          cbd_range: string | null
          clone_days_avg: number | null
          created_at: string | null
          cultivation_notes: string | null
          description: string | null
          display_name: string
          dominance_type: string | null
          dry_days_avg: number | null
          feed_group: string | null
          flowering_time_days: number | null
          genetics_description: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          plant_size: string | null
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
          avg_yield_per_plant_g?: number | null
          bucked_to_bulk_ratio?: number | null
          bulk_to_packaged_ratio?: number | null
          category?: string | null
          cbd_range?: string | null
          clone_days_avg?: number | null
          created_at?: string | null
          cultivation_notes?: string | null
          description?: string | null
          display_name: string
          dominance_type?: string | null
          dry_days_avg?: number | null
          feed_group?: string | null
          flowering_time_days?: number | null
          genetics_description?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          plant_size?: string | null
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
          avg_yield_per_plant_g?: number | null
          bucked_to_bulk_ratio?: number | null
          bulk_to_packaged_ratio?: number | null
          category?: string | null
          cbd_range?: string | null
          clone_days_avg?: number | null
          created_at?: string | null
          cultivation_notes?: string | null
          description?: string | null
          display_name?: string
          dominance_type?: string | null
          dry_days_avg?: number | null
          feed_group?: string | null
          flowering_time_days?: number | null
          genetics_description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          plant_size?: string | null
          terpene_profile?: Json | null
          thc_range?: string | null
          typical_yield_percentage?: number | null
          updated_at?: string | null
          veg_days_avg?: number | null
        }
        Relationships: []
      }
      strategic_log: {
        Row: {
          created_at: string | null
          decisions: Json | null
          id: string
          open_questions: Json | null
          session_date: string
          summary: string
          topic: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          created_at?: string | null
          decisions?: Json | null
          id?: string
          open_questions?: Json | null
          session_date?: string
          summary: string
          topic: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string | null
          decisions?: Json | null
          id?: string
          open_questions?: Json | null
          session_date?: string
          summary?: string
          topic?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
      system_rules: {
        Row: {
          active: boolean
          added_by: string
          added_reason: string | null
          created_at: string
          id: string
          rationale: string
          rule_category: string
          rule_number: number
          rule_text: string
          severity: string
          updated_at: string
          visibility: string
        }
        Insert: {
          active?: boolean
          added_by?: string
          added_reason?: string | null
          created_at?: string
          id?: string
          rationale: string
          rule_category: string
          rule_number: number
          rule_text: string
          severity?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          active?: boolean
          added_by?: string
          added_reason?: string | null
          created_at?: string
          id?: string
          rationale?: string
          rule_category?: string
          rule_number?: number
          rule_text?: string
          severity?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      task_tracker: {
        Row: {
          assigned_session: string | null
          blocking_reason: string | null
          category: string
          completed_at: string | null
          completed_session: string | null
          created_at: string
          description: string | null
          design_rationale: string | null
          horizon: string | null
          id: string
          last_triaged: string | null
          metadata: Json | null
          parent_task_id: string | null
          priority: number
          resolution: string | null
          status: string
          strategic_weight: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          assigned_session?: string | null
          blocking_reason?: string | null
          category: string
          completed_at?: string | null
          completed_session?: string | null
          created_at?: string
          description?: string | null
          design_rationale?: string | null
          horizon?: string | null
          id?: string
          last_triaged?: string | null
          metadata?: Json | null
          parent_task_id?: string | null
          priority?: number
          resolution?: string | null
          status?: string
          strategic_weight?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          assigned_session?: string | null
          blocking_reason?: string | null
          category?: string
          completed_at?: string | null
          completed_session?: string | null
          created_at?: string
          description?: string | null
          design_rationale?: string | null
          horizon?: string | null
          id?: string
          last_triaged?: string | null
          metadata?: Json | null
          parent_task_id?: string | null
          priority?: number
          resolution?: string | null
          status?: string
          strategic_weight?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tracker_assigned_session_fkey"
            columns: ["assigned_session"]
            isOneToOne: false
            referencedRelation: "session_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tracker_completed_session_fkey"
            columns: ["completed_session"]
            isOneToOne: false
            referencedRelation: "session_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tracker_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "stale_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tracker_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "task_tracker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tracker_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_priority_dashboard"
            referencedColumns: ["id"]
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
          training_type?: string
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
        ]
      }
      user_context_preferences: {
        Row: {
          confidence: string
          created_at: string
          id: string
          last_updated: string
          preference_key: string
          preference_value: string
          source: string
          user_id: string
          visibility: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          id?: string
          last_updated?: string
          preference_key: string
          preference_value: string
          source?: string
          user_id: string
          visibility?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          id?: string
          last_updated?: string
          preference_key?: string
          preference_value?: string
          source?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_context_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interaction_log: {
        Row: {
          category_matched: string | null
          created_at: string
          escalated_to_justin: boolean | null
          feedback_note: string | null
          feedback_score: number | null
          id: string
          intent_classified: string | null
          queried_at: string
          raw_message: string | null
          response_latency_ms: number | null
          result_type: string | null
          session_id: string | null
          tables_queried: string[] | null
          user_email: string | null
          user_id: string | null
          visibility: string
        }
        Insert: {
          category_matched?: string | null
          created_at?: string
          escalated_to_justin?: boolean | null
          feedback_note?: string | null
          feedback_score?: number | null
          id?: string
          intent_classified?: string | null
          queried_at?: string
          raw_message?: string | null
          response_latency_ms?: number | null
          result_type?: string | null
          session_id?: string | null
          tables_queried?: string[] | null
          user_email?: string | null
          user_id?: string | null
          visibility?: string
        }
        Update: {
          category_matched?: string | null
          created_at?: string
          escalated_to_justin?: boolean | null
          feedback_note?: string | null
          feedback_score?: number | null
          id?: string
          intent_classified?: string | null
          queried_at?: string
          raw_message?: string | null
          response_latency_ms?: number | null
          result_type?: string | null
          session_id?: string | null
          tables_queried?: string[] | null
          user_email?: string | null
          user_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interaction_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interaction_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          ai_access_tier: string
          auth_user_id: string | null
          common_intents: string[]
          communication_style: string
          created_at: string
          data_domains: string[]
          department: string | null
          email: string
          embedded_at: string | null
          embedding: string | null
          full_name: string
          id: string
          is_active: boolean
          jargon_comfort: string
          last_active_at: string | null
          onboarding_complete: boolean
          persona_notes: string | null
          preferred_name: string | null
          preferred_response_length: string
          reports_to: string | null
          role: string
          slack_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          ai_access_tier?: string
          auth_user_id?: string | null
          common_intents?: string[]
          communication_style?: string
          created_at?: string
          data_domains?: string[]
          department?: string | null
          email: string
          embedded_at?: string | null
          embedding?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          jargon_comfort?: string
          last_active_at?: string | null
          onboarding_complete?: boolean
          persona_notes?: string | null
          preferred_name?: string | null
          preferred_response_length?: string
          reports_to?: string | null
          role: string
          slack_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          ai_access_tier?: string
          auth_user_id?: string | null
          common_intents?: string[]
          communication_style?: string
          created_at?: string
          data_domains?: string[]
          department?: string | null
          email?: string
          embedded_at?: string | null
          embedding?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          jargon_comfort?: string
          last_active_at?: string | null
          onboarding_complete?: boolean
          persona_notes?: string | null
          preferred_name?: string | null
          preferred_response_length?: string
          reports_to?: string | null
          role?: string
          slack_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          notes: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          notes?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          notes?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      stale_tasks: {
        Row: {
          blocking_reason: string | null
          category: string | null
          created_at: string | null
          horizon: string | null
          id: string | null
          last_triaged: string | null
          priority: number | null
          staleness_tier: string | null
          status: string | null
          strategic_weight: string | null
          time_since_triage: string | null
          time_since_update: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          blocking_reason?: string | null
          category?: string | null
          created_at?: string | null
          horizon?: string | null
          id?: string | null
          last_triaged?: string | null
          priority?: number | null
          staleness_tier?: never
          status?: string | null
          strategic_weight?: string | null
          time_since_triage?: never
          time_since_update?: never
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          blocking_reason?: string | null
          category?: string | null
          created_at?: string | null
          horizon?: string | null
          id?: string | null
          last_triaged?: string | null
          priority?: number | null
          staleness_tier?: never
          status?: string | null
          strategic_weight?: string | null
          time_since_triage?: never
          time_since_update?: never
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_cowork_queue_active: {
        Row: {
          blocked_by: string | null
          confidence: string | null
          context_db_keys: string[] | null
          created_at: string | null
          created_by_session: string | null
          description: string | null
          id: string | null
          priority: string | null
          proposed_code: string | null
          proposed_sql: string | null
          target_identifier: string | null
          target_system: string | null
          task_type: string | null
          title: string | null
        }
        Insert: {
          blocked_by?: string | null
          confidence?: string | null
          context_db_keys?: string[] | null
          created_at?: string | null
          created_by_session?: string | null
          description?: string | null
          id?: string | null
          priority?: string | null
          proposed_code?: string | null
          proposed_sql?: string | null
          target_identifier?: string | null
          target_system?: string | null
          task_type?: string | null
          title?: string | null
        }
        Update: {
          blocked_by?: string | null
          confidence?: string | null
          context_db_keys?: string[] | null
          created_at?: string | null
          created_by_session?: string | null
          description?: string | null
          id?: string | null
          priority?: string | null
          proposed_code?: string | null
          proposed_sql?: string | null
          target_identifier?: string | null
          target_system?: string | null
          task_type?: string | null
          title?: string | null
        }
        Relationships: []
      }
      v_embedding_coverage: {
        Row: {
          embedded_rows: number | null
          pct_covered: number | null
          pending_rows: number | null
          source: string | null
          total_rows: number | null
        }
        Relationships: []
      }
      v_impact_analysis: {
        Row: {
          changed_entity_id: string | null
          impacted_confidence: string | null
          impacted_domains: string[] | null
          impacted_entity_id: string | null
          impacted_entity_name: string | null
          impacted_entity_notes: string | null
          impacted_entity_type: string | null
          impacted_status: string | null
          relationship_detail: string | null
          relationship_type: string | null
        }
        Relationships: []
      }
      v_knowledge_graph_stale: {
        Row: {
          confidence: string | null
          days_since_verified: number | null
          domains: string[] | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          last_verified: string | null
          properties_preview: string | null
        }
        Insert: {
          confidence?: string | null
          days_since_verified?: never
          domains?: string[] | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          last_verified?: string | null
          properties_preview?: never
        }
        Update: {
          confidence?: string | null
          days_since_verified?: never
          domains?: string[] | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          last_verified?: string | null
          properties_preview?: never
        }
        Relationships: []
      }
      v_priority_dashboard: {
        Row: {
          blocking_reason: string | null
          category: string | null
          horizon: string | null
          horizon_rank: number | null
          id: string | null
          priority: number | null
          status: string | null
          strategic_weight: string | null
          title: string | null
        }
        Insert: {
          blocking_reason?: string | null
          category?: string | null
          horizon?: string | null
          horizon_rank?: never
          id?: string | null
          priority?: number | null
          status?: string | null
          strategic_weight?: string | null
          title?: string | null
        }
        Update: {
          blocking_reason?: string | null
          category?: string | null
          horizon?: string | null
          horizon_rank?: never
          id?: string | null
          priority?: number | null
          status?: string | null
          strategic_weight?: string | null
          title?: string | null
        }
        Relationships: []
      }
      v_recurring_patterns: {
        Row: {
          category: string | null
          days_pattern_active: number | null
          first_seen: string | null
          most_recent: string | null
          most_recent_lesson: string | null
          most_recent_prevention: string | null
          occurrence_count: number | null
          pattern_type: string | null
          repeated_lesson: string | null
          severity: string | null
        }
        Relationships: []
      }
      v_sprint_active: {
        Row: {
          acceptance_criteria: string | null
          actual_sessions: number | null
          blocked_reason: string | null
          context_db_keys: string[] | null
          db_objects: string[] | null
          dependencies_met: boolean | null
          depends_on: string[] | null
          estimated_sessions: number | null
          executor: string | null
          files_to_touch: string[] | null
          horizon: string | null
          known_traps: string | null
          priority: number | null
          spec: string | null
          sprint_goal: string | null
          sprint_id: string | null
          sprint_name: string | null
          sprint_number: number | null
          target_sessions: number | null
          task_type: string | null
          ticket_actual_sessions: number | null
          ticket_id: string | null
          ticket_number: number | null
          ticket_status: string | null
          tickets_done: number | null
          tickets_ready: number | null
          tickets_total: number | null
          title: string | null
        }
        Relationships: []
      }
      v_sprint_summary: {
        Row: {
          actual_sessions: number | null
          blocked: number | null
          completed_at: string | null
          deferred: number | null
          done: number | null
          goal: string | null
          horizon: string | null
          in_progress: number | null
          name: string | null
          pct_complete: number | null
          ready: number | null
          sprint_number: number | null
          started_at: string | null
          status: string | null
          target_sessions: number | null
          total_tickets: number | null
        }
        Relationships: []
      }
      v_top10_now: {
        Row: {
          blocking_reason: string | null
          category: string | null
          horizon: string | null
          status: string | null
          strategic_weight: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      execute_readonly_query: { Args: { query_text: string }; Returns: Json }
      execute_sql_json: { Args: { query_text: string }; Returns: Json }
      is_admin_user: { Args: never; Returns: boolean }
      prepare_session_context: {
        Args: { session_focus?: string }
        Returns: Json
      }
      record_context_access: { Args: { row_ids: string[] }; Returns: undefined }
      run_embed_backfill: { Args: never; Returns: undefined }
      search_all: {
        Args: {
          context_count?: number
          doc_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          source_type: string
          title: string
        }[]
      }
      search_context:
        | {
            Args: {
              match_limit?: number
              query_embedding: string
              similarity_threshold?: number
              source_filter?: string
            }
            Returns: {
              category: string
              content: string
              id: string
              metadata: Json
              similarity: number
              source_table: string
              title: string
            }[]
          }
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              category: string
              id: string
              key: string
              similarity: number
              value: string
            }[]
          }
      search_context_by_text: {
        Args: {
          match_limit?: number
          query_text: string
          similarity_threshold?: number
          source_filter?: string
        }
        Returns: {
          category: string
          content: string
          id: string
          metadata: Json
          similarity: number
          source_table: string
          title: string
        }[]
      }
      search_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          source: string
          title: string
        }[]
      }
      triage_summary: { Args: never; Returns: Json }
      triage_tasks: { Args: { task_ids: string[] }; Returns: number }
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

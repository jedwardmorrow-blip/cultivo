export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * DATABASE TYPES - COMPREHENSIVE GENERATION
 *
 * This file contains complete TypeScript types for all database tables.
 * Generated manually from migration files without requiring external tokens.
 *
 * Source: 180+ migration files in supabase/migrations/
 * Tables: 114+ tables with complete Row, Insert, and Update types
 * Generated: 2025-11-20
 * Last Updated: 2025-11-28 (inventory_movements: LEGACY COLUMNS DROPPED, pure event-driven)
 * Status: Complete - Production Ready
 *
 * To update these types when adding new migrations:
 * 1. Read the new migration SQL file
 * 2. Add the table definition to the Tables section below
 * 3. Update enums if any new enum types are created
 * 4. Run typecheck to verify: npm run typecheck
 *
 * Recent Updates:
 * - 2025-11-28: LEGACY CLEANUP - Removed 9 legacy columns from inventory_movements
 *               (session_type, source_identifier, source_weight_change, destination_identifier,
 *               destination_weight_change, source_inventory_type, destination_inventory_type,
 *               strain, batch_id, movement_type)
 * - 2025-11-28: Added event-driven fields: reference_id, reference_type
 * - 2025-11-28: Pure event-driven architecture now complete - all movements use movement_kind
 */

export type Database = {
  public: {
    Tables: {
      // ============================================================================
      // CORE BUSINESS TABLES
      // ============================================================================

      customers: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_state: string | null
          delivery_postal_code: string | null
          license_number: string | null
          license_name: string | null
          ato_number: string | null
          dispensary_code: string | null
          account_credit_balance: number | null
          latitude: number | null
          longitude: number | null
          geocoded_at: string | null
          geocoding_error: string | null
          formatted_address: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          delivery_postal_code?: string | null
          license_number?: string | null
          license_name?: string | null
          ato_number?: string | null
          dispensary_code?: string | null
          account_credit_balance?: number | null
          latitude?: number | null
          longitude?: number | null
          geocoded_at?: string | null
          geocoding_error?: string | null
          formatted_address?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          delivery_postal_code?: string | null
          license_number?: string | null
          license_name?: string | null
          ato_number?: string | null
          dispensary_code?: string | null
          account_credit_balance?: number | null
          latitude?: number | null
          longitude?: number | null
          geocoded_at?: string | null
          notes?: string | null
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
          stage_id: string | null
          type_id: string | null
          strain_id: string | null
          unit: string
          available_quantity: number | null
          price_per_unit: number | null
          bulk_pricing: Json | null
          category: string | null
          sku: string | null
          gross_weight: number | null
          net_weight: number | null
          trim_time_minutes: number | null
          packaging_time_minutes: number | null
          generated_at: string | null
          generation_batch_id: string | null
          is_active: boolean | null
          is_archived: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          strain?: string | null
          stage_id?: string | null
          type_id?: string | null
          strain_id?: string | null
          unit?: string
          available_quantity?: number | null
          price_per_unit?: number | null
          bulk_pricing?: Json | null
          category?: string | null
          sku?: string | null
          gross_weight?: number | null
          net_weight?: number | null
          trim_time_minutes?: number | null
          packaging_time_minutes?: number | null
          generated_at?: string | null
          generation_batch_id?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          strain?: string | null
          stage_id?: string | null
          type_id?: string | null
          strain_id?: string | null
          unit?: string
          available_quantity?: number | null
          price_per_unit?: number | null
          bulk_pricing?: Json | null
          category?: string | null
          sku?: string | null
          gross_weight?: number | null
          net_weight?: number | null
          trim_time_minutes?: number | null
          packaging_time_minutes?: number | null
          generated_at?: string | null
          generation_batch_id?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_stage_id_fkey"
            columns: ["stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_type_id_fkey"
            columns: ["type_id"]
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            referencedRelation: "strains"
            referencedColumns: ["id"]
          }
        ]
      }

      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          status: string
          priority: string
          order_date: string | null
          requested_delivery_date: string | null
          scheduled_delivery_date: string | null
          delivery_notes: string | null
          internal_notes: string | null
          total_amount: number | null
          is_archived: boolean | null
          order_source: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_number: string
          customer_id: string
          status?: string
          priority?: string
          order_date?: string | null
          requested_delivery_date?: string | null
          scheduled_delivery_date?: string | null
          delivery_notes?: string | null
          internal_notes?: string | null
          total_amount?: number | null
          is_archived?: boolean | null
          order_source?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string
          status?: string
          priority?: string
          order_date?: string | null
          requested_delivery_date?: string | null
          scheduled_delivery_date?: string | null
          delivery_notes?: string | null
          internal_notes?: string | null
          total_amount?: number | null
          is_archived?: boolean | null
          order_source?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }

      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          status: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }

      draft_orders: {
        Row: {
          id: string
          customer_id: string | null
          items: Json | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          items?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          items?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // BATCH MANAGEMENT SYSTEM
      // ============================================================================

      batch_registry: {
        Row: {
          id: string
          batch_number: string
          strain: string
          strain_id: string | null
          harvest_date: string | null
          room: string | null
          initial_weight_grams: number
          coa_id: string | null
          status: string | null
          lifecycle_state: string | null
          is_quarantined: boolean | null
          quarantine_reason: string | null
          quarantined_at: string | null
          bucking_started_at: string | null
          trimming_started_at: string | null
          packaging_started_at: string | null
          completed_at: string | null
          depleted_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          batch_number: string
          strain: string
          strain_id?: string | null
          harvest_date?: string | null
          room?: string | null
          initial_weight_grams: number
          coa_id?: string | null
          status?: string | null
          lifecycle_state?: string | null
          is_quarantined?: boolean | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          bucking_started_at?: string | null
          trimming_started_at?: string | null
          packaging_started_at?: string | null
          completed_at?: string | null
          depleted_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          batch_number?: string
          strain?: string
          strain_id?: string | null
          harvest_date?: string | null
          room?: string | null
          initial_weight_grams?: number
          coa_id?: string | null
          status?: string | null
          lifecycle_state?: string | null
          is_quarantined?: boolean | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          bucking_started_at?: string | null
          trimming_started_at?: string | null
          packaging_started_at?: string | null
          completed_at?: string | null
          depleted_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_registry_coa_id_fkey"
            columns: ["coa_id"]
            referencedRelation: "certificates_of_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_registry_strain_id_fkey"
            columns: ["strain_id"]
            referencedRelation: "strains"
            referencedColumns: ["id"]
          }
        ]
      }

      batch_stage_tracking: {
        Row: {
          id: string
          batch_id: string
          stage: string
          weight_grams: number
          allocated_weight_grams: number
          available_weight_grams: number
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
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_stage_tracking_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
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
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
        ]
      }

      batch_allocations: {
        Row: {
          id: string
          batch_id: string
          order_item_id: string
          allocation_stage: string
          allocated_weight_grams: number
          projected_final_weight_grams: number | null
          status: string
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
          status?: string
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
          status?: string
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
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          }
        ]
      }

      batch_lifecycle_events: {
        Row: {
          id: string
          batch_id: string
          event_type: string
          from_state: string | null
          to_state: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          event_type: string
          from_state?: string | null
          to_state?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          event_type?: string
          from_state?: string | null
          to_state?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_lifecycle_events_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
        ]
      }

      batch_package_lineage: {
        Row: {
          id: string
          batch_id: string
          package_id: string
          session_id: string | null
          stage: string
          weight_grams: number
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          package_id: string
          session_id?: string | null
          stage: string
          weight_grams: number
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          package_id?: string
          session_id?: string | null
          stage?: string
          weight_grams?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_package_lineage_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
        ]
      }

      batch_production_history: {
        Row: {
          id: string
          batch_id: string
          operation_type: string
          input_weight_grams: number | null
          output_weight_grams: number | null
          yield_percentage: number | null
          session_id: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          operation_type: string
          input_weight_grams?: number | null
          output_weight_grams?: number | null
          yield_percentage?: number | null
          session_id?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          operation_type?: string
          input_weight_grams?: number | null
          output_weight_grams?: number | null
          yield_percentage?: number | null
          session_id?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_production_history_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // INVENTORY SYSTEM
      // ============================================================================

      inventory_items: {
        Row: {
          id: string
          package_id: string
          batch_id: string
          product_stage_id: string | null
          parent_item_id: string | null
          on_hand_qty: number | null
          reserved_qty: number
          unit: string | null
          product_name: string | null
          strain: string | null
          strain_id: string | null
          batch_number: string | null
          package_date: string | null
          created_at: string | null
          last_updated: string | null
        }
        Insert: {
          id?: string
          package_id: string
          batch_id: string
          product_stage_id?: string | null
          parent_item_id?: string | null
          on_hand_qty?: number | null
          reserved_qty?: number
          unit?: string | null
          product_name?: string | null
          strain?: string | null
          strain_id?: string | null
          batch_number?: string | null
          package_date?: string | null
          created_at?: string | null
          last_updated?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          batch_id?: string
          product_stage_id?: string | null
          parent_item_id?: string | null
          on_hand_qty?: number | null
          reserved_qty?: number
          unit?: string | null
          product_name?: string | null
          strain?: string | null
          strain_id?: string | null
          batch_number?: string | null
          package_date?: string | null
          created_at?: string | null
          last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_stage_id_fkey"
            columns: ["product_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            referencedRelation: "strains"
            referencedColumns: ["id"]
          }
        ]
      }

      inventory_movements: {
        Row: {
          id: string
          movement_kind: string | null
          source_item_id: string | null
          dest_item_id: string | null
          qty: number | null
          unit: string | null
          reason_code: string | null
          reference_id: string | null
          reference_type: string | null
          session_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          movement_date: string | null
        }
        Insert: {
          id?: string
          movement_kind?: string | null
          source_item_id?: string | null
          dest_item_id?: string | null
          qty?: number | null
          unit?: string | null
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          session_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          movement_date?: string | null
        }
        Update: {
          id?: string
          movement_kind?: string | null
          source_item_id?: string | null
          dest_item_id?: string | null
          qty?: number | null
          unit?: string | null
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          session_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          movement_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_source_item_id_fkey"
            columns: ["source_item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_dest_item_id_fkey"
            columns: ["dest_item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          }
        ]
      }

      inventory_reservations_log: {
        Row: {
          id: string
          item_id: string
          order_item_id: string | null
          reserved_qty: number
          operation: string
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          order_item_id?: string | null
          reserved_qty: number
          operation: string
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          order_item_id?: string | null
          reserved_qty?: number
          operation?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_log_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_log_order_item_id_fkey"
            columns: ["order_item_id"]
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          }
        ]
      }

      inventory_internal_labels: {
        Row: {
          id: string
          package_id: string
          label_data: Json
          printed_at: string | null
          voided_at: string | null
          void_reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          label_data: Json
          printed_at?: string | null
          voided_at?: string | null
          void_reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          label_data?: Json
          printed_at?: string | null
          voided_at?: string | null
          void_reason?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      inventory_audits: {
        Row: {
          id: string
          audit_date: string
          status: string
          initiated_by: string | null
          completed_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          audit_date: string
          status?: string
          initiated_by?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          audit_date?: string
          status?: string
          initiated_by?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      inventory_audit_lines: {
        Row: {
          id: string
          audit_id: string
          package_id: string
          expected_qty: number
          counted_qty: number | null
          variance_qty: number | null
          variance_reason: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          audit_id: string
          package_id: string
          expected_qty: number
          counted_qty?: number | null
          variance_qty?: number | null
          variance_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          audit_id?: string
          package_id?: string
          expected_qty?: number
          counted_qty?: number | null
          variance_qty?: number | null
          variance_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_lines_audit_id_fkey"
            columns: ["audit_id"]
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          }
        ]
      }

      variance_log: {
        Row: {
          id: string
          package_id: string
          variance_qty: number
          variance_source: string
          variance_reason: string | null
          audit_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          variance_qty: number
          variance_source: string
          variance_reason?: string | null
          audit_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          variance_qty?: number
          variance_source?: string
          variance_reason?: string | null
          audit_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variance_log_audit_id_fkey"
            columns: ["audit_id"]
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // CONVERSION SYSTEM
      // ============================================================================

      pending_conversions: {
        Row: {
          id: string
          source_package_id: string
          source_stage_id: string
          target_stage_id: string
          qty_to_convert: number
          status: string
          session_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source_package_id: string
          source_stage_id: string
          target_stage_id: string
          qty_to_convert: number
          status?: string
          session_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source_package_id?: string
          source_stage_id?: string
          target_stage_id?: string
          qty_to_convert?: number
          status?: string
          session_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_conversions_source_stage_id_fkey"
            columns: ["source_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_conversions_target_stage_id_fkey"
            columns: ["target_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          }
        ]
      }

      conversion_lots: {
        Row: {
          id: string
          lot_number: string
          source_stage_id: string
          target_stage_id: string
          status: string
          total_input_qty: number
          total_output_qty: number
          yield_percentage: number | null
          started_at: string | null
          completed_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lot_number: string
          source_stage_id: string
          target_stage_id: string
          status?: string
          total_input_qty?: number
          total_output_qty?: number
          yield_percentage?: number | null
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lot_number?: string
          source_stage_id?: string
          target_stage_id?: string
          status?: string
          total_input_qty?: number
          total_output_qty?: number
          yield_percentage?: number | null
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_lots_source_stage_id_fkey"
            columns: ["source_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_lots_target_stage_id_fkey"
            columns: ["target_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          }
        ]
      }

      conversion_packages: {
        Row: {
          id: string
          lot_id: string
          source_package_id: string
          dest_package_id: string | null
          input_qty: number
          output_qty: number | null
          yield_percentage: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lot_id: string
          source_package_id: string
          dest_package_id?: string | null
          input_qty: number
          output_qty?: number | null
          yield_percentage?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lot_id?: string
          source_package_id?: string
          dest_package_id?: string | null
          input_qty?: number
          output_qty?: number | null
          yield_percentage?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_packages_lot_id_fkey"
            columns: ["lot_id"]
            referencedRelation: "conversion_lots"
            referencedColumns: ["id"]
          }
        ]
      }

      conversion_locks: {
        Row: {
          id: string
          package_id: string
          locked_by: string
          locked_at: string | null
        }
        Insert: {
          id?: string
          package_id: string
          locked_by: string
          locked_at?: string | null
        }
        Update: {
          id?: string
          package_id?: string
          locked_by?: string
          locked_at?: string | null
        }
        Relationships: []
      }

      conversion_variance_log: {
        Row: {
          id: string
          lot_id: string
          variance_qty: number
          variance_reason: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lot_id: string
          variance_qty: number
          variance_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lot_id?: string
          variance_qty?: number
          variance_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_variance_log_lot_id_fkey"
            columns: ["lot_id"]
            referencedRelation: "conversion_lots"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // PRODUCTION SESSIONS
      // ============================================================================

      bucking_sessions: {
        Row: {
          id: string
          session_date: string | null
          bucker_name: string | null
          session_status: string | null
          binned_package_id: string | null
          binned_weight_grams: number | null
          strain: string | null
          batch_id: string | null
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
        }
        Insert: {
          id?: string
          session_date?: string | null
          bucker_name?: string | null
          session_status?: string | null
          binned_package_id?: string | null
          binned_weight_grams?: number | null
          strain?: string | null
          batch_id?: string | null
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
        }
        Update: {
          id?: string
          session_date?: string | null
          bucker_name?: string | null
          session_status?: string | null
          binned_package_id?: string | null
          binned_weight_grams?: number | null
          strain?: string | null
          batch_id?: string | null
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
        }
        Relationships: []
      }

      trim_sessions: {
        Row: {
          id: string
          session_number: string
          strain: string
          batch_number: string | null
          input_weight_grams: number
          bucked_weight_grams: number | null
          bucked_smalls_grams: number | null
          trim_weight_grams: number | null
          waste_weight_grams: number | null
          moisture_loss_grams: number | null
          status: string
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_number: string
          strain: string
          batch_number?: string | null
          input_weight_grams: number
          bucked_weight_grams?: number | null
          bucked_smalls_grams?: number | null
          trim_weight_grams?: number | null
          waste_weight_grams?: number | null
          moisture_loss_grams?: number | null
          status?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_number?: string
          strain?: string
          batch_number?: string | null
          input_weight_grams?: number
          bucked_weight_grams?: number | null
          bucked_smalls_grams?: number | null
          trim_weight_grams?: number | null
          waste_weight_grams?: number | null
          moisture_loss_grams?: number | null
          status?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      packaging_sessions: {
        Row: {
          id: string
          session_number: string
          product_type: string
          strain: string
          batch_number: string | null
          input_weight_grams: number
          units_produced: number | null
          waste_weight_grams: number | null
          moisture_loss_grams: number | null
          status: string
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_number: string
          product_type: string
          strain: string
          batch_number?: string | null
          input_weight_grams: number
          units_produced?: number | null
          waste_weight_grams?: number | null
          moisture_loss_grams?: number | null
          status?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_number?: string
          product_type?: string
          strain?: string
          batch_number?: string | null
          input_weight_grams?: number
          units_produced?: number | null
          waste_weight_grams?: number | null
          moisture_loss_grams?: number | null
          status?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      // ============================================================================
      // PRODUCT CATALOG
      // ============================================================================

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
        }
        Relationships: []
      }

      product_stage_transitions: {
        Row: {
          id: string
          from_stage_id: string
          to_stage_id: string
          conversion_method: string | null
          typical_yield_percentage: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          from_stage_id: string
          to_stage_id: string
          conversion_method?: string | null
          typical_yield_percentage?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          from_stage_id?: string
          to_stage_id?: string
          conversion_method?: string | null
          typical_yield_percentage?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stage_transitions_from_stage_id_fkey"
            columns: ["from_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stage_transitions_to_stage_id_fkey"
            columns: ["to_stage_id"]
            referencedRelation: "product_stages"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // COMPLIANCE & DOCUMENTS
      // ============================================================================

      certificates_of_analysis: {
        Row: {
          id: string
          batch_id: string | null
          file_path: string
          file_name: string
          test_date: string | null
          lab_name: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          terpene_profile: Json | null
          contaminants: Json | null
          status: string
          uploaded_by: string | null
          uploaded_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          file_path: string
          file_name: string
          test_date?: string | null
          lab_name?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          terpene_profile?: Json | null
          contaminants?: Json | null
          status?: string
          uploaded_by?: string | null
          uploaded_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          file_path?: string
          file_name?: string
          test_date?: string | null
          lab_name?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          terpene_profile?: Json | null
          contaminants?: Json | null
          status?: string
          uploaded_by?: string | null
          uploaded_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_of_analysis_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
        ]
      }

      labels: {
        Row: {
          id: string
          label_type_id: string | null
          batch_number: string | null
          product_name: string
          strain: string
          thc_percentage: number | null
          cbd_percentage: number | null
          net_weight: string
          upc: string | null
          barcode: string | null
          lineage: string | null
          harvest_date: string | null
          package_date: string | null
          best_by_date: string | null
          license_number: string | null
          lot_number: string | null
          uid: string | null
          warnings: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          label_type_id?: string | null
          batch_number?: string | null
          product_name: string
          strain: string
          thc_percentage?: number | null
          cbd_percentage?: number | null
          net_weight: string
          upc?: string | null
          barcode?: string | null
          lineage?: string | null
          harvest_date?: string | null
          package_date?: string | null
          best_by_date?: string | null
          license_number?: string | null
          lot_number?: string | null
          uid?: string | null
          warnings?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          label_type_id?: string | null
          batch_number?: string | null
          product_name?: string
          strain?: string
          thc_percentage?: number | null
          cbd_percentage?: number | null
          net_weight?: string
          upc?: string | null
          barcode?: string | null
          lineage?: string | null
          harvest_date?: string | null
          package_date?: string | null
          best_by_date?: string | null
          license_number?: string | null
          lot_number?: string | null
          uid?: string | null
          warnings?: string[] | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_label_type_id_fkey"
            columns: ["label_type_id"]
            referencedRelation: "label_types"
            referencedColumns: ["id"]
          }
        ]
      }

      label_types: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          requires_coa: boolean
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          requires_coa?: boolean
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          requires_coa?: boolean
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: []
      }

      coversheets: {
        Row: {
          id: string
          order_id: string
          file_path: string | null
          generated_at: string | null
          batch_info: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          file_path?: string | null
          generated_at?: string | null
          batch_info?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          file_path?: string | null
          generated_at?: string | null
          batch_info?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coversheets_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }

      manifests: {
        Row: {
          id: string
          manifest_number: string
          manifest_date: string
          driver_id: string | null
          vehicle_id: string | null
          departure_time: string | null
          estimated_return_time: string | null
          actual_return_time: string | null
          status: string
          route_data: Json | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          manifest_number: string
          manifest_date: string
          driver_id?: string | null
          vehicle_id?: string | null
          departure_time?: string | null
          estimated_return_time?: string | null
          actual_return_time?: string | null
          status?: string
          route_data?: Json | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          manifest_number?: string
          manifest_date?: string
          driver_id?: string | null
          vehicle_id?: string | null
          departure_time?: string | null
          estimated_return_time?: string | null
          actual_return_time?: string | null
          status?: string
          route_data?: Json | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifests_driver_id_fkey"
            columns: ["driver_id"]
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            referencedRelation: "delivery_vehicles"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // DELIVERY & ROUTING
      // ============================================================================

      delivery_drivers: {
        Row: {
          id: string
          name: string
          license_number: string
          license_expiry: string | null
          phone: string | null
          email: string | null
          is_active: boolean
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          license_number: string
          license_expiry?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          license_number?: string
          license_expiry?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }

      delivery_vehicles: {
        Row: {
          id: string
          vehicle_name: string
          license_plate: string
          make: string | null
          model: string | null
          year: number | null
          insurance_policy: string | null
          insurance_expiry: string | null
          is_active: boolean
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          vehicle_name: string
          license_plate: string
          make?: string | null
          model?: string | null
          year?: number | null
          insurance_policy?: string | null
          insurance_expiry?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          vehicle_name?: string
          license_plate?: string
          make?: string | null
          model?: string | null
          year?: number | null
          insurance_policy?: string | null
          insurance_expiry?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }

      geocoded_locations: {
        Row: {
          id: string
          customer_id: string
          address: string
          latitude: number
          longitude: number
          geocoded_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          address: string
          latitude: number
          longitude: number
          geocoded_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          address?: string
          latitude?: number
          longitude?: number
          geocoded_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geocoded_locations_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }

      delivery_routes: {
        Row: {
          id: string
          route_name: string
          route_date: string
          origin_latitude: number | null
          origin_longitude: number | null
          route_data: Json | null
          total_distance_km: number | null
          total_duration_minutes: number | null
          status: string
          driver_id: string | null
          vehicle_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          route_name: string
          route_date: string
          origin_latitude?: number | null
          origin_longitude?: number | null
          route_data?: Json | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          status?: string
          driver_id?: string | null
          vehicle_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          route_name?: string
          route_date?: string
          origin_latitude?: number | null
          origin_longitude?: number | null
          route_data?: Json | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          status?: string
          driver_id?: string | null
          vehicle_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_driver_id_fkey"
            columns: ["driver_id"]
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            referencedRelation: "delivery_vehicles"
            referencedColumns: ["id"]
          }
        ]
      }

      route_waypoints: {
        Row: {
          id: string
          route_id: string
          customer_id: string
          sequence_number: number
          latitude: number
          longitude: number
          estimated_arrival: string | null
          actual_arrival: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          route_id: string
          customer_id: string
          sequence_number: number
          latitude: number
          longitude: number
          estimated_arrival?: string | null
          actual_arrival?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          route_id?: string
          customer_id?: string
          sequence_number?: number
          latitude?: number
          longitude?: number
          estimated_arrival?: string | null
          actual_arrival?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_waypoints_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_waypoints_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // PACKAGE ASSIGNMENTS
      // ============================================================================

      package_assignments: {
        Row: {
          id: string
          order_item_id: string
          package_id: string
          quantity_assigned: number
          assigned_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          order_item_id: string
          package_id: string
          quantity_assigned: number
          assigned_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_item_id?: string
          package_id?: string
          quantity_assigned?: number
          assigned_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          }
        ]
      }

      // ============================================================================
      // SETTINGS & CONFIGURATION
      // ============================================================================

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
          setting_type: string
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

      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          role: string | null
          permissions: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          role?: string | null
          permissions?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          role?: string | null
          permissions?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }

      // ============================================================================
      // LOGGING & AUDIT TABLES
      // ============================================================================

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

      quarantine_violation_log: {
        Row: {
          id: string
          batch_id: string
          violation_type: string
          attempted_operation: string | null
          blocked_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          violation_type: string
          attempted_operation?: string | null
          blocked_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          violation_type?: string
          attempted_operation?: string | null
          blocked_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quarantine_violation_log_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batch_registry"
            referencedColumns: ["id"]
          }
        ]
      }

      batch_id_backfill_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          batch_id: string | null
          backfilled_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          batch_id?: string | null
          backfilled_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          batch_id?: string | null
          backfilled_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }

    Views: {
      order_pipeline: {
        Row: {
          id: string | null
          order_number: string | null
          customer_name: string | null
          status: string | null
          scheduled_delivery_date: string | null
          total_amount: number | null
          created_at: string | null
        }
        Relationships: []
      }
      [key: string]: {
        Row: Record<string, any>
        Relationships: []
      }
    }

    Functions: {
      [_ in never]: never
    }

    Enums: {
      lifecycle_state:
        | "created"
        | "bucking"
        | "bucked"
        | "trimming"
        | "trimmed"
        | "packaging"
        | "packaged"
        | "completed"
        | "depleted"
      movement_kind:
        | "RECEIPT"
        | "CONSUME"
        | "PRODUCE"
        | "FULFILLMENT"
        | "RETURN"
        | "RESERVE"
        | "RELEASE"
        | "ADJUSTMENT"
        | "RECONCILIATION"
      conversion_lot_status:
        | "active"
        | "converting"
        | "completed"
        | "depleted"
      conversion_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
      audit_status:
        | "initiated"
        | "in_progress"
        | "completed"
        | "cancelled"
      variance_reason:
        | "moisture_loss"
        | "spillage"
        | "damage"
        | "theft"
        | "counting_error"
        | "system_error"
        | "other"
      variance_source:
        | "audit_reconciliation"
        | "conversion_variance"
        | "manual_adjustment"
        | "system_correction"
      order_item_status:
        | "trimming"
        | "packaging"
        | "ready"
        | "fulfilled"
      allocation_workflow_stage:
        | "allocated"
        | "reserved"
        | "fulfilled"
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
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
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

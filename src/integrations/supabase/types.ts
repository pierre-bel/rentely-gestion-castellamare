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
      booking_payment_items: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          due_date: string | null
          id: string
          is_paid: boolean
          label: string
          paid_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          label: string
          paid_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          label?: string
          paid_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payment_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payment_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      bookings: {
        Row: {
          access_token: string
          cancellation_policy_snapshot: Json | null
          checkin_date: string
          checkout_date: string
          cleaning_fee: number | null
          created_at: string
          currency: string | null
          guest_service_fee_rate: number | null
          guest_user_id: string
          guests: number
          host_commission_amount: number | null
          host_commission_rate: number | null
          host_payout_gross: number | null
          host_payout_net: number | null
          id: string
          igloohome_code: string | null
          listing_id: string
          nights: number
          notes: string | null
          platform_revenue_total: number | null
          pricing_breakdown: Json | null
          service_fee: number | null
          status: Database["public"]["Enums"]["booking_status"] | null
          subtotal: number
          tax_rate: number | null
          taxes: number | null
          total_price: number
          updated_at: string
        }
        Insert: {
          access_token?: string
          cancellation_policy_snapshot?: Json | null
          checkin_date: string
          checkout_date: string
          cleaning_fee?: number | null
          created_at?: string
          currency?: string | null
          guest_service_fee_rate?: number | null
          guest_user_id: string
          guests: number
          host_commission_amount?: number | null
          host_commission_rate?: number | null
          host_payout_gross?: number | null
          host_payout_net?: number | null
          id?: string
          igloohome_code?: string | null
          listing_id: string
          nights: number
          notes?: string | null
          platform_revenue_total?: number | null
          pricing_breakdown?: Json | null
          service_fee?: number | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          subtotal: number
          tax_rate?: number | null
          taxes?: number | null
          total_price: number
          updated_at?: string
        }
        Update: {
          access_token?: string
          cancellation_policy_snapshot?: Json | null
          checkin_date?: string
          checkout_date?: string
          cleaning_fee?: number | null
          created_at?: string
          currency?: string | null
          guest_service_fee_rate?: number | null
          guest_user_id?: string
          guests?: number
          host_commission_amount?: number | null
          host_commission_rate?: number | null
          host_payout_gross?: number | null
          host_payout_net?: number | null
          id?: string
          igloohome_code?: string | null
          listing_id?: string
          nights?: number
          notes?: string | null
          platform_revenue_total?: number | null
          pricing_breakdown?: Json | null
          service_fee?: number | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          subtotal?: number
          tax_rate?: number | null
          taxes?: number | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          created_at: string
          days_before_checkin: number
          description: string
          id: string
          is_active: boolean
          name: string
          policy_key: string
          refund_percentage: number
        }
        Insert: {
          created_at?: string
          days_before_checkin: number
          description: string
          id?: string
          is_active?: boolean
          name: string
          policy_key: string
          refund_percentage: number
        }
        Update: {
          created_at?: string
          days_before_checkin?: number
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          policy_key?: string
          refund_percentage?: number
        }
        Relationships: []
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          featured_image_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean | null
          name: string
          state_region_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          featured_image_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          name: string
          state_region_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          featured_image_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          name?: string
          state_region_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_state_region_id_fkey"
            columns: ["state_region_id"]
            isOneToOne: false
            referencedRelation: "states_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_staff: {
        Row: {
          created_at: string
          host_user_id: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_user_id: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_user_id?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cleaning_staff_listings: {
        Row: {
          cleaning_staff_id: string
          created_at: string
          host_user_id: string
          id: string
          listing_id: string
        }
        Insert: {
          cleaning_staff_id: string
          created_at?: string
          host_user_id: string
          id?: string
          listing_id: string
        }
        Update: {
          cleaning_staff_id?: string
          created_at?: string
          host_user_id?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_staff_listings_cleaning_staff_id_fkey"
            columns: ["cleaning_staff_id"]
            isOneToOne: false
            referencedRelation: "cleaning_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_staff_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_staff_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_staff_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone_code: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone_code?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_decision: string | null
          approved_refund_amount: number | null
          assigned_admin_id: string | null
          attachment_urls: string[] | null
          booking_id: string
          category: Database["public"]["Enums"]["dispute_category"]
          created_at: string
          description: string
          id: string
          initiated_by_user_id: string
          listing_id: string
          refund_transaction_id: string | null
          requested_refund_amount: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_admin_id: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          subject: string
          support_thread_id: string | null
          updated_at: string
          user_role: string
        }
        Insert: {
          admin_decision?: string | null
          approved_refund_amount?: number | null
          assigned_admin_id?: string | null
          attachment_urls?: string[] | null
          booking_id: string
          category: Database["public"]["Enums"]["dispute_category"]
          created_at?: string
          description: string
          id?: string
          initiated_by_user_id: string
          listing_id: string
          refund_transaction_id?: string | null
          requested_refund_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          subject: string
          support_thread_id?: string | null
          updated_at?: string
          user_role: string
        }
        Update: {
          admin_decision?: string | null
          approved_refund_amount?: number | null
          assigned_admin_id?: string | null
          attachment_urls?: string[] | null
          booking_id?: string
          category?: Database["public"]["Enums"]["dispute_category"]
          created_at?: string
          description?: string
          id?: string
          initiated_by_user_id?: string
          listing_id?: string
          refund_transaction_id?: string | null
          requested_refund_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          subject?: string
          support_thread_id?: string | null
          updated_at?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_refund_transaction_id_fkey"
            columns: ["refund_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_admin_id_fkey"
            columns: ["resolved_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_admin_id_fkey"
            columns: ["resolved_by_admin_id"]
            isOneToOne: false
            referencedRelation: "user_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_support_thread_id_fkey"
            columns: ["support_thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          body_html: string
          created_at: string
          host_user_id: string
          id: string
          is_enabled: boolean
          listing_ids: string[] | null
          name: string
          recipient_email: string | null
          recipient_type: string
          reply_to_email: string | null
          send_if_late: boolean
          subject: string
          trigger_days: number
          trigger_type: Database["public"]["Enums"]["email_trigger_type"]
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          host_user_id: string
          id?: string
          is_enabled?: boolean
          listing_ids?: string[] | null
          name: string
          recipient_email?: string | null
          recipient_type?: string
          reply_to_email?: string | null
          send_if_late?: boolean
          subject: string
          trigger_days?: number
          trigger_type: Database["public"]["Enums"]["email_trigger_type"]
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          host_user_id?: string
          id?: string
          is_enabled?: boolean
          listing_ids?: string[] | null
          name?: string
          recipient_email?: string | null
          recipient_type?: string
          reply_to_email?: string | null
          send_if_late?: boolean
          subject?: string
          trigger_days?: number
          trigger_type?: Database["public"]["Enums"]["email_trigger_type"]
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          automation_id: string | null
          booking_id: string | null
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          status: string
          subject: string
        }
        Insert: {
          automation_id?: string | null
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          automation_id?: string | null
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by_admin_id: string | null
          id: string
          question: string
          status: string
          updated_at: string
          updated_by_admin_id: string | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          question: string
          status?: string
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          question?: string
          status?: string
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Relationships: []
      }
      guest_debts: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          dispute_id: string
          expires_at: string | null
          guest_user_id: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_transaction_id: string | null
          reason: string
          status: string
          waived_at: string | null
          waived_by_admin_id: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          dispute_id: string
          expires_at?: string | null
          guest_user_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          reason: string
          status?: string
          waived_at?: string | null
          waived_by_admin_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          dispute_id?: string
          expires_at?: string | null
          guest_user_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          reason?: string
          status?: string
          waived_at?: string | null
          waived_by_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_debts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_debts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "guest_debts_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_debts_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      host_payment_schedules: {
        Row: {
          created_at: string
          due_days: number
          due_type: string
          host_user_id: string
          id: string
          label: string
          percentage: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_days?: number
          due_type?: string
          host_user_id: string
          id?: string
          label: string
          percentage: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_days?: number
          due_type?: string
          host_user_id?: string
          id?: string
          label?: string
          percentage?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      listing_availability: {
        Row: {
          created_at: string
          end_date: string
          id: string
          listing_id: string
          price: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          listing_id: string
          price?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          listing_id?: string
          price?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_moderation_feedback: {
        Row: {
          admin_user_id: string
          comment: string | null
          created_at: string
          id: string
          is_resolved: boolean
          listing_id: string
          section_key: string
          status: string
        }
        Insert: {
          admin_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          listing_id: string
          section_key: string
          status: string
        }
        Update: {
          admin_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          listing_id?: string
          section_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_moderation_feedback_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_moderation_feedback_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_moderation_feedback_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_moderation_feedback_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_moderation_feedback_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_weekly_pricing: {
        Row: {
          created_at: string
          extra_night_weekend_rate: number
          host_user_id: string
          id: string
          listing_id: string
          nightly_rate: number
          updated_at: string
          week_start_date: string
          weekend_nightly_rate: number
        }
        Insert: {
          created_at?: string
          extra_night_weekend_rate?: number
          host_user_id: string
          id?: string
          listing_id: string
          nightly_rate?: number
          updated_at?: string
          week_start_date: string
          weekend_nightly_rate?: number
        }
        Update: {
          created_at?: string
          extra_night_weekend_rate?: number
          host_user_id?: string
          id?: string
          listing_id?: string
          nightly_rate?: number
          updated_at?: string
          week_start_date?: string
          weekend_nightly_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_weekly_pricing_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_weekly_pricing_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_weekly_pricing_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          amenities: string[] | null
          base_price: number
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          cancellation_policy_id: string
          checkin_from: string | null
          checkout_until: string | null
          city: string
          city_id: string | null
          cleaning_fee: number | null
          country: string
          country_id: string | null
          cover_image: string | null
          created_at: string
          currency: string | null
          description: string | null
          guests_max: number
          host_user_id: string
          house_rules: string | null
          id: string
          images: string[] | null
          latitude: number | null
          longitude: number | null
          max_nights: number | null
          min_nights: number | null
          monthly_discount: number | null
          postal_code: string | null
          rating_avg: number | null
          rating_count: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          security_deposit: number | null
          size_sqft: number | null
          state: string | null
          state_region_id: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
          weekly_discount: number | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          base_price: number
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy_id: string
          checkin_from?: string | null
          checkout_until?: string | null
          city: string
          city_id?: string | null
          cleaning_fee?: number | null
          country?: string
          country_id?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          guests_max?: number
          host_user_id: string
          house_rules?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          max_nights?: number | null
          min_nights?: number | null
          monthly_discount?: number | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_deposit?: number | null
          size_sqft?: number | null
          state?: string | null
          state_region_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          weekly_discount?: number | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          base_price?: number
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy_id?: string
          checkin_from?: string | null
          checkout_until?: string | null
          city?: string
          city_id?: string | null
          cleaning_fee?: number | null
          country?: string
          country_id?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          guests_max?: number
          host_user_id?: string
          house_rules?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          max_nights?: number | null
          min_nights?: number | null
          monthly_discount?: number | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_deposit?: number | null
          size_sqft?: number | null
          state?: string | null
          state_region_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          weekly_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_listings_cancellation_policy"
            columns: ["cancellation_policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_state_region_id_fkey"
            columns: ["state_region_id"]
            isOneToOne: false
            referencedRelation: "states_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          is_locked: boolean
          last_message_at: string
          listing_id: string | null
          locked_at: string | null
          locked_reason: string | null
          participant_1_id: string
          participant_2_id: string
          thread_type: Database["public"]["Enums"]["thread_type"] | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          last_message_at?: string
          listing_id?: string | null
          locked_at?: string | null
          locked_reason?: string | null
          participant_1_id: string
          participant_2_id: string
          thread_type?: Database["public"]["Enums"]["thread_type"] | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          last_message_at?: string
          listing_id?: string | null
          locked_at?: string | null
          locked_reason?: string | null
          participant_1_id?: string
          participant_2_id?: string
          thread_type?: Database["public"]["Enums"]["thread_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "message_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string
          booking_id: string | null
          created_at: string
          from_user_id: string
          id: string
          read: boolean | null
          thread_id: string | null
          to_user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          booking_id?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          read?: boolean | null
          thread_id?: string | null
          to_user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          booking_id?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          read?: boolean | null
          thread_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          base_cleaning_fee: number | null
          base_subtotal: number | null
          booking_id: string
          commission_amount: number | null
          commission_on_retained: number | null
          created_at: string
          currency: string
          dispute_ids: string[] | null
          gross_revenue: number | null
          guest_total_payment: number | null
          host_retained_gross: number | null
          host_user_id: string
          id: string
          net_before_adjustments: number | null
          notes: string | null
          original_amount: number | null
          payout_date: string | null
          refund_percentage_applied: number | null
          status: string
          total_dispute_refunds: number | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          base_cleaning_fee?: number | null
          base_subtotal?: number | null
          booking_id: string
          commission_amount?: number | null
          commission_on_retained?: number | null
          created_at?: string
          currency?: string
          dispute_ids?: string[] | null
          gross_revenue?: number | null
          guest_total_payment?: number | null
          host_retained_gross?: number | null
          host_user_id: string
          id?: string
          net_before_adjustments?: number | null
          notes?: string | null
          original_amount?: number | null
          payout_date?: string | null
          refund_percentage_applied?: number | null
          status?: string
          total_dispute_refunds?: number | null
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          base_cleaning_fee?: number | null
          base_subtotal?: number | null
          booking_id?: string
          commission_amount?: number | null
          commission_on_retained?: number | null
          created_at?: string
          currency?: string
          dispute_ids?: string[] | null
          gross_revenue?: number | null
          guest_total_payment?: number | null
          host_retained_gross?: number | null
          host_user_id?: string
          id?: string
          net_before_adjustments?: number | null
          notes?: string | null
          original_amount?: number | null
          payout_date?: string | null
          refund_percentage_applied?: number | null
          status?: string
          total_dispute_refunds?: number | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          effective_from: string
          id: string
          is_active: boolean
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_custom_sections: {
        Row: {
          body_html: string
          created_at: string
          host_user_id: string
          id: string
          is_enabled: boolean
          section_key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          host_user_id: string
          id?: string
          is_enabled?: boolean
          section_key?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          host_user_id?: string
          id?: string
          is_enabled?: boolean
          section_key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_settings: {
        Row: {
          created_at: string
          custom_footer_text: string | null
          host_user_id: string
          id: string
          require_full_payment_for_access_code: boolean
          section_order: Json | null
          show_access_code: boolean
          show_address: boolean
          show_amenities: boolean
          show_house_rules: boolean
          show_map_link: boolean
          show_payment_schedule: boolean
          show_price: boolean
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          created_at?: string
          custom_footer_text?: string | null
          host_user_id: string
          id?: string
          require_full_payment_for_access_code?: boolean
          section_order?: Json | null
          show_access_code?: boolean
          show_address?: boolean
          show_amenities?: boolean
          show_house_rules?: boolean
          show_map_link?: boolean
          show_payment_schedule?: boolean
          show_price?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          created_at?: string
          custom_footer_text?: string | null
          host_user_id?: string
          id?: string
          require_full_payment_for_access_code?: boolean
          section_order?: Json | null
          show_access_code?: boolean
          show_address?: boolean
          show_amenities?: boolean
          show_house_rules?: boolean
          show_map_link?: boolean
          show_payment_schedule?: boolean
          show_price?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_demo: boolean | null
          is_system: boolean | null
          last_name: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_demo?: boolean | null
          is_system?: boolean | null
          last_name?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_demo?: boolean | null
          is_system?: boolean | null
          last_name?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_user_id: string
          booking_id: string
          created_at: string
          id: string
          listing_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          text: string | null
          updated_at: string
        }
        Insert: {
          author_user_id: string
          booking_id: string
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          text?: string | null
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      states_regions: {
        Row: {
          code: string | null
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "states_regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string
          gender: string | null
          host_user_id: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          street_number: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          gender?: string | null
          host_user_id: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          gender?: string | null
          host_user_id?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          dispute_id: string | null
          id: string
          provider: string
          status: string
          type: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          dispute_id?: string | null
          id?: string
          provider: string
          status: string
          type: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          dispute_id?: string | null
          id?: string
          provider?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_booking_portal"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "transactions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
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
      embed_listing_info: {
        Row: {
          base_price: number | null
          city: string | null
          id: string | null
          title: string | null
        }
        Insert: {
          base_price?: number | null
          city?: string | null
          id?: string | null
          title?: string | null
        }
        Update: {
          base_price?: number | null
          city?: string | null
          id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      public_booking_dates: {
        Row: {
          checkin_date: string | null
          checkout_date: string | null
          listing_id: string | null
        }
        Insert: {
          checkin_date?: string | null
          checkout_date?: string | null
          listing_id?: string | null
        }
        Update: {
          checkin_date?: string | null
          checkout_date?: string | null
          listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      public_booking_portal: {
        Row: {
          access_token: string | null
          address: string | null
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          booking_id: string | null
          checkin_date: string | null
          checkin_from: string | null
          checkout_date: string | null
          checkout_until: string | null
          city: string | null
          cleaning_fee: number | null
          country: string | null
          cover_image: string | null
          currency: string | null
          guests: number | null
          house_rules: string | null
          igloohome_code: string | null
          latitude: number | null
          listing_images: string[] | null
          listing_title: string | null
          longitude: number | null
          nights: number | null
          notes: string | null
          postal_code: string | null
          pricing_breakdown: Json | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          service_fee: number | null
          state: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          subtotal: number | null
          taxes: number | null
          total_price: number | null
        }
        Relationships: []
      }
      public_listing_availability: {
        Row: {
          end_date: string | null
          listing_id: string | null
          start_date: string | null
        }
        Insert: {
          end_date?: string | null
          listing_id?: string | null
          start_date?: string | null
        }
        Update: {
          end_date?: string | null
          listing_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "embed_listing_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      public_listings: {
        Row: {
          address: string | null
          amenities: string[] | null
          base_price: number | null
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          cancellation_policy_id: string | null
          city: string | null
          cleaning_fee: number | null
          country: string | null
          cover_image: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          guests_max: number | null
          id: string | null
          images: string[] | null
          latitude: number | null
          longitude: number | null
          max_nights: number | null
          min_nights: number | null
          rating_avg: number | null
          rating_count: number | null
          state: string | null
          title: string | null
          type: Database["public"]["Enums"]["property_type"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          base_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy_id?: string | null
          city?: string | null
          cleaning_fee?: number | null
          country?: string | null
          cover_image?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          guests_max?: number | null
          id?: string | null
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          max_nights?: number | null
          min_nights?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          state?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["property_type"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          base_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy_id?: string | null
          city?: string | null
          cleaning_fee?: number | null
          country?: string | null
          cover_image?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          guests_max?: number | null
          id?: string | null
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          max_nights?: number | null
          min_nights?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          state?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["property_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_listings_cancellation_policy"
            columns: ["cancellation_policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_portal_custom_sections: {
        Row: {
          body_html: string | null
          host_user_id: string | null
          id: string | null
          is_enabled: boolean | null
          section_key: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          body_html?: string | null
          host_user_id?: string | null
          id?: string | null
          is_enabled?: boolean | null
          section_key?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          body_html?: string | null
          host_user_id?: string | null
          id?: string | null
          is_enabled?: boolean | null
          section_key?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      public_portal_settings: {
        Row: {
          custom_footer_text: string | null
          host_user_id: string | null
          require_full_payment_for_access_code: boolean | null
          section_order: Json | null
          show_access_code: boolean | null
          show_address: boolean | null
          show_amenities: boolean | null
          show_house_rules: boolean | null
          show_map_link: boolean | null
          show_payment_schedule: boolean | null
          show_price: boolean | null
          welcome_message: string | null
        }
        Insert: {
          custom_footer_text?: string | null
          host_user_id?: string | null
          require_full_payment_for_access_code?: boolean | null
          section_order?: Json | null
          show_access_code?: boolean | null
          show_address?: boolean | null
          show_amenities?: boolean | null
          show_house_rules?: boolean | null
          show_map_link?: boolean | null
          show_payment_schedule?: boolean | null
          show_price?: boolean | null
          welcome_message?: string | null
        }
        Update: {
          custom_footer_text?: string | null
          host_user_id?: string | null
          require_full_payment_for_access_code?: boolean | null
          section_order?: Json | null
          show_access_code?: boolean | null
          show_address?: boolean | null
          show_amenities?: boolean | null
          show_house_rules?: boolean | null
          show_map_link?: boolean | null
          show_payment_schedule?: boolean | null
          show_price?: boolean | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
        }
        Relationships: []
      }
      user_admin_view: {
        Row: {
          avatar_url: string | null
          bookings_count: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          listings_count: number | null
          primary_role: Database["public"]["Enums"]["app_role"] | null
          status: Database["public"]["Enums"]["user_status"] | null
          user_display_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bookings_count?: never
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: never
          id?: string | null
          last_name?: string | null
          listings_count?: never
          primary_role?: never
          status?: Database["public"]["Enums"]["user_status"] | null
          user_display_id?: never
        }
        Update: {
          avatar_url?: string | null
          bookings_count?: never
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: never
          id?: string | null
          last_name?: string | null
          listings_count?: never
          primary_role?: never
          status?: Database["public"]["Enums"]["user_status"] | null
          user_display_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user_soft: {
        Args: { p_admin_user_id: string; p_user_id: string }
        Returns: Json
      }
      admin_export_reviews_custom_report: {
        Args: {
          p_city_ids?: string[]
          p_end_date: string
          p_min_ratings?: number[]
          p_start_date: string
        }
        Returns: {
          city_name: string
          country_name: string
          listing_id: string
          listing_name: string
          rating: number
          review_created_at: string
          review_text: string
          user_full_name: string
        }[]
      }
      admin_get_detailed_revenue_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          booking_display_id: string
          booking_id: string
          checkin_date: string
          checkout_date: string
          created_at: string
          guest_first_name: string
          guest_last_name: string
          guest_user_id: string
          host_payouts_amount: number
          listing_title: string
          net_revenue: number
          refunds_amount: number
          status: string
          total_price: number
        }[]
      }
      admin_get_dispute_details: {
        Args: { p_dispute_id: string }
        Returns: Json
      }
      admin_get_listing_reviews_detail: {
        Args: { p_listing_id: string }
        Returns: {
          listing_city: string
          listing_id: string
          listing_title: string
          rating: number
          review_created_at: string
          review_text: string
          user_name: string
        }[]
      }
      admin_get_listings_reviews_report: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          average_rating: number
          last_review_date: string
          listing_city: string
          listing_id: string
          listing_title: string
          total_reviews: number
        }[]
      }
      admin_get_support_conversations: {
        Args: {
          p_admin_user_id: string
          p_search_query?: string
          p_sort_by?: string
        }
        Returns: {
          last_message: string
          last_message_time: string
          thread_id: string
          unread_count: number
          user_avatar: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_weekly_bookings: {
        Args: { weeks_back?: number }
        Returns: {
          booking_count: number
          week_label: string
          week_start: string
        }[]
      }
      admin_get_weekly_revenue: {
        Args: { weeks_back?: number }
        Returns: {
          revenue: number
          week_label: string
          week_start: string
        }[]
      }
      admin_get_weekly_revenue_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          bookings_count: number
          gross_revenue: number
          host_payouts_amount: number
          net_revenue: number
          refunds_amount: number
          week_end: string
          week_label: string
          week_start: string
        }[]
      }
      admin_mark_payout_completed: {
        Args: { p_payout_id: string }
        Returns: Json
      }
      admin_resolve_dispute:
        | {
            Args: {
              p_admin_decision: string
              p_approved_refund_amount?: number
              p_dispute_id: string
              p_is_submit?: boolean
              p_resolution_notes?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_decision: string
              p_dispute_id: string
              p_refund_amount?: number
              p_resolution_notes?: string
            }
            Returns: Json
          }
      admin_search_bookings: {
        Args: {
          checkin_end?: string
          checkin_start?: string
          checkout_end?: string
          checkout_start?: string
          max_price?: number
          min_price?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: Database["public"]["Enums"]["booking_status"]
        }
        Returns: {
          booking_display_id: string
          checkin_date: string
          checkout_date: string
          created_at: string
          guest_avatar: string
          guest_email: string
          guest_name: string
          guest_user_id: string
          guests: number
          host_avatar: string
          host_email: string
          host_name: string
          host_user_id: string
          id: string
          listing_city: string
          listing_country: string
          listing_id: string
          listing_title: string
          nights: number
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }[]
      }
      admin_search_disputes: {
        Args: {
          category_filter?: string
          created_end?: string
          created_start?: string
          max_amount?: number
          min_amount?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: string
        }
        Returns: {
          booking_display_id: string
          booking_id: string
          category: string
          created_at: string
          description: string
          dispute_display_id: string
          guest_avatar: string
          guest_email: string
          guest_name: string
          guest_user_id: string
          host_avatar: string
          host_email: string
          host_name: string
          host_user_id: string
          id: string
          listing_city: string
          listing_country: string
          listing_id: string
          listing_title: string
          requested_refund_amount: number
          resolution_notes: string
          status: string
          subject: string
          support_thread_id: string
          updated_at: string
        }[]
      }
      admin_search_faqs: {
        Args: {
          category_filter?: string
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: string
        }
        Returns: {
          answer: string
          category: string
          created_at: string
          id: string
          question: string
          status: string
          updated_at: string
        }[]
      }
      admin_search_guest_debts: {
        Args: {
          max_amount?: number
          min_amount?: number
          reason_filter?: string
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: string
        }
        Returns: {
          amount: number
          booking_display_id: string
          booking_id: string
          created_at: string
          currency: string
          dispute_display_id: string
          dispute_id: string
          expires_at: string
          guest_avatar: string
          guest_email: string
          guest_name: string
          guest_user_id: string
          id: string
          listing_title: string
          notes: string
          paid_at: string
          reason: string
          status: string
        }[]
      }
      admin_search_listings: {
        Args: {
          max_price?: number
          min_price?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: Database["public"]["Enums"]["listing_status"]
        }
        Returns: {
          base_price: number
          city: string
          country: string
          cover_image: string
          created_at: string
          host_first_name: string
          host_last_name: string
          host_user_id: string
          id: string
          rating_avg: number
          rating_count: number
          state: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
        }[]
      }
      admin_search_payouts:
        | {
            Args: {
              max_amount?: number
              min_amount?: number
              search_query?: string
              sort_by?: string
              sort_order?: string
              status_filter?: string
            }
            Returns: {
              amount: number
              booking_id: string
              created_at: string
              currency: string
              guest_name: string
              host_avatar: string
              host_email: string
              host_name: string
              host_user_id: string
              id: string
              listing_id: string
              listing_title: string
              notes: string
              payout_date: string
              status: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              max_amount?: number
              min_amount?: number
              search_query?: string
              sort_by?: string
              sort_order?: string
              status_filter?: string
              transaction_type_filter?: string
            }
            Returns: {
              amount: number
              base_cleaning_fee: number
              base_subtotal: number
              booking_host_commission_amount: number
              booking_host_payout_gross: number
              booking_host_payout_net: number
              booking_id: string
              booking_status: string
              booking_subtotal: number
              cancellation_date: string
              checkin_date: string
              checkout_date: string
              cleaning_fee: number
              commission_amount: number
              commission_on_retained: number
              created_at: string
              currency: string
              dispute_category: string
              dispute_ids: string[]
              gross_revenue: number
              guest_avatar: string
              guest_debt_status: string
              guest_email: string
              guest_name: string
              guest_total_payment: number
              host_avatar: string
              host_email: string
              host_name: string
              host_retained_gross: number
              host_user_id: string
              id: string
              listing_id: string
              listing_title: string
              net_before_adjustments: number
              notes: string
              original_amount: number
              payout_date: string
              refund_amount: number
              refund_percentage_applied: number
              status: string
              total_dispute_refunds: number
              transaction_type: string
            }[]
          }
      admin_search_reviews: {
        Args: {
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: Database["public"]["Enums"]["review_status"]
        }
        Returns: {
          author_user_id: string
          booking_checkin: string
          booking_checkout: string
          booking_id: string
          booking_status: Database["public"]["Enums"]["booking_status"]
          created_at: string
          guest_avatar: string
          guest_email: string
          guest_name: string
          host_email: string
          host_name: string
          id: string
          listing_city: string
          listing_country: string
          listing_id: string
          listing_title: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          text: string
          updated_at: string
        }[]
      }
      admin_search_transactions: {
        Args: {
          max_amount?: number
          min_amount?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: string
          type_filter?: string
        }
        Returns: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          guest_avatar: string
          guest_email: string
          guest_name: string
          guest_user_id: string
          id: string
          listing_id: string
          listing_title: string
          provider: string
          status: string
          type: string
        }[]
      }
      admin_search_users: {
        Args: {
          role_filter?: Database["public"]["Enums"]["app_role"]
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: Database["public"]["Enums"]["user_status"]
        }
        Returns: {
          avatar_url: string
          bookings_count: number
          created_at: string
          email: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          listings_count: number
          primary_role: string
          status: Database["public"]["Enums"]["user_status"]
          user_display_id: string
        }[]
      }
      admin_suspend_user: {
        Args: { p_admin_user_id: string; p_user_id: string }
        Returns: Json
      }
      admin_unsuspend_user: {
        Args: { p_admin_user_id: string; p_user_id: string }
        Returns: Json
      }
      apply_outstanding_debts_to_payout: {
        Args: { p_payout_id: string }
        Returns: undefined
      }
      calculate_listing_rating: {
        Args: { target_listing_id: string }
        Returns: undefined
      }
      cancel_booking_with_refund:
        | {
            Args: { p_booking_id: string; p_cancellation_reason?: string }
            Returns: Json
          }
        | {
            Args: {
              p_booking_id: string
              p_cancellation_reason?: string
              p_user_id: string
            }
            Returns: Json
          }
      cancel_expired_bookings: { Args: never; Returns: Json }
      check_guest_outstanding_debts: {
        Args: { p_guest_user_id: string }
        Returns: boolean
      }
      confirm_booking_payment: {
        Args: {
          p_amount: number
          p_booking_id: string
          p_currency?: string
          p_provider: string
        }
        Returns: Json
      }
      create_booking_with_financial_snapshot:
        | {
            Args: {
              p_checkin_date: string
              p_checkout_date: string
              p_cleaning_fee: number
              p_guests: number
              p_listing_id: string
              p_nights_breakdown?: Json
              p_notes?: string
              p_pricing_breakdown?: Json
              p_subtotal: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_checkin_date: string
              p_checkout_date: string
              p_cleaning_fee: number
              p_guests: number
              p_listing_id: string
              p_notes?: string
              p_subtotal: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_checkin_date: string
              p_checkout_date: string
              p_cleaning_fee: number
              p_guests: number
              p_listing_id: string
              p_nights_breakdown?: Json
              p_notes?: string
              p_subtotal: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_checkin_date: string
              p_checkout_date: string
              p_cleaning_fee: number
              p_guests: number
              p_listing_id: string
              p_nights_breakdown?: Json
              p_notes?: string
              p_pricing_breakdown?: Json
              p_subtotal: number
            }
            Returns: Json
          }
      create_dispute_with_support_thread: {
        Args: {
          p_attachment_urls?: string[]
          p_booking_id: string
          p_category: Database["public"]["Enums"]["dispute_category"]
          p_description: string
          p_requested_refund_amount?: number
          p_subject: string
        }
        Returns: Json
      }
      expire_old_guest_debts: { Args: never; Returns: Json }
      get_admin_dashboard_kpis: {
        Args: never
        Returns: {
          active_bookings: number
          cancelled_bookings: number
          occupancy_rate: number
          open_disputes: number
          pending_listings: number
          total_revenue: number
        }[]
      }
      get_demo_credentials: {
        Args: never
        Returns: {
          email: string
          password: string
          role: string
        }[]
      }
      get_eligible_refund_amount: {
        Args: { p_booking_id: string }
        Returns: number
      }
      get_host_dashboard_kpis: {
        Args: { p_host_user_id: string }
        Returns: {
          actual_net_revenue: number
          average_rate: number
          host_fees_paid: number
          occupancy_rate: number
          pending_payouts: number
          total_gross_revenue: number
        }[]
      }
      get_host_earnings_report: {
        Args: {
          p_end_month: string
          p_host_user_id: string
          p_listing_ids?: string[]
          p_max_gross?: number
          p_max_net?: number
          p_min_gross?: number
          p_min_net?: number
          p_search_query?: string
          p_sort_by?: string
          p_sort_order?: string
          p_start_month: string
        }
        Returns: {
          actual_net_earnings: number
          average_nightly_rate: number
          cancel_percentage: number
          cancellation_income: number
          completed_count: number
          dispute_income: number
          dispute_refunds: number
          gross_earnings: number
          last_payout_date: string
          listing_id: string
          listing_title: string
          month_date: string
          month_year: string
          net_earnings: number
          nights_booked: number
          occupancy_percentage: number
          platform_fees: number
        }[]
      }
      get_or_create_support_thread: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_or_create_thread: {
        Args: {
          p_booking_id?: string
          p_listing_id?: string
          p_participant_1_id: string
          p_participant_2_id: string
        }
        Returns: string
      }
      get_public_profiles: {
        Args: never
        Returns: {
          about: string
          avatar_url: string
          created_at: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_unread_inbox_conversations: {
        Args: { p_user_id: string }
        Returns: {
          booking_id: string
          is_locked: boolean
          last_message: string
          last_message_time: string
          listing_address: string
          listing_title: string
          locked_at: string
          locked_reason: string
          other_user_id: string
          other_user_name: string
          thread_id: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      host_cancel_booking_full_refund: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      host_search_bookings: {
        Args: {
          checkin_end?: string
          checkin_start?: string
          checkout_end?: string
          checkout_start?: string
          host_id: string
          max_price?: number
          min_price?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: Database["public"]["Enums"]["booking_status"]
        }
        Returns: {
          checkin_date: string
          checkout_date: string
          created_at: string
          guest_avatar: string
          guest_email: string
          guest_name: string
          guest_user_id: string
          guests: number
          host_payout_gross: number
          id: string
          listing_id: string
          listing_title: string
          nights: number
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      host_search_listings: {
        Args: {
          host_id: string
          max_price?: number
          min_price?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          status_filter?: Database["public"]["Enums"]["listing_status"]
        }
        Returns: {
          base_price: number
          city: string
          country: string
          cover_image: string
          created_at: string
          id: string
          rating_avg: number
          rating_count: number
          state: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
        }[]
      }
      host_search_payouts:
        | {
            Args: {
              p_host_user_id: string
              p_max_amount?: number
              p_min_amount?: number
              p_search_query?: string
              p_sort_by?: string
              p_sort_order?: string
              p_status_filter?: string
              p_transaction_type_filter?: string
            }
            Returns: {
              amount: number
              base_cleaning_fee: number
              base_subtotal: number
              booking_host_commission_amount: number
              booking_host_payout_gross: number
              booking_host_payout_net: number
              booking_id: string
              booking_status: string
              booking_subtotal: number
              cancellation_date: string
              checkin_date: string
              checkout_date: string
              cleaning_fee: number
              commission_amount: number
              commission_on_retained: number
              created_at: string
              currency: string
              dispute_category: string
              dispute_ids: string[]
              gross_revenue: number
              guest_debt_status: string
              guest_email: string
              guest_name: string
              guest_total_payment: number
              host_retained_gross: number
              id: string
              listing_id: string
              listing_title: string
              net_before_adjustments: number
              notes: string
              original_amount: number
              payout_date: string
              refund_amount: number
              refund_percentage_applied: number
              status: string
              total_dispute_refunds: number
              transaction_type: string
            }[]
          }
        | {
            Args: {
              max_amount?: number
              min_amount?: number
              search_query?: string
              sort_by?: string
              sort_order?: string
              status_filter?: string
              transaction_type_filter?: string
            }
            Returns: {
              amount: number
              booking_host_commission_amount: number
              booking_host_payout_gross: number
              booking_host_payout_net: number
              booking_id: string
              booking_status: string
              booking_subtotal: number
              cancellation_date: string
              checkin_date: string
              checkout_date: string
              created_at: string
              currency: string
              dispute_category: string
              dispute_id: string
              guest_debt_status: string
              guest_email: string
              guest_name: string
              id: string
              listing_id: string
              listing_title: string
              notes: string
              payout_date: string
              refund_amount: number
              status: string
              transaction_type: string
            }[]
          }
      make_user_admin: { Args: { target_user_id: string }; Returns: undefined }
      mark_past_bookings_completed: { Args: never; Returns: undefined }
      process_guest_debt_payment:
        | {
            Args: { p_approved_amount: number; p_dispute_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_guest_debt_id: string
              p_payment_amount: number
              p_payment_currency: string
              p_payment_provider: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_guest_debt_id: string
              p_provider: string
            }
            Returns: Json
          }
      process_guest_refund:
        | {
            Args: { p_approved_refund_amount: number; p_dispute_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_approved_refund_amount: number
              p_dispute_id: string
              p_resolution_notes: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_approved_amount: number
              p_booking_id: string
              p_booking_status: string
              p_currency: string
              p_dispute_id: string
              p_host_user_id: string
              p_resolution_notes: string
            }
            Returns: undefined
          }
      process_host_claim:
        | {
            Args: {
              p_approved_claim_amount: number
              p_dispute_id: string
              p_resolution_notes: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_approved_amount: number
              p_booking_id: string
              p_currency: string
              p_dispute_id: string
              p_host_user_id: string
              p_resolution_notes: string
            }
            Returns: undefined
          }
      search_inbox_conversations: {
        Args: { p_search_query?: string; p_sort_by?: string; p_user_id: string }
        Returns: {
          booking_id: string
          last_message: string
          last_message_time: string
          listing_address: string
          listing_title: string
          other_user_id: string
          other_user_name: string
          thread_id: string
          unread_count: number
        }[]
      }
      send_dispute_resolution_message: {
        Args: {
          p_decision: string
          p_dispute_id: string
          p_is_guest_dispute?: boolean
          p_refund_amount?: number
          p_resolution_notes?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "host" | "guest"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "cancelled_guest"
        | "cancelled_host"
        | "completed"
        | "expired"
      cancellation_policy: "flexible" | "moderate" | "strict"
      dispute_category:
        | "refund_request"
        | "policy_violation"
        | "property_damage"
        | "cleanliness_issue"
        | "amenity_issue"
        | "safety_concern"
        | "billing_dispute"
        | "other"
      dispute_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "closed"
        | "escalated"
        | "pending"
        | "on_hold"
        | "resolved_approved"
        | "resolved_declined"
      email_trigger_type:
        | "booking_confirmed"
        | "days_before_checkin"
        | "day_of_checkin"
        | "days_after_checkin"
        | "days_before_checkout"
        | "day_of_checkout"
        | "days_after_checkout"
      listing_status: "draft" | "pending" | "approved" | "rejected" | "blocked"
      payout_status_enum: "pending" | "completed" | "failed" | "cancelled"
      property_type: "apartment" | "villa" | "room" | "house" | "condo"
      review_status: "pending" | "approved" | "rejected" | "blocked"
      thread_type: "user_to_user" | "user_to_support"
      user_status: "active" | "inactive" | "suspended"
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
      app_role: ["admin", "host", "guest"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "cancelled_guest",
        "cancelled_host",
        "completed",
        "expired",
      ],
      cancellation_policy: ["flexible", "moderate", "strict"],
      dispute_category: [
        "refund_request",
        "policy_violation",
        "property_damage",
        "cleanliness_issue",
        "amenity_issue",
        "safety_concern",
        "billing_dispute",
        "other",
      ],
      dispute_status: [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "escalated",
        "pending",
        "on_hold",
        "resolved_approved",
        "resolved_declined",
      ],
      email_trigger_type: [
        "booking_confirmed",
        "days_before_checkin",
        "day_of_checkin",
        "days_after_checkin",
        "days_before_checkout",
        "day_of_checkout",
        "days_after_checkout",
      ],
      listing_status: ["draft", "pending", "approved", "rejected", "blocked"],
      payout_status_enum: ["pending", "completed", "failed", "cancelled"],
      property_type: ["apartment", "villa", "room", "house", "condo"],
      review_status: ["pending", "approved", "rejected", "blocked"],
      thread_type: ["user_to_user", "user_to_support"],
      user_status: ["active", "inactive", "suspended"],
    },
  },
} as const

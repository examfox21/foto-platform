export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      photographers: {
        Row: {
          id: string
          email: string
          name: string
          business_name: string | null
          phone: string | null
          website: string | null
          subscription_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          business_name?: string | null
          phone?: string | null
          website?: string | null
          subscription_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          business_name?: string | null
          phone?: string | null
          website?: string | null
          subscription_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          photographer_id: string
          email: string
          name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          email: string
          name: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          email?: string
          name?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      galleries: {
        Row: {
          id: string
          photographer_id: string
          client_id: string
          title: string
          description: string | null
          access_code: string
          status: string
          package_photos_count: number
          additional_photo_price: number
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          client_id: string
          title: string
          description?: string | null
          access_code: string
          status?: string
          package_photos_count?: number
          additional_photo_price?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          client_id?: string
          title?: string
          description?: string | null
          access_code?: string
          status?: string
          package_photos_count?: number
          additional_photo_price?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          gallery_id: string
          filename: string
          original_url: string
          thumbnail_url: string
          watermark_url: string | null
          file_size: number | null
          width: number | null
          height: number | null
          upload_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gallery_id: string
          filename: string
          original_url: string
          thumbnail_url: string
          watermark_url?: string | null
          file_size?: number | null
          width?: number | null
          height?: number | null
          upload_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gallery_id?: string
          filename?: string
          original_url?: string
          thumbnail_url?: string
          watermark_url?: string | null
          file_size?: number | null
          width?: number | null
          height?: number | null
          upload_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      client_selections: {
        Row: {
          id: string
          photo_id: string
          gallery_id: string
          client_id: string
          selected_for_package: boolean
          is_additional_purchase: boolean
          created_at: string
        }
        Insert: {
          id?: string
          photo_id: string
          gallery_id: string
          client_id: string
          selected_for_package?: boolean
          is_additional_purchase?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          photo_id?: string
          gallery_id?: string
          client_id?: string
          selected_for_package?: boolean
          is_additional_purchase?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          gallery_id: string
          client_id: string
          photographer_id: string
          total_amount: number
          p24_session_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gallery_id: string
          client_id: string
          photographer_id: string
          total_amount: number
          p24_session_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gallery_id?: string
          client_id?: string
          photographer_id?: string
          total_amount?: number
          p24_session_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
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

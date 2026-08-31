/**
 * Database type surface for Simply Raizal (Stage 2).
 * Mirrors the Supabase schema for stories, categories, tags, media, and profiles.
 */
export type StoryLanguage = 'en' | 'es';
export type StoryStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
export type AccessLevel = 'public' | 'registered' | 'subscriber' | 'premium';
export type IslandScope = 'san_andres' | 'old_providence' | 'saint_catalina' | 'archipelago' | 'none';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          email_verified: string | null;
          image: string | null;
          is_author: boolean;
          is_editor: boolean;
          editorial_title: string | null;
          preferred_locale: 'en' | 'es';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          email_verified?: string | null;
          image?: string | null;
          is_author?: boolean;
          is_editor?: boolean;
          editorial_title?: string | null;
          preferred_locale?: 'en' | 'es';
        };
        Update: {
          name?: string | null;
          image?: string | null;
          preferred_locale?: 'en' | 'es';
        };
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name_en: string;
          name_es: string;
          description_en: string | null;
          description_es: string | null;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_en: string;
          name_es: string;
          description_en?: string | null;
          description_es?: string | null;
          active?: boolean;
          sort_order?: number;
        };
        Update: {
          name_en?: string;
          name_es?: string;
          description_en?: string | null;
          description_es?: string | null;
          active?: boolean;
          sort_order?: number;
        };
      };
      tags: {
        Row: {
          id: string;
          slug: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          slug: string;
          headline: string;
          subheadline: string | null;
          summary: string | null;
          body: Record<string, unknown>;
          language: StoryLanguage;
          status: StoryStatus;
          access_level: AccessLevel;
          author_id: string | null;
          editor_id: string | null;
          primary_category_id: string | null;
          island: IslandScope;
          featured_image_id: string | null;
          image_caption: string | null;
          image_credit: string | null;
          seo_title: string | null;
          seo_description: string | null;
          published_at: string | null;
          scheduled_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          headline?: string;
          subheadline?: string | null;
          summary?: string | null;
          body?: Record<string, unknown>;
          language?: StoryLanguage;
          status?: StoryStatus;
          access_level?: AccessLevel;
          author_id?: string | null;
          editor_id?: string | null;
          primary_category_id?: string | null;
          island?: IslandScope;
          featured_image_id?: string | null;
          image_caption?: string | null;
          image_credit?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          published_at?: string | null;
          scheduled_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          slug?: string;
          headline?: string;
          subheadline?: string | null;
          summary?: string | null;
          body?: Record<string, unknown>;
          language?: StoryLanguage;
          status?: StoryStatus;
          access_level?: AccessLevel;
          author_id?: string | null;
          editor_id?: string | null;
          primary_category_id?: string | null;
          island?: IslandScope;
          featured_image_id?: string | null;
          image_caption?: string | null;
          image_credit?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          published_at?: string | null;
          scheduled_at?: string | null;
          updated_by?: string | null;
        };
      };
      story_versions: {
        Row: {
          id: string;
          story_id: string;
          headline: string;
          subheadline: string | null;
          summary: string | null;
          body: Record<string, unknown>;
          author_id: string | null;
          editor_id: string | null;
          language: StoryLanguage;
          primary_category_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          headline?: string;
          subheadline?: string | null;
          summary?: string | null;
          body?: Record<string, unknown>;
          author_id?: string | null;
          editor_id?: string | null;
          language?: StoryLanguage;
          primary_category_id?: string | null;
          created_by: string;
        };
        Update: Record<string, never>;
      };
      story_categories: {
        Row: {
          story_id: string;
          category_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          story_id: string;
          category_id: string;
          is_primary?: boolean;
        };
        Update: {
          is_primary?: boolean;
        };
      };
      story_tags: {
        Row: {
          story_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          story_id: string;
          tag_id: string;
        };
        Update: Record<string, never>;
      };
      media_assets: {
        Row: {
          id: string;
          url: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          file_size: number | null;
          alt_text: string;
          caption: string | null;
          credit: string | null;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          alt_text?: string;
          caption?: string | null;
          credit?: string | null;
          uploaded_by: string;
        };
        Update: {
          alt_text?: string;
          caption?: string | null;
          credit?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      story_language: StoryLanguage;
      story_status: StoryStatus;
      access_level: AccessLevel;
      island_scope: IslandScope;
    };
  };
}

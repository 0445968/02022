/**
 * Database type surface for West Island Times.
 *
 * Stage 2:
 * - profiles
 * - stories
 * - story versions
 * - categories
 * - tags
 * - media
 *
 * Stage 3:
 * - homepage curation
 * - breaking news
 */

export type StoryLanguage =
  | 'en'
  | 'es';

export type StoryStatus =
  | 'draft'
  | 'in_review'
  | 'scheduled'
  | 'published'
  | 'archived';

export type AccessLevel =
  | 'public'
  | 'registered'
  | 'subscriber'
  | 'premium';

export type IslandScope =
  | 'san_andres'
  | 'old_providence'
  | 'saint_catalina'
  | 'archipelago'
  | 'none';

  export type EditorialBylineStatus =
  | 'active'
  | 'former'
  | 'hidden';

  export type HomepageSlotType =
  | 'lead'
  | 'top_left'
  | 'top_right'
  | 'secondary'
  | 'lead_support'
  | 'more_coverage'
  | 'highlight'
  | 'world'
  | 'latest_news'
  | 'editors_pick'
  | 'latest_feature'
  | 'section_feature'
  | 'video_feature'
  | 'island_feature'
  | 'headline_bar';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CommentStatus =
  | 'pending'
  | 'published'
  | 'hidden'
  | 'deleted';

export type CommentReportStatus =
  | 'open'
  | 'reviewed'
  | 'dismissed'
  | 'actioned';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          display_name: string;
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
          display_name?: string;
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
          display_name?: string;
          image?: string | null;
          preferred_locale?: 'en' | 'es';
        };

        Relationships: [];
      };

      editorial_profiles: {
        Row: {
          id: string;
      
          account_id:
            | string
            | null;
      
          byline_name: string;
      
          slug: string;
      
          editorial_title:
            | string
            | null;
      
          bio:
            | string
            | null;
      
          headshot_media_id:
            | string
            | null;
      
          byline_status:
            EditorialBylineStatus;
      
          created_at: string;
      
          updated_at: string;
        };
      
        Insert: {
          id?: string;
      
          account_id?:
            | string
            | null;
      
          byline_name: string;
      
          slug: string;
      
          editorial_title?:
            | string
            | null;
      
          bio?:
            | string
            | null;
      
          headshot_media_id?:
            | string
            | null;
      
          byline_status?:
            EditorialBylineStatus;
      
          created_at?: string;
      
          updated_at?: string;
        };
      
        Update: {
          account_id?:
            | string
            | null;
      
          byline_name?: string;
      
          slug?: string;
      
          editorial_title?:
            | string
            | null;
      
          bio?:
            | string
            | null;
      
          headshot_media_id?:
            | string
            | null;
      
          byline_status?:
            EditorialBylineStatus;
      
          updated_at?: string;
        };

        Relationships: [];
      };

      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          created_at: string;
        };

        Insert: {
          id?: string;
          user_id: string;
          story_id: string;
          created_at?: string;
        };

        Update: Record<
          string,
          never
        >;

        Relationships: [
          {
            foreignKeyName: 'bookmarks_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookmarks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      comments: {
        Row: {
          id: string;
          story_id: string;
          user_id:
            | string
            | null;
          parent_id:
            | string
            | null;
          body: string;
          status:
            CommentStatus;
          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;
          story_id: string;
          user_id?:
            | string
            | null;
          parent_id?:
            | string
            | null;
          body: string;
          status?:
            CommentStatus;
          created_at?: string;
          updated_at?: string;
        };

        Update: {
          body?: string;
          status?:
            CommentStatus;
        };

        Relationships: [
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      comment_reports: {
        Row: {
          id: string;
          comment_id: string;
          reporter_id: string;
          reason: string;
          status:
            CommentReportStatus;
          reviewed_by:
            | string
            | null;
          reviewed_at:
            | string
            | null;
          created_at: string;
        };

        Insert: {
          id?: string;
          comment_id: string;
          reporter_id: string;
          reason: string;
          status?:
            CommentReportStatus;
          reviewed_by?:
            | string
            | null;
          reviewed_at?:
            | string
            | null;
          created_at?: string;
        };

        Update: {
          status?:
            CommentReportStatus;
          reviewed_by?:
            | string
            | null;
          reviewed_at?:
            | string
            | null;
        };

        Relationships: [
          {
            foreignKeyName: 'comment_reports_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_reports_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
          slug?: string;
          name_en?: string;
          name_es?: string;
          description_en?: string | null;
          description_es?: string | null;
          active?: boolean;
          sort_order?: number;
        };

        Relationships: [];
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
          slug?: string;
          name?: string;
        };

        Relationships: [];
      };

      stories: {
        Row: {
          id: string;
          slug: string;
          headline: string;
          short_title:
          | string
          | null;
          subheadline: string | null;
          summary: string | null;
          body: Record<
            string,
            unknown
          >;
          language: StoryLanguage;
          status: StoryStatus;
          access_level: AccessLevel;
          author_id: string | null;
          editor_id: string | null;
          primary_category_id:
            | string
            | null;
          island: IslandScope;
          featured_image_id:
            | string
            | null;
          image_caption:
            | string
            | null;
          image_credit:
            | string
            | null;
          seo_title:
            | string
            | null;
          seo_description:
            | string
            | null;
          originally_published_at:
            | string
            | null;
          published_at:
            | string
            | null;
          scheduled_at:
            | string
            | null;
          created_by:
            | string
            | null;
          updated_by:
            | string
            | null;
          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;
          slug: string;
          headline?: string;
          short_title?:
          | string
          | null;
          subheadline?:
            | string
            | null;
          summary?:
            | string
            | null;
          body?: Record<
            string,
            unknown
          >;
          language?: StoryLanguage;
          status?: StoryStatus;
          access_level?: AccessLevel;
          author_id?:
            | string
            | null;
          editor_id?:
            | string
            | null;
          primary_category_id?:
            | string
            | null;
          island?: IslandScope;
          featured_image_id?:
            | string
            | null;
          image_caption?:
            | string
            | null;
          image_credit?:
            | string
            | null;
          seo_title?:
            | string
            | null;
          seo_description?:
            | string
            | null;
          originally_published_at?:
            | string
            | null;
          published_at?:
            | string
            | null;
          scheduled_at?:
            | string
            | null;
          created_by?:
            | string
            | null;
          updated_by?:
            | string
            | null;
        };

        Update: {
          slug?: string;
          headline?: string;        
          short_title?:
            | string
            | null;
        
          subheadline?:
            | string
            | null;
          summary?:
            | string
            | null;
          body?: Record<
            string,
            unknown
          >;
          language?: StoryLanguage;
          status?: StoryStatus;
          access_level?: AccessLevel;
          author_id?:
            | string
            | null;
          editor_id?:
            | string
            | null;
          primary_category_id?:
            | string
            | null;
          island?: IslandScope;
          featured_image_id?:
            | string
            | null;
          image_caption?:
            | string
            | null;
          image_credit?:
            | string
            | null;
          seo_title?:
            | string
            | null;
          seo_description?:
            | string
            | null;
          originally_published_at?:
            | string
            | null;
          published_at?:
            | string
            | null;
          scheduled_at?:
            | string
            | null;
          created_by?:
            | string
            | null;
          updated_by?:
            | string
            | null;
        };

        Relationships: [
          {
            foreignKeyName: 'stories_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stories_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stories_editor_id_fkey';
            columns: ['editor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stories_featured_image_id_fkey';
            columns: ['featured_image_id'];
            isOneToOne: false;
            referencedRelation: 'media_assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stories_primary_category_id_fkey';
            columns: ['primary_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stories_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      story_revisions: {
        Row: {
          id: string;

          story_id: string;

          headline: string;

          short_title:
            | string
            | null;

          subheadline:
            | string
            | null;

          summary:
            | string
            | null;

          body: Record<
            string,
            unknown
          >;

          language:
            StoryLanguage;

          status:
            StoryStatus;

          access_level:
            AccessLevel;

          author_id:
            | string
            | null;

          editor_id:
            | string
            | null;

          primary_category_id:
            | string
            | null;

          category_ids:
            string[];

          tag_ids:
            string[];

          island:
            IslandScope;

          featured_image_id:
            | string
            | null;

          image_caption:
            | string
            | null;

          image_credit:
            | string
            | null;

          seo_title:
            | string
            | null;

          seo_description:
            | string
            | null;

          slug: string;

          originally_published_at:
            | string
            | null;

          scheduled_at:
            | string
            | null;

          created_by:
            | string
            | null;

          updated_by:
            | string
            | null;

          created_at: string;

          updated_at: string;
        };

        Insert: {
          id?: string;

          story_id: string;

          headline: string;

          short_title?:
            | string
            | null;

          subheadline?:
            | string
            | null;

          summary?:
            | string
            | null;

          body?: Record<
            string,
            unknown
          >;

          language?:
            StoryLanguage;

          status?:
            StoryStatus;

          access_level?:
            AccessLevel;

          author_id?:
            | string
            | null;

          editor_id?:
            | string
            | null;

          primary_category_id?:
            | string
            | null;

          category_ids?:
            string[];

          tag_ids?:
            string[];

          island?:
            IslandScope;

          featured_image_id?:
            | string
            | null;

          image_caption?:
            | string
            | null;

          image_credit?:
            | string
            | null;

          seo_title?:
            | string
            | null;

          seo_description?:
            | string
            | null;

          slug: string;

          originally_published_at?:
            | string
            | null;

          scheduled_at?:
            | string
            | null;

          created_by?:
            | string
            | null;

          updated_by?:
            | string
            | null;
        };

        Update: {
          story_id?: string;

          headline?: string;

          short_title?:
            | string
            | null;

          subheadline?:
            | string
            | null;

          summary?:
            | string
            | null;

          body?: Record<
            string,
            unknown
          >;

          language?:
            StoryLanguage;

          status?:
            StoryStatus;

          access_level?:
            AccessLevel;

          author_id?:
            | string
            | null;

          editor_id?:
            | string
            | null;

          primary_category_id?:
            | string
            | null;

          category_ids?:
            string[];

          tag_ids?:
            string[];

          island?:
            IslandScope;

          featured_image_id?:
            | string
            | null;

          image_caption?:
            | string
            | null;

          image_credit?:
            | string
            | null;

          seo_title?:
            | string
            | null;

          seo_description?:
            | string
            | null;

          slug?: string;

          originally_published_at?:
            | string
            | null;

          scheduled_at?:
            | string
            | null;

          updated_by?:
            | string
            | null;
        };

        Relationships: [
          {
            foreignKeyName: 'story_revisions_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_editor_id_fkey';
            columns: ['editor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_featured_image_id_fkey';
            columns: ['featured_image_id'];
            isOneToOne: false;
            referencedRelation: 'media_assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_primary_category_id_fkey';
            columns: ['primary_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      story_versions: {
        Row: {
          id: string;
          story_id: string;
          headline: string;
          short_title?:
            | string
            | null;
          subheadline:
            | string
            | null;
          summary:
            | string
            | null;
          body: Record<
            string,
            unknown
          >;
          author_id:
            | string
            | null;
          editor_id:
            | string
            | null;
          language: StoryLanguage;
          primary_category_id:
            | string
            | null;
          created_by: string;
          created_at: string;
        };

        Insert: {
          id?: string;
          story_id: string;
          headline?: string;
          short_title?:
            | string
            | null;
          subheadline?:
            | string
            | null;
          summary?:
            | string
            | null;
          body?: Record<
            string,
            unknown
          >;
          author_id?:
            | string
            | null;
          editor_id?:
            | string
            | null;
          language?: StoryLanguage;
          primary_category_id?:
            | string
            | null;
          created_by: string;
        };

        Update: Record<
          string,
          never
        >;

        Relationships: [
          {
            foreignKeyName: 'story_versions_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_versions_editor_id_fkey';
            columns: ['editor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_versions_primary_category_id_fkey';
            columns: ['primary_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_versions_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
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

        Relationships: [
          {
            foreignKeyName: 'story_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_categories_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
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

        Update: Record<
          string,
          never
        >;

        Relationships: [
          {
            foreignKeyName: 'story_tags_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
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
          file_size:
            | number
            | null;
          alt_text: string;
          caption:
            | string
            | null;
          credit:
            | string
            | null;
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
          width?:
            | number
            | null;
          height?:
            | number
            | null;
          file_size?:
            | number
            | null;
          alt_text?: string;
          caption?:
            | string
            | null;
          credit?:
            | string
            | null;
          uploaded_by: string;
        };

        Update: {
          alt_text?: string;
          caption?:
            | string
            | null;
          credit?:
            | string
            | null;
        };

        Relationships: [
          {
            foreignKeyName: 'media_assets_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      homepage_slots: {
        Row: {
          id: string;
          slot: HomepageSlotType;
          story_id: string;
          position: number;
          category_id:
            | string
            | null;
          starts_at:
            | string
            | null;
          ends_at:
            | string
            | null;
          active: boolean;
          created_by:
            | string
            | null;
          updated_by:
            | string
            | null;
          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;
          slot: HomepageSlotType;
          story_id: string;
          position?: number;
          category_id?:
            | string
            | null;
          starts_at?:
            | string
            | null;
          ends_at?:
            | string
            | null;
          active?: boolean;
          created_by?:
            | string
            | null;
          updated_by?:
            | string
            | null;
        };

        Update: {
          slot?: HomepageSlotType;
          story_id?: string;
          position?: number;
          category_id?:
            | string
            | null;
          starts_at?:
            | string
            | null;
          ends_at?:
            | string
            | null;
          active?: boolean;
          updated_by?:
            | string
            | null;
        };

        Relationships: [
          {
            foreignKeyName: 'homepage_slots_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'homepage_slots_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'homepage_slots_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'homepage_slots_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      homepage_layout_drafts: {
        Row: {
          id: string;
          selections: Json;
          updated_by:
            | string
            | null;
          updated_at: string;
        };

        Insert: {
          id?: string;
          selections?: Json;
          updated_by?:
            | string
            | null;
          updated_at?: string;
        };

        Update: {
          selections?: Json;
          updated_by?:
            | string
            | null;
          updated_at?: string;
        };

        Relationships: [
          {
            foreignKeyName: 'homepage_layout_drafts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      breaking_news: {
        Row: {
          id: string;
          headline: string;
          story_id:
            | string
            | null;
          external_url:
            | string
            | null;
          active: boolean;
          position: number;
          starts_at:
            | string
            | null;
          ends_at:
            | string
            | null;
          created_by:
            | string
            | null;
          updated_by:
            | string
            | null;
          created_at: string;
          updated_at: string;
        };

        Insert: {
          id?: string;
          headline: string;
          story_id?:
            | string
            | null;
          external_url?:
            | string
            | null;
          active?: boolean;
          position?: number;
          starts_at?:
            | string
            | null;
          ends_at?:
            | string
            | null;
          created_by?:
            | string
            | null;
          updated_by?:
            | string
            | null;
        };

        Update: {
          headline?: string;
          story_id?:
            | string
            | null;
          external_url?:
            | string
            | null;
          active?: boolean;
          position?: number;
          starts_at?:
            | string
            | null;
          ends_at?:
            | string
            | null;
          updated_by?:
            | string
            | null;
        };

        Relationships: [
          {
            foreignKeyName: 'breaking_news_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'breaking_news_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'breaking_news_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: {
      reader_public_profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url:
            | string
            | null;
        };

        Relationships: [];
      };
    };

    Functions: {
      publish_homepage_layout: {
        Args: {
          p_selections: Json;
          p_user_id?:
            | string
            | null;
        };

        Returns: undefined;
      };

      publish_story_revision: {
        Args: {
          p_story_id:
            string;
    
          p_user_id:
            string;
        };
    
        Returns:
          undefined;
      };
    };

    Enums: {
      story_language: StoryLanguage;
      story_status: StoryStatus;
      access_level: AccessLevel;
      island_scope: IslandScope;
      homepage_slot_type: HomepageSlotType;
      comment_status:
        CommentStatus;

      comment_report_status:
        CommentReportStatus;
    };
  };
}

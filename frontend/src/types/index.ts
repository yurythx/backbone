export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  is_system_role: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  groups: string[];
  role?: number;
  role_details?: Role;
  is_superuser?: boolean;
  avatar?: string | null;
  avatar_url?: string | null;
}

export interface Contact {
  id: number;
  username: string;
  email: string;
  is_online: boolean;
  group_names: string[];
  is_staff: boolean;
  avatar_url?: string | null;
}

export interface MessageReaction {
  id: number;
  user: number;
  user_username: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: number;
  content: string;
  sender: number;
  conversation: number;
  created_at: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  reactions?: MessageReaction[];
  is_read?: boolean;
  edited_at?: string | null;
  reply_to?: {
    id: number;
    content: string;
    sender: number;
    sender_username: string;
    created_at: string;
    file_name?: string;
    file_type?: string;
  } | null;
}

export interface Conversation {
  id: number;
  participants: Contact[];
  last_message?: Message;
  created_at: string;
  updated_at: string;
}

export interface TenantBranding {
  id: number;
  company: string;
  company_name: string;
  logo: string | null;
  logo_url: string | null;
  icon: string | null;
  icon_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  theme_palette: string;
  custom_css: string;
  custom_js: string;
  footer_text: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserThemePreference {
  id: number;
  user: number;
  theme_palette: string | null;
  use_tenant_theme: boolean;
  dark_mode_preference: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  branding: {
    primaryColor?: string;
    logoUrl?: string;
  };
  theme_branding?: TenantBranding;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  is_published: boolean;
  published_at?: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  author: number; // ID
  category: number | null; // ID
  tags: number[]; // IDs
  tag_list?: Tag[]; // Full objects if read
  created_at: string;
  updated_at: string;
  image?: string | null;
  author_name?: string;
  category_name?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  company_name?: string;
  company_slug?: string;
}

export interface PlanFeature {
  feature_code: string;
  feature_name: string;
  value: string;
}

export interface Plan {
  id: number;
  name: string;
  price: string;
  features: PlanFeature[];
}

export interface License {
  id: number;
  plan: number; // Plan ID
  plan_name: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface Module {
  id: number;
  code: string;
  name: string;
  description: string;
  is_global: boolean;
}

export interface TenantModule {
  id: number;
  module: number; // ID
  module_code: string; // From serializer
  module_name: string; // From serializer
  module_details?: Module; // If expanded
  is_active: boolean;
  config: any;
}
export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  is_active: boolean;
  company: string; // UUID
  created_at: string;
  updated_at: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

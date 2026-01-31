export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  groups: string[];
}

export interface Contact {
  id: number;
  username: string;
  email: string;
  is_online: boolean;
  group_names: string[];
  is_staff: boolean;
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
  theme_palette: string;
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
  branding: {
    primaryColor?: string;
    logoUrl?: string;
  };
  theme_branding?: TenantBranding; // Adicionado para suportar o novo modelo
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

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  is_published: boolean;
  author: number; // ID
  category: number | null; // ID
  created_at: string;
  updated_at: string;
  image?: string | null;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface Plan {
  id: number;
  name: string;
  price: string;
}

export interface License {
  id: number;
  plan: number; // Plan ID
  start_date: string;
  end_date?: string;
  is_active: boolean;
  plan_details?: Plan; // Optional expanded plan
}

export interface Module {
  code: string;
  name: string;
  description: string;
  is_global: boolean;
}

export interface TenantModule {
  id: number;
  module: number; // ID
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

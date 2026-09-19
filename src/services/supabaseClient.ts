import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const rawKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Loại bỏ ký tự ẩn BOM (\uFEFF) và khoảng trắng nếu có
const supabaseUrl = rawUrl.replace(/^\uFEFF/, '').trim();
const supabasePublishableKey = rawKey.replace(/^\uFEFF/, '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;


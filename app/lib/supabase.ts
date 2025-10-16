import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern to ensure only one client instance
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'drill-auth',
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

export type DrawingImage = {
  id: string;
  image_url: string;
  storage_path: string;
  prompt: string;
  category: string;
  subject_type: string;
  clothing_state: string;
  attributes: Record<string, unknown>;
  base_image_id?: string;
  model: string;
  generation_type: 'text-to-image' | 'image-to-image';
  created_at: string;
  used_count: number;
  last_used_at?: string;
  // Legacy fields (will be deprecated after migration)
  body_type?: string;
  race?: string;
  pose?: string;
  angle?: string;
};
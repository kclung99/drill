import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DrawingImage = {
  id: string;
  image_url: string;
  storage_path: string;
  prompt: string;
  body_type: string;
  race: string;
  pose: string;
  angle: string;
  created_at: string;
  used_count: number;
  last_used_at?: string;
};
/**
 * Shared sync utilities for pulling data from Supabase and replacing localStorage
 */

import { supabase } from '@/app/lib/supabase';

/**
 * Pull array data from Supabase table and replace localStorage
 * Used for sessions (chord, drawing)
 */
export async function pullAndReplaceList<T>(
  tableName: string,
  localStorageKey: string,
  userId: string,
  mapRow: (row: any) => T
): Promise<T[]> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const items: T[] = (data || []).map(mapRow);

  if (typeof window !== 'undefined') {
    localStorage.setItem(localStorageKey, JSON.stringify(items));
  }

  return items;
}

/**
 * Pull single object from Supabase table and replace localStorage
 * Used for settings
 */
export async function pullAndReplaceSingle<T>(
  tableName: string,
  localStorageKey: string,
  userId: string,
  mapRow: (row: any) => T,
  defaultValue: T
): Promise<T> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const item: T = data ? mapRow(data) : defaultValue;

  if (typeof window !== 'undefined') {
    localStorage.setItem(localStorageKey, JSON.stringify(item));
  }

  return item;
}

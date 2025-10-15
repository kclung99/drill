/**
 * Drawing References Service
 *
 * Service for loading reference images from the drawing_refs table.
 */

import { supabase } from '../lib/supabase';

export interface DrawingRef {
  id: string;
  filename: string;
  source_url: string;
  page_url: string | null;
  platform: string | null;
  body_part: string | null;
  gender: string | null;
  clothing_state: string;
  attributes: any;
  used_count: number;
  used_for_generation: boolean;
  created_at: string;
  used_at: string | null;
}

export class DrawingRefsService {
  /**
   * Get reference images for a drawing session
   */
  async getRefsForSession(
    count: number,
    bodyPart: string = 'full-body',
    gender: string = 'female',
    clothing: string = 'minimal'
  ): Promise<DrawingRef[]> {
    try {
      // Build query with filters - fetch more than needed for randomization
      const fetchCount = Math.min(count * 3, 50);

      let query = supabase
        .from('drawing_refs')
        .select('*')
        .eq('body_part', bodyPart)
        .eq('clothing_state', clothing);

      // Filter by gender (handle 'both' case)
      if (gender !== 'both') {
        query = query.eq('gender', gender);
      }

      // Get refs prioritizing least used
      const { data: availableRefs, error } = await query
        .order('used_count', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(fetchCount);

      if (error) {
        throw error;
      }

      const existingCount = availableRefs?.length || 0;

      if (existingCount < count) {
        console.warn(
          `⚠️  Not enough refs: requested ${count}, found ${existingCount} for ${bodyPart}/${gender}/${clothing}`
        );

        if (existingCount === 0) {
          throw new Error(
            `No reference images available for ${bodyPart}/${gender}/${clothing}.`
          );
        }

        // Return what we have
        const refIds = availableRefs.map((ref) => ref.id);
        await this.markRefsAsUsed(refIds);
        return availableRefs;
      }

      // Randomly select from the pool of least-used refs
      const selectedRefs = this.randomlySelectRefs(availableRefs, count);

      // Mark selected refs as used
      const refIds = selectedRefs.map((ref) => ref.id);
      await this.markRefsAsUsed(refIds);

      return selectedRefs;
    } catch (error) {
      console.error('Failed to get refs for session:', error);
      throw error;
    }
  }

  /**
   * Randomly select refs using Fisher-Yates shuffle
   */
  private randomlySelectRefs(refs: DrawingRef[], count: number): DrawingRef[] {
    const shuffled = [...refs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  /**
   * Mark refs as used (increment usage count)
   */
  private async markRefsAsUsed(refIds: string[]): Promise<void> {
    try {
      for (const refId of refIds) {
        const { error } = await supabase.rpc('increment_ref_usage', {
          ref_id: refId,
        });

        if (error) {
          console.error(`Failed to mark ref ${refId} as used:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to mark refs as used:', error);
      // Non-critical error, don't throw
    }
  }
}

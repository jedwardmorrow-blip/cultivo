import { supabase } from '@/lib/supabase';
import type { QualityGrade, QualityGradeHistory } from '@/types';

let cachedGrades: QualityGrade[] | null = null;

export const qualityGradeService = {
  async fetchGrades(): Promise<QualityGrade[]> {
    if (cachedGrades) return cachedGrades;

    const { data, error } = await supabase
      .from('quality_grades')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    cachedGrades = (data || []) as QualityGrade[];
    return cachedGrades;
  },

  clearCache() {
    cachedGrades = null;
  },

  async getGradeById(gradeId: string): Promise<QualityGrade | null> {
    const grades = await this.fetchGrades();
    return grades.find(g => g.id === gradeId) || null;
  },

  async getGradeByCode(code: string): Promise<QualityGrade | null> {
    const grades = await this.fetchGrades();
    return grades.find(g => g.code === code) || null;
  },

  async assignBatchGrade(
    batchId: string,
    gradeId: string | null,
    userId: string | null,
    reason?: string
  ): Promise<{ cascadedCount: number }> {
    const { data: batch } = await supabase
      .from('batch_registry')
      .select('quality_grade_id')
      .eq('id', batchId)
      .maybeSingle();

    const previousGradeId = batch?.quality_grade_id || null;

    const { error: updateError } = await supabase
      .from('batch_registry')
      .update({ quality_grade_id: gradeId })
      .eq('id', batchId);

    if (updateError) throw updateError;

    await supabase.from('quality_grade_history').insert({
      entity_type: 'batch',
      entity_id: batchId,
      previous_grade_id: previousGradeId,
      new_grade_id: gradeId,
      changed_by: userId,
      reason: reason || null,
    });

    let cascadedCount = 0;
    if (gradeId) {
      const { data: updatedItems } = await supabase
        .from('inventory_items')
        .update({ quality_grade_id: gradeId })
        .is('quality_grade_id', null)
        .eq('batch_id', batchId)
        .select('id');

      cascadedCount = updatedItems?.length || 0;
    }

    return { cascadedCount };
  },

  async assignItemGrade(
    itemId: string,
    gradeId: string | null,
    userId: string | null,
    reason?: string
  ): Promise<void> {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('quality_grade_id')
      .eq('id', itemId)
      .maybeSingle();

    const previousGradeId = item?.quality_grade_id || null;

    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ quality_grade_id: gradeId })
      .eq('id', itemId);

    if (updateError) throw updateError;

    await supabase.from('quality_grade_history').insert({
      entity_type: 'inventory_item',
      entity_id: itemId,
      previous_grade_id: previousGradeId,
      new_grade_id: gradeId,
      changed_by: userId,
      reason: reason || null,
    });
  },

  async getGradeHistory(
    entityType: 'batch' | 'inventory_item',
    entityId: string
  ): Promise<QualityGradeHistory[]> {
    const { data, error } = await supabase
      .from('quality_grade_history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as QualityGradeHistory[];
  },

  async getBatchGradeId(batchId: string): Promise<string | null> {
    const { data } = await supabase
      .from('batch_registry')
      .select('quality_grade_id')
      .eq('batch_id', batchId)
      .maybeSingle();

    return data?.quality_grade_id || null;
  },
};

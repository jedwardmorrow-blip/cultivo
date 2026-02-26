import { useState, useEffect } from 'react';
import { qualityGradeService } from '@/services';
import type { QualityGrade } from '@/types';

export function useQualityGrades() {
  const [grades, setGrades] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await qualityGradeService.fetchGrades();
        if (!cancelled) setGrades(data);
      } catch (err) {
        console.error('Failed to load quality grades:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const assignableGrades = grades.filter(g => g.code !== 'UNDEFINED');

  const getGradeById = (id: string | null | undefined): QualityGrade | null => {
    if (!id) return null;
    return grades.find(g => g.id === id) || null;
  };

  const getGradeByCode = (code: string): QualityGrade | null => {
    return grades.find(g => g.code === code) || null;
  };

  return { grades, assignableGrades, loading, getGradeById, getGradeByCode };
}

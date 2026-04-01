import { supabase } from '../../lib/supabase';

interface CrudServiceOptions<T, _TInput = Partial<T>, _TUpdate = Partial<T>> {
  tableName: string;
  select?: string;
}

export function createCrudService<T, TInput = Partial<T>, TUpdate = Partial<T>>(
  options: CrudServiceOptions<T, TInput, TUpdate>
) {
  const { tableName, select = '*' } = options;

  return {
    async fetchAll(): Promise<T[]> {
      // @ts-expect-error [stale-db-types: generic string tableName not in Supabase table union — resolves after database.types.ts regen]
      const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data as T[]) || [];
    },

    async fetchById(id: string): Promise<T | null> {
      // @ts-expect-error [stale-db-types: generic string tableName not in Supabase table union — resolves after database.types.ts regen]
      const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as T | null;
    },

    async create(input: TInput): Promise<T> {
      // @ts-expect-error [stale-db-types: generic string tableName not in Supabase table union — resolves after database.types.ts regen]
      const { data, error } = await supabase
        .from(tableName)
        .insert([input])
        .select(select)
        .single();

      if (error) throw new Error(error.message);
      return data as T;
    },

    async update(id: string, updates: TUpdate): Promise<T> {
      // @ts-expect-error [stale-db-types: generic string tableName not in Supabase table union — resolves after database.types.ts regen]
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select(select)
        .single();

      if (error) throw new Error(error.message);
      return data as T;
    },

    async delete(id: string): Promise<void> {
      // @ts-expect-error [stale-db-types: generic string tableName not in Supabase table union — resolves after database.types.ts regen]
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
  };
}

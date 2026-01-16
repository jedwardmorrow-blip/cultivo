import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface UseTableSubscriptionOptions {
  debounceMs?: number;
}

export function useTableSubscription(
  tableName: string,
  callback: () => void,
  options: UseTableSubscriptionOptions = {}
) {
  const { debounceMs = 500 } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            callback();
          }, debounceMs);
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [tableName, callback, debounceMs]);
}

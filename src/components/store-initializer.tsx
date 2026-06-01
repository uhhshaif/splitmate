'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, isMockMode } from '@/lib/supabase';

export default function StoreInitializer() {
  const initialize = useStore((state) => state.initialize);

  useEffect(() => {
    initialize();

    if (isMockMode) return;

    // Set up real-time subscription for database updates
    const channel = supabase
      .channel('splitmate-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          // console.log('[Realtime] Expenses updated, refetching...');
          initialize();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => {
          // console.log('[Realtime] Group members updated, refetching...');
          initialize();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => {
          // console.log('[Realtime] Groups updated, refetching...');
          initialize();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        () => {
          // console.log('[Realtime] Settlements updated, refetching...');
          initialize();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialize]);

  return null;
}


'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function StoreInitializer() {
  const initialize = useStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}


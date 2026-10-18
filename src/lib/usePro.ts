"use client";

import { useCallback, useEffect, useState } from "react";
import { getProStatus, onAuthChange } from "./supabase";

/** Tiny hook: is the logged-in user a Pro subscriber? */
export function usePro() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const pro = await getProStatus();
    setIsPro(pro);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => refresh());
    return onAuthChange(() => queueMicrotask(() => refresh()));
  }, [refresh]);

  return { isPro, loading, refresh };
}

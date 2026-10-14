"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readSummary, storageAvailable } from "@/lib/data/database";
import type { DatasetSummary } from "@/lib/data/types";
import { cloudConfigured, getStoreAccess, getSupabase, type StoreAccess } from "@/lib/supabase/client";

type DataContextValue = { summary: DatasetSummary | null; loading: boolean; supported: boolean; cloud: boolean; userEmail: string | null; access: StoreAccess | null; authError: string; refresh: () => Promise<void>; reloadAuth: () => Promise<void>; signOut: () => Promise<void> };
const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const cloud = cloudConfigured();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [access, setAccess] = useState<StoreAccess | null>(null);
  const [authError, setAuthError] = useState("");
  const refresh = useCallback(async () => { setSummary(await readSummary()); }, []);
  const reloadAuth = useCallback(async () => {
    setLoading(true); setAuthError("");
    try {
      if (!cloud) { const ok = await storageAvailable(); setSupported(ok); if (ok) await refresh(); return; }
      const supabase = getSupabase(); const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      if (!data.user) { setAccess(null); setSummary(null); return; }
      const nextAccess = await getStoreAccess(); setAccess(nextAccess); await refresh();
    } catch (error) { setAccess(null); setSummary(null); setAuthError(error instanceof Error ? error.message : "로그인 정보를 확인하지 못했습니다."); }
    finally { setLoading(false); }
  }, [cloud, refresh]);
  const signOut = useCallback(async () => { if (cloud) await getSupabase().auth.signOut(); setUserEmail(null); setAccess(null); setSummary(null); setAuthError(""); }, [cloud]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reloadAuth(); }, 0);
    if (!cloud) return () => window.clearTimeout(timer);
    const { data } = getSupabase().auth.onAuthStateChange(() => { void reloadAuth(); });
    return () => { window.clearTimeout(timer); data.subscription.unsubscribe(); };
  }, [cloud, reloadAuth]);
  const value = useMemo(() => ({ summary, loading, supported, cloud, userEmail, access, authError, refresh, reloadAuth, signOut }), [summary, loading, supported, cloud, userEmail, access, authError, refresh, reloadAuth, signOut]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useCafeData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider가 필요합니다.");
  return value;
}

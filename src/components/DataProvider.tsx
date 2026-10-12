"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readSummary, storageAvailable } from "@/lib/data/database";
import type { DatasetSummary } from "@/lib/data/types";

type DataContextValue = { summary: DatasetSummary | null; loading: boolean; supported: boolean; refresh: () => Promise<void> };
const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const refresh = useCallback(async () => { setSummary(await readSummary()); }, []);
  useEffect(() => { void (async () => { const ok = await storageAvailable(); setSupported(ok); if (ok) await refresh(); setLoading(false); })(); }, [refresh]);
  const value = useMemo(() => ({ summary, loading, supported, refresh }), [summary, loading, supported, refresh]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useCafeData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider가 필요합니다.");
  return value;
}

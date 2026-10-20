"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PeriodUnit } from "@/lib/calculations";

export type SalesWorkspaceFilters = {
  unit: PeriodUnit;
  date: string;
  category: string;
  menu: string;
  query: string;
};

type FilterPatch = Partial<SalesWorkspaceFilters>;

function validUnit(value: string | null): PeriodUnit {
  return value === "day" || value === "week" || value === "month" ? value : "month";
}

export function useSalesWorkspaceFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters: SalesWorkspaceFilters = {
    unit: validUnit(searchParams.get("unit")),
    date: searchParams.get("date") ?? "",
    category: searchParams.get("category") ?? "",
    menu: searchParams.get("menu") ?? "",
    query: searchParams.get("q") ?? "",
  };

  const paramsWith = useCallback((patch: FilterPatch) => {
    const params = new URLSearchParams(searchParams.toString());
    const entries: [keyof SalesWorkspaceFilters, string][] = [
      ["unit", patch.unit ?? filters.unit],
      ["date", patch.date ?? filters.date],
      ["category", patch.category ?? filters.category],
      ["menu", patch.menu ?? filters.menu],
      ["query", patch.query ?? filters.query],
    ];
    const keys: Record<keyof SalesWorkspaceFilters, string> = { unit: "unit", date: "date", category: "category", menu: "menu", query: "q" };
    params.delete("channel");
    for (const [name, value] of entries) {
      if (!value || (name === "unit" && value === "month")) params.delete(keys[name]);
      else params.set(keys[name], value);
    }
    return params;
  }, [filters.category, filters.date, filters.menu, filters.query, filters.unit, searchParams]);

  const updateFilters = useCallback((patch: FilterPatch) => {
    const params = paramsWith(patch);
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }, [paramsWith, pathname]);

  const hrefFor = useCallback((target: string, patch: FilterPatch = {}) => {
    const params = paramsWith(patch);
    return `${target}${params.size ? `?${params.toString()}` : ""}`;
  }, [paramsWith]);

  return { filters, updateFilters, hrefFor };
}

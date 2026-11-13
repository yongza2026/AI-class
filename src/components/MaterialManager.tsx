"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
export function MaterialManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "settings");
    router.replace(`/inventory/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  return <section className="page"><p role="status">통합 품목·재고 화면으로 이동합니다…</p></section>;
}

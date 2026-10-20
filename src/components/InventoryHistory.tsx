"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { auditRow } from "@/lib/data/migration";
import { readDataset, replaceDataset } from "@/lib/data/database";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { numberOf, qty, valueOf } from "@/lib/format";
import { useCafeData } from "./DataProvider";

type LoadState = "loading" | "ready" | "error";

function safeInventoryReturn(value: string) {
  return value.startsWith("/inventory") && !value.startsWith("//") ? value : "/inventory/history";
}

export function InventoryHistory() {
  const { refresh } = useCafeData();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      setData(await readDataset());
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "재고 이력을 불러오지 못했습니다.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    readDataset().then((next) => {
      if (ignore) return;
      setData(next);
      setState("ready");
    }).catch((cause) => {
      if (ignore) return;
      setError(cause instanceof Error ? cause.message : "재고 이력을 불러오지 못했습니다.");
      setState("error");
    });
    return () => { ignore = true; };
  }, []);

  const setFilter = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(name, value); else params.delete(name);
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [pathname, router]);

  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const location = searchParams.get("location") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const eventType = searchParams.get("type") ?? "";
  const materialId = searchParams.get("material") ?? "";

  const categories = [...new Set(data?.materials.map((row) => valueOf(row, "category")).filter(Boolean) ?? [])];
  const locations = [...new Set(data?.materials.map((row) => valueOf(row, "location")).filter(Boolean) ?? [])];
  const rows = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLocaleLowerCase("ko");
    return [...data.inventoryEvents]
      .filter((row) => {
        const material = data.materials.find((item) => item.materialId === row.materialId);
        return (!materialId || row.materialId === materialId)
          && (!category || material?.category === category)
          && (!location || material?.location === location)
          && (!from || valueOf(row, "date") >= from)
          && (!to || valueOf(row, "date") <= to)
          && (!eventType || row.eventType === eventType)
          && `${material?.name ?? ""} ${row.materialId} ${row.eventId}`.toLocaleLowerCase("ko").includes(needle);
      })
      .sort((a, b) => valueOf(b, "date").localeCompare(valueOf(a, "date")) || valueOf(b, "eventId").localeCompare(valueOf(a, "eventId")));
  }, [category, data, eventType, from, location, materialId, query, to]);

  const currentUrl = safeInventoryReturn(`${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`);
  const recordHref = `/inventory/new?return=${encodeURIComponent(currentUrl)}${materialId ? `&material=${encodeURIComponent(materialId)}` : ""}`;

  async function remove(row: DataRow) {
    if (!data || !confirm(`${row.date} ${row.eventType} 기록을 삭제할까요? 재고도 함께 다시 계산됩니다.`)) return;
    const id = valueOf(row, "eventId");
    const next = {
      ...data,
      inventoryEvents: data.inventoryEvents.filter((item) => item.eventId !== id),
      purchaseLots: data.purchaseLots.filter((item) => item.eventId !== id),
      bottleStates: data.bottleStates.filter((item) => item.eventId !== id),
      auditLog: [...data.auditLog, auditRow("삭제", "inventoryEvents", id, row, null, "사용자 삭제")],
    };
    await replaceDataset(next);
    setData(next);
    setMessage("재고 기록을 삭제하고 잔량을 다시 계산했습니다.");
    await refresh();
  }

  if (state === "loading") return <section className="page"><div className="empty-card" role="status">재고 이력을 불러오고 있습니다…</div></section>;
  if (state === "error") return <section className="page"><div className="empty-card"><h2>재고 이력을 불러오지 못했습니다</h2><p>{error}</p><button className="button primary" onClick={() => void load()}>다시 시도</button></div></section>;
  if (!data) return <section className="page"><div className="empty-card"><h2>저장된 운영 자료가 없습니다</h2><p>데이터 관리에서 자료를 준비한 뒤 재고 이력을 확인할 수 있습니다.</p></div></section>;

  return (
    <section className="page">
      <div className="page-heading">
        <div><p className="eyebrow">재료 흐름</p><h1>재고 이력</h1><p>입고·폐기·실사조정·판매 외 사용 기록을 품목별로 확인합니다.</p></div>
        <div className="actions"><button className="button secondary" onClick={() => void load()}><RefreshCw size={16}/>새로고침</button><Link className="button primary" href={recordHref}><Plus size={16}/>재고 기록</Link></div>
      </div>
      <div className="notice info"><span>실사조정은 입력한 값을 실측 잔량으로 저장합니다. 아래 변동량은 적용 전 잔량과 실측 잔량의 차이입니다.</span></div>
      {message && <div className="notice success" role="status"><span>{message}</span></div>}
      <div className="filter-bar inventory-filter-bar">
        <label className="grow">품목 검색<input value={query} onChange={(event) => setFilter("q", event.target.value)} placeholder="품목명 또는 ID"/></label>
        <label>분류<select value={category} onChange={(event) => setFilter("category", event.target.value)}><option value="">전체</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>보관 위치<select value={location} onChange={(event) => setFilter("location", event.target.value)}><option value="">전체</option>{locations.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>시작일<input type="date" value={from} onChange={(event) => setFilter("from", event.target.value)}/></label>
        <label>종료일<input type="date" value={to} onChange={(event) => setFilter("to", event.target.value)}/></label>
        <label>기록 유형<select value={eventType} onChange={(event) => setFilter("type", event.target.value)}><option value="">전체</option><option>입고</option><option>폐기</option><option>실사조정</option><option value="수동사용">R&amp;D·서비스 사용</option></select></label>
      </div>
      {!data.inventoryEvents.length ? (
        <div className="empty-card"><h2>아직 재고 기록이 없습니다</h2><p>입고, 실사, 폐기 또는 R&amp;D 사용을 기록해 주세요.</p><Link className="button primary" href={recordHref}>첫 재고 기록</Link></div>
      ) : !rows.length ? (
        <div className="empty-card"><h2>검색 결과가 없습니다</h2><p>검색어 또는 기간·기록 유형 필터를 바꿔 보세요.</p></div>
      ) : (
        <div className="card table-card"><div className="table-wrap"><table className="data-table inventory-history-table"><thead><tr><th>날짜 / ID</th><th>품목</th><th>유형</th><th className="num">변동량</th><th>실측 잔량</th><th>금액 상태</th><th>사유</th><th>관리</th></tr></thead><tbody>{rows.map((row) => {
          const editHref = `/inventory/new?event=${encodeURIComponent(valueOf(row, "eventId"))}&return=${encodeURIComponent(currentUrl)}`;
          return <tr key={valueOf(row, "eventId")}><td>{row.date}<small>{row.eventId}</small></td><td><strong>{data.materials.find((item) => item.materialId === row.materialId)?.name ?? "삭제된 품목"}</strong><small>{row.materialId}</small></td><td>{row.eventType === "수동사용" ? "R&D·서비스 사용" : row.eventType}</td><td className="num">{qty(numberOf(row, "quantity"), valueOf(row, "unit"))}</td><td>{row.eventType === "실사조정" ? qty(numberOf(row, "countedQuantity"), valueOf(row, "unit")) : "-"}</td><td>{row.eventType === "입고" ? <span className={`badge ${row.costStatus === "확정" ? "verified" : "pending"}`}>{row.costStatus || "미입력"}</span> : "-"}</td><td>{row.reason || "-"}</td><td><Link className="icon-button" aria-label={`${row.date} 기록 수정`} href={editHref}><Pencil size={15}/></Link><button className="icon-button danger-text" aria-label={`${row.date} 기록 삭제`} onClick={() => void remove(row)}><Trash2 size={15}/></button></td></tr>;
        })}</tbody></table></div></div>
      )}
    </section>
  );
}


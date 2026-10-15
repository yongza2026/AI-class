"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { readDataset, replaceDataset } from "@/lib/data/database";
import { auditRow, emptyDataset } from "@/lib/data/migration";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { BASE_UNITS, duplicateCandidates, MATERIAL_CATEGORIES, seoulToday } from "@/lib/inventoryDomain";
import { numberOf, valueOf } from "@/lib/format";
import { useCafeData } from "./DataProvider";

type Form = { materialId?: string; name: string; brand: string; category: string; sourceType: "구매" | "자체 제조"; unit: string; purchaseUnit: string; packageCapacity: string; allowFraction: boolean; supplierId: string; location: string; safetyStock: string; targetStock: string; active: boolean };
const blank = (): Form => ({ name: "", brand: "", category: "주류", sourceType: "구매", unit: "ml", purchaseUnit: "ml", packageCapacity: "", allowFraction: false, supplierId: "", location: "", safetyStock: "", targetStock: "", active: true });

export function MaterialManager() {
  const { refresh } = useCafeData();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [message, setMessage] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void readDataset().then(setData); }, []);
  useEffect(() => { if (form) requestAnimationFrame(() => firstRef.current?.focus()); }, [form]);
  const rows = useMemo(() => (data?.materials ?? []).filter((row) => `${row.name} ${row.brand ?? ""} ${row.materialId}`.toLocaleLowerCase("ko").includes(query.trim().toLocaleLowerCase("ko"))), [data, query]);
  const candidates = useMemo(() => form && data ? duplicateCandidates(data.materials.filter((row) => row.materialId !== form.materialId), { name: form.name, brand: form.brand, packageCapacity: Number(form.packageCapacity) }) : [], [data, form]);

  function edit(row: DataRow) {
    setForm({ materialId: valueOf(row, "materialId"), name: valueOf(row, "name"), brand: valueOf(row, "brand"), category: valueOf(row, "category") || "주류", sourceType: valueOf(row, "sourceType") === "자체 제조" ? "자체 제조" : "구매", unit: valueOf(row, "unit"), purchaseUnit: valueOf(row, "purchaseUnit") || valueOf(row, "unit"), packageCapacity: String(row.packageCapacity ?? row.packQuantity ?? ""), allowFraction: row.allowFraction === true, supplierId: valueOf(row, "supplierId"), location: valueOf(row, "location"), safetyStock: String(row.safetyStock ?? ""), targetStock: String(row.targetStock ?? ""), active: row.active !== false });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!form) return;
    try {
      const nextData = data ?? emptyDataset(seoulToday());
      if (!form.name.trim()) throw new Error("품목 이름을 입력해 주세요.");
      const capacity = Number(form.packageCapacity);
      if (!Number.isFinite(capacity) || capacity <= 0) throw new Error("포장 용량은 0보다 큰 숫자로 입력해 주세요.");
      const existing = form.materialId ? nextData.materials.find((row) => row.materialId === form.materialId) : undefined;
      const hasHistory = existing && (nextData.openingInventory.some((row) => row.materialId === form.materialId) || nextData.inventoryEvents.some((row) => row.materialId === form.materialId) || nextData.recipes.some((row) => row.materialId === form.materialId));
      if (hasHistory && existing?.unit !== form.unit) throw new Error("기록이 있는 품목의 기준 단위는 바꿀 수 없습니다. 새 규격 품목으로 추가해 주세요.");
      if (!form.materialId && candidates.some((row) => row.exactSize) && !confirm("이름·브랜드·규격이 같은 품목이 있습니다. 그래도 별도 품목으로 추가할까요?")) return;
      const id = form.materialId ?? `MAT-${crypto.randomUUID()}`;
      const row: DataRow = { ...(existing ?? {}), materialId: id, name: form.name.trim(), brand: form.brand.trim() || null, category: form.category, sourceType: form.sourceType, unit: form.unit, purchaseUnit: form.purchaseUnit, packageCapacity: capacity, packQuantity: capacity, allowFraction: form.unit === "개" ? form.allowFraction : true, supplierId: form.supplierId || "SUP-MANUAL", location: form.location.trim() || null, safetyStock: form.safetyStock === "" ? null : Number(form.safetyStock), targetStock: form.targetStock === "" ? null : Number(form.targetStock), active: form.active, leadDays: numberOf(existing ?? {}, "leadDays"), safetyDays: numberOf(existing ?? {}, "safetyDays"), basePackPrice: numberOf(existing ?? {}, "basePackPrice") };
      const suppliers = nextData.suppliers.some((item) => item.supplierId === "SUP-MANUAL") ? nextData.suppliers : [...nextData.suppliers, { supplierId: "SUP-MANUAL", name: "직접 입력", dataClass: "실제" }];
      const materials = existing ? nextData.materials.map((item) => item.materialId === id ? row : item) : [...nextData.materials, row];
      const next = { ...nextData, suppliers, materials, auditLog: [...nextData.auditLog, auditRow(existing ? "수정" : "추가", "materials", id, existing ?? null, row)] };
      await replaceDataset(next); setData(next); await refresh(); setForm(null); setMessage(`${row.name} 품목을 ${existing ? "수정" : "추가"}했습니다.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "품목을 저장하지 못했습니다."); }
  }

  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">재고 · 발주 기준 정보</p><h1>품목 관리</h1><p>주류, 식재료, 제조 베이스와 소모품의 규격·단위·보관 위치를 관리합니다.</p></div><button className="button primary" onClick={() => setForm(blank())}><Plus size={16}/>새 품목</button></div>
    {message && <div className="notice info" role="status"><span>{message}</span></div>}
    <div className="filter-bar"><label className="grow">품목 검색<div className="input-with-icon"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 브랜드 또는 ID"/></div></label></div>
    {!rows.length ? <div className="empty-card"><h2>{data?.materials.length ? "검색 결과가 없습니다" : "첫 품목을 등록해 주세요"}</h2><p>품목을 먼저 만들어야 입고·폐기·실사와 원가를 기록할 수 있습니다.</p><button className="button primary" onClick={() => setForm(blank())}>첫 품목 만들기</button></div> : <div className="card table-card"><div className="table-wrap"><table className="data-table"><thead><tr><th>품목</th><th>분류</th><th>구분</th><th>기준 단위</th><th>구매 규격</th><th>보관 위치</th><th>상태</th><th>관리</th></tr></thead><tbody>{rows.map((row) => <tr key={valueOf(row, "materialId")}><td><strong>{row.name}</strong><small>{row.brand || row.materialId}</small></td><td>{row.category || "미분류"}</td><td>{row.sourceType || "구매"}</td><td>{row.unit}</td><td>{Number(row.packageCapacity ?? row.packQuantity).toLocaleString()} {row.purchaseUnit || row.unit}</td><td>{row.location || "미입력"}</td><td><span className={`badge ${row.active === false ? "pending" : "verified"}`}>{row.active === false ? "비활성" : "사용 중"}</span></td><td><button className="icon-button" aria-label={`${row.name} 수정`} onClick={() => edit(row)}><Pencil size={15}/></button></td></tr>)}</tbody></table></div></div>}
    {form && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && confirm("입력 중인 내용을 취소할까요?")) setForm(null); }}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="material-title" onSubmit={submit} onKeyDown={(event) => { if (event.key === "Escape" && confirm("입력 중인 내용을 취소할까요?")) setForm(null); }}><div className="modal-head"><div><p className="eyebrow">품목 기준 정보</p><h2 id="material-title">{form.materialId ? "품목 수정" : "새 품목"}</h2></div><button type="button" className="icon-button" aria-label="닫기" onClick={() => { if (confirm("입력 중인 내용을 취소할까요?")) setForm(null); }}>×</button></div><div className="form-grid">
      <label>품목 이름<input ref={firstRef} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>브랜드<input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })}/></label>
      <label>분류<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{MATERIAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>조달 방식<select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value as Form["sourceType"] })}><option>구매</option><option>자체 제조</option></select></label>
      <label>기준 단위<select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value, purchaseUnit: event.target.value })}>{BASE_UNITS.map((item) => <option key={item}>{item}</option>)}</select></label><label>구매 표기 단위<select value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })}><option>{form.unit}</option>{form.unit === "ml" && <option>L</option>}{form.unit === "g" && <option>kg</option>}</select></label>
      <label>포장 용량<input type="number" min="0.01" step="0.01" required value={form.packageCapacity} onChange={(event) => setForm({ ...form, packageCapacity: event.target.value })}/></label><label>보관 위치<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}/></label>
      <label>안전 재고<input type="number" min="0" step="0.01" value={form.safetyStock} onChange={(event) => setForm({ ...form, safetyStock: event.target.value })}/></label><label>목표 재고<input type="number" min="0" step="0.01" value={form.targetStock} onChange={(event) => setForm({ ...form, targetStock: event.target.value })}/></label>
      {form.unit === "개" && <label className="checkbox"><input type="checkbox" checked={form.allowFraction} onChange={(event) => setForm({ ...form, allowFraction: event.target.checked })}/>낱개 소수 수량 허용</label>}<label className="checkbox"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })}/>사용 중인 품목</label>
    </div>{candidates.length > 0 && <div className="notice info"><span>비슷한 품목 {candidates.length}개가 있습니다. 용량이 다르면 별도 품목으로 저장하세요.</span></div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => { if (confirm("입력 중인 내용을 취소할까요?")) setForm(null); }}>취소</button><button className="button primary">저장</button></div></form></div>}
  </section>;
}

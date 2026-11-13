"use client";

import { useMemo, useRef, useState } from "react";
import { readDataset, replaceDataset } from "@/lib/data/database";
import { auditRow, emptyDataset } from "@/lib/data/migration";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { BASE_UNITS, convertToBase, duplicateCandidates, MATERIAL_CATEGORIES, seoulToday } from "@/lib/inventoryDomain";
import { numberOf, valueOf } from "@/lib/format";
import { materialFormFor, blankMaterialForm, materialFormError, type MaterialForm } from "@/lib/materialForm";
import { useCafeData } from "./DataProvider";
import { useDialogFocus } from "./useDialogFocus";

type Props = { data: CafeDataset | null; material?: DataRow; production?: boolean; onClose: () => void; onSaved: (data: CafeDataset, id: string, message: string) => void };
export function MaterialEditor({ data, material, production = false, onClose, onSaved }: Props) {
  const { refresh } = useCafeData();
  const [form, setForm] = useState<MaterialForm>(() => material ? materialFormFor(material) : { ...blankMaterialForm(), ...(production ? { sourceType: "자체 제조" as const, category: "제조 베이스" } : {}) });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const initialFormRef = useRef(JSON.stringify(form));
  const firstRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const candidates = useMemo(() => duplicateCandidates((data?.materials ?? []).filter((row) => row.materialId !== form.materialId), { name: form.name, brand: form.brand, packageCapacity: Number(form.packageCapacity) }), [data, form]);
  const errorField = message.includes("기준 단위") ? "unit" : message.includes("목표 재고") ? "targetStock" : message.includes("안전 재고") ? "safetyStock" : message.includes("포장 용량") ? "packageCapacity" : message.includes("구매 표기") ? "purchaseUnit" : message.includes("품목 이름") ? "name" : "";
  function closeForm() {
    if (savingRef.current) return;
    if (JSON.stringify(form) !== initialFormRef.current && !confirm("입력 중인 변경 내용을 취소할까요?")) return;
    onClose();
  }
  useDialogFocus(dialogRef, true, closeForm);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    setMessage("");
    const error = materialFormError(form, data);
    if (error) { setMessage(error); return; }
    if (!form.materialId && candidates.some((row) => row.exactSize) && !confirm("이름·브랜드·규격이 같은 품목이 있습니다. 그래도 별도 품목으로 추가할까요?")) return;
    savingRef.current = true; setSaving(true);
    try {
      const nextData = await readDataset() ?? data ?? emptyDataset(seoulToday());
      const freshError = materialFormError(form, nextData);
      if (freshError) throw new Error(freshError);
      const existing = form.materialId ? nextData.materials.find((row) => row.materialId === form.materialId) : undefined;
      if (form.materialId && !existing) throw new Error("수정할 품목을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      const capacity = Number(form.packageCapacity);
      const id = form.materialId ?? `MAT-${crypto.randomUUID()}`;
      // Preserve the existing category representation when the field was not changed.
      const category = existing && (valueOf(existing, "category") === form.category) ? existing.category : (form.category || null);
      const row: DataRow = { ...(existing ?? {}), materialId: id, name: form.name.trim(), brand: form.brand.trim() || null, category, sourceType: existing && !existing.sourceType && form.sourceType === "구매" ? existing.sourceType : form.sourceType, unit: form.unit, purchaseUnit: form.purchaseUnit, packageCapacity: capacity, packQuantity: existing && existing.packageCapacity === capacity && valueOf(existing, "purchaseUnit") === form.purchaseUnit ? existing.packQuantity : convertToBase(capacity, form.purchaseUnit, form.unit), allowFraction: form.unit === "개" ? form.allowFraction : true, supplierId: form.supplierId || "SUP-MANUAL", location: form.location.trim() || null, safetyStock: form.safetyStock === "" ? null : Number(form.safetyStock), targetStock: form.targetStock === "" ? null : Number(form.targetStock), active: form.active, leadDays: numberOf(existing ?? {}, "leadDays"), safetyDays: numberOf(existing ?? {}, "safetyDays"), basePackPrice: numberOf(existing ?? {}, "basePackPrice") };
      const suppliers = nextData.suppliers.some((item) => item.supplierId === "SUP-MANUAL") ? nextData.suppliers : [...nextData.suppliers, { supplierId: "SUP-MANUAL", name: "직접 입력", dataClass: "실제" }];
      const next = { ...nextData, suppliers, materials: existing ? nextData.materials.map((item) => item.materialId === id ? row : item) : [...nextData.materials, row], auditLog: [...nextData.auditLog, auditRow(existing ? "수정" : "추가", "materials", id, existing ?? null, row)] };
      await replaceDataset(next);
      // A summary refresh failure must not turn a committed save into a retry.
      void refresh().catch(() => undefined);
      onSaved(next, id, `${row.name} 품목을 ${existing ? "수정" : "추가"}했습니다.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "품목을 저장하지 못했습니다."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="material-title" onSubmit={submit} aria-busy={saving} ref={dialogRef}><div className="modal-head"><div><p className="eyebrow">품목 기준 정보</p><h2 id="material-title">{form.materialId ? "품목 수정" : production ? "제조할 품목 등록" : "새 품목"}</h2></div><button type="button" className="icon-button" aria-label="닫기" onClick={() => closeForm()}>×</button></div>{message && <div className="notice error" role="alert">{message}</div>}{errorField && <p className="negative" id="material-field-error">{message}</p>}<p className="editor-help">{production ? "레몬 코디얼·발효액처럼 매장에서 만들 품목을 등록하세요. 저장하면 원재료와 제조량을 입력하는 화면으로 이어집니다. 이 단계에서는 재고가 바뀌지 않습니다." : "품목 등록은 재고를 추가하지 않습니다. 저장 후 입고를 따로 기록해 주세요."}</p><fieldset disabled={saving} className="editor-fields"><div className="form-grid">
      <label>품목 이름<input data-autofocus ref={firstRef} required aria-invalid={errorField === "name"} aria-describedby={errorField === "name" ? "material-field-error" : undefined} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>{!production && <label>브랜드<input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })}/></label>}
      <label>분류<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">미분류</option>{form.category && !MATERIAL_CATEGORIES.some((item) => item === form.category) && <option>{form.category}</option>}{MATERIAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>조달 방식<select disabled={production} value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value as MaterialForm["sourceType"] })}><option>구매</option><option>자체 제조</option></select></label>
      <label>기준 단위<select aria-invalid={errorField === "unit"} aria-describedby={errorField === "unit" ? "material-field-error" : undefined} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value, purchaseUnit: event.target.value })}>{BASE_UNITS.map((item) => <option key={item}>{item}</option>)}</select></label><label>{production ? "용량 표기 단위" : "구매 표기 단위"}<select aria-invalid={errorField === "purchaseUnit"} aria-describedby={errorField === "purchaseUnit" ? "material-field-error" : undefined} value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })}><option>{form.unit}</option>{form.unit === "ml" && <option>L</option>}{form.unit === "g" && <option>kg</option>}</select></label>
      <label>{production ? "기본 용기 용량" : "포장 용량"} ({form.purchaseUnit})<input type="number" min="0.01" step="0.01" required aria-invalid={errorField === "packageCapacity"} aria-describedby={errorField === "packageCapacity" ? "material-field-error" : undefined} value={form.packageCapacity} onChange={(event) => setForm({ ...form, packageCapacity: event.target.value })}/></label><label>보관 위치<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}/></label>
      {!production && <><label>안전 재고 ({form.unit})<input type="number" min="0" step="0.01" aria-invalid={errorField === "safetyStock"} aria-describedby={errorField === "safetyStock" ? "material-field-error" : undefined} value={form.safetyStock} onChange={(event) => setForm({ ...form, safetyStock: event.target.value })}/></label><label>목표 재고 ({form.unit})<input type="number" min="0" step="0.01" aria-invalid={errorField === "targetStock"} aria-describedby={errorField === "targetStock" ? "material-field-error" : undefined} value={form.targetStock} onChange={(event) => setForm({ ...form, targetStock: event.target.value })}/></label>
      {form.unit === "개" && <label className="checkbox"><input type="checkbox" checked={form.allowFraction} onChange={(event) => setForm({ ...form, allowFraction: event.target.checked })}/>낱개 소수 수량 허용</label>}<label className="checkbox"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })}/>사용 중인 품목</label></>}
    </div></fieldset>{candidates.length > 0 && <div className="notice info"><span>비슷한 품목 {candidates.length}개가 있습니다. 용량이 다르면 별도 품목으로 저장하세요.</span></div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => closeForm()}>취소</button><button className="button primary" disabled={saving}>{saving ? "저장 중…" : production ? "저장하고 제조 입력" : "저장"}</button></div></form></div>
  );
}

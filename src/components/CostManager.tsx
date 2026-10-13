"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Pencil, Plus, Upload } from "lucide-react";
import { calculateProductCost, type ProductCost } from "@/lib/costing";
import { mergeCostLedger, parseCostLedger, type CostImportItem } from "@/lib/data/costImport";
import { readDataset, replaceDataset } from "@/lib/data/database";
import type { CafeDataset, DataRow, ImportIssue } from "@/lib/data/types";
import { numberOf, valueOf, won } from "@/lib/format";
import { useCafeData } from "./DataProvider";

type RecipeLine = { materialId: string; quantity: number };
type MaterialForm = { materialId?: string; name: string; category: string; unit: string; packQuantity: number; packPrice: number };

export default function CostManager() {
  const { refresh } = useCafeData();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [importItems, setImportItems] = useState<CostImportItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState("");
  const [materialForm, setMaterialForm] = useState<MaterialForm | null>(null);
  const [productForm, setProductForm] = useState<{ name: string; price: number; category: string; lines: RecipeLine[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void readDataset().then((next) => { setData(next); if (next) setSelectedMenu(valueOf(next.menus[0] ?? {}, "menuId")); }); }, []);

  const productCost = useMemo<ProductCost | null>(() => data && selectedMenu ? calculateProductCost(data, selectedMenu) : null, [data, selectedMenu]);
  const materials = data?.materials ?? [];

  async function onLedger(file?: File) {
    if (!file || !data) return;
    setMessage("발주처 원장을 읽고 있습니다…"); setIssues([]); setImportItems([]);
    const result = await parseCostLedger(file);
    setIssues(result.issues);
    if (!result.items.length) { setMessage("가져올 수 있는 품목이 없습니다. 원장 시트와 필수 열을 확인해 주세요."); return; }
    const merged = mergeCostLedger(data, result.items);
    await replaceDataset(merged.data); setData(merged.data); await refresh();
    setImportItems(result.items); setMessage(`${merged.added}개 품목을 추가하고 ${merged.updated}개 품목의 원가를 갱신했습니다. 가격 이력이 저장되었습니다.`);
  }

  async function saveMaterial(event: React.FormEvent) {
    event.preventDefault(); if (!data || !materialForm) return;
    if (!materialForm.name.trim() || !materialForm.unit.trim() || materialForm.packQuantity <= 0 || materialForm.packPrice < 0) { setMessage("품목명·단위·구매용량·가격을 확인해 주세요."); return; }
    const materialId = materialForm.materialId ?? `MAT-MANUAL-${Date.now()}`;
    const nextMaterial: DataRow = { materialId, name: materialForm.name.trim(), category: materialForm.category.trim() || "미분류", unit: materialForm.unit.trim(), packQuantity: materialForm.packQuantity, basePackPrice: materialForm.packPrice, supplierId: "SUP-MANUAL", leadDays: 0, safetyDays: 0, updatedAt: data.meta.asOf };
    const materialsNext = materialForm.materialId ? data.materials.map((row) => row.materialId === materialId ? { ...row, ...nextMaterial } : row) : [...data.materials, nextMaterial];
    const suppliers = data.suppliers.some((row) => row.supplierId === "SUP-MANUAL") ? data.suppliers : [...data.suppliers, { supplierId: "SUP-MANUAL", name: "직접 입력", dataClass: "실제" }];
    const priceHistory = [...data.priceHistory, { materialId, effectiveDate: data.meta.asOf, packPrice: materialForm.packPrice, packQuantity: materialForm.packQuantity }];
    const next = { ...data, materials: materialsNext, suppliers, priceHistory };
    await replaceDataset(next); setData(next); await refresh(); setMaterialForm(null); setMessage(`${materialForm.name} 품목을 ${materialForm.materialId ? "수정" : "추가"}했습니다.`);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault(); if (!data || !productForm) return;
    const lines = productForm.lines.filter((line) => line.materialId && line.quantity > 0);
    if (!productForm.name.trim() || productForm.price < 0 || !lines.length) { setMessage("제품명·판매가와 재료 1개 이상을 입력해 주세요."); return; }
    const menuId = `M-COST-${Date.now()}`; const recipeVersion = "v1";
    const menu: DataRow = { menuId, name: productForm.name.trim(), price: productForm.price, category: productForm.category.trim() || "기타", recipeVersion };
    const recipes = lines.map((line) => { const material = data.materials.find((row) => String(row.materialId) === line.materialId); return { recipeVersion, menuId, materialId: line.materialId, quantity: line.quantity, unit: String(valueOf(material ?? {}, "unit")) }; });
    const next = { ...data, menus: [...data.menus, menu], recipes: [...data.recipes, ...recipes] };
    await replaceDataset(next); setData(next); setSelectedMenu(menuId); await refresh(); setProductForm(null); setMessage(`${productForm.name} 제품과 레시피를 저장했습니다.`);
  }

  if (!data) return <section className="page"><div className="empty-card">데이터 관리에서 샘플 또는 매장 자료를 먼저 준비해 주세요.</div></section>;
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">발주 원장 · 제품 원가</p><h1>원가 관리</h1><p>발주처 월 원장을 올리면 품목과 구매단가를 갱신하고 제품별 원가를 확인합니다.</p></div><button className="button primary" onClick={() => fileRef.current?.click()}><Upload size={16}/>발주 원장 업로드</button><input ref={fileRef} hidden type="file" accept=".xlsx" onChange={(event) => { void onLedger(event.target.files?.[0]); event.currentTarget.value = ""; }}/></div>
    {message && <div className="notice info" role="status"><span>{message}</span></div>}
    {issues.length > 0 && <div className="notice error"><div><strong>확인할 원장 항목 {issues.length}건</strong><span>{issues.slice(0, 3).map((issue) => `${issue.row ?? ""}행 ${issue.message}`).join(" · ")}</span></div></div>}
    {importItems.length > 0 && <div className="notice success"><CheckCircle2/><div><strong>원가 갱신 완료</strong><span>{importItems.length.toLocaleString()}개 품목의 발주처 단가를 반영했습니다. 기존 레시피는 품목 ID를 유지합니다.</span></div></div>}
    <div className="card cost-import-guide"><h2>월 원장 가져오기 기준</h2><p>첫 번째 시트의 `재료명`, `단위`, `사이즈`, `가격(원)(부가세미포함)` 열을 읽습니다. 같은 재료명·단위·구매용량이면 기존 품목의 가격 이력을 추가하고, 없으면 새 품목으로 등록합니다.</p></div>
    <div className="section-heading"><div><p className="eyebrow">제품별 원가표</p><h2>제품을 만들 때 드는 원가</h2></div><button className="button secondary" onClick={() => setProductForm({ name: "", price: 0, category: "", lines: [{ materialId: String(materials[0]?.materialId ?? ""), quantity: 0 }] })}><Plus size={16}/>새 제품 만들기</button></div>
    <div className="card cost-product"><label>제품 선택<select value={selectedMenu} onChange={(event) => setSelectedMenu(event.target.value)}>{data.menus.map((menu) => <option key={String(menu.menuId)} value={String(menu.menuId)}>{String(menu.name)}</option>)}</select></label>{productCost ? <><div className="summary-strip"><span>판매가 <strong>{won(productCost.price)}</strong></span><span>1개 원가 <strong>{won(productCost.unitCost)}</strong></span><span>원가율 <strong>{productCost.costRate == null ? "계산 불가" : `${productCost.costRate.toFixed(1)}%`}</strong></span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>재료</th><th>사용량</th><th>단위당 가격</th><th>재료 원가</th></tr></thead><tbody>{productCost.lines.map((line) => <tr key={line.materialId}><td>{line.name}</td><td>{line.quantity.toLocaleString()} {line.unit}</td><td>{won(line.unitCost)}</td><td><strong>{won(line.cost)}</strong></td></tr>)}</tbody></table></div>{!productCost.lines.length && <div className="table-empty">이 제품에 연결된 레시피가 없습니다.</div>}</> : <div className="table-empty">제품을 선택해 주세요.</div>}</div>
    <div className="section-heading"><div><p className="eyebrow">품목 마스터</p><h2>재료·부재료 목록</h2></div><button className="button secondary" onClick={() => setMaterialForm({ name: "", category: "", unit: "g", packQuantity: 0, packPrice: 0 })}><Plus size={16}/>품목 직접 추가</button></div>
    <div className="card table-card"><div className="table-wrap"><table className="data-table"><thead><tr><th>분류</th><th>품목</th><th>단위</th><th className="num">구매용량</th><th className="num">구매가격</th><th className="num">단위당 원가</th><th>관리</th></tr></thead><tbody>{materials.slice(0, 100).map((material) => <tr key={String(material.materialId)}><td>{String(material.category ?? "미분류")}</td><td>{String(material.name)}</td><td>{String(material.unit)}</td><td className="num">{numberOf(material, "packQuantity").toLocaleString()}</td><td className="num">{won(numberOf(material, "basePackPrice"))}</td><td className="num">{numberOf(material, "packQuantity") ? won(numberOf(material, "basePackPrice") / numberOf(material, "packQuantity")) : "-"}</td><td><button className="icon-button" aria-label={`${String(material.name)} 수정`} onClick={() => setMaterialForm({ materialId: String(material.materialId), name: String(material.name), category: String(material.category ?? ""), unit: String(material.unit), packQuantity: numberOf(material, "packQuantity"), packPrice: numberOf(material, "basePackPrice") })}><Pencil size={15}/></button></td></tr>)}</tbody></table></div></div>
    {productForm && <div className="modal-backdrop"><form className="modal" onSubmit={saveProduct}><div className="modal-head"><div><p className="eyebrow">새 제품</p><h2>제품 원가표 만들기</h2></div><button type="button" className="icon-button" onClick={() => setProductForm(null)}>✕</button></div><div className="form-grid"><label>제품명<input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}/></label><label>판매가<input type="number" min="0" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: Number(event.target.value) })}/></label><label>분류<input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}/></label></div><div className="card"><h3>재료와 사용량</h3>{productForm.lines.map((line, index) => <div className="form-grid" key={index}><label>재료<select value={line.materialId} onChange={(event) => setProductForm({ ...productForm, lines: productForm.lines.map((item, itemIndex) => itemIndex === index ? { ...item, materialId: event.target.value } : item) })}>{materials.map((material) => <option key={String(material.materialId)} value={String(material.materialId)}>{String(material.name)} ({String(material.unit)})</option>)}</select></label><label>사용량<input type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => setProductForm({ ...productForm, lines: productForm.lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item) })}/></label></div>)}<button type="button" className="button secondary" onClick={() => setProductForm({ ...productForm, lines: [...productForm.lines, { materialId: String(materials[0]?.materialId ?? ""), quantity: 0 }] })}><Plus size={16}/>재료 추가</button></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setProductForm(null)}>취소</button><button className="button primary">제품 저장</button></div></form></div>}
    {materialForm && <div className="modal-backdrop"><form className="modal small" onSubmit={saveMaterial}><div className="modal-head"><div><p className="eyebrow">품목 마스터</p><h2>{materialForm.materialId ? "품목 수정" : "품목 추가"}</h2></div><button type="button" className="icon-button" onClick={() => setMaterialForm(null)}>✕</button></div><div className="form-grid"><label>품목명<input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })}/></label><label>분류<input value={materialForm.category} onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })}/></label><label>단위<input required value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })}/></label><label>구매용량<input type="number" min="0.01" value={materialForm.packQuantity} onChange={(event) => setMaterialForm({ ...materialForm, packQuantity: Number(event.target.value) })}/></label><label className="span-2">구매가격 (VAT 제외)<input type="number" min="0" value={materialForm.packPrice} onChange={(event) => setMaterialForm({ ...materialForm, packPrice: Number(event.target.value) })}/></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setMaterialForm(null)}>취소</button><button className="button primary">저장</button></div></form></div>}
  </section>;
}

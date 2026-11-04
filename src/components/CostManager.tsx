"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Pencil, Plus, Upload } from "lucide-react";
import { calculateProductCost, type ProductCost } from "@/lib/costing";
import { mergeCostLedger, parseCostLedger, type CostImportItem } from "@/lib/data/costImport";
import { readDataset, replaceDataset } from "@/lib/data/database";
import { mergeProductCostWorkbook, parseProductCostWorkbook, type ProductCostImportResult } from "@/lib/data/productCostImport";
import type { CafeDataset, DataRow, ImportIssue } from "@/lib/data/types";
import { numberOf, valueOf, won } from "@/lib/format";
import { useCafeData } from "./DataProvider";

type RecipeLine = { materialId: string; quantity: number };
type MaterialForm = { materialId: string; name: string; packQuantity: number; packPrice: number };

export default function CostManager() {
  const materialIdFilter=useSearchParams().get("material")??"";
  const { access, refresh } = useCafeData();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [importItems, setImportItems] = useState<CostImportItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState("");
  const [materialForm, setMaterialForm] = useState<MaterialForm | null>(null);
  const [productForm, setProductForm] = useState<{ name: string; price: number; category: string; lines: RecipeLine[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingProductImport, setPendingProductImport] = useState<ProductCostImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void readDataset().then((next) => { setData(next); if (next) setSelectedMenu(valueOf(next.menus[0] ?? {}, "menuId")); }); }, []);

  const productCost = useMemo<ProductCost | null>(() => data && selectedMenu ? calculateProductCost(data, selectedMenu) : null, [data, selectedMenu]);
  const materials = data?.materials ?? [];
  const listedMaterials=materialIdFilter?materials.filter((row)=>row.materialId===materialIdFilter):materials.slice(0,100);
  const productImportPreview = useMemo(() => data && pendingProductImport ? mergeProductCostWorkbook(data, pendingProductImport) : null, [data, pendingProductImport]);

  async function onLedger(file?: File) {
    if (!file || !data) return;
    setBusy(true); setMessage("발주처 원장을 읽고 있습니다…"); setIssues([]); setImportItems([]);
    try {
      const result = await parseCostLedger(file);
      setIssues(result.issues);
      if (!result.items.length) { setMessage("가져올 수 있는 품목이 없습니다. 원장 시트와 필수 열을 확인해 주세요."); return; }
      const merged = mergeCostLedger(data, result.items);
      await replaceDataset(merged.data); setData(merged.data); await refresh();
      setImportItems(result.items); setMessage(`${merged.added}개 품목을 추가하고 ${merged.updated}개 품목의 원가를 갱신했습니다. 가격 이력이 저장되었습니다.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "발주 원장을 저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function onProductCostFile(file?: File) {
    if (!file || !data || busy || access?.role === "viewer") return;
    setBusy(true); setPendingProductImport(null); setIssues([]); setImportItems([]); setMessage("제품·재료·레시피를 검사하고 있습니다…");
    try {
      const parsed = await parseProductCostWorkbook(file, data.meta.asOf);
      if (parsed.issues.length) { setIssues(parsed.issues); setMessage("파일에서 확인할 항목이 있습니다. 아래 내용을 고친 뒤 다시 올려 주세요."); return; }
      const merged = mergeProductCostWorkbook(data, parsed);
      if (merged.issues.length) { setIssues(merged.issues); setMessage("현재 홈페이지 자료와 연결할 수 없는 항목이 있습니다. 아래 내용을 확인해 주세요."); return; }
      setPendingProductImport(parsed);
      setMessage("아직 저장되지 않았습니다. 제품별 원가 미리보기를 확인하고 ‘확인 후 저장’을 눌러 주세요.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "제품 원가 파일을 저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function saveProductImport() {
    if (!pendingProductImport || busy || access?.role === "viewer") return;
    setBusy(true); setIssues([]);
    try {
      const current = await readDataset();
      if (!current) throw new Error("매장 자료를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      const merged = mergeProductCostWorkbook(current, pendingProductImport);
      if (merged.issues.length) { setIssues(merged.issues); setMessage("연결할 수 없는 항목이 있어 저장하지 않았습니다."); return; }
      await replaceDataset(merged.data); setData(merged.data); setPendingProductImport(null);
      if (merged.menuIds[0]) setSelectedMenu(merged.menuIds[0]);
      setMessage(`제품 ${merged.productsAdded}개 추가·${merged.productsUpdated}개 수정, 재료 ${merged.materialsAdded}개 추가·${merged.materialsUpdated}개 수정, 레시피 ${merged.recipeLines}줄을 반영했습니다.`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "제품 원가를 저장하지 못했습니다. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }

  async function saveMaterial(event: React.FormEvent) {
    event.preventDefault(); if (!data || !materialForm) return;
    if (!Number.isFinite(materialForm.packPrice) || materialForm.packPrice < 0 || materialForm.packQuantity <= 0) { setMessage("구매가격과 구매 규격을 확인해 주세요."); return; }
    const {materialId}=materialForm;

    const materialsNext=data.materials.map((row)=>row.materialId===materialId?{...row,basePackPrice:materialForm.packPrice}:row);

    const priceHistory = [...data.priceHistory, { materialId, effectiveDate: data.meta.asOf, packPrice: materialForm.packPrice, packQuantity: materialForm.packQuantity }];
    const next = { ...data, materials: materialsNext, priceHistory };
    await replaceDataset(next); setData(next); await refresh(); setMaterialForm(null); setMessage(`${materialForm.name} 구매가격을 수정했습니다.`);
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
  return <section className="page cost-management-page">
    <div className="page-heading"><div><p className="eyebrow">발주 원장 · 제품 원가</p><h1>구매·원가</h1><p>발주처 월 원장을 올리면 품목과 구매단가를 갱신하고 제품별 원가를 확인합니다.</p></div><button className="button primary" disabled={busy || access?.role === "viewer"} onClick={() => fileRef.current?.click()}><Upload size={16}/>{busy ? "처리 중…" : "발주 원장 업로드"}</button><input ref={fileRef} hidden type="file" accept=".xlsx" onChange={(event) => { void onLedger(event.target.files?.[0]); event.currentTarget.value = ""; }}/></div>
    {message && <div className="notice info" role="status"><span>{message}</span></div>}
    {issues.length > 0 && <div className="notice error product-import-issues" role="alert"><div><strong>확인할 엑셀 항목 {issues.length}건</strong><ul>{issues.map((issue, index) => <li key={index}>{issue.sheet} {issue.row ? `${issue.row}행 ` : ""}{issue.value ? `(${String(issue.value)}) ` : ""}{issue.message}</li>)}</ul></div></div>}
    {importItems.length > 0 && <div className="notice success"><CheckCircle2/><div><strong>원가 갱신 완료</strong><span>{importItems.length.toLocaleString()}개 품목의 발주처 단가를 반영했습니다. 기존 레시피는 품목 ID를 유지합니다.</span></div></div>}
    <div className="card cost-import-guide"><h2>월 원장 가져오기 기준</h2><p>첫 번째 시트의 `재료명`, `단위`, `사이즈`, `가격(원)(부가세미포함)` 열을 읽습니다. 같은 재료명·단위·구매용량이면 기존 품목의 가격 이력을 추가하고, 없으면 새 품목으로 등록합니다.</p></div>
    <div className="section-heading"><div><p className="eyebrow">제품별 원가표</p><h2>제품을 만들 때 드는 원가</h2></div><div className="button-row"><a className="button secondary" href="/templates/POCO_제품원가_업로드양식.xlsx" download><Download size={16}/>제품 원가 양식</a><button className="button primary" disabled={busy || access?.role === "viewer"} onClick={() => productFileRef.current?.click()}><Upload size={16}/>제품 원가 엑셀 업로드</button><input ref={productFileRef} hidden type="file" accept=".xlsx" onChange={(event) => { void onProductCostFile(event.target.files?.[0]); event.currentTarget.value = ""; }}/><button className="button secondary" onClick={() => setProductForm({ name: "", price: 0, category: "", lines: [{ materialId: String(materials[0]?.materialId ?? ""), quantity: 0 }] })}><Plus size={16}/>새 제품 만들기</button></div></div>
    <div className="card cost-import-guide"><h3>제품 원가 엑셀 자동 입력</h3><p>‘제품목록 · 재료단가 · 레시피입력’을 작성해 올리면 저장 전 원가를 확인할 수 있습니다. 제품코드가 같으면 기존 제품을 수정하고, 코드가 연결되지 않으면 같은 제품명을 찾습니다. 재료는 같은 이름·단위로 연결합니다.</p><p>파일에 포함한 제품의 현재 레시피는 파일 내용으로 교체하며 예전 레시피는 보존합니다. 재고 수량과 판매 기록은 바뀌지 않습니다. 단가는 매장 기준일({data.meta.asOf})부터 적용하며 같은 적용일의 단가는 갱신합니다.</p></div>
    {productImportPreview && !productImportPreview.issues.length && <div className="card product-import-preview" aria-label="제품 원가 가져오기 미리보기"><h3>저장 전 미리보기</h3><div className="summary-strip"><span>제품 추가 <strong>{productImportPreview.productsAdded}개</strong></span><span>제품 수정 <strong>{productImportPreview.productsUpdated}개</strong></span><span>재료 추가 <strong>{productImportPreview.materialsAdded}개</strong></span><span>재료 수정 <strong>{productImportPreview.materialsUpdated}개</strong></span><span>레시피 <strong>{productImportPreview.recipeLines}줄</strong></span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>제품</th><th>재료 수</th><th>판매가</th><th>1개 원가</th><th>원가율</th></tr></thead><tbody>{productImportPreview.menuIds.map((id) => { const cost = calculateProductCost(productImportPreview.data, id); return cost && <tr key={id}><td>{cost.name}</td><td>{cost.lines.length}개</td><td>{won(cost.price)}</td><td>{won(cost.unitCost)}</td><td>{cost.costRate == null ? "판매가 0원" : `${cost.costRate.toFixed(1)}%`}</td></tr>; })}</tbody></table></div><div className="button-row"><button className="button secondary" disabled={busy} onClick={() => { setPendingProductImport(null); setMessage("가져오기를 취소했습니다. 매장 자료는 변경되지 않았습니다."); }}>취소</button><button className="button primary" disabled={busy || access?.role === "viewer"} onClick={() => void saveProductImport()}>{busy ? "저장 중…" : "확인 후 저장"}</button></div></div>}
    <div className="card cost-product"><label>제품 선택<select value={selectedMenu} onChange={(event) => setSelectedMenu(event.target.value)}>{data.menus.map((menu) => <option key={String(menu.menuId)} value={String(menu.menuId)}>{String(menu.name)}</option>)}</select></label>{productCost ? <><div className="summary-strip"><span>판매가 <strong>{won(productCost.price)}</strong></span><span>1개 원가 <strong>{won(productCost.unitCost)}</strong></span><span>원가율 <strong>{productCost.costRate == null ? "계산 불가" : `${productCost.costRate.toFixed(1)}%`}</strong></span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>재료</th><th>사용량</th><th>단위당 가격</th><th>재료 원가</th></tr></thead><tbody>{productCost.lines.map((line) => <tr key={line.materialId}><td>{line.name}</td><td>{line.quantity.toLocaleString()} {line.unit}</td><td>{won(line.unitCost)}</td><td><strong>{won(line.cost)}</strong></td></tr>)}</tbody></table></div>{!productCost.lines.length && <div className="table-empty">이 제품에 연결된 레시피가 없습니다.</div>}</> : <div className="table-empty">제품을 선택해 주세요.</div>}</div>
    <div className="section-heading"><div><p className="eyebrow">품목 마스터</p><h2 id="cost-materials">재료·부재료 목록</h2></div><Link className="button secondary" href="/inventory/items">품목 설정에서 등록·수정</Link></div>
    <div className="card table-card"><div className="table-wrap"><table className="data-table"><thead><tr><th>분류</th><th>품목</th><th>단위</th><th className="num">구매용량</th><th className="num">구매가격</th><th className="num">단위당 원가</th><th>관리</th></tr></thead><tbody>{listedMaterials.map((material) => <tr key={String(material.materialId)}><td>{String(material.category ?? "미분류")}</td><td>{String(material.name)}</td><td>{String(material.unit)}</td><td className="num">{numberOf(material, "packQuantity").toLocaleString()}</td><td className="num">{won(numberOf(material, "basePackPrice"))}</td><td className="num">{numberOf(material, "packQuantity") ? won(numberOf(material, "basePackPrice") / numberOf(material, "packQuantity")) : "-"}</td><td><button disabled={access?.role==="viewer" || material.sourceType==="자체 제조" || numberOf(material,"packQuantity")<=0} className="icon-button" aria-label={`${String(material.name)} 구매가격 수정`} onClick={() => setMaterialForm({ materialId: String(material.materialId), name: String(material.name), packQuantity: numberOf(material, "packQuantity"), packPrice: numberOf(material, "basePackPrice") })}><Pencil size={15}/></button></td></tr>)}</tbody></table></div></div>
    {materialIdFilter&&<p>{listedMaterials.length===0?"이 품목의 구매 정보를 찾지 못했습니다. ":"선택한 품목의 구매 정보입니다. "}<Link href="/costs#cost-materials">전체 품목 보기</Link></p>}
    {productForm && <div className="modal-backdrop"><form className="modal" onSubmit={saveProduct}><div className="modal-head"><div><p className="eyebrow">새 제품</p><h2>제품 원가표 만들기</h2></div><button type="button" className="icon-button" onClick={() => setProductForm(null)}>✕</button></div><div className="form-grid"><label>제품명<input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}/></label><label>판매가<input type="number" min="0" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: Number(event.target.value) })}/></label><label>분류<input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}/></label></div><div className="card"><h3>재료와 사용량</h3>{productForm.lines.map((line, index) => <div className="form-grid" key={index}><label>재료<select value={line.materialId} onChange={(event) => setProductForm({ ...productForm, lines: productForm.lines.map((item, itemIndex) => itemIndex === index ? { ...item, materialId: event.target.value } : item) })}>{materials.map((material) => <option key={String(material.materialId)} value={String(material.materialId)}>{String(material.name)} ({String(material.unit)})</option>)}</select></label><label>사용량<input type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => setProductForm({ ...productForm, lines: productForm.lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item) })}/></label></div>)}<button type="button" className="button secondary" onClick={() => setProductForm({ ...productForm, lines: [...productForm.lines, { materialId: String(materials[0]?.materialId ?? ""), quantity: 0 }] })}><Plus size={16}/>재료 추가</button></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setProductForm(null)}>취소</button><button className="button primary">제품 저장</button></div></form></div>}
    {materialForm && <div className="modal-backdrop"><form className="modal small" onSubmit={saveMaterial}><div className="modal-head"><div><p className="eyebrow">품목 마스터</p><h2>{materialForm.name} 구매가격 수정</h2></div><button type="button" className="icon-button" onClick={() => setMaterialForm(null)}>✕</button></div><div className="form-grid"><p>기준 단위와 구매 규격은 품목 설정에서 변경할 수 있습니다.</p><label className="span-2">구매가격 (VAT 제외)<input type="number" min="0" value={materialForm.packPrice} onChange={(event) => setMaterialForm({ ...materialForm, packPrice: Number(event.target.value) })}/></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setMaterialForm(null)}>취소</button><button className="button primary">저장</button></div></form></div>}
  </section>;
}
